import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceLineReleaseWitnessRuntimeContract,
} from './types';

type SurfaceLineReleaseWitnessDefinition = MockProviderManifest['surfaceLineReleaseWitnessContracts'][number];

const getRemainingConnections = (provider: SavedProviderHealthEntry | null) => (
  provider?.activeConnections !== null
  && provider?.activeConnections !== undefined
  && provider?.maxConnections !== null
  && provider?.maxConnections !== undefined
    ? Math.max(provider.maxConnections - provider.activeConnections, 0)
    : null
);

const getTone = ({
  owner,
  remainingConnections,
}: {
  owner: SavedProviderHealthEntry | null;
  remainingConnections: number | null;
}): SurfaceLineReleaseWitnessRuntimeContract['tone'] => {
  if (!owner || remainingConnections === null) return 'watch';
  if (remainingConnections === 0) return 'recover';
  if (remainingConnections === 1 || owner.warning || owner.status === 'checking' || owner.status === 'degraded') return 'watch';
  return 'ready';
};

const getReleaseWitness = ({
  owner,
  board,
  remainingConnections,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  remainingConnections: number | null;
}) => {
  if (!owner || remainingConnections === null) {
    return 'Fresh provider-line proof has to land before StreamDeck can honestly say the next launch is clear.';
  }

  if (remainingConnections === 0) {
    if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
      return `One active line must clear on ${owner.providerName}, or ${board.recommendedProvider.providerName} must take ownership before premium launch language returns.`;
    }
    return `One active line must clear on ${owner.providerName} before the current owner can honestly reclaim launch authority.`;
  }

  if (remainingConnections === 1) {
    return `${owner.providerName} still has one spare line, so the shell must keep the release trigger visible before another launch spends the last safe opening.`;
  }

  return `${owner.providerName} still has visible launch room, but StreamDeck should keep the exact release trigger legible instead of waiting until the cap is already hit.`;
};

const getFallbackOwner = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner?.providerId) {
    return board.recommendedProvider.providerName;
  }

  if (owner) {
    return `${owner.providerName} stays primary until cap pressure becomes explicit`;
  }

  return 'No fallback owner is credible yet';
};

const getCapStatus = ({
  owner,
  remainingConnections,
  saturatedProviderCount,
}: {
  owner: SavedProviderHealthEntry | null;
  remainingConnections: number | null;
  saturatedProviderCount: number;
}) => {
  if (!owner || remainingConnections === null) {
    return 'Capacity proof pending';
  }

  if (remainingConnections === 0) {
    return `${owner.activeConnections ?? 0}/${owner.maxConnections ?? 0} lines in use · ${saturatedProviderCount} provider${saturatedProviderCount === 1 ? '' : 's'} saturated`;
  }

  return `${owner.activeConnections ?? 0}/${owner.maxConnections ?? 0} lines in use · ${remainingConnections} line${remainingConnections === 1 ? '' : 's'} open`;
};

const getDetail = ({
  owner,
  board,
  remainingConnections,
  saturatedProviderCount,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  remainingConnections: number | null;
  saturatedProviderCount: number;
}) => {
  if (!owner || remainingConnections === null) {
    return 'Saved-provider switching can stay visible, but cap-sensitive ownership should remain provisional until StreamDeck can verify current line usage again.';
  }

  if (remainingConnections === 0) {
    if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
      return `${owner.providerName} is at the account ceiling, so StreamDeck should fail closed on another direct launch and point the user at ${board.recommendedProvider.providerName} instead of blaming the selected title or channel.`;
    }
    return `${owner.providerName} is at the account ceiling, so StreamDeck should downgrade into wait-or-reconnect language until a real line-release witness lands.`;
  }

  if (remainingConnections === 1) {
    return `${owner.providerName} still owns the next move, but only one safe launch remains before the shell has to stop implying that retries are interchangeable with honest headroom.`;
  }

  return `${owner.providerName} still has enough room to own the next move, while ${saturatedProviderCount > 0 ? `${saturatedProviderCount} other saved provider${saturatedProviderCount === 1 ? ' stays' : 's stay'} visibly capped` : 'no saved provider is currently pinned at the account ceiling'}.`;
};

export const buildSavedProviderLineReleaseRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceLineReleaseWitnessDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceLineReleaseWitnessRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = board.activeProvider ?? board.recommendedProvider ?? null;
  const remainingConnections = getRemainingConnections(owner);
  const saturatedProviders = board.providers.filter((provider) => {
    const remaining = getRemainingConnections(provider);
    return remaining !== null && remaining <= 0;
  });
  const saturatedProviderCount = saturatedProviders.length;
  const tone = getTone({ owner, remainingConnections });
  const fallbackProvider = board.recommendedProvider && board.recommendedProvider.providerId !== owner?.providerId
    ? board.recommendedProvider
    : null;

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: contract.summary,
    currentOwner: owner ? `${owner.providerName} (${owner.trustLabel})` : contract.witnesses[0]?.saturatedOwner ?? 'No verified owner',
    releaseWitness: getReleaseWitness({
      owner,
      board,
      remainingConnections,
    }),
    fallbackOwner: getFallbackOwner({
      owner,
      board,
    }),
    capStatus: getCapStatus({
      owner,
      remainingConnections,
      saturatedProviderCount,
    }),
    detail: getDetail({
      owner,
      board,
      remainingConnections,
      saturatedProviderCount,
    }),
    tone,
    providerCount: board.providers.length,
    saturatedProviderCount,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    fallbackProviderId: fallbackProvider?.providerId ?? null,
  };
};
