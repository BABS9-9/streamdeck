import {
  LivePlayerControlRuntimeContract,
  LivePlayerOverlayInteractionRuntimeContract,
  LivePlayerOverlayTimelineMarker,
  LivePlayerOverlayTimelineRuntimeContract,
  LivePlayerRecoveryActionRuntimeContract,
  PlayerControlTelemetry,
  WatchHistoryItem,
} from './types';

const toneRank = {
  ready: 0,
  watch: 1,
  recover: 2,
} as const;

const getDominantTone = (tones: LivePlayerOverlayTimelineRuntimeContract['tone'][]) => tones.reduce<LivePlayerOverlayTimelineRuntimeContract['tone']>((current, tone) => (
  toneRank[tone] > toneRank[current] ? tone : current
), 'ready');

const clampPercent = (value: number | null) => {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Number(value)));
};

const formatSeconds = (seconds?: number | null) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainder = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const getTimelineState = ({
  controlRuntime,
  recoveryRuntime,
}: {
  controlRuntime: LivePlayerControlRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayTimelineRuntimeContract['timelineState'] => {
  if (recoveryRuntime?.actionKind === 'wait-for-line' || recoveryRuntime?.actionKind === 'fail-closed') {
    return 'recovery-pinned';
  }
  if (controlRuntime.seekWindowState === 'resume-window') return 'resume-window';
  if (controlRuntime.seekWindowState === 'timeshift-active') return 'timeshift-active';
  if (controlRuntime.seekWindowState === 'timeshift-ready') return 'timeshift-ready';
  if (controlRuntime.seekWindowState === 'live-edge') return 'live-edge';
  return 'unavailable';
};

const getResumeProgressPercent = ({
  historyItem,
  controlTelemetry,
}: {
  historyItem: WatchHistoryItem | null;
  controlTelemetry: PlayerControlTelemetry;
}) => {
  if (historyItem?.resumeCheckpoint?.progressPercent !== undefined) {
    return clampPercent(historyItem.resumeCheckpoint.progressPercent);
  }

  if (typeof historyItem?.progress === 'number' && Number.isFinite(historyItem.progress)) {
    return clampPercent(historyItem.progress * 100);
  }

  if (
    typeof historyItem?.positionSeconds === 'number'
    && Number.isFinite(historyItem.positionSeconds)
    && typeof controlTelemetry.durationSeconds === 'number'
    && Number.isFinite(controlTelemetry.durationSeconds)
    && controlTelemetry.durationSeconds > 0
  ) {
    return clampPercent((historyItem.positionSeconds / controlTelemetry.durationSeconds) * 100);
  }

  return null;
};

const getTimelineMarkers = ({
  timelineState,
  coveragePercent,
  historyItem,
  controlTelemetry,
}: {
  timelineState: LivePlayerOverlayTimelineRuntimeContract['timelineState'];
  coveragePercent: number | null;
  historyItem: WatchHistoryItem | null;
  controlTelemetry: PlayerControlTelemetry;
}): LivePlayerOverlayTimelineMarker[] => {
  const markers: LivePlayerOverlayTimelineMarker[] = [
    {
      id: 'window-start',
      label: timelineState.startsWith('timeshift') ? 'Window start' : 'Start',
      state: timelineState.startsWith('timeshift') ? 'rewind floor' : 'playback start',
      summary: timelineState.startsWith('timeshift')
        ? 'This is the oldest safe point the provider is still exposing for live rewind.'
        : 'This is the earliest durable point in the current playback session.',
      detail: timelineState.startsWith('timeshift')
        ? 'The full-screen overlay should not imply deeper rewind than the provider currently exposes.'
        : 'Resume math should anchor to the real playback start instead of freehand progress copy.',
      positionPercent: 0,
      tone: 'watch',
    },
  ];

  if (historyItem?.resumeCheckpoint) {
    markers.push({
      id: 'resume-checkpoint',
      label: 'Checkpoint',
      state: `${historyItem.resumeCheckpoint.progressPercent}% saved`,
      summary: `A runtime-owned checkpoint was captured at ${formatSeconds(historyItem.resumeCheckpoint.positionSeconds)}.`,
      detail: 'Resume flows can point here directly instead of rebuilding checkpoint copy from generic history state.',
      positionPercent: clampPercent(historyItem.resumeCheckpoint.progressPercent),
      tone: 'ready',
    });
  }

  const currentPositionLabel = timelineState === 'resume-window'
    ? formatSeconds(historyItem?.positionSeconds ?? historyItem?.resumeCheckpoint?.positionSeconds ?? 0)
    : timelineState === 'live-edge'
      ? 'Live edge'
      : timelineState === 'timeshift-active'
        ? 'Offset active'
        : timelineState === 'timeshift-ready'
          ? 'Live-ready'
          : 'Unavailable';

  markers.push({
    id: 'current-position',
    label: 'Current position',
    state: currentPositionLabel,
    summary: timelineState === 'resume-window'
      ? 'The current playback position is safe to show directly on the overlay progress lane.'
      : timelineState === 'timeshift-active'
        ? 'Playback is off live edge, but the provider has not published an exact offset marker.'
        : timelineState === 'timeshift-ready'
          ? 'Live rewind is available, but playback is still sitting at the live edge.'
          : timelineState === 'live-edge'
            ? 'Playback is currently attached to live edge.'
            : 'No stable playback position is available yet.',
    detail: timelineState === 'resume-window'
      ? 'The overlay can drive a real seek bar from this backend-owned position instead of a plain status string.'
      : timelineState === 'timeshift-active'
        ? 'Keep the lane explicit about timeshift posture until player telemetry exposes a precise offset.'
        : timelineState === 'timeshift-ready'
          ? 'A rewind lane is honest here, but it should stay anchored to live edge until the viewer actually leaves it.'
          : timelineState === 'live-edge'
            ? 'The lane should emphasize live position instead of pretending VOD-style progress.'
            : 'Do not render fake progress when the runtime does not own one.',
    positionPercent: coveragePercent,
    tone: timelineState === 'unavailable' ? 'recover' : 'ready',
  });

  if (timelineState === 'live-edge' || timelineState.startsWith('timeshift')) {
    markers.push({
      id: 'live-edge',
      label: 'Live edge',
      state: controlTelemetry.atLiveEdge === false ? 'ahead of current' : 'current owner',
      summary: 'This is the freshest live point the provider is currently willing to expose.',
      detail: 'Remote-first copy should name live edge explicitly whenever timeshift or catch-up posture is involved.',
      positionPercent: 100,
      tone: controlTelemetry.atLiveEdge === false ? 'watch' : 'ready',
    });
  }

  if (timelineState === 'resume-window') {
    markers.push({
      id: 'window-end',
      label: 'End',
      state: controlTelemetry.durationSeconds ? formatSeconds(controlTelemetry.durationSeconds) : 'title end',
      summary: 'This marks the far end of the current title.',
      detail: 'The overlay can measure remaining time from a real duration instead of vague completion copy.',
      positionPercent: 100,
      tone: 'watch',
    });
  }

  return markers;
};

export const buildLivePlayerOverlayTimelineRuntime = ({
  historyItem,
  controlTelemetry,
  controlRuntime,
  interactionRuntime,
  recoveryRuntime = null,
}: {
  historyItem: WatchHistoryItem | null;
  controlTelemetry: PlayerControlTelemetry;
  controlRuntime: LivePlayerControlRuntimeContract;
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
  recoveryRuntime?: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayTimelineRuntimeContract => {
  const timelineState = getTimelineState({ controlRuntime, recoveryRuntime });
  const resumeProgressPercent = getResumeProgressPercent({ historyItem, controlTelemetry });
  const coveragePercent = timelineState === 'live-edge'
    ? 100
    : timelineState === 'resume-window'
      ? resumeProgressPercent
      : timelineState === 'timeshift-ready'
        ? 100
        : timelineState === 'timeshift-active'
          ? null
          : null;
  const elapsedSeconds = timelineState === 'resume-window'
    ? historyItem?.positionSeconds ?? historyItem?.resumeCheckpoint?.positionSeconds ?? null
    : timelineState === 'timeshift-active'
      ? historyItem?.positionSeconds ?? null
      : null;
  const durationSeconds = controlTelemetry.durationSeconds ?? historyItem?.durationSeconds ?? historyItem?.resumeCheckpoint?.durationSeconds ?? null;
  const remainingSeconds = timelineState === 'resume-window' && durationSeconds && elapsedSeconds !== null
    ? Math.max(0, durationSeconds - elapsedSeconds)
    : null;
  const markers = getTimelineMarkers({
    timelineState,
    coveragePercent,
    historyItem,
    controlTelemetry,
  });
  const tone = getDominantTone([
    controlRuntime.tone,
    recoveryRuntime?.tone ?? 'ready',
    timelineState === 'unavailable' ? 'recover' : 'ready',
    timelineState === 'timeshift-active' ? 'watch' : 'ready',
  ]);

  const windowLabel = timelineState === 'resume-window'
    ? durationSeconds
      ? `Duration ${formatSeconds(durationSeconds)}`
      : 'Duration still settling'
    : controlTelemetry.seekableWindowSeconds
      ? `Seek window ${formatSeconds(controlTelemetry.seekableWindowSeconds)}`
      : 'No seek window exposed';
  const liveEdgeLabel = timelineState === 'live-edge'
    ? 'Attached to live edge'
    : timelineState === 'timeshift-ready'
      ? 'Live edge remains the current anchor'
      : timelineState === 'timeshift-active'
        ? 'Live edge stays ahead of the current offset'
        : 'Not a live-edge lane';
  const positionLabel = timelineState === 'resume-window'
    ? elapsedSeconds !== null
      ? formatSeconds(elapsedSeconds)
      : '0:00'
    : timelineState === 'timeshift-active'
      ? 'Offset active'
      : timelineState === 'timeshift-ready'
        ? 'At live edge'
        : timelineState === 'live-edge'
          ? 'Live edge'
          : 'Unavailable';
  const focusLabel = interactionRuntime.visibilityState === 'transport'
    ? 'Transport currently owns the overlay lane.'
    : interactionRuntime.visibilityState === 'recovery'
      ? 'Recovery posture keeps the timeline visible until the next owner is honest.'
      : interactionRuntime.visibilityState === 'tracks'
        ? 'Track selection is open, so the timeline should stay secondary.'
        : 'The hero lane can surface the timeline without losing playback ownership.';

  return {
    screenId: 'player',
    title: 'Overlay timeline runtime',
    eyebrow: 'Progress + seek lane',
    summary: timelineState === 'resume-window'
      ? 'The overlay now has a backend-owned resume lane with concrete elapsed, remaining, and checkpoint markers.'
      : timelineState === 'timeshift-active'
        ? 'Timeshift posture is real, but the runtime is honest that current live offset is still coarse.'
        : timelineState === 'timeshift-ready'
          ? 'The overlay can advertise live rewind readiness without pretending the viewer already left live edge.'
          : timelineState === 'live-edge'
            ? 'Playback is pinned to live edge, so the timeline should read as a live rail rather than a VOD seek bar.'
            : 'No safe progress or seek lane is available yet.',
    detail: timelineState === 'resume-window'
      ? 'This contract keeps elapsed time, remaining time, checkpoints, and end-cap math backend-owned for Mara’s full-screen seek UI.'
      : timelineState.startsWith('timeshift')
        ? 'This contract keeps live window posture explicit so the full-screen overlay can show rewind truth without inventing exact offset math the player does not own yet.'
        : timelineState === 'live-edge'
          ? 'This contract tells the overlay to privilege live-edge copy over generic percentage progress.'
          : 'The overlay should stay conservative until progress telemetry becomes durable enough to publish.',
    tone,
    timelineState,
    coveragePercent,
    elapsedLabel: timelineState === 'resume-window'
      ? elapsedSeconds !== null
        ? formatSeconds(elapsedSeconds)
        : '0:00'
      : 'Live',
    remainingLabel: timelineState === 'resume-window'
      ? remainingSeconds !== null
        ? formatSeconds(remainingSeconds)
        : 'Unknown'
      : controlTelemetry.seekableWindowSeconds
        ? formatSeconds(controlTelemetry.seekableWindowSeconds)
        : 'Unavailable',
    windowLabel,
    liveEdgeLabel,
    positionLabel,
    focusLabel,
    markers,
    nextMove: {
      label: timelineState === 'resume-window'
        ? 'Keep the seek lane literal'
        : timelineState.startsWith('timeshift')
          ? 'Keep live-window wording explicit'
          : timelineState === 'live-edge'
            ? 'Anchor the lane to live edge'
            : 'Avoid fake progress',
      detail: timelineState === 'resume-window'
        ? 'The full-screen overlay can render a real progress bar, checkpoint pill, and remaining-time caption from this contract directly.'
        : timelineState.startsWith('timeshift')
          ? 'The full-screen overlay should show window size and live-edge direction, but not a fake offset percentage until player telemetry exposes it.'
          : timelineState === 'live-edge'
            ? 'Use live-edge status and window bounds instead of a VOD-style completion bar.'
            : 'Fallback copy should stay textual until the runtime owns a trustworthy timeline.',
      tone: timelineState === 'unavailable' ? 'recover' : timelineState === 'timeshift-active' ? 'watch' : 'ready',
    },
  };
};
