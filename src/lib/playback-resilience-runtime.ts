import {
  ConnectionStatus,
  PlaybackResilienceContract,
  PlaybackResilienceProviderState,
  PlaybackResilienceTone,
  SavedConnection,
  StreamHealth,
  WatchHistoryItem,
} from './types';

type BuildPlaybackResilienceContractArgs = {
  screenId: 'live' | 'search';
  connections: SavedConnection[];
  activeConnectionId: string | null;
  connectionStatus: Record<string, ConnectionStatus>;
  watchHistory?: WatchHistoryItem[];
  streamHealth?: StreamHealth | null;
  selectedLabel?: string | null;
  cachedResultCount?: number;
  droppedProviderIds?: string[];
  degradedProviderCount?: number;
};

const toneRank: Record<PlaybackResilienceTone, number> = {
  ready: 0,
  watch: 1,
  recover: 2,
};

const getDominantTone = (tones: PlaybackResilienceTone[]): PlaybackResilienceTone =>
  tones.reduce<PlaybackResilienceTone>((current, tone) => (
    toneRank[tone] > toneRank[current] ? tone : current
  ), 'ready');

const getProviderTone = (
  state: ConnectionStatus['state'],
  options?: { isPlaybackOwner?: boolean; hasDrop?: boolean }
): PlaybackResilienceTone => {
  if (options?.hasDrop || state === 'error') return 'recover';
  if (state === 'degraded' || state === 'checking' || state === 'idle') return 'watch';
  if (options?.isPlaybackOwner === false && state !== 'healthy') return 'watch';
  return 'ready';
};

const getProviderSummary = (
  connection: SavedConnection,
  status: ConnectionStatus | undefined,
  options: { isPlaybackOwner: boolean; hasDrop: boolean; screenId: 'live' | 'search' }
) => {
  if (options.hasDrop) {
    return {
      summary: `${connection.name} dropped out of the current ${options.screenId === 'live' ? 'playback' : 'search'} path.`,
      detail: status?.message || 'Cached provider state was cleared so the shell does not keep promising a dead provider.',
    };
  }

  if (status?.state === 'error') {
    return {
      summary: `${connection.name} needs recovery before it should own the next move.`,
      detail: status.message || 'The last provider check failed, so retry copy should yield to recovery or a provider switch.',
    };
  }

  if (status?.state === 'degraded') {
    return {
      summary: `${connection.name} is still searchable, but launch confidence is degraded.`,
      detail: status.message || 'Keep continuity visible, but downgrade exact same-provider promises until provider health improves.',
    };
  }

  if (status?.state === 'checking') {
    return {
      summary: `${connection.name} is revalidating before it can take full ownership again.`,
      detail: 'Preserve cached continuity while the shell waits for a fresh health answer instead of forcing a blind retry.',
    };
  }

  if (options.isPlaybackOwner) {
    return {
      summary: `${connection.name} still owns the clearest playback witness.`,
      detail: options.screenId === 'live'
        ? 'Live can keep the current stream visible while health telemetry decides whether recovery must replace play.'
        : 'Search can keep continuity proof attached to the result while switching launch ownership if needed.',
    };
  }

  return {
    summary: `${connection.name} is clean enough to stay in the active rotation.`,
    detail: 'Cached state and provider identity are aligned, so this provider can keep its current role without recovery copy.',
  };
};

const formatSeconds = (seconds?: number | null) => {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return 'No checkpoint yet';
  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
};

const getSignalTone = (value: number, thresholds: { watch: number; recover: number }) => {
  if (value >= thresholds.recover) return 'recover';
  if (value >= thresholds.watch) return 'watch';
  return 'ready';
};

