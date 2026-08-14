import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceHoldReceiptRuntimeContract,
} from './types';

type SurfaceHoldReceiptDefinition = MockProviderManifest['surfaceHoldReceipts'][number];
type HoldTone = SurfaceHoldReceiptDefinition['holds'][number]['tone'];

const getHoldTone = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): HoldTone => {
  if (!owner) return 'recover';
  if (owner.warning && board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'recover';
  }
  if (owner.warning) return 'watch';
  if (owner.status === 'healthy' || owner.trustScore >= 90) return 'ready';
  if (owner.status === 'checking' || owner.status === 'degraded') return 'watch';
  return 'recover';
};

const getOwnerStatusLabel = (owner: SavedProviderHealthEntry | null) => {
  if (!owner) return 'No saved owner is validated yet';
  if (owner.statusMessage) return owner.statusMessage;
  if (owner.warning) return owner.warning;
  return `${owner.providerName} is currently stable enough to keep this surface moving honestly.`;
};

const getBlocker = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: HoldTone;
}) => {
  if (!owner) {
    return 'No saved provider has been validated strongly enough to own the premium move yet.';
  }

  if (owner.warning) return owner.warning;

  if (tone === 'watch' && owner.status === 'checking') {
    return `${owner.providerName} is still refreshing its provider proof, so premium motion should stay visibly cautious.`;
  }

  if (tone === 'recover' && board.recoveryRoute?.providerId && board.recoveryRoute.providerId !== owner.providerId) {
    return board.recoveryRoute.detail;
  }

  return `No runtime blocker is active. ${owner.providerName} still owns the next move.`;
};

const getClearanceProof = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: HoldTone;
}) => {
  if (!owner) {
    return 'Save and validate at least one provider so runtime ownership exists before the premium CTA leads the user forward.';
  }

  if (tone === 'ready') {
    return `Keep ${owner.providerName} healthy on the saved-provider board so the premium CTA can stay premium without handoff theater.`;
  }

  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `Switch runtime ownership to ${board.recommendedProvider.providerName} or restore ${owner.providerName} until the saved-provider board clears the active warning.`;
  }

  return `Refresh ${owner.providerName} until auth, expiry, or line-pressure warnings clear on the saved-provider board.`;
};

const getRecoveryOwner = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (board.recoveryRoute?.title) return board.recoveryRoute.title;
  if (board.recommendedProvider?.providerName) return board.recommendedProvider.providerName;
  if (owner?.providerName) return owner.providerName;
  return 'No saved recovery owner yet';
};

export const buildSavedProviderHoldReceiptRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceHoldReceiptDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceHoldReceiptRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = board.activeProvider ?? board.recommendedProvider ?? null;

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime blocker, clearance, and recovery ownership now derive from the saved-provider health board instead of staying mock-only.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    holds: contract.holds.slice(0, 1).map((hold) => {
      const tone = getHoldTone({ owner, board });

      return {
        ...hold,
        blocker: getBlocker({ owner, board, tone }),
        clearanceProof: getClearanceProof({ owner, board, tone }),
        recoveryOwner: getRecoveryOwner({ owner, board }),
        tone,
        owner,
        ownerStatusLabel: getOwnerStatusLabel(owner),
      };
    }),
  };
};
