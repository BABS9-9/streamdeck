import {
  LivePlayerControlRuntimeContract,
  LivePlayerOverlayCommandRuntimeContract,
  LivePlayerOverlayInteractionRuntimeContract,
  LivePlayerOverlaySessionCard,
  LivePlayerOverlaySessionCommandState,
  LivePlayerOverlaySessionFreshnessState,
  LivePlayerOverlaySessionRuntimeContract,
  LivePlayerRecoveryActionRuntimeContract,
} from './types';

const toneRank = {
  ready: 0,
  watch: 1,
  recover: 2,
} as const;

const getDominantTone = (tones: LivePlayerOverlaySessionRuntimeContract['tone'][]) => tones.reduce<LivePlayerOverlaySessionRuntimeContract['tone']>((current, tone) => (
  toneRank[tone] > toneRank[current] ? tone : current
), 'ready');

const formatAgo = (timestamp: number | null, now = Date.now()) => {
  if (!timestamp || !Number.isFinite(timestamp) || timestamp <= 0) return 'No runtime witness yet';
  const deltaSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (deltaSeconds < 5) return 'Just now';
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  return `${Math.floor(deltaHours / 24)}d ago`;
};

const getSessionFreshnessState = ({
  interactionRuntime,
  recoveryRuntime,
  lastExecutionAt,
}: {
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
  lastExecutionAt: number | null;
}): LivePlayerOverlaySessionFreshnessState => {
  if (interactionRuntime.visibilityState === 'recovery' || recoveryRuntime?.actionKind === 'wait-for-line' || recoveryRuntime?.actionKind === 'fail-closed') {
    return 'recovery-locked';
  }
  if (!lastExecutionAt) return interactionRuntime.visibilityState === 'closed' ? 'warming' : 'fresh';

  const ageMs = Date.now() - lastExecutionAt;
  if (ageMs <= 90_000) return 'fresh';
  if (ageMs <= 5 * 60_000) return 'warming';
  return 'stale';
};

