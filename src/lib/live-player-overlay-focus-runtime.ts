import {
  LivePlayerContinuityRuntimeContract,
  LivePlayerControlRuntimeContract,
  LivePlayerControlTone,
  LivePlayerFocusReturnRuntimeContract,
  LivePlayerOverlayFocusGroup,
  LivePlayerOverlayFocusRailState,
  LivePlayerOverlayFocusRuntimeContract,
  LivePlayerOverlayFocusStep,
  LivePlayerRecoveryActionRuntimeContract,
  LivePlayerRemoteRuntimeContract,
} from './types';

const toneRank: Record<LivePlayerControlTone, number> = {
  ready: 0,
  watch: 1,
  recover: 2,
};

const getDominantTone = (tones: LivePlayerControlTone[]) =>
  tones.reduce<LivePlayerControlTone>((current, tone) => (
    toneRank[tone] > toneRank[current] ? tone : current
  ), 'ready');

const getRailState = ({
  controlRuntime,
  remoteRuntime,
  recoveryRuntime,
}: {
  controlRuntime: LivePlayerControlRuntimeContract;
  remoteRuntime: LivePlayerRemoteRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayFocusRailState => {
  if (recoveryRuntime?.actionKind === 'fail-closed' || recoveryRuntime?.actionKind === 'wait-for-line') {
    return 'recovery-primary';
  }
  if (remoteRuntime.primaryIntentState === 'track-picker-ready' || controlRuntime.subtitleAudioOptionState === 'selection-active') {
    return 'track-picker';
  }
  if (controlRuntime.seekWindowState === 'timeshift-active' || controlRuntime.seekWindowState === 'timeshift-ready') {
    return 'timeshift-transport';
  }
  if (controlRuntime.focusReturnState === 'recovery-rail' || controlRuntime.focusReturnState === 'provider-switch') {
    return 'return-ladder';
  }
  return 'hero-primary';
};

const getRailTone = ({
  railState,
  recoveryRuntime,
  continuityRuntime,
}: {
  railState: LivePlayerOverlayFocusRailState;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
  continuityRuntime: LivePlayerContinuityRuntimeContract;
}): LivePlayerControlTone => {
  if (railState === 'recovery-primary') return recoveryRuntime?.tone ?? 'recover';
  if (railState === 'return-ladder') return continuityRuntime.tone === 'recover' ? 'recover' : 'watch';
  if (railState === 'track-picker' || railState === 'timeshift-transport') return 'watch';
  return 'ready';
};

const buildHeroSteps = ({
  controlRuntime,
  remoteRuntime,
}: {
  controlRuntime: LivePlayerControlRuntimeContract;
  remoteRuntime: LivePlayerRemoteRuntimeContract;
}): LivePlayerOverlayFocusStep[] => [
  {
    id: 'hero-ok',
    label: 'Hero OK',
    buttons: ['OK'],
    state: remoteRuntime.primaryIntentState,
    summary: 'Primary confirmation should stay attached to the visible hero layer first.',
    detail: remoteRuntime.actions.find((action) => action.id === 'ok')?.detail
      ?? 'The overlay hero owns the next confident OK press before focus drifts deeper.',
    tone: remoteRuntime.actions.find((action) => action.id === 'ok')?.tone ?? remoteRuntime.tone,
  },
  {
    id: 'hero-up-down',
    label: 'Hero reveal',
    buttons: ['Up', 'Down'],
    state: controlRuntime.infoBarVisibilityState,
    summary: 'Vertical travel should open metadata and controls without dropping playback ownership.',
    detail: remoteRuntime.actions.find((action) => action.id === 'up-down')?.detail
      ?? 'Guide, provider, and playback explanation stay in the hero layer first.',
    tone: controlRuntime.infoBarVisibilityState === 'recovery-forced' ? 'recover' : 'watch',
  },
];

const buildTransportSteps = ({
  controlRuntime,
  remoteRuntime,
}: {
  controlRuntime: LivePlayerControlRuntimeContract;
  remoteRuntime: LivePlayerRemoteRuntimeContract;
}): LivePlayerOverlayFocusStep[] => [
  {
    id: 'transport-left-right',
    label: 'Seek travel',
    buttons: ['Left', 'Right'],
    state: controlRuntime.seekWindowState,
    summary: controlRuntime.seekWindowState === 'timeshift-active'
      ? 'Horizontal travel must preserve the current rewind offset.'
      : controlRuntime.seekWindowState === 'timeshift-ready'
        ? 'Horizontal travel can open a rewind lane without pretending VOD behavior.'
        : 'Horizontal travel should stay conservative while live edge holds.',
    detail: remoteRuntime.actions.find((action) => action.id === 'left-right')?.detail
      ?? 'Seek truth should come from runtime telemetry instead of browser assumptions.',
    tone: remoteRuntime.actions.find((action) => action.id === 'left-right')?.tone ?? controlRuntime.tone,
  },
  {
    id: 'transport-ok',
    label: 'Transport settle',
    buttons: ['OK'],
    state: remoteRuntime.primaryIntentState,
    summary: 'OK must settle the current offset explicitly before the overlay collapses.',
    detail: remoteRuntime.actions.find((action) => action.id === 'ok')?.summary
      ?? 'Transport focus should make the next confirm action explicit.',
    tone: controlRuntime.seekWindowState === 'timeshift-active' ? 'watch' : 'ready',
  },
];

const buildTrackSteps = ({
  controlRuntime,
  remoteRuntime,
}: {
  controlRuntime: LivePlayerControlRuntimeContract;
  remoteRuntime: LivePlayerRemoteRuntimeContract;
}): LivePlayerOverlayFocusStep[] => [
  {
    id: 'tracks-open',
    label: 'Track picker',
    buttons: ['Up', 'OK'],
    state: controlRuntime.subtitleAudioOptionState,
    summary: controlRuntime.subtitleAudioOptionState === 'none'
      ? 'Track buttons must stay visibly unavailable.'
      : 'Track buttons can open real audio and subtitle choices from the overlay rail.',
    detail: remoteRuntime.actions.find((action) => action.id === 'audio-subtitle')?.detail
      ?? 'Audio and subtitle availability belongs in the same remote-first overlay contract.',
    tone: remoteRuntime.actions.find((action) => action.id === 'audio-subtitle')?.tone ?? controlRuntime.tone,
  },
  {
    id: 'tracks-confirm',
    label: 'Selection confirm',
    buttons: ['OK', 'Back'],
    state: remoteRuntime.primaryIntentState,
    summary: controlRuntime.subtitleAudioOptionState === 'selection-active'
      ? 'The current track selection already needs explicit confirmation.'
      : 'Selection focus should still reserve a clear confirm and escape path.',
    detail: remoteRuntime.actions.find((action) => action.id === 'ok')?.detail
      ?? 'Track selection should never collapse back into generic playback copy.',
    tone: controlRuntime.subtitleAudioOptionState === 'none' ? 'watch' : 'ready',
  },
];

const buildRecoverySteps = ({
  recoveryRuntime,
  continuityRuntime,
}: {
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
  continuityRuntime: LivePlayerContinuityRuntimeContract;
}): LivePlayerOverlayFocusStep[] => [
  {
    id: 'recovery-primary',
    label: 'Recovery primary',
    buttons: ['OK'],
    state: recoveryRuntime?.actionKind ?? 'fail-closed',
    summary: recoveryRuntime?.nextMove.label ?? 'No confident recovery move is available.',
    detail: recoveryRuntime?.nextMove.detail
      ?? 'The overlay should keep recovery copy primary until playback earns a cleaner owner again.',
    tone: recoveryRuntime?.tone ?? 'recover',
  },
  {
    id: 'recovery-secondary',
    label: 'Recovery secondary',
    buttons: recoveryRuntime?.nextMove.secondaryActionLabel ? ['Down', 'OK'] : ['Back'],
    state: continuityRuntime.continuityState,
    summary: recoveryRuntime?.nextMove.secondaryActionLabel
      ? `Secondary recovery action stays available as "${recoveryRuntime.nextMove.secondaryActionLabel}".`
      : 'Back should preserve the recovery explanation when no secondary action exists.',
    detail: recoveryRuntime?.overlayCopy
      ?? continuityRuntime.nextMove.detail,
    tone: recoveryRuntime?.tone ?? continuityRuntime.tone,
  },
];

const buildReturnSteps = ({
  focusReturnRuntime,
  continuityRuntime,
}: {
  focusReturnRuntime: LivePlayerFocusReturnRuntimeContract;
  continuityRuntime: LivePlayerContinuityRuntimeContract;
}): LivePlayerOverlayFocusStep[] => [
  {
    id: 'return-back',
    label: 'Back ladder',
    buttons: ['Back'],
    state: focusReturnRuntime.focusReturnState,
    summary: 'Back should return through one backend-owned ladder instead of closing the player blindly.',
    detail: focusReturnRuntime.backTarget,
    tone: focusReturnRuntime.nextMove.tone,
  },
  {
    id: 'return-context',
    label: 'Context handoff',
    buttons: ['Back', 'Up'],
    state: continuityRuntime.continuityState,
    summary: 'Return focus should preserve the same playback story the overlay already surfaced.',
    detail: focusReturnRuntime.recoveryTarget,
    tone: continuityRuntime.tone,
  },
];

const buildGroup = ({
  id,
  label,
  railState,
  steps,
}: {
  id: LivePlayerOverlayFocusGroup['id'];
  label: string;
  railState: LivePlayerOverlayFocusRailState;
  steps: LivePlayerOverlayFocusStep[];
}): LivePlayerOverlayFocusGroup => {
  const tone = getDominantTone(steps.map((step) => step.tone));

  return {
    id,
    label,
    railState,
    summary: steps[0]?.summary ?? `${label} stays runtime-owned.`,
    detail: steps[0]?.detail ?? 'Overlay focus should stay explicit on this rail.',
    tone,
    steps,
  };
};

export const buildLivePlayerOverlayFocusRuntime = ({
  controlRuntime,
  continuityRuntime,
  remoteRuntime,
  focusReturnRuntime,
  recoveryRuntime = null,
}: {
  controlRuntime: LivePlayerControlRuntimeContract;
  continuityRuntime: LivePlayerContinuityRuntimeContract;
  remoteRuntime: LivePlayerRemoteRuntimeContract;
  focusReturnRuntime: LivePlayerFocusReturnRuntimeContract;
  recoveryRuntime?: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayFocusRuntimeContract => {
  const railState = getRailState({
    controlRuntime,
    remoteRuntime,
    recoveryRuntime,
  });
  const heroSteps = buildHeroSteps({ controlRuntime, remoteRuntime });
  const transportSteps = buildTransportSteps({ controlRuntime, remoteRuntime });
  const trackSteps = buildTrackSteps({ controlRuntime, remoteRuntime });
  const recoverySteps = buildRecoverySteps({ recoveryRuntime, continuityRuntime });
  const returnSteps = buildReturnSteps({ focusReturnRuntime, continuityRuntime });

  const focusGroups = [
    buildGroup({
      id: 'hero',
      label: 'Hero lane',
      railState: 'hero-primary',
      steps: heroSteps,
    }),
    buildGroup({
      id: 'transport',
      label: 'Transport lane',
      railState: 'timeshift-transport',
      steps: transportSteps,
    }),
    buildGroup({
      id: 'tracks',
      label: 'Track lane',
      railState: 'track-picker',
      steps: trackSteps,
    }),
    buildGroup({
      id: 'recovery',
      label: 'Recovery lane',
      railState: 'recovery-primary',
      steps: recoverySteps,
    }),
    buildGroup({
      id: 'return',
      label: 'Return lane',
      railState: 'return-ladder',
      steps: returnSteps,
    }),
  ];

  const tone = getDominantTone([
    getRailTone({
      railState,
      recoveryRuntime,
      continuityRuntime,
    }),
    ...focusGroups.map((group) => group.tone),
  ]);

  const activeGroup = focusGroups.find((group) => group.railState === railState) ?? focusGroups[0];
  const supportGroup = railState === 'recovery-primary'
    ? focusGroups.find((group) => group.id === 'return') ?? focusGroups[4]
    : focusGroups.find((group) => group.id === 'recovery') ?? focusGroups[3];

  return {
    screenId: 'player',
    title: 'Overlay focus ladder contract',
    eyebrow: 'Remote-first overlay focus',
    summary: railState === 'recovery-primary'
      ? 'Recovery now owns first focus on the overlay until playback earns a calmer owner again.'
      : railState === 'track-picker'
        ? 'Track selection has enough runtime proof to take primary overlay focus cleanly.'
        : railState === 'timeshift-transport'
          ? 'Timeshift travel now owns the horizontal rail instead of generic browser seeking.'
          : railState === 'return-ladder'
            ? 'Back and exit behavior now stay attached to one explicit return ladder.'
            : 'The overlay can keep hero controls primary because ownership and playback proof still agree.',
    detail: 'This runtime turns remote intent, seek posture, track availability, recovery action truth, and focus return doctrine into one explicit TV-style focus ladder for the player overlay.',
    tone,
    railState,
    primaryFocusLabel: activeGroup?.label ?? 'Hero lane',
    secondaryFocusLabel: activeGroup?.steps[1]?.label ?? supportGroup?.label ?? 'Recovery lane',
    supportFocusLabel: supportGroup?.label ?? 'Return lane',
    heroButtons: heroSteps.flatMap((step) => step.buttons),
    nextMove: {
      label: activeGroup?.summary ?? 'Keep focus on the current overlay rail.',
      detail: activeGroup?.detail ?? 'The overlay focus ladder should stay explicit while playback state changes.',
      buttons: Array.from(new Set(activeGroup?.steps.flatMap((step) => step.buttons) ?? ['OK'])),
      tone: activeGroup?.tone ?? tone,
    },
    focusGroups,
  };
};
