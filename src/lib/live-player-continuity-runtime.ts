import {
  ConnectionStatus,
  LivePlayerContinuityEntry,
  LivePlayerContinuityRuntimeContract,
  LivePlayerContinuitySignal,
  LivePlayerControlTone,
  LivePlayerPlaybackContinuityState,
  ProviderGuideCoverageReport,
  ProviderSwitchContext,
  SavedConnection,
  WatchHistoryItem,
  XtreamStream,
} from './types';

type RecoveryTarget = {
  providerId: string;
  providerName: string;
  categoryName?: string;
} | null;

type BuildLivePlayerContinuityRuntimeArgs = {
  currentStream: XtreamStream | null;
  currentProviderId: string | null;
  activeConnectionId: string | null;
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  watchHistory: WatchHistoryItem[];
  playbackContinuityState: LivePlayerPlaybackContinuityState;
  streamHealthStatus: 'idle' | 'loading' | 'healthy' | 'buffering' | 'degraded' | 'error';
  currentGuideCoverage?: ProviderGuideCoverageReport | null;
  lastSwitchContext?: ProviderSwitchContext | null;
  recoveryTarget?: RecoveryTarget;
};

const getTone = ({
  playbackContinuityState,
  streamHealthStatus,
  currentGuideCoverage,
}: Pick<BuildLivePlayerContinuityRuntimeArgs, 'playbackContinuityState' | 'streamHealthStatus' | 'currentGuideCoverage'>): LivePlayerControlTone => {
  if (
    playbackContinuityState === 'broken'
    || streamHealthStatus === 'error'
    || currentGuideCoverage?.status === 'error'
    || currentGuideCoverage?.status === 'empty'
  ) {
    return 'recover';
  }
  if (
    playbackContinuityState === 'degraded'
    || streamHealthStatus === 'buffering'
    || streamHealthStatus === 'degraded'
    || currentGuideCoverage?.status === 'partial'
    || currentGuideCoverage?.status === 'stale'
  ) {
    return 'watch';
  }
  return 'ready';
};

