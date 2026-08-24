import {
  LivePlayerRecoveryActionRuntimeContract,
  LivePlayerLineClearanceRuntimeContract,
  LivePlayerLineReleaseRuntimeContract,
  MultiConnectionSwitchRuntimeContract,
  SavedProviderRecoveryAuthorityRuntimeContract,
  SurfaceRecoveryProofDissentRuntimeContract,
  SurfaceRecoveryProofQuorumRuntimeContract,
  XtreamStream,
} from './types';

type RecoveryTarget = {
  providerId: string;
  providerName: string;
  categoryName?: string;
} | null;

const getToneRank = (tone: LivePlayerRecoveryActionRuntimeContract['tone']) => (
  tone === 'recover' ? 2 : tone === 'watch' ? 1 : 0
);

const getStrongestTone = (
  tones: Array<LivePlayerRecoveryActionRuntimeContract['tone'] | null | undefined>
): LivePlayerRecoveryActionRuntimeContract['tone'] => tones.reduce<LivePlayerRecoveryActionRuntimeContract['tone']>((current, tone) => (
  tone && getToneRank(tone) > getToneRank(current) ? tone : current
), 'ready');

const getPrimaryQuorum = (runtime: SurfaceRecoveryProofQuorumRuntimeContract | null) => runtime?.quorums[0] ?? null;
const getPrimaryDissent = (runtime: SurfaceRecoveryProofDissentRuntimeContract | null) => runtime?.dissents[0] ?? null;

const getSwitchTargetId = ({
  switchRuntime,
  authorityRuntime,
}: {
  switchRuntime: MultiConnectionSwitchRuntimeContract | null;
  authorityRuntime: SavedProviderRecoveryAuthorityRuntimeContract | null;
}) => {
  if (authorityRuntime?.authorityProviderId && authorityRuntime.authorityProviderId !== authorityRuntime.activeProviderId) {
    return authorityRuntime.authorityProviderId;
  }

  if (switchRuntime?.recommendedProviderId && switchRuntime.recommendedProviderId !== switchRuntime.activeProviderId) {
    return switchRuntime.recommendedProviderId;
  }

  return null;
};

const buildSupportEntries = ({
  authorityRuntime,
  quorumRuntime,
  dissentRuntime,
  lineReleaseRuntime,
  lineClearanceRuntime,
  switchRuntime,
}: {
  authorityRuntime: SavedProviderRecoveryAuthorityRuntimeContract | null;
  quorumRuntime: SurfaceRecoveryProofQuorumRuntimeContract | null;
  dissentRuntime: SurfaceRecoveryProofDissentRuntimeContract | null;
  lineReleaseRuntime: LivePlayerLineReleaseRuntimeContract | null;
  lineClearanceRuntime: LivePlayerLineClearanceRuntimeContract | null;
  switchRuntime: MultiConnectionSwitchRuntimeContract | null;
}): LivePlayerRecoveryActionRuntimeContract['supportEntries'] => {
  const entries: LivePlayerRecoveryActionRuntimeContract['supportEntries'] = [];
  const quorum = getPrimaryQuorum(quorumRuntime);
  const dissent = getPrimaryDissent(dissentRuntime);

  if (authorityRuntime) {
    entries.push({
      id: 'authority',
      label: 'Recovery authority',
      summary: authorityRuntime.finalOwnerLabel,
      detail: authorityRuntime.failClosedReason,
      tone: authorityRuntime.tone,
    });
  }

  if (quorum) {
    entries.push({
      id: 'proof-quorum',
      label: 'Proof quorum',
      summary: quorum.quorumStatus,
      detail: quorum.missingVote,
      tone: quorum.tone,
    });
  }

  if (dissent) {
    entries.push({
      id: 'proof-dissent',
      label: 'Proof dissent',
      summary: dissent.dissentingSignal,
      detail: dissent.repairTrigger,
      tone: dissent.tone,
    });
  }

  if (lineReleaseRuntime) {
    entries.push({
      id: 'line-release',
      label: 'Line-release witness',
      summary: lineReleaseRuntime.releaseWitnessLabel,
      detail: lineReleaseRuntime.nextMove.detail,
      tone: lineReleaseRuntime.tone,
    });
  }

  if (lineClearanceRuntime) {
    entries.push({
      id: 'line-clearance',
      label: 'Line-clearance priority',
      summary: lineClearanceRuntime.reclaimRuleLabel,
      detail: lineClearanceRuntime.blockedClaimantLabel,
      tone: lineClearanceRuntime.tone,
    });
  }

  if (switchRuntime) {
    entries.push({
      id: 'switch-readiness',
      label: 'Switch readiness',
      summary: switchRuntime.recommendedAction,
      detail: switchRuntime.detail,
      tone: switchRuntime.tone,
    });
  }

  return entries;
};

