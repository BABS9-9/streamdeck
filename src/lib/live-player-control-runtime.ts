import {
  ConnectionStatus,
  LivePlayerControlCard,
  LivePlayerControlRuntimeContract,
  LivePlayerControlSignal,
  LivePlayerControlTone,
  PlayerControlTelemetry,
  ProviderGuideCoverageReport,
  ProviderGuideContinuityContract,
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

type BuildLivePlayerControlRuntimeArgs = {
  currentStream: XtreamStream | null;
  currentProviderId: string | null;
  activeConnectionId: string | null;
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  watchHistory: WatchHistoryItem[];
  controlTelemetry: PlayerControlTelemetry;
  streamHealthStatus: 'idle' | 'loading' | 'healthy' | 'buffering' | 'degraded' | 'error';
  dockMode: 'expanded' | 'compact';
  currentGuideCoverage?: ProviderGuideCoverageReport | null;
  guideContinuity?: ProviderGuideContinuityContract | null;
  lastSwitchContext?: ProviderSwitchContext | null;
  recoveryTarget?: RecoveryTarget;
};

const toneRank: Record<LivePlayerControlTone, number> = {
  ready: 0,
  watch: 1,
  recover: 2,
};

const getDominantTone = (tones: LivePlayerControlTone[]) =>
  tones.reduce<LivePlayerControlTone>((current, tone) => (
    toneRank[tone] > toneRank[current] ? tone : current
  ), 'ready');

const formatSeconds = (seconds?: number | null) => {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return '0s';
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
};

const getPlayPauseCard = ({
  playbackState,
  providerName,
  statusMessage,
}: {
  playbackState: LivePlayerControlRuntimeContract['playPauseState'];
  providerName: string;
  statusMessage: string;
}): LivePlayerControlCard => {
  switch (playbackState) {
    case 'playing':
      return {
        id: 'play-pause',
        label: 'Play / pause state',
        state: playbackState,
        summary: `${providerName} is actively carrying playback.`,
        detail: statusMessage,
        tone: 'ready',
      };
    case 'paused':
      return {
        id: 'play-pause',
        label: 'Play / pause state',
        state: playbackState,
        summary: 'Playback is paused without losing the current stream owner.',
        detail: 'The next OK press should resume the same stream instead of rebuilding provider intent.',
        tone: 'watch',
      };
    case 'buffering':
      return {
        id: 'play-pause',
        label: 'Play / pause state',
        state: playbackState,
        summary: `${providerName} is still attached, but playback is buffering.`,
        detail: statusMessage,
        tone: 'watch',
      };
    case 'error':
      return {
        id: 'play-pause',
        label: 'Play / pause state',
        state: playbackState,
        summary: 'Playback lost enough proof to keep auto-play calm.',
        detail: statusMessage,
        tone: 'recover',
      };
    case 'loading':
      return {
        id: 'play-pause',
        label: 'Play / pause state',
        state: playbackState,
        summary: `${providerName} is still being validated for this playback session.`,
        detail: statusMessage,
        tone: 'watch',
      };
    default:
      return {
        id: 'play-pause',
        label: 'Play / pause state',
        state: playbackState,
        summary: 'No active playback is holding focus right now.',
        detail: 'Do not imply player momentum until a real stream has attached.',
        tone: 'recover',
      };
  }
};

export const buildLivePlayerControlRuntime = ({
  currentStream,
  currentProviderId,
  activeConnectionId,
  connections,
  connectionStatus,
  watchHistory,
  controlTelemetry,
  streamHealthStatus,
  dockMode,
  currentGuideCoverage = null,
  guideContinuity = null,
  lastSwitchContext = null,
  recoveryTarget = null,
}: BuildLivePlayerControlRuntimeArgs): LivePlayerControlRuntimeContract => {
  const currentProvider = connections.find((connection) => connection.id === currentProviderId) ?? null;
  const currentProviderStatus = currentProviderId ? connectionStatus[currentProviderId] : null;
  const historyItem = currentProviderId && currentStream
    ? watchHistory.find((item) => item.id === `${currentProviderId}-${Number(currentStream.stream_id ?? currentStream.series_id ?? 0)}`) ?? null
    : watchHistory[0] ?? null;
  const providerName = currentProvider?.name || historyItem?.lastOwner?.providerName || 'Current provider';
  const playbackOwnerProviderId = historyItem?.lastOwner?.providerId ?? currentProviderId ?? null;
  const isLive = currentStream?.stream_type === 'live';

  const playPauseState = controlTelemetry.playbackState;

  const seekWindowState: LivePlayerControlRuntimeContract['seekWindowState'] = !currentStream
    ? 'unavailable'
    : isLive
      ? controlTelemetry.seekableWindowSeconds && controlTelemetry.seekableWindowSeconds >= 90
        ? controlTelemetry.atLiveEdge === false
          ? 'timeshift-active'
          : 'timeshift-ready'
        : 'live-edge'
      : 'resume-window';

  const infoBarVisibilityState: LivePlayerControlRuntimeContract['infoBarVisibilityState'] =
    streamHealthStatus === 'error' || streamHealthStatus === 'buffering' || currentGuideCoverage?.status === 'error'
      ? 'recovery-forced'
      : dockMode === 'expanded'
        ? isLive
          ? 'guide-led'
          : 'details-open'
        : 'compact-hidden';

  const subtitleAudioOptionState: LivePlayerControlRuntimeContract['subtitleAudioOptionState'] =
    controlTelemetry.hasSelectedAudioTrack || controlTelemetry.hasSelectedSubtitleTrack
      ? 'selection-active'
      : controlTelemetry.audioTrackCount > 0 && controlTelemetry.subtitleTrackCount > 0
        ? 'audio-and-subtitles'
        : controlTelemetry.audioTrackCount > 0
          ? 'audio-only'
          : controlTelemetry.subtitleTrackCount > 0
            ? 'subtitles-only'
            : 'none';

  const focusReturnState: LivePlayerControlRuntimeContract['focusReturnState'] =
    recoveryTarget
      ? recoveryTarget.categoryName
        ? 'same-category'
        : 'recovery-rail'
      : lastSwitchContext?.sourceSurface === 'player' || lastSwitchContext?.reason === 'recovery' || lastSwitchContext?.reason === 'variant'
        ? 'provider-switch'
        : historyItem?.resumeCheckpoint
          ? 'resume-history'
          : 'live-grid';

  const playbackContinuityState: LivePlayerControlRuntimeContract['playbackContinuityState'] =
    streamHealthStatus === 'error'
      ? recoveryTarget
        ? recoveryTarget.categoryName
          ? 'category-preserved'
          : 'switch-preserved'
        : 'broken'
      : historyItem?.staleSession?.status === 'recover'
        ? recoveryTarget
          ? 'switch-preserved'
          : 'degraded'
        : lastSwitchContext?.preservedTitle && currentStream?.name && lastSwitchContext.preservedTitle === currentStream.name && lastSwitchContext.fromProviderId && lastSwitchContext.fromProviderId !== currentProviderId
          ? 'switch-preserved'
          : recoveryTarget?.categoryName
            ? 'category-preserved'
            : currentProviderStatus?.state === 'degraded' || streamHealthStatus === 'degraded' || streamHealthStatus === 'buffering'
              ? 'degraded'
              : 'same-provider';

  const playPauseCard = getPlayPauseCard({
    playbackState: playPauseState,
    providerName,
    statusMessage: currentProviderStatus?.message || guideContinuity?.nextMoveDetail || 'Playback telemetry is healthy enough to keep the current provider active.',
  });

  const seekWindowCard: LivePlayerControlCard = {
    id: 'seek-window',
    label: 'Seek window state',
    state: seekWindowState,
    summary: seekWindowState === 'resume-window'
      ? 'Resume checkpoints can move through this title without rebuilding provider ownership.'
      : seekWindowState === 'timeshift-active'
        ? 'The stream has moved off live edge, so player controls must preserve the current offset honestly.'
        : seekWindowState === 'timeshift-ready'
          ? 'The provider is exposing enough live window to allow rewind without pretending VOD-style seeking.'
          : seekWindowState === 'live-edge'
            ? 'This stream is effectively pinned to live edge.'
            : 'No seek window is usable yet.',
    detail: seekWindowState === 'resume-window'
      ? historyItem?.resumeCheckpoint
        ? `Checkpoint captured at ${formatSeconds(historyItem.resumeCheckpoint.positionSeconds)} with ${historyItem.resumeCheckpoint.progressPercent}% progress.`
        : 'Non-live playback is attached, but a durable resume checkpoint has not been captured yet.'
      : controlTelemetry.seekableWindowSeconds
        ? `Current seekable window: ${formatSeconds(controlTelemetry.seekableWindowSeconds)}.`
        : 'The provider is not exposing a safe rewind window right now.',
    tone: seekWindowState === 'live-edge' || seekWindowState === 'unavailable'
      ? 'watch'
      : 'ready',
  };

  const infoBarCard: LivePlayerControlCard = {
    id: 'info-bar',
    label: 'Info bar visibility',
    state: infoBarVisibilityState,
    summary: infoBarVisibilityState === 'guide-led'
      ? 'Expanded player state is carrying now/next truth beside playback.'
      : infoBarVisibilityState === 'details-open'
        ? 'Expanded player details can stay open without losing playback ownership.'
        : infoBarVisibilityState === 'recovery-forced'
          ? 'The info layer should stay visible until the playback problem is explained.'
          : 'Compact mode can collapse the heavy metadata safely.',
    detail: infoBarVisibilityState === 'guide-led'
      ? guideContinuity?.ownerDetail || currentGuideCoverage?.summary || 'Guide truth is available for the active channel.'
      : infoBarVisibilityState === 'recovery-forced'
        ? currentProviderStatus?.message || historyItem?.staleSession?.detail || 'Playback needs visible explanation before the shell hides the state.'
        : 'The current player state does not require persistent explanation copy.',
    tone: infoBarVisibilityState === 'recovery-forced' ? 'recover' : 'ready',
  };

  const subtitleAudioCard: LivePlayerControlCard = {
    id: 'subtitle-audio',
    label: 'Subtitle / audio options',
    state: subtitleAudioOptionState,
    summary: subtitleAudioOptionState === 'selection-active'
      ? 'The player already has an explicit audio or subtitle selection active.'
      : subtitleAudioOptionState === 'audio-and-subtitles'
        ? 'Both audio and subtitle controls are available for the overlay.'
        : subtitleAudioOptionState === 'audio-only'
          ? 'Only audio track changes are currently exposed.'
          : subtitleAudioOptionState === 'subtitles-only'
            ? 'Only subtitle controls are currently exposed.'
            : 'This stream is not advertising audio or subtitle choices yet.',
    detail: `Audio tracks: ${controlTelemetry.audioTrackCount} · Subtitle tracks: ${controlTelemetry.subtitleTrackCount}.`,
    tone: subtitleAudioOptionState === 'none' ? 'watch' : 'ready',
  };

  const focusReturnCard: LivePlayerControlCard = {
    id: 'focus-return',
    label: 'Player focus return',
    state: focusReturnState,
    summary: focusReturnState === 'provider-switch'
      ? 'Back/close should return into the switched provider context, not a generic player exit.'
      : focusReturnState === 'same-category'
        ? 'If exact continuity breaks, the player can still return into the same live category.'
        : focusReturnState === 'recovery-rail'
          ? 'Player recovery should stay pinned to the healthiest duplicate before falling back to browsing.'
          : focusReturnState === 'resume-history'
            ? 'The current session has enough history to return into the last owned checkpoint.'
            : 'Default return path is the active live grid selection.',
    detail: lastSwitchContext?.preservedTitle
      ? `Last switch preserved "${lastSwitchContext.preservedTitle}" from ${lastSwitchContext.sourceSurface || 'system'}.`
      : historyItem?.staleSession?.detail || 'No saved switch context is currently overriding the standard return ladder.',
    tone: focusReturnState === 'recovery-rail' ? 'watch' : 'ready',
  };

  const continuityCard: LivePlayerControlCard = {
    id: 'playback-continuity',
    label: 'Provider-aware continuity',
    state: playbackContinuityState,
    summary: playbackContinuityState === 'same-provider'
      ? `${providerName} still owns both the active playback session and the visible continuity story.`
      : playbackContinuityState === 'switch-preserved'
        ? 'The title can survive a provider switch without pretending nothing changed.'
        : playbackContinuityState === 'category-preserved'
          ? 'Exact channel ownership broke, but the same category story can still survive.'
          : playbackContinuityState === 'degraded'
            ? 'Playback continuity still exists, but it is already relying on downgraded proof.'
            : 'The current player path cannot honestly claim clean continuity anymore.',
    detail: recoveryTarget
      ? `Recommended recovery target: ${recoveryTarget.providerName}${recoveryTarget.categoryName ? ` via ${recoveryTarget.categoryName}` : ''}.`
      : historyItem?.staleSession?.detail || currentGuideCoverage?.summary || 'The active provider still has enough proof to keep continuity local.',
    tone: playbackContinuityState === 'same-provider'
      ? 'ready'
      : playbackContinuityState === 'broken'
        ? 'recover'
        : 'watch',
  };

  const cards = [
    playPauseCard,
    seekWindowCard,
    infoBarCard,
    subtitleAudioCard,
    focusReturnCard,
    continuityCard,
  ];

  const signals: LivePlayerControlSignal[] = [
    {
      label: 'Playback owner',
      value: providerName,
      detail: playbackOwnerProviderId === activeConnectionId
        ? 'The active provider still matches the last playback owner.'
        : 'The playback owner and active provider have diverged, so the overlay must speak carefully.',
      tone: playbackOwnerProviderId === activeConnectionId ? 'ready' : 'watch',
    },
    {
      label: 'Seek window',
      value: controlTelemetry.seekableWindowSeconds ? formatSeconds(controlTelemetry.seekableWindowSeconds) : 'None',
      detail: isLive
        ? 'Live streams should say whether rewind is real, at edge, or unavailable.'
        : `Duration: ${formatSeconds(controlTelemetry.durationSeconds)}.`,
      tone: seekWindowState === 'unavailable' ? 'recover' : seekWindowState === 'live-edge' ? 'watch' : 'ready',
    },
    {
      label: 'Guide continuity',
      value: currentGuideCoverage?.status || 'unknown',
      detail: guideContinuity?.trustSummary || currentGuideCoverage?.summary || 'Guide coverage has not reported a usable player continuity state yet.',
      tone: currentGuideCoverage?.status === 'error' || currentGuideCoverage?.status === 'empty'
        ? 'recover'
        : currentGuideCoverage?.status === 'partial' || currentGuideCoverage?.status === 'stale'
          ? 'watch'
          : 'ready',
    },
    {
      label: 'Track options',
      value: `${controlTelemetry.audioTrackCount}/${controlTelemetry.subtitleTrackCount}`,
      detail: 'Audio/subtitle counts are now runtime-owned instead of guessed from surface-local copy.',
      tone: subtitleAudioOptionState === 'none' ? 'watch' : 'ready',
    },
  ];

  const tone = getDominantTone(cards.map((card) => card.tone));
  const recommendedProviderId = recoveryTarget?.providerId || null;
  const nextMove = tone === 'recover'
    ? {
        label: recoveryTarget ? 'Switch playback ownership' : 'Explain break before replay',
        detail: recoveryTarget
          ? `Move the next control action onto ${recoveryTarget.providerName} so the player stops pretending the current provider still owns the stream.`
          : 'Keep the player state visible and explicit until a healthy provider or same-category fallback exists.',
        tone: 'recover' as const,
        targetProviderId: recoveryTarget?.providerId ?? null,
      }
    : tone === 'watch'
      ? {
          label: 'Preserve context, downgrade certainty',
          detail: 'Keep the title, category, and guide state visible, but stop overclaiming exact continuity until playback proof settles.',
          tone: 'watch' as const,
          targetProviderId: recoveryTarget?.providerId ?? null,
        }
      : {
          label: 'Keep current provider in control',
          detail: 'The player can stay calm because telemetry, guide continuity, and playback ownership still agree.',
          tone: 'ready' as const,
          targetProviderId: null,
        };

  const summary = tone === 'recover'
    ? `${providerName} no longer owns a carefree player session for ${currentStream?.name || 'the current stream'}.`
    : tone === 'watch'
      ? `${providerName} can keep the player open, but control truth now needs visible caution.`
      : `${providerName} still owns the player cleanly enough for remote-first controls to stay calm.`;

  const detail = [
    playPauseCard.detail,
    continuityCard.detail,
    guideContinuity?.nextMoveDetail || currentGuideCoverage?.summary || null,
  ].filter(Boolean).join(' ');

  return {
    screenId: 'player',
    title: 'Live player control runtime',
    summary,
    detail,
    tone,
    activeProviderId: activeConnectionId,
    playbackOwnerProviderId,
    recommendedProviderId,
    playPauseState,
    seekWindowState,
    infoBarVisibilityState,
    subtitleAudioOptionState,
    focusReturnState,
    playbackContinuityState,
    cards,
    signals,
    nextMove,
  };
};
