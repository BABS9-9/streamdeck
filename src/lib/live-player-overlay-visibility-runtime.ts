import {
  LivePlayerControlRuntimeContract,
  LivePlayerControlTone,
  LivePlayerOverlayInteractionRuntimeContract,
  LivePlayerOverlayVisibilityPriorityEntry,
  LivePlayerOverlayVisibilityRule,
  LivePlayerOverlayVisibilityRuntimeContract,
  LivePlayerOverlayVisibilityState,
  LivePlayerRecoveryActionRuntimeContract,
} from './types';

const toneRank: Record<LivePlayerControlTone, number> = {
  ready: 0,
  watch: 1,
  recover: 2,
};

const getDominantTone = (tones: LivePlayerControlTone[]) => tones.reduce<LivePlayerControlTone>((current, tone) => (
  toneRank[tone] > toneRank[current] ? tone : current
), 'ready');

const getRuleRank = (id: LivePlayerOverlayVisibilityRule['id']) => {
  switch (id) {
    case 'recovery':
      return 1;
    case 'transport':
      return 2;
    case 'tracks':
      return 3;
    case 'manual':
      return 4;
    default:
      return 5;
  }
};

const buildRules = ({
  streamHealthStatus,
  controlRuntime,
  recoveryRuntime,
  rawVisibilityState,
  effectiveVisibilityState,
  targetVisibilityState,
}: {
  streamHealthStatus: 'idle' | 'healthy' | 'degraded' | 'loading' | 'buffering' | 'error';
  controlRuntime: LivePlayerControlRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
  rawVisibilityState: LivePlayerOverlayVisibilityState;
  effectiveVisibilityState: LivePlayerOverlayVisibilityState;
  targetVisibilityState: LivePlayerOverlayVisibilityState;
}): LivePlayerOverlayVisibilityRule[] => {
  const recoveryActive = streamHealthStatus === 'error'
    || recoveryRuntime?.actionKind === 'wait-for-line'
    || recoveryRuntime?.actionKind === 'fail-closed';
  const transportActive = !recoveryActive
    && rawVisibilityState === 'closed'
    && controlRuntime.seekWindowState === 'timeshift-active';
  const tracksActive = !recoveryActive
    && !transportActive
    && rawVisibilityState === 'closed'
    && controlRuntime.subtitleAudioOptionState === 'selection-active';
  const manualActive = rawVisibilityState !== 'closed' && !recoveryActive;

  return [
    {
      id: 'recovery',
      label: 'Recovery persistence',
      state: recoveryActive ? 'active' : recoveryRuntime ? 'standby' : 'released',
      summary: recoveryActive
        ? 'Recovery owns overlay persistence until playback truth stops being ambiguous.'
        : recoveryRuntime
          ? 'Recovery is ready, but it no longer has to pin the shell open.'
          : 'No recovery-owned overlay pin is currently needed.',
      detail: streamHealthStatus === 'error'
        ? 'Playback health is in error posture, so the overlay should move visibly into recovery even if the shell was previously closed.'
        : recoveryRuntime?.actionKind === 'wait-for-line'
          ? recoveryRuntime.reasonPath
          : recoveryRuntime?.actionKind === 'fail-closed'
            ? recoveryRuntime.overlayCopy
            : 'Recovery posture is not currently forcing the overlay open.',
      targetVisibilityState: 'recovery',
      tone: recoveryActive ? 'recover' : recoveryRuntime?.tone ?? 'ready',
    },
    {
      id: 'transport',
      label: 'Transport persistence',
      state: transportActive ? 'active' : controlRuntime.seekWindowState === 'timeshift-active' ? 'standby' : 'released',
      summary: transportActive
        ? 'Timeshift settlement should re-open the transport lane instead of hiding in local dock state.'
        : controlRuntime.seekWindowState === 'timeshift-active'
          ? 'Timeshift remains active, but another higher-priority lane currently owns persistence.'
          : 'Transport posture is not currently forcing the overlay open.',
      detail: controlRuntime.seekWindowState === 'timeshift-active'
        ? 'The user is offset from live edge, so the transport lane should remain the visible honesty surface whenever nothing higher priority owns the shell.'
        : 'The transport lane can stay released until seek or timeshift proof becomes active again.',
      targetVisibilityState: 'transport',
      tone: transportActive ? 'watch' : controlRuntime.tone,
    },
    {
      id: 'tracks',
      label: 'Track-picker persistence',
      state: tracksActive ? 'active' : controlRuntime.subtitleAudioOptionState === 'selection-active' ? 'standby' : 'released',
      summary: tracksActive
        ? 'Audio or subtitle selection should re-open the tracks lane until the picker resolves.'
        : controlRuntime.subtitleAudioOptionState === 'selection-active'
          ? 'Track selection is present, but another lane currently outranks it.'
          : 'Track selection is not currently forcing the overlay open.',
      detail: controlRuntime.subtitleAudioOptionState === 'selection-active'
        ? 'Track selection has runtime-owned confirm and escape semantics, so the dock should not bury it behind a closed shell.'
        : 'The tracks lane can stay released until audio or subtitle selection becomes active again.',
      targetVisibilityState: 'tracks',
      tone: tracksActive ? 'watch' : controlRuntime.tone,
    },
    {
      id: 'manual',
      label: 'Manual-open carry-forward',
      state: manualActive ? 'active' : rawVisibilityState !== 'closed' ? 'standby' : 'released',
      summary: manualActive
        ? 'A visible overlay lane should stay visible until a stronger runtime rule takes over.'
        : rawVisibilityState !== 'closed'
          ? 'The overlay was manually opened, but a stronger runtime posture has taken over.'
          : 'No manually opened overlay lane is currently being preserved.',
      detail: manualActive
        ? `The shell is already open on ${rawVisibilityState}, so visibility can carry forward without another forced transition.`
        : effectiveVisibilityState === targetVisibilityState
          ? 'The current runtime visibility already matches the backend-owned target lane.'
          : 'Manual-open carry-forward is idle because the overlay is currently closed.',
      targetVisibilityState: rawVisibilityState,
      tone: manualActive ? 'ready' : 'watch',
    },
  ];
};

