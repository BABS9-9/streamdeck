import {
  LivePlayerControlTone,
  LivePlayerOverlayExecutionPlan,
  LivePlayerOverlayExecutionPlanStep,
  LivePlayerOverlayExecutionRuntimeContract,
  LivePlayerOverlayInteractionRuntimeContract,
  LivePlayerOverlayPlaybackRuntimeContract,
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

const createStep = ({
  id,
  label,
  detail,
  effectKind,
  overlayState = null,
  targetProviderId = null,
  trackCommand = null,
}: {
  id: string;
  label: string;
  detail: string;
  effectKind: LivePlayerOverlayExecutionPlanStep['effectKind'];
  overlayState?: LivePlayerOverlayExecutionPlanStep['overlayState'];
  targetProviderId?: string | null;
  trackCommand?: LivePlayerOverlayExecutionPlanStep['trackCommand'];
}): LivePlayerOverlayExecutionPlanStep => ({
  id,
  label,
  detail,
  effectKind,
  overlayState,
  targetProviderId,
  trackCommand,
});

const getCommandPlan = ({
  dispatch,
  recoveryRuntime,
  interactionRuntime,
}: {
  dispatch: LivePlayerOverlayInteractionRuntimeContract['commandDispatches'][number];
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
}): LivePlayerOverlayExecutionPlan => {
  const basePlan: LivePlayerOverlayExecutionPlan = {
    id: `command-${dispatch.commandId}`,
    source: 'command',
    commandId: dispatch.commandId,
    actionId: null,
    label: dispatch.label,
    dispatchKind: dispatch.dispatchKind,
    available: dispatch.available,
    tone: dispatch.tone,
    startVisibilityState: interactionRuntime.visibilityState,
    targetVisibilityState: interactionRuntime.visibilityState,
    targetProviderId: dispatch.targetProviderId,
    targetMode: 'none',
    summary: dispatch.summary,
    detail: dispatch.detail,
    blockedDetail: dispatch.detail,
    unavailableDetail: dispatch.detail,
    steps: [],
  };

  switch (dispatch.dispatchKind) {
    case 'open-overlay':
    case 'reveal-info':
      return {
        ...basePlan,
        targetVisibilityState: 'hero',
        summary: 'Reveal the player overlay through one runtime-owned entry lane.',
        detail: `${dispatch.summary} ${dispatch.detail}`.trim(),
        blockedDetail: 'The overlay reveal path should stay blocked only if playback no longer owns a visible shell.',
        unavailableDetail: dispatch.detail,
        steps: [
          createStep({
            id: 'show-hero-overlay',
            label: 'Show hero overlay',
            detail: 'Promote the hero overlay layer before deeper transport or track controls appear.',
            effectKind: 'set-overlay-state',
            overlayState: 'hero',
          }),
        ],
      };
    case 'close-overlay':
      return {
        ...basePlan,
        targetVisibilityState: 'closed',
        targetMode: 'close-path',
        summary: 'Collapse the overlay while leaving playback attached to the current owner.',
        detail: `${dispatch.summary} ${dispatch.detail}`.trim(),
        blockedDetail: 'Overlay close should stay blocked only when recovery truth still has to remain visible.',
        unavailableDetail: dispatch.detail,
        steps: [
          createStep({
            id: 'close-overlay',
            label: 'Close overlay',
            detail: 'Drop the overlay back to closed while preserving live playback.',
            effectKind: 'close-overlay',
            overlayState: 'closed',
          }),
        ],
      };
    case 'settle-timeshift':
      return {
        ...basePlan,
        targetVisibilityState: 'transport',
        summary: 'Keep timeshift settlement in the transport lane instead of hiding it in local player state.',
        detail: `${dispatch.summary} ${dispatch.detail}`.trim(),
        blockedDetail: 'Timeshift settlement should stay blocked when the provider has not exposed a stable seek window.',
        unavailableDetail: dispatch.detail,
        steps: [
          createStep({
            id: 'show-transport-overlay',
            label: 'Show transport lane',
            detail: 'Keep the transport lane open so left/right movement settles against visible offset proof.',
            effectKind: 'set-overlay-state',
            overlayState: 'transport',
          }),
        ],
      };
    case 'open-track-picker':
      return {
        ...basePlan,
        targetVisibilityState: 'tracks',
        summary: 'Move directly into track selection without inventing a separate UI-only picker state.',
        detail: `${dispatch.summary} ${dispatch.detail}`.trim(),
        blockedDetail: 'Track selection should stay blocked when no audio or subtitle options are attached to playback.',
        unavailableDetail: dispatch.detail,
        steps: [
          createStep({
            id: 'show-track-picker',
            label: 'Show track picker',
            detail: 'Open the tracks overlay lane so audio and subtitle options stay anchored to playback.',
            effectKind: 'set-overlay-state',
            overlayState: 'tracks',
          }),
          createStep({
            id: 'request-track-picker',
            label: 'Request track picker command',
            detail: 'Send the picker request through the player store instead of adding local transient state.',
            effectKind: 'request-track-command',
            overlayState: 'tracks',
            trackCommand: 'open-picker',
          }),
        ],
      };
    case 'route-back':
      return interactionRuntime.visibilityState === 'closed'
        ? {
            ...basePlan,
            targetVisibilityState: 'closed',
            targetMode: 'close-path',
            summary: 'Route Back out of playback once the overlay is already closed.',
            detail: `${dispatch.summary} ${dispatch.detail}`.trim(),
            blockedDetail: 'Back should only fail to close playback when the player no longer owns an active session.',
            unavailableDetail: dispatch.detail,
            steps: [
              createStep({
                id: 'close-playback',
                label: 'Close playback session',
                detail: 'Exit the active player session through the same return ladder the runtime already published.',
                effectKind: 'close-playback',
              }),
            ],
          }
        : {
            ...basePlan,
            targetVisibilityState: 'closed',
            targetMode: 'close-path',
            summary: 'Collapse the overlay first, then preserve playback for the next Back press.',
            detail: `${dispatch.summary} ${dispatch.detail}`.trim(),
            blockedDetail: 'Back should keep recovery or focus-return truth visible before it allows a full close.',
            unavailableDetail: dispatch.detail,
            steps: [
              createStep({
                id: 'close-visible-overlay',
                label: 'Close visible overlay',
                detail: 'Dismiss the currently visible overlay lane without tearing down playback.',
                effectKind: 'close-overlay',
                overlayState: 'closed',
              }),
            ],
          };
    case 'retry-playback':
      return {
        ...basePlan,
        targetVisibilityState: 'recovery',
        targetMode: 'current-playback',
        summary: 'Retry the current playback owner through a recovery-owned overlay lane.',
        detail: `${dispatch.summary} ${dispatch.detail}`.trim(),
        blockedDetail: 'Retry stays blocked if the current owner, playback URL, or active stream proof is already gone.',
        unavailableDetail: dispatch.detail,
        steps: [
          createStep({
            id: 'open-recovery-overlay',
            label: 'Open recovery overlay',
            detail: 'Keep recovery copy visible while the retry is dispatched.',
            effectKind: 'set-overlay-state',
            overlayState: 'recovery',
          }),
          createStep({
            id: 'retry-current-owner',
            label: 'Retry current owner',
            detail: recoveryRuntime?.nextMove.detail ?? 'Retry the current playback owner without switching providers.',
            effectKind: 'retry-playback',
          }),
        ],
      };
    case 'quick-switch':
      return {
        ...basePlan,
        targetVisibilityState: 'recovery',
        targetMode: recoveryRuntime?.targetMode === 'exact-variant'
          ? 'exact-variant'
          : recoveryRuntime?.targetMode === 'category-fallback'
            ? 'category-fallback'
            : 'direct-provider',
        summary: 'Quick-switch to the healthier saved provider through one recovery-authored handoff ladder.',
        detail: `${dispatch.summary} ${dispatch.detail}`.trim(),
        blockedDetail: 'Quick-switch stays blocked if the runtime cannot name a concrete provider owner to take over.',
        unavailableDetail: dispatch.detail,
        steps: [
          createStep({
            id: 'open-recovery-for-switch',
            label: 'Open recovery overlay',
            detail: 'Keep the provider transfer visible before the owner changes.',
            effectKind: 'set-overlay-state',
            overlayState: 'recovery',
            targetProviderId: dispatch.targetProviderId,
          }),
          createStep({
            id: 'quick-switch-owner',
            label: 'Quick-switch owner',
            detail: recoveryRuntime?.nextMove.detail ?? 'Move directly onto the healthier saved provider.',
            effectKind: 'quick-switch',
            overlayState: 'recovery',
            targetProviderId: dispatch.targetProviderId,
          }),
        ],
      };
    case 'reclaim-owner':
      return {
        ...basePlan,
        targetVisibilityState: 'recovery',
        targetMode: recoveryRuntime?.targetMode === 'exact-variant'
          ? 'exact-variant'
          : recoveryRuntime?.targetMode === 'category-fallback'
            ? 'category-fallback'
            : 'direct-provider',
        summary: 'Reclaim the rightful owner through an explicit recovery-authored owner handoff.',
        detail: `${dispatch.summary} ${dispatch.detail}`.trim(),
        blockedDetail: 'Owner reclaim stays blocked if the runtime cannot prove which saved provider regained rightful custody.',
        unavailableDetail: dispatch.detail,
        steps: [
          createStep({
            id: 'open-recovery-for-reclaim',
            label: 'Open recovery overlay',
            detail: 'Keep recovery ownership visible while the rightful owner is reclaimed.',
            effectKind: 'set-overlay-state',
            overlayState: 'recovery',
            targetProviderId: dispatch.targetProviderId,
          }),
          createStep({
            id: 'play-exact-recovery-target',
            label: 'Try exact recovery target',
            detail: 'Try the exact matched provider variant first if the recovery runtime published one.',
            effectKind: 'play-exact-recovery-target',
            overlayState: 'recovery',
            targetProviderId: dispatch.targetProviderId,
          }),
          createStep({
            id: 'play-category-recovery-target',
            label: 'Try category recovery target',
            detail: 'If no exact variant exists, try the same-category fallback before a raw owner switch.',
            effectKind: 'play-category-recovery-target',
            overlayState: 'recovery',
            targetProviderId: dispatch.targetProviderId,
          }),
          createStep({
            id: 'switch-playback-owner',
            label: 'Switch playback owner',
            detail: 'Fall back to a direct playback-owner handoff only after the richer recovery routes are exhausted.',
            effectKind: 'switch-playback-owner',
            overlayState: 'recovery',
            targetProviderId: dispatch.targetProviderId,
          }),
        ],
      };
    case 'wait-for-line':
      return {
        ...basePlan,
        targetVisibilityState: 'recovery',
        summary: 'Keep recovery pinned open while line pressure blocks the next playback move.',
        detail: `${dispatch.summary} ${dispatch.detail}`.trim(),
        blockedDetail: recoveryRuntime?.reasonPath ?? 'Line pressure still blocks the next honest playback action.',
        unavailableDetail: dispatch.detail,
        steps: [
          createStep({
            id: 'pin-recovery-overlay',
            label: 'Pin recovery overlay',
            detail: 'Keep the recovery layer visible so line saturation stays explicit.',
            effectKind: 'set-overlay-state',
            overlayState: 'recovery',
          }),
          createStep({
            id: 'record-line-block',
            label: 'Record blocked recovery',
            detail: recoveryRuntime?.reasonPath ?? 'Do not invent a successful recovery action while line pressure is still active.',
            effectKind: 'record-blocked',
            overlayState: 'recovery',
            targetProviderId: dispatch.targetProviderId,
          }),
        ],
      };
    default:
      return {
        ...basePlan,
        summary: 'No runtime-owned execution plan is attached to this command yet.',
        steps: [
          createStep({
            id: 'record-unavailable-plan',
            label: 'Record unavailable dispatch',
            detail: dispatch.detail,
            effectKind: 'record-unavailable',
          }),
        ],
      };
  }
};

const getActionPlan = ({
  action,
  interactionRuntime,
  recoveryRuntime,
}: {
  action: LivePlayerOverlayPlaybackRuntimeContract['actions'][number];
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayExecutionPlan => {
  if (action.dispatchKind === 'cycle-audio-track') {
    return {
      id: `action-${action.id}`,
      source: 'action',
      commandId: action.commandId,
      actionId: action.id,
      label: action.label,
      dispatchKind: action.dispatchKind,
      available: action.available,
      tone: action.tone,
      startVisibilityState: interactionRuntime.visibilityState,
      targetVisibilityState: 'tracks',
      targetProviderId: action.targetProviderId,
      targetMode: 'none',
      summary: action.summary,
      detail: action.detail,
      blockedDetail: action.availabilityDetail,
      unavailableDetail: action.availabilityDetail,
      steps: [
        createStep({
          id: 'show-audio-tracks',
          label: 'Show track picker',
          detail: 'Open the tracks lane before cycling audio so the selection stays visible.',
          effectKind: 'set-overlay-state',
          overlayState: 'tracks',
        }),
        createStep({
          id: 'cycle-audio-track',
          label: 'Request audio cycle',
          detail: 'Use the store-owned track command to cycle audio without local picker state.',
          effectKind: 'request-track-command',
          overlayState: 'tracks',
          trackCommand: 'cycle-audio',
        }),
      ],
    };
  }

  if (action.dispatchKind === 'cycle-subtitle-track') {
    return {
      id: `action-${action.id}`,
      source: 'action',
      commandId: action.commandId,
      actionId: action.id,
      label: action.label,
      dispatchKind: action.dispatchKind,
      available: action.available,
      tone: action.tone,
      startVisibilityState: interactionRuntime.visibilityState,
      targetVisibilityState: 'tracks',
      targetProviderId: action.targetProviderId,
      targetMode: 'none',
      summary: action.summary,
      detail: action.detail,
      blockedDetail: action.availabilityDetail,
      unavailableDetail: action.availabilityDetail,
      steps: [
        createStep({
          id: 'show-subtitle-tracks',
          label: 'Show track picker',
          detail: 'Open the tracks lane before cycling subtitles so the selection stays visible.',
          effectKind: 'set-overlay-state',
          overlayState: 'tracks',
        }),
        createStep({
          id: 'cycle-subtitle-track',
          label: 'Request subtitle cycle',
          detail: 'Use the store-owned track command to cycle subtitles without local picker state.',
          effectKind: 'request-track-command',
          overlayState: 'tracks',
          trackCommand: 'cycle-subtitle',
        }),
      ],
    };
  }

  if (action.dispatchKind === 'open-track-picker') {
    return {
      id: `action-${action.id}`,
      source: 'action',
      commandId: action.commandId,
      actionId: action.id,
      label: action.label,
      dispatchKind: action.dispatchKind,
      available: action.available,
      tone: action.tone,
      startVisibilityState: interactionRuntime.visibilityState,
      targetVisibilityState: 'tracks',
      targetProviderId: action.targetProviderId,
      targetMode: 'none',
      summary: action.summary,
      detail: action.detail,
      blockedDetail: action.availabilityDetail,
      unavailableDetail: action.availabilityDetail,
      steps: [
        createStep({
          id: 'show-track-selection',
          label: 'Show track picker',
          detail: 'Open the tracks lane through the same execution contract used by the remote commands.',
          effectKind: 'set-overlay-state',
          overlayState: 'tracks',
        }),
        createStep({
          id: 'open-track-picker-command',
          label: 'Request picker open',
          detail: 'Dispatch the player-store picker command instead of inventing local dialog state.',
          effectKind: 'request-track-command',
          overlayState: 'tracks',
          trackCommand: 'open-picker',
        }),
      ],
    };
  }

  const commandPlan = action.commandId
    ? getCommandPlan({
        dispatch: interactionRuntime.commandDispatches.find((dispatch) => dispatch.commandId === action.commandId) ?? {
          commandId: action.commandId,
          label: action.label,
          dispatchKind: action.dispatchKind,
          targetProviderId: action.targetProviderId,
          available: action.available,
          summary: action.summary,
          detail: action.detail,
          tone: action.tone,
        },
        recoveryRuntime,
        interactionRuntime,
      })
    : null;

  if (commandPlan) {
    return {
      ...commandPlan,
      id: `action-${action.id}`,
      source: 'action',
      actionId: action.id,
      label: action.label,
      available: action.available,
      summary: action.summary,
      detail: action.detail,
      blockedDetail: action.availabilityDetail,
      unavailableDetail: action.availabilityDetail,
      tone: action.tone,
      targetProviderId: action.targetProviderId,
    };
  }

  return {
    id: `action-${action.id}`,
    source: 'action',
    commandId: action.commandId,
    actionId: action.id,
    label: action.label,
    dispatchKind: action.dispatchKind,
    available: action.available,
    tone: action.tone,
    startVisibilityState: interactionRuntime.visibilityState,
    targetVisibilityState: interactionRuntime.visibilityState,
    targetProviderId: action.targetProviderId,
    targetMode: 'none',
    summary: action.summary,
    detail: action.detail,
    blockedDetail: action.availabilityDetail,
    unavailableDetail: action.availabilityDetail,
    steps: [
      createStep({
        id: 'record-unavailable-action-plan',
        label: 'Record unavailable action',
        detail: action.availabilityDetail,
        effectKind: action.available ? 'record-blocked' : 'record-unavailable',
        targetProviderId: action.targetProviderId,
      }),
    ],
  };
};

export const buildLivePlayerOverlayExecutionRuntime = ({
  interactionRuntime,
  playbackRuntime,
  recoveryRuntime = null,
}: {
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
  playbackRuntime: LivePlayerOverlayPlaybackRuntimeContract;
  recoveryRuntime?: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayExecutionRuntimeContract => {
  const commandPlans = interactionRuntime.commandDispatches.map((dispatch) => getCommandPlan({
    dispatch,
    recoveryRuntime,
    interactionRuntime,
  }));
  const actionPlans = playbackRuntime.actions.map((action) => getActionPlan({
    action,
    interactionRuntime,
    recoveryRuntime,
  }));
  const recoveryPlan = commandPlans.find((plan) => (
    plan.dispatchKind === 'retry-playback'
    || plan.dispatchKind === 'quick-switch'
    || plan.dispatchKind === 'reclaim-owner'
    || plan.dispatchKind === 'wait-for-line'
  )) ?? actionPlans.find((plan) => (
    plan.dispatchKind === 'retry-playback'
    || plan.dispatchKind === 'quick-switch'
    || plan.dispatchKind === 'reclaim-owner'
  )) ?? null;
  const primaryPlan = commandPlans.find((plan) => plan.commandId === 'ok') ?? actionPlans[0] ?? commandPlans[0] ?? null;
  const tone = getDominantTone([
    interactionRuntime.tone,
    playbackRuntime.tone,
    recoveryRuntime?.tone ?? 'ready',
    recoveryPlan?.tone ?? primaryPlan?.tone ?? 'ready',
  ]);

  return {
    screenId: 'player',
    title: 'Overlay execution runtime',
    eyebrow: 'Dispatch plan ledger',
    summary: recoveryPlan
      ? 'Overlay execution now publishes one recovery-aware dispatch ladder instead of leaving command handling inside the dock component.'
      : 'Overlay execution now publishes one runtime-owned command and action plan for the full-screen player path.',
    detail: 'This runtime freezes the ordered execution steps for overlay reveal, close, recovery routing, track commands, and owner handoff so the dock executes runtime truth instead of per-branch component logic.',
    tone,
    primaryPlanLabel: primaryPlan?.label ?? 'No primary dispatch plan',
    recoveryPlanLabel: recoveryPlan?.label ?? 'No recovery plan is active',
    commandPlans,
    actionPlans,
    nextMove: {
      label: recoveryPlan?.label ?? primaryPlan?.label ?? interactionRuntime.nextMove.label,
      detail: recoveryPlan?.detail ?? primaryPlan?.detail ?? interactionRuntime.nextMove.detail,
      tone: recoveryPlan?.tone ?? primaryPlan?.tone ?? tone,
      targetProviderId: recoveryPlan?.targetProviderId ?? primaryPlan?.targetProviderId ?? interactionRuntime.nextMove.targetProviderId,
    },
  };
};
