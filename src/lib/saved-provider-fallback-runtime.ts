import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceFallbackEquivalenceRuntimeContract,
  SurfaceFallbackRankingRuntimeContract,
} from './types';

type SurfaceFallbackRankingDefinition = MockProviderManifest['surfaceFallbackRankingContracts'][number];
type SurfaceFallbackEquivalenceDefinition = MockProviderManifest['surfaceFallbackEquivalenceContracts'][number];
type FallbackTone = SurfaceFallbackRankingDefinition['rankings'][number]['tone'];

const getFallbackOwner = (board: SavedProviderHealthBoard) =>
  board.activeProvider ?? board.recommendedProvider ?? null;

const getFallbackLeader = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (!owner) return null;
  if (owner.warning && board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return board.recommendedProvider;
  }
  return owner;
};

const getFallbackTone = ({
  owner,
  leader,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  leader: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): FallbackTone => {
  if (!owner || !leader) return 'recover';
  if (owner.warning && leader.providerId !== owner.providerId) return 'recover';
  if (owner.warning || owner.status === 'checking' || leader.status === 'checking') return 'watch';
  if (board.recommendedProvider && board.recommendedProvider.providerId !== leader.providerId) return 'watch';
  return 'ready';
};

const getLeaderStatusLabel = ({
  owner,
  leader,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  leader: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (!leader) {
    return 'No saved provider currently owns fallback truth strongly enough to lead a premium rescue claim.';
  }

  if (!owner) {
    return `${leader.providerName} is the healthiest saved provider, but no active owner is set yet.`;
  }

  if (leader.providerId !== owner.providerId) {
    return `${owner.providerName} no longer owns the safest rescue order. ${leader.providerName} now leads the healthiest fallback path.`;
  }

  if (owner.warning) {
    return owner.warning;
  }

  if (board.headline?.detail) {
    return board.headline.detail;
  }

  return `${leader.providerName} still owns the current fallback story.`;
};

const getRescueOrder = ({
  owner,
  leader,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  leader: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (!leader) return '1. Validate a saved provider. 2. Restore provider trust. 3. Avoid pretending a rescue order exists yet.';

  const second = owner && owner.providerId !== leader.providerId
    ? owner.providerName
    : board.providers.find((provider) => provider.providerId !== leader.providerId)?.providerName ?? null;
  const third = board.providers.find((provider) =>
    provider.providerId !== leader.providerId
    && provider.providerId !== owner?.providerId
    && provider.providerId !== board.recommendedProvider?.providerId
  )?.providerName ?? null;

  const steps = [
    `1. ${leader.providerName} leads`,
    second ? `2. ${second} stays visible` : '2. Keep the current surface visible',
    third ? `3. ${third} only after recovery proof` : '3. Reconnect only after fallback proof breaks',
  ];

  return steps.join(' ');
};

const getRankingEvidence = ({
  owner,
  leader,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  leader: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (!leader) {
    return 'There is no validated provider ownership, so rescue order cannot honestly outrank reconnect yet.';
  }

  const headroom = leader.maxConnections && leader.activeConnections !== null
    ? `${leader.activeConnections}/${leader.maxConnections} lines in use`
    : 'line headroom still unproven';
  const warningDetail = owner?.warning
    ? ` Active owner warning: ${owner.warning}`
    : '';

  return `${leader.providerName} leads because ${leader.trustLabel.toLowerCase()} is strongest, ${headroom}, and saved-provider recovery truth currently ranks it ahead of the other ${Math.max(board.providers.length - 1, 0)} saved option${board.providers.length === 2 ? '' : 's'}.${warningDetail}`;
};

const getRerankTrigger = ({
  owner,
  leader,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  leader: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (!leader) {
    return 'Rerank as soon as any saved provider validates strongly enough to own a real rescue move.';
  }

  if (!owner) {
    return `Rerank once an active provider is chosen or ${leader.providerName} loses enough trust that another saved path becomes healthier.`;
  }

  if (leader.providerId !== owner.providerId) {
    return `Rerank if ${owner.providerName} recovers enough trust to retake the move or if ${leader.providerName} loses line headroom, auth stability, or expiry proof.`;
  }

  if (board.recoveryRoute?.detail) {
    return board.recoveryRoute.detail;
  }

  return `Rerank once another saved provider outranks ${leader.providerName} on trust, headroom, or recovery honesty.`;
};

const getEquivalentExperience = ({
  owner,
  leader,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  leader: SavedProviderHealthEntry | null;
  tone: FallbackTone;
}) => {
  if (!leader) {
    return 'Exact rescue cannot be promised because no saved provider currently owns the same destination.';
  }

  if (tone === 'ready') {
    return `${leader.providerName} can preserve the same launch destination without changing the visible move or hiding who owns it.`;
  }

  if (owner && leader.providerId !== owner.providerId) {
    return `${leader.providerName} can preserve the same overall intent, but the exact provider handoff is no longer invisible enough to call it unchanged.`;
  }

  return `${leader.providerName} can still carry most of the same destination, but the shell should keep rescue language visibly cautious.`;
};

const getApproximateExperience = ({
  owner,
  leader,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  leader: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (!leader) {
    return 'Any fallback is only approximate until a saved provider validates and the shell can point to a real recovery owner.';
  }

  if (!owner) {
    return `${leader.providerName} can restart the flow from the healthiest saved state, but the shell still owes a visible reconnect-style setup step.`;
  }

  if (leader.providerId !== owner.providerId) {
    return `${leader.providerName} preserves user intent better than a blind reconnect, but the rescue now changes provider ownership and should be framed as approximate continuity.`;
  }

  if (owner.warning) {
    return `${owner.providerName} still holds partial continuity, but warnings mean the shell should describe rescue as approximate until trust recovers.`;
  }

  if (board.recoveryRoute?.title) {
    return `${board.recoveryRoute.title} stays ready if exact sameness breaks and the surface needs a visible fallback handoff.`;
  }

  return `${leader.providerName} can keep rough momentum, but the shell should downgrade from “same move” the moment trust weakens.`;
};

const getRestartTrigger = ({
  owner,
  leader,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  leader: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (!leader) {
    return 'Treat the next move as an honest restart until a saved provider can prove continuity.';
  }

  if (!owner || leader.providerId !== owner.providerId) {
    return `Restart truth takes over if ${leader.providerName} can no longer preserve intent more honestly than a reconnect or if another provider becomes the only safe path.`;
  }

  if (board.recoveryRoute?.detail) {
    return board.recoveryRoute.detail;
  }

  return `Restart once ${leader.providerName} loses enough trust, auth stability, or line headroom that the shell can no longer defend the same destination.`;
};

const getEquivalenceStatus = ({
  tone,
  owner,
  leader,
}: {
  tone: FallbackTone;
  owner: SavedProviderHealthEntry | null;
  leader: SavedProviderHealthEntry | null;
}) => {
  if (!leader) return 'No continuity owner';
  if (tone === 'ready') return 'Same destination';
  if (owner && leader.providerId !== owner.providerId) return 'Visible provider handoff';
  if (tone === 'watch') return 'Approximate continuity';
  return 'Restart honesty';
};

export const buildSavedProviderFallbackRankingRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceFallbackRankingDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceFallbackRankingRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getFallbackOwner(board);
  const leader = getFallbackLeader({ owner, board });
  const tone = getFallbackTone({ owner, leader, board });

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime rescue order now derives from saved-provider trust, headroom, and recovery ownership instead of staying mock-only.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    rankings: contract.rankings.slice(0, 1).map((ranking) => ({
      ...ranking,
      currentLeader: leader
        ? `${leader.providerName} leads the current rescue order.`
        : 'No saved provider has validated strongly enough to lead.',
      rankingEvidence: getRankingEvidence({ owner, leader, board }),
      rerankTrigger: getRerankTrigger({ owner, leader, board }),
      tone,
      leader,
      leaderStatusLabel: getLeaderStatusLabel({ owner, leader, board }),
      rescueOrder: getRescueOrder({ owner, leader, board }),
    })),
  };
};

export const buildSavedProviderFallbackEquivalenceRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceFallbackEquivalenceDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceFallbackEquivalenceRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getFallbackOwner(board);
  const leader = getFallbackLeader({ owner, board });
  const tone = getFallbackTone({ owner, leader, board });

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime sameness, approximation, and restart truth now derive from saved-provider ownership and recovery posture instead of staying mock-only.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    equivalence: contract.equivalence.slice(0, 1).map((equivalence) => ({
      ...equivalence,
      equivalentExperience: getEquivalentExperience({ owner, leader, tone }),
      approximateExperience: getApproximateExperience({ owner, leader, board }),
      restartTrigger: getRestartTrigger({ owner, leader, board }),
      tone,
      leader,
      leaderStatusLabel: getLeaderStatusLabel({ owner, leader, board }),
      equivalenceStatus: getEquivalenceStatus({ tone, owner, leader }),
    })),
  };
};