export const buildPlaybackResilienceContract = ({
  screenId,
  connections,
  activeConnectionId,
  connectionStatus,
  watchHistory = [],
  streamHealth,
  selectedLabel,
  cachedResultCount = 0,
  droppedProviderIds = [],
  degradedProviderCount = 0,
}: BuildPlaybackResilienceContractArgs): PlaybackResilienceContract => {
  const activeConnection = connections.find((connection) => connection.id === activeConnectionId) ?? null;
  const droppedProviderSet = new Set(droppedProviderIds);
  const latestPlaybackItem = watchHistory[0] ?? null;
  const playbackOwner = latestPlaybackItem?.providerId ?? null;
  const providerStates: PlaybackResilienceProviderState[] = connections.map((connection) => {
    const isPlaybackOwner = connection.id === playbackOwner;
    const hasDrop = droppedProviderSet.has(connection.id);
    const state = connectionStatus[connection.id]?.state ?? 'idle';
    const tone = getProviderTone(state, { isPlaybackOwner, hasDrop });
    const { summary, detail } = getProviderSummary(connection, connectionStatus[connection.id], {
      isPlaybackOwner,
      hasDrop,
      screenId,
    });

    return {
      providerId: connection.id,
      providerName: connection.name,
      state,
      tone,
      summary,
      detail,
      isActive: connection.id === activeConnectionId,
      isPlaybackOwner,
    };
  });

  const droppedProviderCount = providerStates.filter((provider) => provider.tone === 'recover').length;
  const dominantTone = getDominantTone([
    ...providerStates.map((provider) => provider.tone),
    streamHealth?.status === 'error'
      ? 'recover'
      : streamHealth?.status === 'degraded' || streamHealth?.status === 'buffering'
        ? 'watch'
        : 'ready',
  ]);

  const activeProviderLabel = activeConnection?.name || 'The active provider';
  const selectedDetail = selectedLabel ? ` for ${selectedLabel}` : '';
  const cachedCoveragePercent = connections.length > 0
    ? Math.round((Math.min(cachedResultCount, connections.length) / connections.length) * 100)
    : 0;
  const streamDetail = screenId === 'live'
    ? streamHealth?.message || 'Playback telemetry will call out when launch truth downgrades into recovery truth.'
    : cachedResultCount > 0
      ? `${cachedResultCount} cached result${cachedResultCount === 1 ? '' : 's'} can stay visible while provider ownership shifts.`
      : 'Search should keep continuity visible only when cached proof still exists.';

  const summary = dominantTone === 'recover'
    ? `${activeProviderLabel} no longer deserves carefree ${screenId === 'live' ? 'playback' : 'search'} ownership${selectedDetail}.`
    : dominantTone === 'watch'
      ? `${activeProviderLabel} can keep the current ${screenId === 'live' ? 'stream' : 'query'} moving, but the shell should speak with caution${selectedDetail}.`
      : `${activeProviderLabel} still has enough proof to keep ${screenId === 'live' ? 'playback' : 'search'} continuity clean${selectedDetail}.`;

  const detail = droppedProviderCount > 0
    ? `${streamDetail} ${droppedProviderCount} provider ${droppedProviderCount === 1 ? 'lane was' : 'lanes were'} cleared out of the active cache/runtime path so stale ownership does not linger after remove or failed retry.`
    : streamDetail;

  const actionLabel = dominantTone === 'recover'
    ? 'Switch or recover before promising exact continuity'
    : dominantTone === 'watch'
      ? 'Keep cached continuity, downgrade launch certainty'
      : 'Continue with current provider posture';

  const actionDetail = dominantTone === 'recover'
    ? 'Provider remove, failed retry, or active playback errors should clear dead cache ownership and move the next action to a healthy saved provider.'
    : dominantTone === 'watch'
      ? 'The shell can keep the same title/query visible, but it should stop implying the current provider still owns the exact same next tap.'
      : 'Cached state, current ownership, and provider health all agree enough to keep the surface calm.';

  const playbackWitness: PlaybackResilienceContract['playbackWitness'] = latestPlaybackItem
    ? {
        label: screenId === 'live' ? 'Current playback witness' : 'Saved continuity witness',
        summary: latestPlaybackItem.kind === 'series' && latestPlaybackItem.seasonNumber && latestPlaybackItem.episodeNumber
          ? `${latestPlaybackItem.providerId === activeConnectionId ? activeProviderLabel : latestPlaybackItem.providerId} still carries S${latestPlaybackItem.seasonNumber}E${latestPlaybackItem.episodeNumber}.`
          : `${latestPlaybackItem.title} still carries the freshest continuity proof.`,
        detail: latestPlaybackItem.resumeCheckpoint
          ? `Checkpoint captured at ${formatSeconds(latestPlaybackItem.resumeCheckpoint.positionSeconds)} with ${latestPlaybackItem.resumeCheckpoint.progressPercent}% progress.`
          : latestPlaybackItem.staleSession?.detail || 'No explicit resume checkpoint is stored yet.',
        tone: latestPlaybackItem.staleSession?.status === 'recover'
          ? 'recover'
          : latestPlaybackItem.staleSession?.status === 'watch'
            ? 'watch'
            : 'ready',
      }
    : null;

  const signals: PlaybackResilienceContract['signals'] = [
    {
      label: 'Dropped lanes',
      value: `${droppedProviderCount}`,
      detail: droppedProviderCount > 0
        ? 'Providers with removed cache/runtime ownership after delete or failed retry.'
        : 'No dropped providers are polluting active runtime state.',
      tone: getSignalTone(droppedProviderCount, { watch: 1, recover: 2 }),
    },
    {
      label: 'Degraded lanes',
      value: `${degradedProviderCount}`,
      detail: degradedProviderCount > 0
        ? 'Providers that can still preserve identity but should speak with caution.'
        : 'Every saved provider is currently healthy enough to keep full launch honesty.',
      tone: getSignalTone(degradedProviderCount, { watch: 1, recover: 3 }),
    },
    {
      label: 'Cached continuity',
      value: `${cachedResultCount}`,
      detail: screenId === 'live'
        ? `${cachedCoveragePercent}% of the current rail is still available in-memory while live telemetry settles.`
        : `${cachedCoveragePercent}% of the saved provider pool still has cached search proof ready to preserve the query.`,
      tone: cachedResultCount === 0 ? 'recover' : cachedResultCount < connections.length ? 'watch' : 'ready',
    },
    {
      label: 'Playback health',
      value: streamHealth?.status || 'idle',
      detail: streamHealth?.bufferSeconds !== null && streamHealth?.bufferSeconds !== undefined
        ? `Buffer: ${streamHealth.bufferSeconds}s · Resolution: ${streamHealth.resolution || 'pending'}`
        : streamHealth?.message || 'Playback telemetry has not reported enough signal yet.',
      tone: streamHealth?.status === 'error'
        ? 'recover'
        : streamHealth?.status === 'degraded' || streamHealth?.status === 'buffering'
          ? 'watch'
          : 'ready',
    },
  ];

  const recoverySteps: PlaybackResilienceContract['recoverySteps'] = dominantTone === 'recover'
    ? [
        {
          label: 'Clear dead owner state',
          detail: 'Strip removed or failed providers out of cache-backed ownership so the next surface does not inherit stale trust.',
          tone: 'recover',
        },
        {
          label: 'Promote healthiest saved provider',
          detail: 'Move the next explicit play/search action onto a provider that still has current health proof.',
          tone: degradedProviderCount > 0 ? 'watch' : 'ready',
        },
        {
          label: 'Preserve user context only',
          detail: 'Keep the current title, query, or checkpoint visible, but stop promising same-provider exact continuity until proof returns.',
          tone: 'watch',
        },
      ]
    : [
        {
          label: 'Keep context pinned',
          detail: screenId === 'live'
            ? 'Hold the current stream identity on screen while telemetry settles.'
            : 'Keep the current query and ranked result meaning visible during provider checks.',
          tone: 'ready',
        },
        {
          label: 'Downgrade launch promises first',
          detail: 'When health wobbles, downgrade exact same-provider claims before you throw away continuity context.',
          tone: dominantTone,
        },
        {
          label: 'Retry only while honest',
          detail: 'A retry stays acceptable only while provider health, cache proof, and launch ownership still agree.',
          tone: dominantTone,
        },
      ];

  return {
    screenId,
    title: screenId === 'live' ? 'Playback resilience' : 'Search resilience',
    summary,
    detail,
    tone: dominantTone,
    activeProviderId: activeConnectionId,
    playbackOwnerProviderId: playbackOwner,
    cachedResultCount,
    droppedProviderCount,
    degradedProviderCount,
    actionLabel,
    actionDetail,
    playbackWitness,
    signals,
    recoverySteps,
    providers: providerStates,
  };
};
