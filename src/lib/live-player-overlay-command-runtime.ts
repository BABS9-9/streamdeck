import {
  LivePlayerContinuityRuntimeContract,
  LivePlayerControlRuntimeContract,
  LivePlayerControlTone,
  LivePlayerFocusReturnRuntimeContract,
  LivePlayerOverlayCommandEntry,
  LivePlayerOverlayCommandRuntimeContract,
  LivePlayerOverlayCommandZone,
  LivePlayerOverlayFocusRuntimeContract,
  LivePlayerRecoveryActionRuntimeContract,
  LivePlayerRemoteRuntimeContract,
} from './types';

const toneRank: Record<LivePlayerControlTone, number> = {
  ready: 0,
  watch: 1,
  recover: 2,
};

const getDominantTone = (tones: LivePlayerControlTone[]) => tones.reduce<LivePlayerControlTone>((current, tone) => (
  toneRank[tone] > toneRank[current] ? tone : current
), 'ready');

const getActiveZone = ({
  focusRuntime,
  recoveryRuntime,
}: {
  focusRuntime: LivePlayerOverlayFocusRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayCommandZone => {
  if (recoveryRuntime?.actionKind === 'fail-closed' || recoveryRuntime?.actionKind === 'wait-for-line') return 'recovery';
  if (focusRuntime.railState === 'timeshift-transport') return 'transport';
  if (focusRuntime.railState === 'track-picker') return 'tracks';
  if (focusRuntime.railState === 'return-ladder') return 'return';
  return 'hero';
};

const getFallbackZone = ({
  controlRuntime,
  continuityRuntime,
}: {
  controlRuntime: LivePlayerControlRuntimeContract;
  continuityRuntime: LivePlayerContinuityRuntimeContract;
}): LivePlayerOverlayCommandZone => {
  if (controlRuntime.focusReturnState === 'provider-switch' || controlRuntime.focusReturnState === 'recovery-rail') {
    return 'return';
  }
  if (continuityRuntime.continuityState === 'broken') return 'recovery';
  if (controlRuntime.subtitleAudioOptionState === 'selection-active') return 'tracks';
  if (controlRuntime.seekWindowState === 'timeshift-active' || controlRuntime.seekWindowState === 'timeshift-ready') {
    return 'transport';
  }
  return 'hero';
};

const getEscalationState = ({
  activeZone,
  recoveryRuntime,
  continuityRuntime,
}: {
  activeZone: LivePlayerOverlayCommandZone;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
  continuityRuntime: LivePlayerContinuityRuntimeContract;
}): LivePlayerOverlayCommandRuntimeContract['escalationState'] => {
  if (activeZone === 'recovery' || recoveryRuntime?.tone === 'recover') return 'recover';
  if (activeZone === 'transport' || activeZone === 'tracks' || activeZone === 'return' || continuityRuntime.tone === 'watch') {
    return 'watch';
  }
  return 'calm';
};

const getZoneLabel = (zone: LivePlayerOverlayCommandZone) => {
  switch (zone) {
    case 'hero':
      return 'Hero layer';
    case 'transport':
      return 'Transport lane';
    case 'tracks':
      return 'Track picker';
    case 'recovery':
      return 'Recovery rail';
    case 'return':
      return 'Return ladder';
    default:
      return 'Overlay layer';
  }
};

const getEscalationLabel = ({
  activeZone,
  fallbackZone,
}: {
  activeZone: LivePlayerOverlayCommandZone;
  fallbackZone: LivePlayerOverlayCommandZone;
}) => activeZone === fallbackZone
  ? `${getZoneLabel(activeZone)} keeps command ownership.`
  : `${getZoneLabel(activeZone)} owns first press, then ${getZoneLabel(fallbackZone)} keeps the safe escape path.`;

const getCommandTone = ({
  actionTone,
  zone,
  recoveryRuntime,
}: {
  actionTone: LivePlayerControlTone;
  zone: LivePlayerOverlayCommandZone;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}) => {
  if (zone === 'recovery') return recoveryRuntime?.tone ?? 'recover';
  return actionTone;
};

const buildOkCommand = ({
  remoteRuntime,
  focusRuntime,
  recoveryRuntime,
  fallbackZone,
}: {
  remoteRuntime: LivePlayerRemoteRuntimeContract;
  focusRuntime: LivePlayerOverlayFocusRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
  fallbackZone: LivePlayerOverlayCommandZone;
}): LivePlayerOverlayCommandEntry => {
  const action = remoteRuntime.actions.find((entry) => entry.id === 'ok');
  const activeZone: LivePlayerOverlayCommandZone = recoveryRuntime?.actionKind === 'fail-closed'
    || recoveryRuntime?.actionKind === 'wait-for-line'
    ? 'recovery'
    : focusRuntime.railState === 'timeshift-transport'
      ? 'transport'
      : focusRuntime.railState === 'track-picker'
        ? 'tracks'
        : 'hero';

  return {
    id: 'ok',
    label: 'OK confirmation',
    buttons: action?.buttons ?? ['OK'],
    state: action?.state ?? remoteRuntime.primaryIntentState,
    activeZone,
    fallbackZone,
    escalationLabel: getEscalationLabel({ activeZone, fallbackZone }),
    summary: action?.summary ?? 'OK should stay backend-owned instead of changing meaning per panel.',
    detail: recoveryRuntime?.actionKind === 'reclaim-owner'
      ? recoveryRuntime.overlayCopy
      : recoveryRuntime?.actionKind === 'quick-switch'
        ? recoveryRuntime.nextMove.detail
        : action?.detail ?? remoteRuntime.nextMove.detail,
    tone: getCommandTone({
      actionTone: action?.tone ?? remoteRuntime.tone,
      zone: activeZone,
      recoveryRuntime,
    }),
  };
};

const buildBackCommand = ({
  remoteRuntime,
  focusReturnRuntime,
  continuityRuntime,
  recoveryRuntime,
}: {
  remoteRuntime: LivePlayerRemoteRuntimeContract;
  focusReturnRuntime: LivePlayerFocusReturnRuntimeContract;
  continuityRuntime: LivePlayerContinuityRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayCommandEntry => {
  const action = remoteRuntime.actions.find((entry) => entry.id === 'back');
  const activeZone: LivePlayerOverlayCommandZone = 'return';
  const fallbackZone: LivePlayerOverlayCommandZone = recoveryRuntime?.actionKind === 'fail-closed' ? 'recovery' : 'hero';

  return {
    id: 'back',
    label: 'Back escape',
    buttons: action?.buttons ?? ['Back'],
    state: focusReturnRuntime.focusReturnState,
    activeZone,
    fallbackZone,
    escalationLabel: getEscalationLabel({ activeZone, fallbackZone }),
    summary: action?.summary ?? 'Back should return through one explicit ladder before the overlay closes.',
    detail: recoveryRuntime?.actionKind === 'fail-closed'
      ? recoveryRuntime.reasonPath
      : focusReturnRuntime.backTarget || continuityRuntime.nextMove.detail,
    tone: getCommandTone({
      actionTone: action?.tone ?? focusReturnRuntime.tone,
      zone: activeZone,
      recoveryRuntime,
    }),
  };
};

const buildLeftRightCommand = ({
  remoteRuntime,
  controlRuntime,
  fallbackZone,
}: {
  remoteRuntime: LivePlayerRemoteRuntimeContract;
  controlRuntime: LivePlayerControlRuntimeContract;
  fallbackZone: LivePlayerOverlayCommandZone;
}): LivePlayerOverlayCommandEntry => {
  const action = remoteRuntime.actions.find((entry) => entry.id === 'left-right');
  const activeZone: LivePlayerOverlayCommandZone = controlRuntime.seekWindowState === 'timeshift-active'
    || controlRuntime.seekWindowState === 'timeshift-ready'
    ? 'transport'
    : 'hero';

  return {
    id: 'left-right',
    label: 'Left / Right travel',
    buttons: action?.buttons ?? ['Left', 'Right'],
    state: action?.state ?? controlRuntime.seekWindowState,
    activeZone,
    fallbackZone,
    escalationLabel: getEscalationLabel({ activeZone, fallbackZone }),
    summary: action?.summary ?? 'Horizontal travel should advertise whether it really owns seek behavior.',
    detail: action?.detail ?? 'Left and Right stay backend-owned so live playback does not masquerade as VOD.',
    tone: action?.tone ?? controlRuntime.tone,
  };
};

const buildUpDownCommand = ({
  remoteRuntime,
  recoveryRuntime,
  fallbackZone,
}: {
  remoteRuntime: LivePlayerRemoteRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
  fallbackZone: LivePlayerOverlayCommandZone;
}): LivePlayerOverlayCommandEntry => {
  const action = remoteRuntime.actions.find((entry) => entry.id === 'up-down');
  const activeZone: LivePlayerOverlayCommandZone = recoveryRuntime?.actionKind === 'fail-closed'
    ? 'recovery'
    : 'hero';

  return {
    id: 'up-down',
    label: 'Up / Down reveal',
    buttons: action?.buttons ?? ['Up', 'Down'],
    state: action?.state ?? remoteRuntime.primaryIntentState,
    activeZone,
    fallbackZone,
    escalationLabel: getEscalationLabel({ activeZone, fallbackZone }),
    summary: action?.summary ?? 'Vertical travel should reveal truth without dropping owner context.',
    detail: recoveryRuntime?.actionKind === 'fail-closed'
      ? recoveryRuntime.overlayCopy
      : action?.detail ?? remoteRuntime.detail,
    tone: getCommandTone({
      actionTone: action?.tone ?? remoteRuntime.tone,
      zone: activeZone,
      recoveryRuntime,
    }),
  };
};

const buildTrackCommand = ({
  remoteRuntime,
  controlRuntime,
  fallbackZone,
}: {
  remoteRuntime: LivePlayerRemoteRuntimeContract;
  controlRuntime: LivePlayerControlRuntimeContract;
  fallbackZone: LivePlayerOverlayCommandZone;
}): LivePlayerOverlayCommandEntry => {
  const action = remoteRuntime.actions.find((entry) => entry.id === 'audio-subtitle');
  const activeZone: LivePlayerOverlayCommandZone = controlRuntime.subtitleAudioOptionState === 'none' ? 'hero' : 'tracks';

  return {
    id: 'audio-subtitle',
    label: 'Audio / subtitles',
    buttons: action?.buttons ?? ['Up', 'OK'],
    state: action?.state ?? controlRuntime.subtitleAudioOptionState,
    activeZone,
    fallbackZone,
    escalationLabel: getEscalationLabel({ activeZone, fallbackZone }),
    summary: action?.summary ?? 'Track controls should stay explicit about whether the picker really exists.',
    detail: action?.detail ?? 'Audio and subtitle options belong to one backend-owned overlay lane.',
    tone: action?.tone ?? controlRuntime.tone,
  };
};

export const buildLivePlayerOverlayCommandRuntime = ({
  controlRuntime,
  continuityRuntime,
  remoteRuntime,
  focusReturnRuntime,
  focusRuntime,
  recoveryRuntime = null,
}: {
  controlRuntime: LivePlayerControlRuntimeContract;
  continuityRuntime: LivePlayerContinuityRuntimeContract;
  remoteRuntime: LivePlayerRemoteRuntimeContract;
  focusReturnRuntime: LivePlayerFocusReturnRuntimeContract;
  focusRuntime: LivePlayerOverlayFocusRuntimeContract;
  recoveryRuntime?: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayCommandRuntimeContract => {
  const activeZone = getActiveZone({ focusRuntime, recoveryRuntime });
  const fallbackZone = getFallbackZone({ controlRuntime, continuityRuntime });
  const commands = [
    buildOkCommand({ remoteRuntime, focusRuntime, recoveryRuntime, fallbackZone }),
    buildBackCommand({ remoteRuntime, focusReturnRuntime, continuityRuntime, recoveryRuntime }),
    buildLeftRightCommand({ remoteRuntime, controlRuntime, fallbackZone }),
    buildUpDownCommand({ remoteRuntime, recoveryRuntime, fallbackZone }),
    buildTrackCommand({ remoteRuntime, controlRuntime, fallbackZone }),
  ];
  const tone = getDominantTone(commands.map((command) => command.tone));
  const escalationState = getEscalationState({ activeZone, recoveryRuntime, continuityRuntime });
  const primaryCommand = commands.find((command) => command.activeZone === activeZone) ?? commands[0];
  const recoveryCommand = commands.find((command) => command.activeZone === 'recovery')
    ?? commands.find((command) => command.fallbackZone === 'recovery')
    ?? commands[0];
  const exitCommand = commands.find((command) => command.id === 'back') ?? commands[0];

  return {
    screenId: 'player',
    title: 'Overlay command doctrine',
    eyebrow: 'Remote command ownership',
    summary: primaryCommand
      ? `${primaryCommand.label} now belongs to the ${getZoneLabel(primaryCommand.activeZone).toLowerCase()} before the overlay invents button meaning locally.`
      : 'Remote command ownership should stay backend-owned across the overlay shell.',
    detail: 'This contract resolves what each remote button means right now, which lane owns first press, and where command authority falls back when playback, recovery, or exit posture changes.',
    tone,
    activeZone,
    fallbackZone,
    escalationState,
    primaryCommandLabel: `${primaryCommand.label} -> ${getZoneLabel(primaryCommand.activeZone)}`,
    recoveryCommandLabel: `${recoveryCommand.label} -> ${getZoneLabel(recoveryCommand.activeZone)}`,
    exitCommandLabel: `${exitCommand.label} -> ${getZoneLabel(exitCommand.activeZone)}`,
    nextMove: {
      label: primaryCommand?.label ?? 'Primary command',
      detail: primaryCommand?.detail ?? remoteRuntime.nextMove.detail,
      buttons: primaryCommand?.buttons ?? ['OK'],
      tone: primaryCommand?.tone ?? tone,
    },
    commands,
  };
};