export const buildLivePlayerContinuityRuntime = ({
  currentStream,
  currentProviderId,
  activeConnectionId,
  connections,
  connectionStatus,
  watchHistory,
  playbackContinuityState,
  streamHealthStatus,
  currentGuideCoverage = null,
  lastSwitchContext = null,
  recoveryTarget = null,
}: BuildLivePlayerContinuityRuntimeArgs): LivePlayerContinuityRuntimeContract => {
  const currentProvider = connections.find((connection) => connection.id === currentProviderId) ?? null;
  const currentProviderStatus = currentProviderId ? connectionStatus[currentProviderId] : null;
  const historyItem = currentProviderId && currentStream
    ? watchHistory.find((item) => item.id === `${currentProviderId}-${Number(currentStream.stream_id ?? currentStream.series_id ?? 0)}`) ?? null
    : watchHistory[0] ?? null;
  const providerName = currentProvider?.name || historyItem?.lastOwner?.providerName || 'Current provider';
  const playbackOwnerProviderId = historyItem?.lastOwner?.providerId ?? currentProviderId ?? null;
  const playbackOwnerName = playbackOwnerProviderId && playbackOwnerProviderId !== currentProviderId
    ? connections.find((connection) => connection.id === playbackOwnerProviderId)?.name || historyItem?.lastOwner?.providerName || providerName
    : providerName;
  const recoveryOwnerLabel = recoveryTarget
    ? `${recoveryTarget.providerName}${recoveryTarget.categoryName ? ` via ${recoveryTarget.categoryName}` : ''}`
    : providerName;
  const tone = getTone({
    playbackContinuityState,
    streamHealthStatus,
    currentGuideCoverage,
  });

  const entries: LivePlayerContinuityEntry[] = [
    {
      id: 'owner',
      label: 'Playback owner',
      state: playbackOwnerProviderId === activeConnectionId ? 'owner-aligned' : 'owner-shifted',
      summary: playbackOwnerProviderId === activeConnectionId
        ? `${providerName} still owns both the active player session and the last earned playback story.`
        : `${playbackOwnerName} still owns the remembered playback story even though the active provider has already shifted.`,
      detail: currentProviderStatus?.message || historyItem?.staleSession?.detail || 'No provider-warning override is displacing the current playback owner yet.',
      tone: playbackOwnerProviderId === activeConnectionId ? 'ready' : 'watch',
    },
    {
      id: 'continuity-path',
      label: 'Continuity path',
      state: playbackContinuityState,
      summary: playbackContinuityState === 'same-provider'
        ? 'Playback can stay on the same provider without widening the continuity story.'
        : playbackContinuityState === 'switch-preserved'
          ? 'The title story survived a provider switch, but the player should stay explicit about that handoff.'
          : playbackContinuityState === 'category-preserved'
            ? 'Exact channel continuity broke, but the same category path is still alive.'
            : playbackContinuityState === 'degraded'
              ? 'Continuity still exists, but it is already leaning on softened proof.'
              : 'The current player path can no longer claim clean continuity.',
      detail: recoveryTarget
        ? `Recovery path available on ${recoveryOwnerLabel}.`
        : lastSwitchContext?.preservedTitle
          ? `Continuity is still pinned to "${lastSwitchContext.preservedTitle}" while the player re-derives the safest owner.`
          : 'No alternate continuity path is attached yet.',
      tone: playbackContinuityState === 'same-provider'
        ? 'ready'
        : playbackContinuityState === 'broken'
          ? 'recover'
          : 'watch',
    },
    {
      id: 'proof-floor',
      label: 'Proof floor',
      state: currentGuideCoverage?.status || 'unknown',
      summary: currentGuideCoverage?.status === 'fresh'
        ? 'Guide and player proof are still fresh enough to keep continuity claims calm.'
        : currentGuideCoverage?.status === 'partial' || currentGuideCoverage?.status === 'stale'
          ? 'Continuity can stay visible, but the proof floor is already softening.'
          : currentGuideCoverage?.status === 'error' || currentGuideCoverage?.status === 'empty'
            ? 'The proof floor has dropped far enough that the player should stop implying calm continuity.'
            : 'Guide proof has not published a stable continuity floor yet.',
      detail: currentGuideCoverage?.summary || 'Guide coverage is not currently contributing a continuity proof read.',
      tone: currentGuideCoverage?.status === 'error' || currentGuideCoverage?.status === 'empty'
        ? 'recover'
        : !currentGuideCoverage || currentGuideCoverage.status === 'partial' || currentGuideCoverage.status === 'stale'
          ? 'watch'
          : 'ready',
    },
    {
      id: 'recovery-owner',
      label: 'Recovery owner',
      state: recoveryTarget ? 'recovery-attached' : 'local-owner',
      summary: recoveryTarget
        ? `${recoveryOwnerLabel} is the next honest owner if playback needs a calm recovery move.`
        : `${providerName} still carries the recovery story locally because no healthier owner is attached.`,
      detail: recoveryTarget
        ? `If exact playback breaks, move onto ${recoveryOwnerLabel} before the player claims continuity is calm again.`
        : 'No alternate provider currently outranks the active path for recovery ownership.',
      tone: recoveryTarget ? 'ready' : tone,
    },
  ];

  const signals: LivePlayerContinuitySignal[] = [
    {
      label: 'Continuity state',
      value: playbackContinuityState,
      detail: 'The player now publishes continuity posture as its own runtime contract instead of one control card.',
      tone: entries[1].tone,
    },
    {
      label: 'Playback owner',
      value: playbackOwnerName,
      detail: playbackOwnerProviderId === activeConnectionId
        ? 'The current provider still matches the last earned playback owner.'
        : 'The active provider and continuity owner have diverged, so the player should stay explicit.',
      tone: entries[0].tone,
    },
    {
      label: 'Proof floor',
      value: currentGuideCoverage?.status || 'unknown',
      detail: currentGuideCoverage?.summary || 'Guide proof has not yet reported a durable continuity floor.',
      tone: entries[2].tone,
    },
    {
      label: 'Recovery owner',
      value: recoveryTarget?.providerName || providerName,
      detail: recoveryTarget
        ? 'A healthier owner is already available for the next calm recovery move.'
        : 'No alternate recovery owner is currently outranking the active path.',
      tone: entries[3].tone,
    },
  ];

  const nextMove = tone === 'recover'
    ? {
        label: recoveryTarget ? 'Move continuity onto recovery owner' : 'Keep the continuity break visible',
        detail: recoveryTarget
          ? `The next player decision should move onto ${recoveryOwnerLabel} before the shell pretends exact continuity survived.`
          : 'No clean recovery owner is attached, so the player should keep the break explicit before replay or exit.',
        tone: 'recover' as const,
        targetProviderId: recoveryTarget?.providerId ?? null,
      }
    : tone === 'watch'
      ? {
          label: 'Preserve story, downgrade certainty',
          detail: 'Keep the title, owner, and category story visible, but stop overclaiming exact continuity until proof hardens again.',
          tone: 'watch' as const,
          targetProviderId: recoveryTarget?.providerId ?? null,
        }
      : {
          label: 'Keep continuity local',
          detail: 'The current provider still has enough owner and guide proof to keep playback continuity calm.',
          tone: 'ready' as const,
          targetProviderId: null,
        };

  const summary = tone === 'recover'
    ? `${providerName} no longer owns a clean continuity story for ${currentStream?.name || 'the current stream'}.`
    : tone === 'watch'
      ? `${providerName} can keep playback open, but continuity is already leaning on watched proof.`
      : `${providerName} still owns the player continuity story cleanly.`;

  const detail = [
    `Playback owner: ${playbackOwnerName}.`,
    `Proof floor: ${currentGuideCoverage?.summary || 'Guide continuity pending.'}`,
    `Recovery owner: ${recoveryOwnerLabel}.`,
  ].join(' ');

  return {
    screenId: 'player',
    title: 'Player continuity runtime',
    eyebrow: 'Provider-aware continuity',
    summary,
    detail,
    tone,
    activeProviderId: activeConnectionId,
    playbackOwnerProviderId,
    recommendedProviderId: recoveryTarget?.providerId ?? null,
    continuityState: playbackContinuityState,
    providerOwnerLabel: playbackOwnerName,
    recoveryOwnerLabel,
    guideState: currentGuideCoverage?.status || 'unknown',
    entries,
    signals,
    nextMove,
  };
};
