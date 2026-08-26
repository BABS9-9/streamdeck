import {
  LivePlayerControlRuntimeContract,
  LivePlayerOverlayInteractionRuntimeContract,
  LivePlayerOverlayPlaybackActionRoute,
  LivePlayerOverlayPlaybackRuntimeContract,
  LivePlayerRecoveryActionRuntimeContract,
  NormalizedEpg,
  PlayerControlTelemetry,
  ProviderEpgSyncState,
  ProviderGuideCoverageReport,
  WatchHistoryItem,
  XtreamStream,
} from './types';

const toneRank = {
  ready: 0,
  watch: 1,
  recover: 2,
} as const;

const getDominantTone = (tones: LivePlayerOverlayPlaybackRuntimeContract['tone'][]) => tones.reduce<LivePlayerOverlayPlaybackRuntimeContract['tone']>((current, tone) => (
  toneRank[tone] > toneRank[current] ? tone : current
), 'ready');

const formatClockTime = (timestamp?: number | null) => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000));
};

const formatDuration = (seconds?: number | null) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const buildProgramLabel = (entry: NormalizedEpg['now'] | NormalizedEpg['next'] | null, fallback: string) => {
  if (!entry) return fallback;
  const start = formatClockTime(entry.start_timestamp);
  const end = formatClockTime(entry.stop_timestamp);
  if (start && end) return `${entry.title} • ${start}-${end}`;
  return entry.title;
};