const buildPriorityEntries = ({
  rules,
  targetVisibilityState,
  directiveState,
}: {
  rules: LivePlayerOverlayVisibilityRule[];
  targetVisibilityState: LivePlayerOverlayVisibilityState;
  directiveState: LivePlayerOverlayVisibilityRuntimeContract['directiveState'];
}): LivePlayerOverlayVisibilityPriorityEntry[] => rules
  .map((rule) => {
    const rank = getRuleRank(rule.id);
    const state: LivePlayerOverlayVisibilityPriorityEntry['state'] = rule.targetVisibilityState === targetVisibilityState
      && rule.state !== 'released'
      ? 'winning'
      : rule.state === 'released'
        ? 'released'
        : 'queued';
    const summary = state === 'winning'
      ? `${rule.label} currently wins overlay persistence.`
      : state === 'queued'
        ? `${rule.label} is ready but outranked by a stronger visibility rule.`
        : `${rule.label} is not contributing to current overlay visibility.`;
    const detail = state === 'winning'
      ? directiveState === 'pinned-open'
        ? `${rule.detail} This rule is actively forcing ${targetVisibilityState} open.`
        : `${rule.detail} This rule currently points the shell at ${targetVisibilityState}.`
      : state === 'queued'
        ? `${rule.detail} The shell would promote ${rule.targetVisibilityState} if the current winner released.`
        : `${rule.detail} No queued visibility transition is attached to this rule right now.`;

    return {
      id: rule.id,
      label: rule.label,
      rank,
      state,
      targetVisibilityState: rule.targetVisibilityState,
      summary,
      detail,
      tone: state === 'winning' ? rule.tone : state === 'queued' ? 'watch' : 'ready',
    };
  })
  .sort((left, right) => left.rank - right.rank);

