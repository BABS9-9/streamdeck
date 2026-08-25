import {
  LivePlayerControlRuntimeContract,
  LivePlayerFocusReturnRuntimeContract,
  LivePlayerOverlayCommandEntry,
  LivePlayerOverlayCommandRuntimeContract,
  LivePlayerOverlayDispatchKind,
  LivePlayerOverlayFocusRuntimeContract,
  LivePlayerOverlayInteractionCommandDispatch,
  LivePlayerOverlayInteractionRuntimeContract,
  LivePlayerOverlayVisibilityState,
  LivePlayerRecoveryActionRuntimeContract,
} from './types';

const toneRank = {
  ready: 0,
  watch: 1,
  recover: 2,
} as const;

const getDominantTone = (tones: LivePlayerOverlayInteractionRuntimeContract['tone'][]) => tones.reduce<LivePlayerOverlayInteractionRuntimeContract['tone']>((current, tone) => (
  toneRank[tone] > toneRank[current] ? tone : current
), 'ready');

const getVisibilityState = ({
  overlayState,
  recoveryRuntime,
  focusRuntime,
}: {
  overlayState: LivePlayerOverlayVisibilityState;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
  focusRuntime: LivePlayerOverlayFocusRuntimeContract;
}): LivePlayerOverlayVisibilityState => {
  if (recoveryRuntime?.actionKind === 'fail-closed' || recoveryRuntime?.actionKind === 'wait-for-line') return 'recovery';
  if (overlayState !== 'closed') return overlayState;
  if (focusRuntime.railState === 'timeshift-transport') return 'transport';
  if (focusRuntime.railState === 'track-picker') return 'tracks';
  return 'closed';
};

const getOpenLabel = ({
  visibilityState,
  commandRuntime,
}: {
  visibilityState: LivePlayerOverlayVisibilityState;
  commandRuntime: LivePlayerOverlayCommandRuntimeContract;
}) => {
  if (visibilityState === 'recovery') return 'Recovery keeps the overlay open until a safer next owner is named.';
  if (visibilityState === 'transport') return 'Transport posture keeps the overlay open for seek settlement.';
  if (visibilityState === 'tracks') return 'Track selection keeps the overlay open until the picker resolves.';
  if (visibilityState === 'hero') return 'The hero layer is already the active overlay owner.';
  return `${commandRuntime.primaryCommandLabel} should be able to open the overlay without rebuilding local state.`;
};

const getCloseLabel = ({
  visibilityState,
  focusReturnRuntime,
}: {
  visibilityState: LivePlayerOverlayVisibilityState;
  focusReturnRuntime: LivePlayerFocusReturnRuntimeContract;
}) => {
  if (visibilityState === 'recovery') return 'Back cannot hide recovery truth until the return ladder is explicit.';
  if (visibilityState === 'closed') return 'The overlay is already closed, so Back should fall through the saved return ladder.';
  return `${focusReturnRuntime.backTarget} stays attached to the same close path.`;
};

const getReasonPath = ({
  visibilityState,
  recoveryRuntime,
  focusReturnRuntime,
  commandRuntime,
}: {
  visibilityState: LivePlayerOverlayVisibilityState;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
  focusReturnRuntime: LivePlayerFocusReturnRuntimeContract;
  commandRuntime: LivePlayerOverlayCommandRuntimeContract;
}) => {
  if (visibilityState === 'recovery') return recoveryRuntime?.reasonPath ?? focusReturnRuntime.nextMove.detail;
  if (visibilityState === 'tracks') return 'Track selection is active, so the overlay should preserve confirm and escape semantics until the picker settles.';
  if (visibilityState === 'transport') return 'Timeshift posture is active, so the overlay should stay open until the current offset is settled honestly.';
  if (visibilityState === 'hero') return commandRuntime.nextMove.detail;
  return focusReturnRuntime.backTarget;
};

