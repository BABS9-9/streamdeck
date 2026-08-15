import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceFallbackExpiryRuntimeContract,
} from './types';

type SurfaceFallbackExpiryDefinition = MockProviderManifest['surfaceFallbackExpiryContracts'][number];
type FallbackExpiryTone = SurfaceFallbackExpiryDefinition['expiries'][number]['tone'];

const getFallbackExpiryOwner = (board: SavedProviderHealthBoard) =>
  board.activeProvider ?? board.recommendedProvider ?? null;

const getFallbackExpiryTone = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): FallbackExpiryTone => {
  if (!owner) return 'recover';
  if (owner.warning && board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'recover';
  }
  if (owner.warning || owner.status === 'checking' || owner.status === 'degraded') return 'watch';
  return 'ready';
};

const getOwnerStatusLabel = (owner: SavedProviderHealthEntry | null) => {
  if (!owner) return 'No saved provider currently owns fallback-expiry truth strongly enough to defend sameness.';
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} still owns the current sameness window without visible rescue decay.`;
};

const getPreservationWindow = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: FallbackExpiryTone;
}) => {
  if (!owner) {
    return 'No preservation window can be claimed until a saved provider proves who owns the next move.';
  }

  if (tone === 'ready') {
    return `${owner.providerName} can still defend the same move because trust, auth stability, expiry posture, and line headroom all point at one uninterrupted owner.`;
  }

  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `${owner.providerName} is still visible, but the sameness window is shrinking because ${board.recommendedProvider.providerName} now reads as the safer rescue owner.`;
  }

  return `${owner.providerName} still carries some continuity, but the shell should treat the same-move window as aging until provider proof fully settles again.`;
};

const getAgingProof = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: FallbackExpiryTone;
}) => {
  if (!owner) {
    return 'Aging proof is already exhausted because no saved provider can prove continuity ownership.';
  }

  if (tone === 'ready') {
    return `${owner.providerName} still posts stable provider proof, so fallback can describe the rescue as the same move without softening the claim.`;
  }

  if (owner.warning) {
    return owner.warning;
  }

  if (board.recoveryRoute?.detail) {
    return board.recoveryRoute.detail;
  }

  return `${owner.providerName} has enough context to preserve rough momentum, but not enough clean proof to keep calling the rescue exact forever.`;
};

const getExpiryTrigger = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (!owner) {
    return 'Expire sameness immediately until a saved provider can prove the same destination honestly.';
  }

  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `Expire sameness once ${board.recommendedProvider.providerName} becomes the only honest rescue owner or ${owner.providerName} can no longer defend the original move without caveats.`;
  }

  if (board.recoveryRoute?.detail) {
    return board.recoveryRoute.detail;
  }

  return `Expire sameness as soon as ${owner.providerName} loses enough trust, auth stability, expiry proof, or line headroom that the shell owes a visibly different rescue story.`;
};

const getExpiryStatus = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: FallbackExpiryTone;
}) => {
  if (!owner) return 'No continuity owner';
  if (tone === 'ready') return 'Sameness window healthy';
  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'Rescue owner has shifted';
  }
  if (tone === 'watch') return 'Sameness window aging';
  return 'Sameness window expired';
};

export const buildSavedProviderFallbackExpiryRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceFallbackExpiryDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceFallbackExpiryRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getFallbackExpiryOwner(board);

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime preservation-window truth now derives from saved-provider ownership, trust, and recovery posture instead of staying mock-only.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    expiries: contract.expiries.slice(0, 1).map((expiry) => {
      const tone = getFallbackExpiryTone({ owner, board });

      return {
        ...expiry,
        preservationWindow: getPreservationWindow({ owner, board, tone }),
        agingProof: getAgingProof({ owner, board, tone }),
        expiryTrigger: getExpiryTrigger({ owner, board }),
        tone,
        owner,
        ownerStatusLabel: getOwnerStatusLabel(owner),
        expiryStatus: getExpiryStatus({ owner, board, tone }),
      };
    }),
  };
};
