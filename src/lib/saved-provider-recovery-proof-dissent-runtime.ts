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
  SurfaceRecoveryProofDissentRuntimeContract,
} from './types';

type SurfaceRecoveryProofDissentDefinition = MockProviderManifest['surfaceRecoveryProofDissentContracts'][number];
type RecoveryLineReleaseRuntime = SurfaceLineReleaseWitnessRuntimeContract | LivePlayerLineReleaseRuntimeContract | null;
type RecoveryLineClearanceRuntime = SurfaceLineClearancePriorityRuntimeContract | LivePlayerLineClearanceRuntimeContract | null;
type RecoveryAuthorityRuntime = SurfaceRecoveryAuthorityRuntimeContract | SavedProviderRecoveryAuthorityRuntimeContract | null;

const getAuthorityOwnerLabel = (runtime: RecoveryAuthorityRuntime) => {
  if (!runtime) return null;
  return 'authorityOwner' in runtime ? runtime.authorityOwner : runtime.finalOwnerLabel;
};

const getReturnTrigger = (runtime: RecoveryAuthorityRuntime) => {
  if (!runtime) return null;
  return runtime.returnTrigger;
};

const getFallbackReason = (runtime: RecoveryAuthorityRuntime) => {
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
  if (!owner) return 'No saved provider currently owns enough aligned proof to reclaim recovery.';
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} is the current best recovery owner, but the shell still needs the dissenting proof to clear.`;
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
}): SurfaceRecoveryProofDissentRuntimeContract['dissents'][number]['tone'] => {
  if (!owner) return 'recover';
  if (lineReleaseRuntime?.tone === 'recover' || lineClearanceRuntime?.tone === 'recover' || recoveryAuthorityRuntime?.tone === 'recover') {
    return 'recover';
  }
  if (owner.warning || lineReleaseRuntime?.tone === 'watch' || lineClearanceRuntime?.tone === 'watch' || recoveryAuthorityRuntime?.tone === 'watch') {
    return 'watch';
  }
  return 'ready';
};

const getDissentingSignal = ({
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
    return 'Provider ownership is still the dissenting signal because no saved provider has earned honest recovery authority yet.';
  }

  if (lineReleaseRuntime?.tone === 'recover' && releaseWitness) {
    return `Line vote dissent: ${releaseWitness}`;
  }

  if (lineClearanceRuntime?.tone === 'recover' && blockedClaimant) {
    return `Reclaim-order dissent: ${blockedClaimant}`;
  }

  if (owner.warning) {
    return `Provider vote dissent: ${owner.warning}`;
  }

  if (recoveryAuthorityRuntime?.tone === 'recover') {
    return `Continuity vote dissent: ${getFallbackReason(recoveryAuthorityRuntime)}`;
  }

  if (lineReleaseRuntime?.tone === 'watch' && releaseWitness) {
    return `Conditional line vote: ${releaseWitness}`;
  }

  if (lineClearanceRuntime?.tone === 'watch' && blockedClaimant) {
    return `Conditional reclaim vote: ${blockedClaimant}`;
  }

  return `${owner.providerName} has no hard dissenting signal, but one proof lane is still conditional enough to keep recovery from sounding unanimous.`;
};

const getContradictedOwner = ({
  owner,
  recoveryAuthorityRuntime,
}: {
  owner: SavedProviderHealthEntry | null;
  recoveryAuthorityRuntime: RecoveryAuthorityRuntime;
}) => {
  if (!owner) {
    return 'No saved owner should reclaim the premium CTA while provider authority is still unresolved.';
  }

  return getAuthorityOwnerLabel(recoveryAuthorityRuntime)
    ?? `${owner.providerName} is still the leading recovery owner, but the dissenting signal is blocking a full reclaim.`;
};

const getConflictSummary = ({
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
  const reclaimRule = getReclaimRuleLabel(lineClearanceRuntime);

  if (!owner) {
    return 'The shell still lacks a trustworthy provider owner, so recovery should stay fail-closed instead of pretending consensus exists.';
  }

  if (lineReleaseRuntime?.tone === 'recover') {
    return `${owner.providerName} may still own the best recovery path, but line evidence is explicitly blocking a full reclaim right now.`;
  }

  if (lineClearanceRuntime?.tone === 'recover') {
    return reclaimRule ?? `${owner.providerName} is still being outranked by reclaimed-line logic, so the recovery stack is not unanimous yet.`;
  }

  if (recoveryAuthorityRuntime?.tone === 'recover') {
    return getFallbackReason(recoveryAuthorityRuntime) ?? `${owner.providerName} still conflicts with the safer carried-forward recovery owner.`;
  }

  if (owner.warning) {
    return `${owner.providerName} still carries a provider-health warning, so the shell should treat recovery as conditional instead of settled.`;
  }

  return `${owner.providerName} is leading the recovery stack, but one proof lane is still soft enough that the shell should say so before sounding unanimous.`;
};

const getRepairTrigger = ({
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
  const reclaimRule = getReclaimRuleLabel(lineClearanceRuntime);
  const returnTrigger = getReturnTrigger(recoveryAuthorityRuntime);

  if (lineReleaseRuntime?.tone === 'recover' && releaseWitness) {
    return releaseWitness;
  }

  if (lineClearanceRuntime?.tone === 'recover' && reclaimRule) {
    return reclaimRule;
  }

  if (recoveryAuthorityRuntime?.tone === 'recover' && returnTrigger) {
    return returnTrigger;
  }

  if (owner?.warning) {
    return `Wait for ${owner.providerName} to clear its provider warning before recovery is narrated like consensus.`;
  }

  return returnTrigger
    ?? 'Only reclaim premium recovery language once provider proof, line posture, and continuity all agree on the same saved owner.';
};

const getSummary = ({
  tone,
  owner,
}: {
  tone: SurfaceRecoveryProofDissentRuntimeContract['dissents'][number]['tone'];
  owner: SavedProviderHealthEntry | null;
}) => {
  if (!owner) {
    return 'Recovery is still missing a trustworthy owner, so the shell should name the dissent instead of overclaiming progress.';
  }

  if (tone === 'recover') {
    return `${owner.providerName} is still being vetoed by a dissenting proof signal, so recovery should stay explicit and fail-closed.`;
  }

  if (tone === 'watch') {
    return `${owner.providerName} is the leading recovery owner, but one proof lane is still conditional enough that the shell should keep the dissent visible.`;
  }

  return `${owner.providerName} has the strongest recovery posture, and the dissent register is now down to conditional watch-only proof instead of a hard veto.`;
};

export const buildSavedProviderRecoveryProofDissentRuntime = ({
  contract,
  board,
  recoveryAuthorityRuntime,
  lineReleaseRuntime,
  lineClearanceRuntime,
}: {
  contract: SurfaceRecoveryProofDissentDefinition | null;
  board: SavedProviderHealthBoard;
  recoveryAuthorityRuntime: RecoveryAuthorityRuntime;
  lineReleaseRuntime: RecoveryLineReleaseRuntime;
  lineClearanceRuntime: RecoveryLineClearanceRuntime;
}): SurfaceRecoveryProofDissentRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getOwner({ board, recoveryAuthorityRuntime });
  const tone = getTone({ owner, lineReleaseRuntime, lineClearanceRuntime, recoveryAuthorityRuntime });

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: getSummary({ tone, owner }),
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    dissents: contract.dissents.map((entry) => ({
      label: entry.label,
      dissentingSignal: getDissentingSignal({ owner, lineReleaseRuntime, lineClearanceRuntime, recoveryAuthorityRuntime }),
      contradictedOwner: getContradictedOwner({ owner, recoveryAuthorityRuntime }),
      conflictSummary: getConflictSummary({ owner, lineReleaseRuntime, lineClearanceRuntime, recoveryAuthorityRuntime }),
      repairTrigger: getRepairTrigger({ owner, lineReleaseRuntime, lineClearanceRuntime, recoveryAuthorityRuntime }),
      tone,
      owner,
      ownerStatusLabel: getOwnerStatusLabel(owner),
    })),
  };
};