const getCommandDispatch = ({
  command,
  visibilityState,
  recoveryRuntime,
}: {
  command: LivePlayerOverlayCommandEntry;
  visibilityState: LivePlayerOverlayVisibilityState;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): Omit<LivePlayerOverlayInteractionCommandDispatch, 'label' | 'summary' | 'detail' | 'available' | 'targetProviderId' | 'tone'> & {
  label: string;
  summary: string;
  detail: string;
  available: boolean;
  targetProviderId: string | null;
  tone: LivePlayerOverlayInteractionRuntimeContract['tone'];
} => {
  switch (command.id) {
    case 'ok':
      if (recoveryRuntime?.actionKind === 'retry') {
        return {
          commandId: command.id,
          label: 'Retry playback',
          dispatchKind: 'retry-playback',
          targetProviderId: recoveryRuntime.targetProviderId,
          available: true,
          summary: 'OK should route into a direct retry on the current playback owner.',
          detail: recoveryRuntime.nextMove.detail,
          tone: recoveryRuntime.tone,
        };
      }
      if (recoveryRuntime?.actionKind === 'quick-switch') {
        return {
          commandId: command.id,
          label: 'Quick-switch owner',
          dispatchKind: 'quick-switch',
          targetProviderId: recoveryRuntime.targetProviderId,
          available: Boolean(recoveryRuntime.targetProviderId),
          summary: 'OK should move directly onto the healthier saved provider.',
          detail: recoveryRuntime.reasonPath,
          tone: recoveryRuntime.tone,
        };
      }
      if (recoveryRuntime?.actionKind === 'reclaim-owner') {
        return {
          commandId: command.id,
          label: 'Reclaim rightful owner',
          dispatchKind: 'reclaim-owner',
          targetProviderId: recoveryRuntime.targetProviderId,
          available: Boolean(recoveryRuntime.targetProviderId),
          summary: 'OK should hand playback back to the recovered rightful owner.',
          detail: recoveryRuntime.reasonPath,
          tone: recoveryRuntime.tone,
        };
      }
      if (recoveryRuntime?.actionKind === 'wait-for-line' || recoveryRuntime?.actionKind === 'fail-closed') {
        return {
          commandId: command.id,
          label: 'Keep recovery visible',
          dispatchKind: 'wait-for-line',
          targetProviderId: recoveryRuntime?.targetProviderId ?? null,
          available: true,
          summary: 'OK should keep the recovery explanation open instead of inventing a false next move.',
          detail: recoveryRuntime?.reasonPath ?? command.detail,
          tone: recoveryRuntime?.tone ?? 'recover',
        };
      }
      if (visibilityState === 'transport') {
        return {
          commandId: command.id,
          label: 'Settle timeshift',
          dispatchKind: 'settle-timeshift',
          targetProviderId: null,
          available: true,
          summary: 'OK should settle the active offset before the overlay collapses.',
          detail: command.detail,
          tone: command.tone,
        };
      }
      if (visibilityState === 'tracks') {
        return {
          commandId: command.id,
          label: 'Confirm tracks',
          dispatchKind: 'open-track-picker',
          targetProviderId: null,
          available: true,
          summary: 'OK should stay attached to the active track selection flow.',
          detail: command.detail,
          tone: command.tone,
        };
      }
      return {
        commandId: command.id,
        label: 'Open overlay',
        dispatchKind: 'open-overlay',
        targetProviderId: null,
        available: true,
        summary: 'OK should open the backend-owned overlay shell first.',
        detail: command.detail,
        tone: command.tone,
      };
    case 'back':
      return {
        commandId: command.id,
        label: visibilityState === 'closed' ? 'Route back' : 'Close overlay',
        dispatchKind: 'route-back',
        targetProviderId: null,
        available: true,
        summary: 'Back should follow the same focus-return ladder the player already published.',
        detail: command.detail,
        tone: command.tone,
      };
    case 'left-right':
      return visibilityState === 'transport'
        ? {
            commandId: command.id,
            label: 'Settle timeshift',
            dispatchKind: 'settle-timeshift',
            targetProviderId: null,
            available: true,
            summary: 'Directional travel stays attached to the transport lane while timeshift is active.',
            detail: command.detail,
            tone: command.tone,
          }
        : {
            commandId: command.id,
            label: 'Reveal transport',
            dispatchKind: 'reveal-info',
            targetProviderId: null,
            available: true,
            summary: 'Directional travel should reveal the transport lane before it pretends to seek.',
            detail: command.detail,
            tone: command.tone,
          };
    case 'up-down':
      return {
        commandId: command.id,
        label: visibilityState === 'closed' ? 'Reveal overlay' : 'Close overlay',
        dispatchKind: visibilityState === 'closed' ? 'reveal-info' : 'close-overlay',
        targetProviderId: null,
        available: true,
        summary: 'Vertical travel should explicitly own overlay reveal and collapse.',
        detail: command.detail,
        tone: command.tone,
      };
    case 'audio-subtitle':
      return {
        commandId: command.id,
        label: 'Open track picker',
        dispatchKind: 'open-track-picker',
        targetProviderId: null,
        available: command.activeZone === 'tracks' || command.state !== 'none',
        summary: command.state === 'none'
          ? 'Track commands should stay visible as unavailable when no audio or subtitle options exist.'
          : 'Track commands should route directly into the picker without inventing UI-local state.',
        detail: command.detail,
        tone: command.tone,
      };
    default:
      return {
        commandId: command.id,
        label: 'No-op',
        dispatchKind: 'noop',
        targetProviderId: null,
        available: false,
        summary: 'No concrete dispatch is attached to this command yet.',
        detail: command.detail,
        tone: command.tone,
      };
  }
};

export const buildLivePlayerOverlayInteractionRuntime = ({
  overlayState,
  controlRuntime,
  focusRuntime,
  focusReturnRuntime,
  commandRuntime,
  recoveryRuntime = null,
}: {
  overlayState: LivePlayerOverlayVisibilityState;
  controlRuntime: LivePlayerControlRuntimeContract;
  focusRuntime: LivePlayerOverlayFocusRuntimeContract;
  focusReturnRuntime: LivePlayerFocusReturnRuntimeContract;
  commandRuntime: LivePlayerOverlayCommandRuntimeContract;
  recoveryRuntime?: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlayInteractionRuntimeContract => {
  const visibilityState = getVisibilityState({
    overlayState,
    recoveryRuntime,
    focusRuntime,
  });
  const commandDispatches = commandRuntime.commands.map((command) => {
    const dispatch = getCommandDispatch({
      command,
      visibilityState,
      recoveryRuntime,
    });

    return {
      ...dispatch,
      detail: dispatch.available ? dispatch.detail : `${dispatch.detail} No honest runtime-owned dispatch is available.`,
    };
  });
  const primaryDispatch = commandDispatches.find((dispatch) => dispatch.commandId === 'ok') ?? null;
  const secondaryDispatch = commandDispatches.find((dispatch) => dispatch.commandId === 'back') ?? null;
  const reasonPath = getReasonPath({
    visibilityState,
    recoveryRuntime,
    focusReturnRuntime,
    commandRuntime,
  });
  const tone = getDominantTone([
    controlRuntime.tone,
    focusReturnRuntime.tone,
    commandRuntime.tone,
    recoveryRuntime?.tone ?? 'ready',
    visibilityState === 'closed' ? 'ready' : visibilityState === 'hero' ? 'watch' : visibilityState === 'recovery' ? 'recover' : 'watch',
  ]);

  return {
    screenId: 'player',
    title: 'Overlay interaction resolver',
    eyebrow: 'Overlay execution doctrine',
    summary: visibilityState === 'recovery'
      ? 'Recovery now owns overlay visibility, command routing, and return handoff.'
      : visibilityState === 'closed'
        ? 'The overlay is closed, but the player still owns one explicit reveal and exit ladder.'
        : `${visibilityState[0]?.toUpperCase() || 'O'}${visibilityState.slice(1)} posture is now runtime-owned for the full-screen overlay path.`,
    detail: 'This runtime turns open/close posture, focus-return handoff, command dispatch, and recovery reason-path glue into one execution contract for the player overlay.',
    tone,
    visibilityState,
    openLabel: getOpenLabel({ visibilityState, commandRuntime }),
    closeLabel: getCloseLabel({ visibilityState, focusReturnRuntime }),
    focusHandoffLabel: focusReturnRuntime.nextMove.label,
    focusHandoffDetail: focusReturnRuntime.nextMove.detail,
    reasonPath,
    primaryDispatch: primaryDispatch
      ? {
          label: primaryDispatch.label,
          dispatchKind: primaryDispatch.dispatchKind,
          targetProviderId: primaryDispatch.targetProviderId,
          available: primaryDispatch.available,
          detail: primaryDispatch.detail,
        }
      : null,
    secondaryDispatch: secondaryDispatch
      ? {
          label: secondaryDispatch.label,
          dispatchKind: secondaryDispatch.dispatchKind,
          targetProviderId: secondaryDispatch.targetProviderId,
          available: secondaryDispatch.available,
          detail: secondaryDispatch.detail,
        }
      : null,
    commandDispatches,
    nextMove: recoveryRuntime?.targetProviderId
      ? {
          label: primaryDispatch?.label ?? 'Route the next command explicitly',
          detail: reasonPath,
          tone: recoveryRuntime.tone,
          targetProviderId: recoveryRuntime.targetProviderId,
        }
      : {
          label: primaryDispatch?.label ?? 'Keep overlay routing explicit',
          detail: reasonPath,
          tone,
          targetProviderId: null,
        },
  };
};