const getCommandState = ({
  interactionRuntime,
  recoveryRuntime,
}: {
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlaySessionCommandState => {
  const dispatches = interactionRuntime.commandDispatches;
  const availableCount = dispatches.filter((dispatch) => dispatch.available).length;

  if (availableCount === 0) return 'unavailable';
  if (recoveryRuntime?.actionKind === 'retry' || recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner' || recoveryRuntime?.actionKind === 'wait-for-line' || recoveryRuntime?.actionKind === 'fail-closed') {
    return 'recovery-routed';
  }
  if (availableCount === dispatches.length) return 'fully-routable';
  return 'partially-routable';
};

const getRecoveryLockState = ({
  interactionRuntime,
  recoveryRuntime,
}: {
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
  recoveryRuntime: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlaySessionRuntimeContract['recoveryLockState'] => {
  if (interactionRuntime.visibilityState === 'recovery' || recoveryRuntime?.actionKind === 'wait-for-line' || recoveryRuntime?.actionKind === 'fail-closed') {
    return 'locked';
  }
  if (recoveryRuntime?.actionKind === 'quick-switch' || recoveryRuntime?.actionKind === 'reclaim-owner' || recoveryRuntime?.actionKind === 'retry') {
    return 'open';
  }
  return 'released';
};

const getDispatchReadinessLabel = ({
  commandState,
  availableCount,
  totalCount,
}: {
  commandState: LivePlayerOverlaySessionCommandState;
  availableCount: number;
  totalCount: number;
}) => {
  if (commandState === 'unavailable') return 'No runtime-owned overlay command is honestly available.';
  if (commandState === 'recovery-routed') return `${availableCount}/${totalCount} commands stay routed through recovery-owned playback truth.`;
  if (commandState === 'fully-routable') return `All ${totalCount} overlay commands have an honest runtime-owned dispatch.`;
  return `${availableCount}/${totalCount} overlay commands are routable without inventing local overlay state.`;
};

const getDriftLabel = ({
  freshnessState,
  interactionRuntime,
  blockedCount,
  unavailableCount,
}: {
  freshnessState: LivePlayerOverlaySessionFreshnessState;
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
  blockedCount: number;
  unavailableCount: number;
}) => {
  if (freshnessState === 'recovery-locked') return 'Recovery keeps the overlay pinned until the next honest owner or line witness is explicit.';
  if (freshnessState === 'stale') return 'The last overlay witness is aging out, so the full-screen shell should prefer explicit refresh copy over implied continuity.';
  if (blockedCount > 0) return 'Recent blocked commands mean the overlay should keep ownership copy visible instead of pretending the last move succeeded.';
  if (unavailableCount > 0) return 'Unavailable commands should remain visibly unavailable so the shell does not drift into fake affordances.';
  if (interactionRuntime.visibilityState === 'closed') return 'The overlay is currently closed, but the reveal ladder still has a backend-owned route.';
  return 'Recent overlay witnesses and command routing still agree, so the shell can stay concise.';
};

const buildCards = ({
  freshnessState,
  commandState,
  recoveryLockState,
  sessionAgeLabel,
  lastExecutionAgeLabel,
  dispatchReadinessLabel,
  blockedCount,
  unavailableCount,
  completedCount,
  driftLabel,
}: {
  freshnessState: LivePlayerOverlaySessionFreshnessState;
  commandState: LivePlayerOverlaySessionCommandState;
  recoveryLockState: LivePlayerOverlaySessionRuntimeContract['recoveryLockState'];
  sessionAgeLabel: string;
  lastExecutionAgeLabel: string;
  dispatchReadinessLabel: string;
  blockedCount: number;
  unavailableCount: number;
  completedCount: number;
  driftLabel: string;
}): LivePlayerOverlaySessionCard[] => [
  {
    id: 'freshness',
    label: 'Freshness',
    value: freshnessState,
    detail: `${sessionAgeLabel}. Last execution: ${lastExecutionAgeLabel}.`,
    tone: freshnessState === 'fresh' ? 'ready' : freshnessState === 'warming' ? 'watch' : 'recover',
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    value: commandState,
    detail: dispatchReadinessLabel,
    tone: commandState === 'fully-routable' ? 'ready' : commandState === 'partially-routable' ? 'watch' : 'recover',
  },
  {
    id: 'cadence',
    label: 'Cadence',
    value: `${completedCount} ok / ${blockedCount} blocked / ${unavailableCount} unavailable`,
    detail: driftLabel,
    tone: blockedCount > 0 || unavailableCount > 0 ? 'watch' : 'ready',
  },
  {
    id: 'recovery',
    label: 'Recovery lock',
    value: recoveryLockState,
    detail: recoveryLockState === 'locked'
      ? 'Recovery currently owns overlay persistence and should stay visible until proof improves.'
      : recoveryLockState === 'open'
        ? 'Recovery still shapes the next move, but the shell can route into the next explicit owner.'
        : 'Recovery is no longer pinning the shell, so normal overlay reveal and close posture can resume.',
    tone: recoveryLockState === 'released' ? 'ready' : recoveryLockState === 'open' ? 'watch' : 'recover',
  },
];

export const buildLivePlayerOverlaySessionRuntime = ({
  controlRuntime,
  commandRuntime,
  interactionRuntime,
  recoveryRuntime = null,
}: {
  controlRuntime: LivePlayerControlRuntimeContract;
  commandRuntime: LivePlayerOverlayCommandRuntimeContract;
  interactionRuntime: LivePlayerOverlayInteractionRuntimeContract;
  recoveryRuntime?: LivePlayerRecoveryActionRuntimeContract | null;
}): LivePlayerOverlaySessionRuntimeContract => {
  const recentExecutions = interactionRuntime.recentExecutions;
  const lastExecutionAt = recentExecutions[0]?.happenedAt ?? null;
  const oldestExecutionAt = recentExecutions[recentExecutions.length - 1]?.happenedAt ?? null;
  const freshnessState = getSessionFreshnessState({
    interactionRuntime,
    recoveryRuntime,
    lastExecutionAt,
  });
  const commandState = getCommandState({
    interactionRuntime,
    recoveryRuntime,
  });
  const recoveryLockState = getRecoveryLockState({
    interactionRuntime,
    recoveryRuntime,
  });
  const availableCount = interactionRuntime.commandDispatches.filter((dispatch) => dispatch.available).length;
  const totalCount = interactionRuntime.commandDispatches.length;
  const blockedCount = recentExecutions.filter((execution) => execution.outcome === 'blocked').length;
  const unavailableCount = recentExecutions.filter((execution) => execution.outcome === 'unavailable').length;
  const completedCount = recentExecutions.filter((execution) => execution.outcome === 'completed').length;
  const dispatchReadinessLabel = getDispatchReadinessLabel({
    commandState,
    availableCount,
    totalCount,
  });
  const sessionAgeLabel = oldestExecutionAt
    ? `Recent witness window started ${formatAgo(oldestExecutionAt)}`
    : interactionRuntime.visibilityState === 'closed'
      ? 'Overlay session is idle and waiting for its first reveal witness'
      : 'Overlay session is active but has not recorded an execution witness yet';
  const lastExecutionAgeLabel = formatAgo(lastExecutionAt);
  const driftLabel = getDriftLabel({
    freshnessState,
    interactionRuntime,
    blockedCount,
    unavailableCount,
  });
  const commandCoverageLabel = `${availableCount}/${totalCount} commands mapped`;
  const tone = getDominantTone([
    controlRuntime.tone,
    commandRuntime.tone,
    interactionRuntime.tone,
    recoveryRuntime?.tone ?? 'ready',
    freshnessState === 'fresh' ? 'ready' : freshnessState === 'warming' ? 'watch' : 'recover',
  ]);
  const cards = buildCards({
    freshnessState,
    commandState,
    recoveryLockState,
    sessionAgeLabel,
    lastExecutionAgeLabel,
    dispatchReadinessLabel,
    blockedCount,
    unavailableCount,
    completedCount,
    driftLabel,
  });

  return {
    screenId: 'player',
    title: 'Overlay session runtime',
    eyebrow: 'Overlay freshness + dispatch cadence',
    summary: recoveryLockState === 'locked'
      ? 'Recovery currently pins the overlay session, so freshness and command cadence have to stay explicit.'
      : freshnessState === 'stale'
        ? 'The overlay session is aging past its last concrete witness, so the full-screen shell should refresh from backend truth.'
        : commandState === 'fully-routable'
          ? 'Overlay session truth is fresh and command routing stays fully backed by the runtime.'
          : 'Overlay session truth is only partially routable, so unavailable affordances should stay honest.',
    detail: 'This runtime summarizes overlay witness freshness, command coverage, execution cadence, and recovery lock posture so the full-screen shell can stay backend-led even between command presses.',
    tone,
    freshnessState,
    commandState,
    recoveryLockState,
    sessionAgeLabel,
    lastExecutionAgeLabel,
    dispatchReadinessLabel,
    driftLabel,
    commandCoverageLabel,
    completedCount,
    blockedCount,
    unavailableCount,
    cards,
    nextMove: recoveryLockState === 'locked'
      ? {
          label: recoveryRuntime?.nextMove.label ?? 'Keep recovery visible',
          detail: recoveryRuntime?.reasonPath ?? interactionRuntime.reasonPath,
          tone: recoveryRuntime?.tone ?? 'recover',
        }
      : {
          label: interactionRuntime.nextMove.label,
          detail: blockedCount > 0 || unavailableCount > 0
            ? `${interactionRuntime.nextMove.detail} ${driftLabel}`
            : interactionRuntime.nextMove.detail,
          tone,
        },
  };
};
