import {
  LivePlayerControlTone,
  LivePlayerOverlayInteractionRuntimeContract,
  LivePlayerOverlayMutationRuntimeContract,
  LivePlayerOverlayVisibilityRuntimeContract,
} from './types';

const toneRank: Record<LivePlayerControlTone, number> = {
  ready: 0,
  watch: 1,
  recover: 2,
};

const getDominantTone = (tones: LivePlayerControlTone[]) => tones.reduce<LivePlayerControlTone>((current, tone) => (
  toneRank[tone] > toneRank[current] ? tone : current
), 'ready');

export const buildLivePlayerOverlayMutationRuntime = ({
  interactionRuntime,
  visibilityRuntime,
}: {
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
  visibilityRuntime: LivePlayerOverlayVisibilityRuntimeContract;
}): LivePlayerOverlayMutationRuntimeContract => {
  const rawVisibilityState = visibilityRuntime.rawVisibilityState;
  const effectiveVisibilityState = interactionRuntime.visibilityState;
  const targetVisibilityState = visibilityRuntime.targetVisibilityState;
  const needsApply = visibilityRuntime.applyMode === 'set-overlay-state' && rawVisibilityState !== targetVisibilityState;

  const mutationState: LivePlayerOverlayMutationRuntimeContract['mutationState'] = needsApply
    ? 'pending'
    : rawVisibilityState === targetVisibilityState
      ? 'aligned'
      : 'idle';
  const tone = getDominantTone([
    visibilityRuntime.tone,
    interactionRuntime.tone,
    needsApply ? visibilityRuntime.nextMove.tone : 'ready',
  ]);
  const summary = needsApply
    ? 'Overlay mutation is pending, so the dock should apply the backend-owned visibility target next.'
    : mutationState === 'aligned'
      ? 'Overlay mutation is already aligned with runtime visibility truth.'
      : 'Overlay mutation is idle because no runtime-owned visibility correction is required.';
  const detail = needsApply
    ? visibilityRuntime.applyDetail
    : mutationState === 'aligned'
      ? 'The stored shell state already matches the current backend-owned visibility target, so no extra dock mutation should fire.'
      : 'The overlay can keep its current stored state until a stronger recovery, transport, or track-selection rule requests a new target.';
  const triggerLabel = needsApply
    ? `${visibilityRuntime.directiveState} -> ${targetVisibilityState}`
    : `${visibilityRuntime.directiveState} hold`;
  const step = needsApply
    ? {
        id: 'apply-visibility-target' as const,
        label: 'Apply visibility target',
        detail: visibilityRuntime.applyDetail,
        effectKind: 'set-overlay-state' as const,
        targetVisibilityState,
      }
    : {
        id: 'hold-visibility-state' as const,
        label: 'Hold visibility state',
        detail: 'No mutation step is needed because the dock is already aligned or released.',
        effectKind: 'none' as const,
        targetVisibilityState,
      };
  const nextMove = needsApply
    ? {
        label: 'Apply runtime target',
        detail: `Set the stored overlay state to ${targetVisibilityState} so dock visibility matches runtime truth.`,
        tone: visibilityRuntime.nextMove.tone,
        targetVisibilityState,
      }
    : {
        label: 'Hold stored visibility',
        detail: 'Leave the stored overlay state alone until a new runtime directive appears.',
        tone: 'ready' as LivePlayerControlTone,
        targetVisibilityState,
      };

  return {
    screenId: 'player',
    title: 'Overlay mutation runtime',
    eyebrow: 'Visibility reconciliation + store mutation policy',
    summary,
    detail,
    tone,
    mutationState,
    rawVisibilityState,
    effectiveVisibilityState,
    targetVisibilityState,
    applyMode: visibilityRuntime.applyMode,
    lockState: visibilityRuntime.lockState,
    triggerLabel,
    releaseRule: visibilityRuntime.releaseRule,
    step,
    nextMove,
  };
};