export const buildLivePlayerRecoveryActionRuntime = ({
  currentStream,
  streamHealthStatus,
  authorityRuntime,
  quorumRuntime,
  dissentRuntime,
  lineReleaseRuntime,
  lineClearanceRuntime,
  switchRuntime,
  exactRecoveryTarget = null,
  categoryRecoveryTarget = null,
}: {
  currentStream: XtreamStream | null;
  streamHealthStatus: 'idle' | 'loading' | 'healthy' | 'buffering' | 'degraded' | 'error';
  authorityRuntime: SavedProviderRecoveryAuthorityRuntimeContract | null;
  quorumRuntime: SurfaceRecoveryProofQuorumRuntimeContract | null;
  dissentRuntime: SurfaceRecoveryProofDissentRuntimeContract | null;
  lineReleaseRuntime: LivePlayerLineReleaseRuntimeContract | null;
  lineClearanceRuntime: LivePlayerLineClearanceRuntimeContract | null;
  switchRuntime: MultiConnectionSwitchRuntimeContract | null;
  exactRecoveryTarget?: RecoveryTarget;
  categoryRecoveryTarget?: RecoveryTarget;
}): LivePlayerRecoveryActionRuntimeContract | null => {
  if (!currentStream || currentStream.stream_type !== 'live') return null;

  const quorum = getPrimaryQuorum(quorumRuntime);
  const dissent = getPrimaryDissent(dissentRuntime);
  const authorityProviderId = authorityRuntime?.authorityProviderId ?? null;
  const activeProviderId = authorityRuntime?.activeProviderId ?? switchRuntime?.activeProviderId ?? null;
  const switchTargetId = getSwitchTargetId({ switchRuntime, authorityRuntime });
  const exactTargetProviderId = exactRecoveryTarget?.providerId ?? null;
  const categoryTargetProviderId = categoryRecoveryTarget?.providerId ?? null;
  const strongestTone = getStrongestTone([
    authorityRuntime?.tone,
    quorum?.tone,
    dissent?.tone,
    lineReleaseRuntime?.tone,
    lineClearanceRuntime?.tone,
    switchRuntime?.tone,
    streamHealthStatus === 'error' ? 'recover' : streamHealthStatus === 'buffering' || streamHealthStatus === 'degraded' ? 'watch' : 'ready',
  ]);

  const lineBlocked = lineReleaseRuntime?.capState === 'line-saturated' || lineReleaseRuntime?.capState === 'proof-pending';
  const reclaimPriorityProviderId = lineClearanceRuntime?.claimantProviderId ?? null;
  const shouldReclaimOwner = Boolean(
    reclaimPriorityProviderId
      && activeProviderId
      && reclaimPriorityProviderId !== activeProviderId
      && (exactTargetProviderId === reclaimPriorityProviderId || categoryTargetProviderId === reclaimPriorityProviderId)
  );
  const shouldQuickSwitch = Boolean(
    switchTargetId
      && switchTargetId !== activeProviderId
      && (exactTargetProviderId === switchTargetId || categoryTargetProviderId === switchTargetId || authorityProviderId === switchTargetId)
  );
  const canRetryCurrentPlayback = Boolean(
    activeProviderId
      && !lineBlocked
      && authorityProviderId === activeProviderId
      && dissent?.tone !== 'recover'
      && (streamHealthStatus === 'error' || streamHealthStatus === 'buffering' || streamHealthStatus === 'degraded')
  );
  const vetoBlocksRecovery = dissent?.tone === 'recover' && !shouldReclaimOwner && !shouldQuickSwitch && !canRetryCurrentPlayback;

  let actionKind: LivePlayerRecoveryActionRuntimeContract['actionKind'] = 'fail-closed';
  let targetMode: LivePlayerRecoveryActionRuntimeContract['targetMode'] = null;
  let targetProviderId: string | null = null;
  let primaryActionLabel: string | null = null;
  let secondaryActionLabel: string | null = null;
  let nextMoveLabel = 'Recovery posture';
  let nextMoveDetail = authorityRuntime?.failClosedReason
    ?? 'Keep playback fail-closed until one saved-provider recovery path can be offered honestly.';
  let reasonPath = authorityRuntime?.failClosedReason
    ?? 'Playback recovery is blocked because the dock cannot prove one honest next owner yet.';
  let overlayCopy = reasonPath;

  if (lineBlocked) {
    actionKind = 'wait-for-line';
    targetMode = exactTargetProviderId ? 'exact-variant' : categoryTargetProviderId ? 'category-fallback' : null;
    targetProviderId = exactTargetProviderId ?? categoryTargetProviderId;
    primaryActionLabel = null;
    secondaryActionLabel = targetProviderId ? 'Switch owner only' : null;
    nextMoveLabel = 'Wait for line release';
    nextMoveDetail = lineReleaseRuntime?.nextMove.detail
      ?? 'Keep the overlay honest about line pressure until the capped provider proves a release witness or a safer owner takes over.';
    reasonPath = lineReleaseRuntime?.releaseWitnessLabel
      ?? authorityRuntime?.failClosedReason
      ?? 'Line pressure is still blocking the next safe playback move.';
    overlayCopy = `Wait for line relief before claiming playback is safely back. ${reasonPath}`;
  } else if (shouldReclaimOwner) {
    actionKind = 'reclaim-owner';
    targetProviderId = reclaimPriorityProviderId;
    targetMode = exactTargetProviderId === reclaimPriorityProviderId ? 'exact-variant' : categoryTargetProviderId === reclaimPriorityProviderId ? 'category-fallback' : 'authority-switch';
    primaryActionLabel = targetMode === 'category-fallback' ? 'Reclaim same category' : 'Reclaim playback owner';
    secondaryActionLabel = 'Switch owner only';
    nextMoveLabel = 'Reclaim the rightful owner';
    nextMoveDetail = lineClearanceRuntime?.nextMove.detail
      ?? 'Recovered line capacity now belongs to a different saved provider, so the overlay should hand playback back deliberately.';
    reasonPath = lineClearanceRuntime?.reclaimRuleLabel
      ?? authorityRuntime?.failClosedReason
      ?? 'Recovered capacity now belongs to a different provider than the visible playback owner.';
    overlayCopy = `Playback should reclaim the rightful saved owner now. ${reasonPath}`;
  } else if (shouldQuickSwitch) {
    actionKind = 'quick-switch';
    targetProviderId = switchTargetId;
    targetMode = exactTargetProviderId === switchTargetId ? 'exact-variant' : categoryTargetProviderId === switchTargetId ? 'category-fallback' : 'authority-switch';
    primaryActionLabel = targetMode === 'category-fallback' ? 'Open same category' : 'Quick-switch playback';
    secondaryActionLabel = 'Switch owner only';
    nextMoveLabel = 'Quick-switch to the healthier owner';
    nextMoveDetail = switchRuntime?.detail
      ?? authorityRuntime?.nextMove.detail
      ?? 'A healthier saved provider can carry playback more honestly than the visible owner right now.';
    reasonPath = authorityRuntime?.failClosedReason
      ?? switchRuntime?.recommendedAction
      ?? 'A healthier saved provider has the cleaner next move.';
    overlayCopy = `Offer a quick-switch instead of a blind retry. ${reasonPath}`;
  } else if (canRetryCurrentPlayback) {
    actionKind = 'retry';
    targetProviderId = activeProviderId;
    targetMode = 'current-playback';
    primaryActionLabel = 'Retry playback';
    secondaryActionLabel = null;
    nextMoveLabel = 'Retry the current owner';
    nextMoveDetail = authorityRuntime?.nextMove.detail
      ?? 'The current saved owner still has the strongest recovery proof, so the overlay can offer a direct retry.';
    reasonPath = authorityRuntime?.returnTrigger
      ?? quorum?.continuityVote
      ?? 'The current playback owner still carries the safest next move.';
    overlayCopy = `Retry on the current owner. ${reasonPath}`;
  } else if (vetoBlocksRecovery) {
    actionKind = 'fail-closed';
    nextMoveLabel = 'Proof dissent is vetoing recovery';
    nextMoveDetail = dissent?.conflictSummary
      ?? 'Playback recovery cannot offer a trustworthy next move while dissenting proof still contradicts the visible owner.';
    reasonPath = dissent?.repairTrigger
      ?? authorityRuntime?.failClosedReason
      ?? 'A dissenting proof signal is still blocking an honest recovery action.';
    overlayCopy = `Do not offer a confident recovery action yet. ${reasonPath}`;
  }

  const vetoStatus = dissent
    ? dissent.dissentingSignal
    : 'No dissent contract is loaded for playback recovery right now.';
  const quorumStatus = quorum
    ? `${quorum.quorumStatus} — ${quorum.missingVote}`
    : 'Playback proof quorum is unavailable, so the overlay should stay conservative.';
  const lineStatus = lineReleaseRuntime?.capState === 'line-saturated' || lineReleaseRuntime?.capState === 'proof-pending'
    ? lineReleaseRuntime.releaseWitnessLabel
    : lineClearanceRuntime?.reclaimRuleLabel
      ?? lineReleaseRuntime?.releaseWitnessLabel
      ?? 'Line posture is stable enough for the current playback owner.';

  return {
    screenId: 'player',
    title: 'Playback recovery action resolver',
    eyebrow: 'Overlay recovery actions',
    summary: actionKind === 'retry'
      ? 'The current playback owner still has the strongest proof, so the overlay can offer a direct retry.'
      : actionKind === 'quick-switch'
        ? 'A healthier saved provider owns the cleaner next move, so the overlay should offer a quick-switch instead of a blind retry.'
        : actionKind === 'wait-for-line'
          ? 'Line pressure is still blocking a safe handoff, so the overlay should wait and explain why.'
          : actionKind === 'reclaim-owner'
            ? 'Recovered line capacity now belongs to a different saved provider, so the overlay should reclaim the rightful owner.'
            : 'Playback recovery should stay fail-closed until the proof stack can name one honest next move.',
    detail: 'This runtime collapses recovery authority, proof quorum, proof dissent, line pressure, and switch readiness into one overlay-safe action contract for player recovery.',
    tone: actionKind === 'fail-closed' ? 'recover' : strongestTone,
    actionKind,
    targetMode,
    activeProviderId,
    authorityProviderId,
    targetProviderId,
    exactTargetProviderId,
    categoryTargetProviderId,
    reasonPath,
    overlayCopy,
    vetoStatus,
    quorumStatus,
    lineStatus,
    nextMove: {
      label: nextMoveLabel,
      detail: nextMoveDetail,
      tone: actionKind === 'fail-closed' ? 'recover' : strongestTone,
      primaryActionLabel,
      secondaryActionLabel,
    },
    supportEntries: buildSupportEntries({
      authorityRuntime,
      quorumRuntime,
      dissentRuntime,
      lineReleaseRuntime,
      lineClearanceRuntime,
      switchRuntime,
    }),
  };
};
