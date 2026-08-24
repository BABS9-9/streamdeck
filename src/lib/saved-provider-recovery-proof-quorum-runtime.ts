import {
  LivePlayerLineClearanceRuntimeContract,
  LivePlayerLineReleaseRuntimeContract,
  MockProviderManifest,
  SavedProviderRecoveryAuthorityRuntimeContract,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceLineClearancePriorityRuntimeContract,
  SurfaceLineReleaseWitnessRuntimeContract,
  SurfaceRecoveryAuthorityRuntimeContract,
  SurfaceRecoveryProofQuorumRuntimeContract,
} from './types';

type SurfaceRecoveryProofQuorumDefinition = MockProviderManifest['surfaceRecoveryProofQuorumContracts'][number];
type RecoveryLineReleaseRuntime = SurfaceLineReleaseWitnessRuntimeContract | LivePlayerLineReleaseRuntimeContract | null;
type RecoveryLineClearanceRuntime = SurfaceLineClearancePriorityRuntimeContract | LivePlayerLineClearanceRuntimeContract | null;
type RecoveryAuthorityRuntime = SurfaceRecoveryAuthorityRuntimeContract | SavedProviderRecoveryAuthorityRuntimeContract | null;

const getAuthorityOwnerLabel = (runtime: RecoveryAuthorityRuntime) => {
  if (!runtime) return null;
  return 'authorityOwner' in runtime ? runtime.authorityOwner : runtime.finalOwnerLabel;
};

const getAuthorityDetail = (runtime: RecoveryAuthorityRuntime) => {
  if (!runtime) return null;
  return runtime.detail;
};

const getAuthorityFallbackReason = (runtime: RecoveryAuthorityRuntime) => {
  if (!runtime) return null;
  return 'fallbackReason' in runtime ? runtime.fallbackReason : runtime.failClosedReason;
};

const getReleaseWitnessLabel = (runtime: RecoveryLineReleaseRuntime) => {
  if (!runtime) return null;
  return 'releaseWitness' in runtime ? runtime.releaseWitness : runtime.releaseWitnessLabel;
};

const getBlockedClaimantLabel = (runtime: RecoveryLineClearanceRuntime) => {
  if (!runtime) return null;
  return 'blockedClaimant' in runtime ? runtime.blockedClaimant : runtime.blockedClaimantLabel;
};

const getReclaimRuleLabel = (runtime: RecoveryLineClearanceRuntime) => {
  if (!runtime) return null;
  return 'reclaimRule' in runtime ? runtime.reclaimRule : runtime.reclaimRuleLabel;
};

const getOwner = ({
  board,
  recoveryAuthorityRuntime,
}: {
  board: SavedProviderHealthBoard;
  recoveryAuthorityRuntime: RecoveryAuthorityRuntime;
}) => {
  if (recoveryAuthorityRuntime?.authorityProviderId) {
    return board.byProviderId[recoveryAuthorityRuntime.authorityProviderId] ?? board.recommendedProvider ?? board.activeProvider ?? null;
  }

  return board.recommendedProvider ?? board.activeProvider ?? board.providers[0] ?? null;
};

