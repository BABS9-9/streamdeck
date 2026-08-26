import {
  LivePlayerOverlayCommandRuntimeContract,
  LivePlayerControlRuntimeContract,
  LivePlayerContinuityRuntimeContract,
  LivePlayerOverlayFocusRuntimeContract,
  LivePlayerOverlayInfoBarState,
  LivePlayerOverlayInteractionRuntimeContract,
  LivePlayerOverlayLane,
  LivePlayerOverlayProgressState,
  LivePlayerOverlayQuickAction,
  LivePlayerOverlayPlaybackRuntimeContract,
  LivePlayerOverlayRuntimeContract,
  LivePlayerOverlaySessionRuntimeContract,
  LivePlayerOverlayStatusChip,
  LivePlayerOverlayTimelineRuntimeContract,
  LivePlayerRecoveryActionRuntimeContract,
  LivePlayerRemoteRuntimeContract,
} from './types';

const toneRank = {
  ready: 0,
  watch: 1,
  recover: 2,
} as const;

const getDominantTone = (tones: LivePlayerOverlayRuntimeContract['tone'][]) => tones.reduce<LivePlayerOverlayRuntimeContract['tone']>((current, tone) => (
  toneRank[tone] > toneRank[current] ? tone : current
), 'ready');

const getInfoBarState = ({
  controlRuntime,
  recoveryRuntime,
}: {
  controlRuntime: LivePlayerControlRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayInfoBarState => {
  if (recoveryRuntime?.actionKind === 'fail-closed') return 'fail-closed';
  if (recoveryRuntime?.actionKind === 'wait-for-line' || recoveryRuntime?.actionKind === 'reclaim-owner' || recoveryRuntime?.actionKind === 'quick-switch') {
    return 'recovery-led';
  }
  if (controlRuntime.playPauseState === 'buffering' || controlRuntime.playPauseState === 'loading') return 'buffer-watch';
  if (controlRuntime.infoBarVisibilityState === 'guide-led') return 'guide-led';
  return 'calm';
};

const getProgressState = ({
  controlRuntime,
}: {
  controlRuntime: LivePlayerControlRuntimeContract;
}): LivePlayerOverlayProgressState => {
  if (controlRuntime.seekWindowState === 'resume-window') return 'resume';
  if (controlRuntime.seekWindowState === 'timeshift-active' || controlRuntime.seekWindowState === 'timeshift-ready') return 'timeshift';
  if (controlRuntime.seekWindowState === 'live-edge') return 'live-edge';
  return 'unavailable';
};

const buildQuickActions = ({
  controlRuntime,
  remoteRuntime,
  recoveryRuntime,
}: {
  controlRuntime: LivePlayerControlRuntimeContract;
  remoteRuntime: LivePlayerRemoteRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayQuickAction[] => {
  const playbackCard = controlRuntime.cards.find((card) => card.id === 'play-pause');
  const audioCard = controlRuntime.cards.find((card) => card.id === 'subtitle-audio');
  const seekCard = controlRuntime.cards.find((card) => card.id === 'seek-window');
  const ownerSignal = remoteRuntime.signals.find((signal) => signal.label === 'Playback owner');

  return [
    {
      id: 'playback',
      label: 'Playback',
      state: controlRuntime.playPauseState,
      summary: playbackCard?.summary ?? 'Playback posture is runtime-owned for the overlay.',
      detail: playbackCard?.detail ?? controlRuntime.detail,
      tone: playbackCard?.tone ?? controlRuntime.tone,
    },
    {
      id: 'audio',
      label: 'Audio',
      state: controlRuntime.subtitleAudioOptionState,
      summary: audioCard?.summary ?? 'Audio options stay visible through the same overlay contract.',
      detail: audioCard?.detail ?? controlRuntime.detail,
      tone: audioCard?.tone ?? controlRuntime.tone,
    },
    {
      id: 'subtitles',
      label: 'Subtitles',
      state: controlRuntime.subtitleAudioOptionState,
      summary: controlRuntime.subtitleAudioOptionState === 'none'
        ? 'Subtitle controls should stay visibly unavailable.'
        : 'Subtitle quick actions are ready to ride the same overlay shell.',
      detail: audioCard?.detail ?? controlRuntime.detail,
      tone: controlRuntime.subtitleAudioOptionState === 'none' ? 'watch' : 'ready',
    },
    {
      id: 'seek',
      label: 'Seek',
      state: controlRuntime.seekWindowState,
      summary: seekCard?.summary ?? 'Seek truth belongs in the overlay instead of browser chrome.',
      detail: seekCard?.detail ?? controlRuntime.detail,
      tone: seekCard?.tone ?? controlRuntime.tone,
    },
    {
      id: 'recovery',
      label: 'Recovery',
      state: recoveryRuntime?.actionKind ?? 'fail-closed',
      summary: recoveryRuntime?.summary ?? 'Recovery posture is unavailable, so the overlay should stay conservative.',
      detail: recoveryRuntime?.overlayCopy ?? 'No recovery action contract is loaded for playback right now.',
      tone: recoveryRuntime?.tone ?? 'recover',
    },
    {
      id: 'owner',
      label: 'Owner',
      state: remoteRuntime.primaryIntentState,
      summary: ownerSignal?.value ?? 'Current owner',
      detail: ownerSignal?.detail ?? remoteRuntime.detail,
      tone: ownerSignal?.tone ?? remoteRuntime.tone,
    },
  ];
};

const buildLanes = ({
  nowLabel,
  nextLabel,
  controlRuntime,
  continuityRuntime,
  remoteRuntime,
  recoveryRuntime,
}: {
  nowLabel: string;
  nextLabel: string;
  controlRuntime: LivePlayerControlRuntimeContract;
  continuityRuntime: LivePlayerContinuityRuntimeContract;
  remoteRuntime: LivePlayerRemoteRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayLane[] => [
  {
    id: 'hero',
    label: 'Info bar',
    state: controlRuntime.infoBarVisibilityState,
    summary: nowLabel,
    detail: nextLabel,
    tone: controlRuntime.tone,
  },
  {
    id: 'recovery',
    label: 'Recovery lane',
    state: recoveryRuntime?.actionKind ?? 'fail-closed',
    summary: recoveryRuntime?.nextMove.label ?? 'No honest recovery move is available.',
    detail: recoveryRuntime?.nextMove.detail ?? 'Playback should stay fail-closed until the proof stack names a next owner.',
    tone: recoveryRuntime?.tone ?? 'recover',
  },
  {
    id: 'remote',
    label: 'Remote lane',
    state: remoteRuntime.primaryIntentState,
    summary: remoteRuntime.nextMove.label,
    detail: remoteRuntime.nextMove.detail,
    tone: remoteRuntime.nextMove.tone,
  },
  {
    id: 'continuity',
    label: 'Continuity lane',
    state: continuityRuntime.continuityState,
    summary: continuityRuntime.nextMove.label,
    detail: continuityRuntime.nextMove.detail,
    tone: continuityRuntime.nextMove.tone,
  },
];

const buildStatusChips = ({
  controlRuntime,
  continuityRuntime,
  remoteRuntime,
  recoveryRuntime,
}: {
  controlRuntime: LivePlayerControlRuntimeContract;
  continuityRuntime: LivePlayerContinuityRuntimeContract;
  remoteRuntime: LivePlayerRemoteRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayStatusChip[] => [
  {
    label: 'Playback',
    value: controlRuntime.playPauseState,
    tone: controlRuntime.tone,
  },
  {
    label: 'Continuity',
    value: continuityRuntime.continuityState,
    tone: continuityRuntime.tone,
  },
  {
    label: 'Remote',
    value: remoteRuntime.primaryIntentState,
    tone: remoteRuntime.tone,
  },
  {
    label: 'Recovery',
    value: recoveryRuntime?.actionKind ?? 'fail-closed',
    tone: recoveryRuntime?.tone ?? 'recover',
  },
];

export const buildLivePlayerOverlayShellRuntime = ({
  channelName,
  providerLabel,
  nowTitle = null,
  nextTitle = null,
  guideStateLabel = null,
  progressLabel,
  seekWindowLabel,
  audioLabel,
  subtitleLabel,
  focusRuntime,
  commandRuntime,
  interactionRuntime,
  sessionRuntime,
  playbackRuntime,
  timelineRuntime,
  controlRuntime,
  continuityRuntime,
  remoteRuntime,
  recoveryRuntime = null,
}: {
  channelName: string;
  providerLabel: string;
  nowTitle?: string | null;
  nextTitle?: string | null;
  guideStateLabel?: string | null;
  progressLabel: string;
  seekWindowLabel: string;
  audioLabel: string;
  subtitleLabel: string;
  focusRuntime: LivePlayerOverlayFocusRuntimeContract;
  commandRuntime: LivePlayerOverlayCommandRuntimeContract;
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
  sessionRuntime: LivePlayerOverlaySessionRuntimeContract;
  playbackRuntime: LivePlayerOverlayPlaybackRuntimeContract;
  timelineRuntime: LivePlayerOverlayTimelineRuntimeContract;
  controlRuntime: LivePlayerControlRuntimeContract;
  continuityRuntime: LivePlayerContinuityRuntimeContract;
  remoteRuntime: LivePlayerRemoteRuntimeContract;
  recoveryRuntime?: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayRuntimeContract => {
  const infoBarState = getInfoBarState({ controlRuntime, recoveryRuntime });
  const progressState = getProgressState({ controlRuntime });
  const tone = getDominantTone([
    controlRuntime.tone,
    continuityRuntime.tone,
    remoteRuntime.tone,
    recoveryRuntime?.tone ?? 'ready',
  ]);
  const nowLabel = nowTitle ? `Now: ${nowTitle}` : `Now: ${channelName}`;
  const nextLabel = nextTitle
    ? `Next: ${nextTitle}`
    : guideStateLabel
      ? `Guide posture: ${guideStateLabel}`
      : 'Next program data is unavailable, so the overlay should say so plainly.';
  const continuityLabel = continuityRuntime.recoveryOwnerLabel;
  const overlayCopy = recoveryRuntime?.overlayCopy
    ?? remoteRuntime.nextMove.detail
    ?? continuityRuntime.nextMove.detail;
  const quickActions = buildQuickActions({ controlRuntime, remoteRuntime, recoveryRuntime });
  const lanes = buildLanes({
    nowLabel,
    nextLabel,
    controlRuntime,
    continuityRuntime,
    remoteRuntime,
    recoveryRuntime,
  });
  const statusChips = buildStatusChips({
    controlRuntime,
    continuityRuntime,
    remoteRuntime,
    recoveryRuntime,
  });

  return {
    screenId: 'player',
    title: 'Player overlay shell contract',
    eyebrow: 'Overlay runtime preview',
    summary: recoveryRuntime?.summary
      ?? 'The overlay should read from one backend-owned shell instead of rebuilding player truth from separate cards.',
    detail: 'This contract packages now/next context, remote-first quick actions, continuity posture, and recovery action truth into one overlay payload for the active player path.',
    tone,
    activeProviderId: controlRuntime.activeProviderId,
    playbackOwnerProviderId: continuityRuntime.playbackOwnerProviderId,
    recommendedProviderId: recoveryRuntime?.targetProviderId ?? continuityRuntime.recommendedProviderId,
    infoBarState,
    progressState,
    nowPlayingLabel: channelName,
    providerLabel,
    nowLabel,
    nextLabel,
    continuityLabel,
    progressLabel,
    seekWindowLabel,
    audioLabel,
    subtitleLabel,
    overlayCopy,
    actionKind: recoveryRuntime?.actionKind ?? 'fail-closed',
    primaryActionLabel: recoveryRuntime?.nextMove.primaryActionLabel ?? null,
    secondaryActionLabel: recoveryRuntime?.nextMove.secondaryActionLabel ?? null,
    focusRuntime,
    commandRuntime,
    interactionRuntime,
    sessionRuntime,
    playbackRuntime,
    timelineRuntime,
    quickActions,
    lanes,
    statusChips,
    nextMove: {
      label: recoveryRuntime?.nextMove.label ?? remoteRuntime.nextMove.label,
      detail: recoveryRuntime?.nextMove.detail ?? overlayCopy,
      tone: recoveryRuntime?.nextMove.tone ?? remoteRuntime.nextMove.tone,
      targetProviderId: recoveryRuntime?.targetProviderId ?? remoteRuntime.nextMove.targetProviderId,
    },
  };
};