export const buildLivePlayerOverlayVisibilityRuntime = ({
  overlayState,
  streamHealthStatus,
  controlRuntime,
  interactionRuntime,
  recoveryRuntime = null,
}: {
  overlayState: LivePlayerOverlayVisibilityState;
  streamHealthStatus: 'idle' | 'healthy' | 'degraded' | 'loading' | 'buffering' | 'error';
  controlRuntime: LivePlayerControlRuntimeContract;
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
  recoveryRuntime?: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayVisibilityRuntimeContract => {
  const rawVisibilityState = overlayState;
  const effectiveVisibilityState = interactionRuntime.visibilityState;

  let targetVisibilityState: LivePlayerOverlayVisibilityState = rawVisibilityState;
  let directiveState: LivePlayerOverlayVisibilityRuntimeContract['directiveState'] = rawVisibilityState === 'closed' ? 'released' : 'manual-open';
  let lockState: LivePlayerOverlayVisibilityRuntimeContract['lockState'] = rawVisibilityState === 'closed' ? 'released' : 'manual-open';
  let applyMode: LivePlayerOverlayVisibilityRuntimeContract['applyMode'] = 'none';
  let applyDetail = 'The current overlay visibility already matches the backend-owned posture.';
  let releaseRule = 'The shell can stay closed until the next explicit reveal, because no player-truth lane is claiming visibility ownership right now.';
  let prioritySummary = 'No visibility rule is currently forcing an overlay lane open.';
  let summary = 'Overlay visibility is released, so the next reveal can stay user-led.';
  let detail = 'No player-truth lane currently needs to force the shell open, so visibility can remain closed until the next explicit reveal command.';
  let nextMove = {
    label: 'Hold current visibility',
    detail: 'The dock does not need to force a visibility transition right now.',
    tone: 'ready' as LivePlayerControlTone,
    targetVisibilityState,
  };

  if (streamHealthStatus === 'error' || recoveryRuntime?.actionKind === 'wait-for-line' || recoveryRuntime?.actionKind === 'fail-closed') {
    targetVisibilityState = 'recovery';
    directiveState = 'pinned-open';
    lockState = 'recovery-pinned';
    applyMode = rawVisibilityState === 'recovery' ? 'none' : 'set-overlay-state';
    applyDetail = streamHealthStatus === 'error'
      ? 'Playback is in error posture, so the dock should force the recovery lane visible.'
      : recoveryRuntime?.reasonPath ?? 'Recovery truth currently outranks every other overlay lane.';
    releaseRule = 'Do not release overlay visibility until playback health or recovery proof stops demanding an explicit recovery lane.';
    prioritySummary = 'Recovery outranks transport, track selection, and manual carry-forward whenever playback truth becomes unsafe or blocked.';
    summary = 'Recovery truth currently owns overlay visibility and should stay pinned open.';
    detail = streamHealthStatus === 'error'
      ? 'Playback health has degraded into an error state, so the shell must promote explicit recovery copy instead of silently remaining closed or transport-led.'
      : recoveryRuntime?.overlayCopy ?? recoveryRuntime?.reasonPath ?? 'Recovery posture is strong enough that the shell should stay visibly open until the proof stack improves.';
    nextMove = {
      label: 'Pin recovery lane',
      detail: applyDetail,
      tone: 'recover',
      targetVisibilityState,
    };
  } else if (rawVisibilityState !== 'closed') {
    targetVisibilityState = rawVisibilityState;
    directiveState = 'manual-open';
    lockState = 'manual-open';
    releaseRule = 'Keep the visible lane until the user closes it or a stronger recovery/selection rule explicitly takes over.';
    prioritySummary = 'No forced backend takeover is active, so the manually visible lane remains the current winner.';
    summary = 'The overlay is already visible, so the current lane can keep ownership until a stronger rule appears.';
    detail = `The dock is already carrying ${rawVisibilityState} visibly, so no automatic override is required while player truth stays calm.`;
    nextMove = {
      label: 'Keep visible lane',
      detail: `Preserve ${rawVisibilityState} until the user closes it or recovery/selection truth outranks it.`,
      tone: 'ready',
      targetVisibilityState,
    };
  } else if (controlRuntime.seekWindowState === 'timeshift-active') {
    targetVisibilityState = 'transport';
    directiveState = 'guided-open';
    lockState = 'transport-pending';
    applyMode = 'set-overlay-state';
    applyDetail = 'Timeshift playback is active while the shell is closed, so the dock should restore the transport lane.';
    releaseRule = 'Release transport ownership once playback settles back to live edge or a stronger recovery rule takes over.';
    prioritySummary = 'Transport currently beats track and manual carry-forward because timeshift honesty outranks a closed shell.';
    summary = 'Transport truth currently owns the next visibility reveal because playback is offset from live edge.';
    detail = 'The player is no longer pinned to live edge, so the transport lane should stay explicit instead of making seek posture disappear inside a closed shell.';
    nextMove = {
      label: 'Restore transport lane',
      detail: applyDetail,
      tone: 'watch',
      targetVisibilityState,
    };
  } else if (controlRuntime.subtitleAudioOptionState === 'selection-active') {
    targetVisibilityState = 'tracks';
    directiveState = 'guided-open';
    lockState = 'tracks-pending';
    applyMode = 'set-overlay-state';
    applyDetail = 'Track selection is active while the shell is closed, so the dock should reopen the tracks lane.';
    releaseRule = 'Release the tracks lane once audio/subtitle selection settles or a higher-priority recovery or transport rule appears.';
    prioritySummary = 'Track selection currently beats manual closed-shell posture because confirm and escape semantics must stay visible.';
    summary = 'Track-selection truth currently owns the next visibility reveal until the picker settles.';
    detail = 'Audio or subtitle selection is still in-flight, so the shell should preserve the tracks lane instead of pretending selection already resolved.';
    nextMove = {
      label: 'Restore tracks lane',
      detail: applyDetail,
      tone: 'watch',
      targetVisibilityState,
    };
  }

  const rules = buildRules({
    streamHealthStatus,
    controlRuntime,
    recoveryRuntime,
    rawVisibilityState,
    effectiveVisibilityState,
    targetVisibilityState,
  });
  const priorityEntries = buildPriorityEntries({
    rules,
    targetVisibilityState,
    directiveState,
  });
  const activeRuleCount = rules.filter((rule) => rule.state === 'active').length;
  const tone = getDominantTone([
    controlRuntime.tone,
    interactionRuntime.tone,
    recoveryRuntime?.tone ?? 'ready',
    nextMove.tone,
  ]);

  return {
    screenId: 'player',
    title: 'Overlay visibility runtime',
    eyebrow: 'Visibility persistence + auto-reveal policy',
    summary,
    detail,
    tone,
    directiveState,
    lockState,
    rawVisibilityState,
    effectiveVisibilityState,
    targetVisibilityState,
    applyMode,
    applyDetail,
    releaseRule,
    prioritySummary,
    activeRuleCount,
    rules,
    priorityEntries,
    nextMove,
  };
};