const getOwnerStatusLabel = (owner: SavedProviderHealthEntry | null) => {
  if (!owner) return 'No saved provider has enough proof to own recovery yet.';
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} currently has enough stable proof to keep recovery claims grounded.`;
};

const getProviderVote = ({
  owner,
  recoveryAuthorityRuntime,
}: {
  owner: SavedProviderHealthEntry | null;
  recoveryAuthorityRuntime: RecoveryAuthorityRuntime;
}) => {
  if (!owner) {
    return 'Provider proof is still missing because no saved owner has earned honest recovery authority yet.';
  }

  if (owner.warning) {
    return `${owner.providerName} only has a conditional provider vote right now: ${owner.warning}`;
  }

  return getAuthorityOwnerLabel(recoveryAuthorityRuntime)
    ?? `${owner.providerName} owns the provider vote because auth freshness and saved-provider trust still point at the same next move.`;
};

const getLineVote = ({
  owner,
  lineReleaseRuntime,
  lineClearanceRuntime,
}: {
  owner: SavedProviderHealthEntry | null;
  lineReleaseRuntime: RecoveryLineReleaseRuntime;
  lineClearanceRuntime: RecoveryLineClearanceRuntime;
}) => {
  const releaseWitness = getReleaseWitnessLabel(lineReleaseRuntime);
  const blockedClaimant = getBlockedClaimantLabel(lineClearanceRuntime);
  const reclaimRule = getReclaimRuleLabel(lineClearanceRuntime);

  if (lineReleaseRuntime?.tone === 'recover' && releaseWitness) {
    return releaseWitness;
  }

  if (lineClearanceRuntime?.tone === 'recover' && blockedClaimant) {
    return blockedClaimant;
  }

  if (lineClearanceRuntime?.claimantProviderId && owner && lineClearanceRuntime.claimantProviderId !== owner.providerId) {
    return reclaimRule ?? `${owner.providerName} does not currently own reclaimed-line priority.`;
  }

  if (releaseWitness) {
    return releaseWitness;
  }

  if (reclaimRule) {
    return reclaimRule;
  }

  return owner
    ? `${owner.providerName} still has enough line headroom or reclaim priority to keep the same recovery path honest.`
    : 'No saved owner currently has a trusted line vote.';
};

const getContinuityVote = ({
  owner,
  board,
  recoveryAuthorityRuntime,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  recoveryAuthorityRuntime: RecoveryAuthorityRuntime;
}) => {
  if (!owner) {
    return 'Continuity proof is not aligned yet because no saved owner can safely carry the same move forward.';
  }

  if (recoveryAuthorityRuntime?.authorityProviderId && board.activeProvider && recoveryAuthorityRuntime.authorityProviderId !== board.activeProvider.providerId) {
    return `${board.activeProvider.providerName} still owns the visible shell, but ${owner.providerName} owns the safer carried-forward move until the return trigger clears.`;
  }

  return getAuthorityDetail(recoveryAuthorityRuntime)
    ?? `${owner.providerName} still preserves the same provider-backed next move without hiding a subject or destination change.`;
};

const getMissingVote = ({
  owner,
  lineReleaseRuntime,
  lineClearanceRuntime,
  recoveryAuthorityRuntime,
}: {
  owner: SavedProviderHealthEntry | null;
  lineReleaseRuntime: RecoveryLineReleaseRuntime;
  lineClearanceRuntime: RecoveryLineClearanceRuntime;
  recoveryAuthorityRuntime: RecoveryAuthorityRuntime;
}) => {
  const releaseWitness = getReleaseWitnessLabel(lineReleaseRuntime);
  const blockedClaimant = getBlockedClaimantLabel(lineClearanceRuntime);

  if (!owner) {
    return 'Missing vote: provider ownership is still unproven, so the shell should stay fail-closed.';
  }

  if (lineReleaseRuntime?.tone === 'recover' && releaseWitness) {
    return `Missing vote: ${releaseWitness}`;
  }

  if (lineClearanceRuntime?.tone === 'recover' && blockedClaimant) {
    return `Missing vote: ${blockedClaimant}`;
  }

  if (owner.warning) {
    return `Missing vote: ${owner.warning}`;
  }

  if (recoveryAuthorityRuntime?.tone === 'recover') {
    return `Missing vote: ${getAuthorityFallbackReason(recoveryAuthorityRuntime)}`;
  }

  return 'Missing vote: none. Provider proof, line posture, and continuity all agree on the same next move.';
};

const getTone = ({
  owner,
  lineReleaseRuntime,
  lineClearanceRuntime,
  recoveryAuthorityRuntime,
}: {
  owner: SavedProviderHealthEntry | null;
  lineReleaseRuntime: RecoveryLineReleaseRuntime;
  lineClearanceRuntime: RecoveryLineClearanceRuntime;
  recoveryAuthorityRuntime: RecoveryAuthorityRuntime;
}): SurfaceRecoveryProofQuorumRuntimeContract['quorums'][number]['tone'] => {
  if (!owner) return 'recover';
  if (lineReleaseRuntime?.tone === 'recover' || lineClearanceRuntime?.tone === 'recover' || recoveryAuthorityRuntime?.tone === 'recover') {
    return 'recover';
  }
  if (owner.warning || lineReleaseRuntime?.tone === 'watch' || lineClearanceRuntime?.tone === 'watch' || recoveryAuthorityRuntime?.tone === 'watch') {
    return 'watch';
  }
  return 'ready';
};

const getQuorumStatus = ({
  tone,
  owner,
  lineReleaseRuntime,
  lineClearanceRuntime,
}: {
  tone: SurfaceRecoveryProofQuorumRuntimeContract['quorums'][number]['tone'];
  owner: SavedProviderHealthEntry | null;
  lineReleaseRuntime: RecoveryLineReleaseRuntime;
  lineClearanceRuntime: RecoveryLineClearanceRuntime;
}) => {
  if (tone === 'ready') return '3 of 3 proofs aligned';
  if (!owner) return '0 of 3 proofs aligned';
  if (lineReleaseRuntime?.tone === 'recover' || lineClearanceRuntime?.tone === 'recover') return '1 of 3 proofs aligned';
  return '2 of 3 proofs aligned';
};

export const buildSavedProviderRecoveryProofQuorumRuntime = ({
  contract,
  board,
  recoveryAuthorityRuntime,
  lineReleaseRuntime,
  lineClearanceRuntime,
}: {
  contract: SurfaceRecoveryProofQuorumDefinition | null;
  board: SavedProviderHealthBoard;
  recoveryAuthorityRuntime: RecoveryAuthorityRuntime;
  lineReleaseRuntime: RecoveryLineReleaseRuntime;
  lineClearanceRuntime: RecoveryLineClearanceRuntime;
}): SurfaceRecoveryProofQuorumRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getOwner({ board, recoveryAuthorityRuntime });
  const tone = getTone({ owner, lineReleaseRuntime, lineClearanceRuntime, recoveryAuthorityRuntime });

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime proof votes now derive from the saved-provider board, recovery authority, and line-pressure contracts instead of mock copy alone.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    quorums: contract.quorums.slice(0, 1).map((quorum) => ({
      ...quorum,
      providerVote: getProviderVote({ owner, recoveryAuthorityRuntime }),
      lineVote: getLineVote({ owner, lineReleaseRuntime, lineClearanceRuntime }),
      continuityVote: getContinuityVote({ owner, board, recoveryAuthorityRuntime }),
      missingVote: getMissingVote({ owner, lineReleaseRuntime, lineClearanceRuntime, recoveryAuthorityRuntime }),
      tone,
      owner,
      ownerStatusLabel: getOwnerStatusLabel(owner),
      quorumStatus: getQuorumStatus({ tone, owner, lineReleaseRuntime, lineClearanceRuntime }),
    })),
  };
};