const getProgramState = ({
  currentStream,
  controlRuntime,
  guide,
  guideCoverage,
  recoveryRuntime,
}: {
  currentStream: XtreamStream | null;
  controlRuntime: LivePlayerControlRuntimeContract;
  guide: NormalizedEpg | null;
  guideCoverage: ProviderGuideCoverageReport | null;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayPlaybackRuntimeContract['programState'] => {
  if (!currentStream) return 'unavailable';
  if (recoveryRuntime?.actionKind === 'wait-for-line' || recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner' || recoveryRuntime?.actionKind === 'fail-closed') {
    return 'recovery-led';
  }
  if (currentStream.stream_type !== 'live') return 'resume';
  if (controlRuntime.seekWindowState === 'timeshift-active' || controlRuntime.seekWindowState === 'timeshift-ready') return 'timeshift';
  if (guide?.now || guide?.next) return 'current-next';
  if (guideCoverage && guideCoverage.status !== 'fresh') return 'guide-stale';
  return 'unavailable';
};

const buildActionRoute = ({
  id,
  interactionRuntime,
  dispatchKind,
  commandId,
  fallbackLabel,
  fallbackSummary,
  fallbackDetail,
  fallbackTone,
}: {
  id: LivePlayerOverlayPlaybackActionRoute['id'];
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
  dispatchKind?: LivePlayerOverlayPlaybackActionRoute['dispatchKind'];
  commandId?: LivePlayerOverlayPlaybackActionRoute['commandId'];
  fallbackLabel: string;
  fallbackSummary: string;
  fallbackDetail: string;
  fallbackTone: LivePlayerOverlayPlaybackActionRoute['tone'];
}): LivePlayerOverlayPlaybackActionRoute | null => {
  const dispatch = interactionRuntime.commandDispatches.find((entry) => (
    (dispatchKind ? entry.dispatchKind === dispatchKind : true)
      && (commandId ? entry.commandId === commandId : true)
  ));

  if (!dispatch && !dispatchKind && !commandId) return null;

  return {
    id,
    label: dispatch?.label ?? fallbackLabel,
    summary: dispatch?.summary ?? fallbackSummary,
    detail: dispatch?.detail ?? fallbackDetail,
    dispatchKind: dispatch?.dispatchKind ?? dispatchKind ?? 'noop',
    commandId: dispatch?.commandId ?? commandId ?? null,
    targetProviderId: dispatch?.targetProviderId ?? null,
    available: dispatch?.available ?? false,
    tone: dispatch?.tone ?? fallbackTone,
  };
};

export const buildLivePlayerOverlayPlaybackRuntime = ({
  currentStream,
  currentProviderName,
  guide,
  guideCoverage,
  guideSyncState,
  historyItem,
  controlTelemetry,
  controlRuntime,
  interactionRuntime,
  recoveryRuntime = null,
}: {
  currentStream: XtreamStream | null;
  currentProviderName: string | null;
  guide: NormalizedEpg | null;
  guideCoverage: ProviderGuideCoverageReport | null;
  guideSyncState: ProviderEpgSyncState | null;
  historyItem: WatchHistoryItem | null;
  controlTelemetry: PlayerControlTelemetry;
  controlRuntime: LivePlayerControlRuntimeContract;
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
  recoveryRuntime?: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayPlaybackRuntimeContract => {
  const programState = getProgramState({
    currentStream,
    controlRuntime,
    guide,
    guideCoverage,
    recoveryRuntime,
  });
  const isLive = currentStream?.stream_type === 'live';
  const currentProgramLabel = buildProgramLabel(
    guide?.now ?? null,
    isLive
      ? `Now: ${currentStream?.name ?? historyItem?.title ?? 'Current channel'}`
      : `Resume: ${historyItem?.title ?? currentStream?.name ?? 'Current title'}`
  );
  const nextProgramLabel = buildProgramLabel(
    guide?.next ?? null,
    isLive
      ? guideCoverage?.summary ?? 'Next program data has not been proven yet.'
      : historyItem?.resumeCheckpoint
        ? `Checkpoint: ${historyItem.resumeCheckpoint.progressPercent}% watched`
        : 'No saved checkpoint has been captured yet.'
  );
  const liveEdgeLabel = !currentStream
    ? 'No playback owner'
    : currentStream.stream_type !== 'live'
      ? 'On-demand playback'
      : controlRuntime.seekWindowState === 'timeshift-active'
        ? 'Viewer is off live edge'
        : controlRuntime.seekWindowState === 'timeshift-ready'
          ? 'Live edge is active with rewind available'
          : controlTelemetry.atLiveEdge === false
            ? 'Live edge drift is still settling'
            : 'Playback is pinned to live edge';
  const seekEligibilityLabel = !currentStream
    ? 'Seek is unavailable until playback attaches.'
    : currentStream.stream_type !== 'live'
      ? 'Resume seek is available for this title.'
      : controlRuntime.seekWindowState === 'timeshift-active'
        ? 'Timeshift seek is active.'
        : controlRuntime.seekWindowState === 'timeshift-ready'
          ? 'Live rewind is available.'
          : 'No rewind window is currently exposed.';
  const programWindowLabel = isLive
    ? guide?.now
      ? `${formatClockTime(guide.now.start_timestamp) ?? 'Now'}-${formatClockTime(guide.now.stop_timestamp) ?? 'Later'} window`
      : guideCoverage?.summary ?? 'Program window still needs guide proof.'
    : formatDuration(controlTelemetry.durationSeconds ?? historyItem?.durationSeconds ?? historyItem?.resumeCheckpoint?.durationSeconds)
      ? `Duration ${formatDuration(controlTelemetry.durationSeconds ?? historyItem?.durationSeconds ?? historyItem?.resumeCheckpoint?.durationSeconds)}`
      : 'Duration still settling';
  const guideFreshnessLabel = guideCoverage?.summary
    ?? (guideSyncState ? `${guideSyncState.status} via ${guideSyncState.source}` : 'Guide has not synced yet.');
  const metadataSummary = currentProviderName
    ? `${currentProviderName} owns the active playback metadata contract for ${currentStream?.name ?? historyItem?.title ?? 'this session'}.`
    : 'Playback metadata ownership is still settling.';

  const retryAction = buildActionRoute({
    id: 'retry',
    interactionRuntime,
    dispatchKind: 'retry-playback',
    fallbackLabel: 'Retry playback',
    fallbackSummary: 'Retry the current playback owner when the dock still trusts the same route.',
    fallbackDetail: 'This path should only stay primary while the current provider still owns the cleanest retry.',
    fallbackTone: recoveryRuntime?.actionKind === 'retry' ? recoveryRuntime.tone : 'watch',
  });
  const quickSwitchAction = buildActionRoute({
    id: 'quick-switch',
    interactionRuntime,
    dispatchKind: recoveryRuntime?.actionKind === 'reclaim-owner' ? 'reclaim-owner' : 'quick-switch',
    fallbackLabel: recoveryRuntime?.actionKind === 'reclaim-owner' ? 'Reclaim playback owner' : 'Quick-switch playback',
    fallbackSummary: recoveryRuntime?.nextMove.label ?? 'Move playback onto the healthier saved provider.',
    fallbackDetail: recoveryRuntime?.nextMove.detail ?? 'The overlay should publish the saved-provider handoff instead of hiding it behind generic retry copy.',
    fallbackTone: recoveryRuntime?.tone ?? 'recover',
  });
  const audioSubtitleAction = buildActionRoute({
    id: 'audio-subtitle',
    interactionRuntime,
    commandId: 'audio-subtitle',
    fallbackLabel: 'Audio / subtitles',
    fallbackSummary: 'Open the track picker from the same overlay contract.',
    fallbackDetail: 'Track choices should be reachable without leaving the player story.',
    fallbackTone: controlRuntime.subtitleAudioOptionState === 'none' ? 'watch' : 'ready',
  });
  const returnAction = buildActionRoute({
    id: 'return',
    interactionRuntime,
    commandId: 'back',
    fallbackLabel: 'Return',
    fallbackSummary: 'Back should either collapse the overlay or leave playback cleanly.',
    fallbackDetail: 'The final return path should stay explicit while recovery and focus state are changing.',
    fallbackTone: 'watch',
  });

  const actions = [retryAction, quickSwitchAction, audioSubtitleAction, returnAction].filter((action): action is LivePlayerOverlayPlaybackActionRoute => Boolean(action));

  const primaryAction = recoveryRuntime?.actionKind === 'retry'
    ? retryAction
    : recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner'
      ? quickSwitchAction
      : audioSubtitleAction?.available
        ? audioSubtitleAction
        : returnAction;
  const secondaryAction = primaryAction?.id === 'quick-switch'
    ? audioSubtitleAction?.available
      ? audioSubtitleAction
      : returnAction
    : primaryAction?.id === 'retry'
      ? quickSwitchAction?.available
        ? quickSwitchAction
        : returnAction
      : primaryAction?.id === 'audio-subtitle'
        ? returnAction
        : audioSubtitleAction?.available
          ? audioSubtitleAction
          : null;

  const actionSummary = primaryAction?.summary
    ?? recoveryRuntime?.nextMove.label
    ?? 'No routed overlay playback action is available yet.';
  const tone = getDominantTone([
    recoveryRuntime?.tone ?? 'ready',
    primaryAction?.tone ?? 'ready',
    programState === 'guide-stale' || programState === 'timeshift' ? 'watch' : 'ready',
    programState === 'recovery-led' || programState === 'unavailable' ? 'recover' : 'ready',
  ]);

  return {
    screenId: 'player',
    title: 'Overlay playback contract',
    eyebrow: 'Xtream-backed overlay metadata',
    summary: actionSummary,
    detail: recoveryRuntime?.overlayCopy
      ?? 'This runtime binds current/next program proof, live-edge posture, seek eligibility, and final overlay actions into one backend-owned playback surface.',
    tone,
    programState,
    guideFreshnessLabel,
    currentProgramLabel,
    nextProgramLabel,
    liveEdgeLabel,
    seekEligibilityLabel,
    programWindowLabel,
    metadataSummary,
    actionSummary,
    primaryAction: primaryAction ?? null,
    secondaryAction: secondaryAction ?? null,
    actions,
  };
};
