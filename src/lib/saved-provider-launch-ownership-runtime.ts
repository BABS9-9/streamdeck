import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceLaunchOwnershipRuntimeContract,
} from './types';

type SurfaceLaunchOwnershipDefinition = MockProviderManifest['surfaceLaunchOwnerships'][number];
type LaunchOwnershipTone = SurfaceLaunchOwnershipDefinition['owners'][number]['tone'];

const getLaunchOwnershipOwner = (board: SavedProviderHealthBoard) =>
  board.activeProvider ?? board.recommendedProvider ?? null;

const getLaunchOwnershipTone = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): LaunchOwnershipTone => {
  if (!owner) return 'recover';
  if (owner.warning && board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'recover';
  }
  if (owner.warning || owner.status === 'checking' || owner.status === 'degraded') return 'watch';
  return 'ready';
};

const getOwnerStatusLabel = (owner: SavedProviderHealthEntry | null) => {
  if (!owner) {
    return 'No saved provider currently owns enough launch proof to keep the next move honest.';
  }
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} still owns the next move strongly enough to keep launch ownership boring and explicit.`;
};

const getCurrentOwner = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: LaunchOwnershipTone;
}) => {
  if (!owner) {
    return 'No provider currently owns the next tap cleanly enough for the shell to imply ordinary continuity.';
  }

  if (tone === 'ready') {
    return `${owner.providerName} still owns the next tap because provider trust, auth posture, and line headroom are all still aligned behind the active move.`;
  }

  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `${owner.providerName} is still the visible source, but ${board.recommendedProvider.providerName} now owns the safer next tap until the original path re-earns trust.`;
  }

  return `${owner.providerName} still owns the visible path, but only with watched language because provider proof is softening.`;
};

const getOwnershipProof = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: LaunchOwnershipTone;
}) => {
  if (!owner) {
    return 'Ownership proof is missing because no saved provider can currently defend who should own the next move.';
  }

  if (tone === 'ready') {
    return `${owner.providerName} remains the active or healthiest saved provider with stable trust, readable auth posture, and no stronger rescue owner waiting in the wings.`;
  }

  if (owner.warning) {
    return owner.warning;
  }

  if (board.recoveryRoute?.detail) {
    return board.recoveryRoute.detail;
  }

  return `${owner.providerName} still has enough provider context to stay visible, but not enough proof to hide that ownership may need to hand off soon.`;
};

const getTransferTrigger = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (!owner) {
    return 'Transfer ownership immediately once any saved provider can honestly prove it owns the next move.';
  }

  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `Transfer ownership once ${board.recommendedProvider.providerName} is the only honest recovery owner or ${owner.providerName} can no longer defend the current move without caveats.`;
  }

  if (board.recoveryRoute?.detail) {
    return board.recoveryRoute.detail;
  }

  return `Transfer ownership as soon as ${owner.providerName} loses enough trust, auth stability, or line headroom that another saved provider owns the safer next tap.`;
};

const getOwnershipStatus = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: LaunchOwnershipTone;
}) => {
  if (!owner) return 'No launch owner';
  if (tone === 'ready') return 'Launch owner intact';
  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'Launch ownership is handing off';
  }
  if (tone === 'watch') return 'Launch ownership is conditional';
  return 'Rescue owns the move';
};

export const buildSavedProviderLaunchOwnershipRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceLaunchOwnershipDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceLaunchOwnershipRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getLaunchOwnershipOwner(board);

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime launch-owner truth now derives from saved-provider trust, status, and recovery posture instead of staying mock-only.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    owners: contract.owners.slice(0, 1).map((launchOwner) => {
      const tone = getLaunchOwnershipTone({ owner, board });

      return {
        ...launchOwner,
        currentOwner: getCurrentOwner({ owner, board, tone }),
        ownershipProof: getOwnershipProof({ owner, board, tone }),
        transferTrigger: getTransferTrigger({ owner, board }),
        tone,
        owner,
        ownerStatusLabel: getOwnerStatusLabel(owner),
        ownershipStatus: getOwnershipStatus({ owner, board, tone }),
      };
    }),
  };
};
