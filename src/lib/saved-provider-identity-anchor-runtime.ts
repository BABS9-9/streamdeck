import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceIdentityAnchorRuntimeContract,
} from './types';

type SurfaceIdentityAnchorDefinition = MockProviderManifest['surfaceIdentityAnchors'][number];
type IdentityAnchorTone = SurfaceIdentityAnchorDefinition['anchors'][number]['tone'];

const getIdentityAnchorOwner = (board: SavedProviderHealthBoard) =>
  board.activeProvider ?? board.recommendedProvider ?? null;

const getIdentityAnchorTone = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): IdentityAnchorTone => {
  if (!owner) return 'recover';
  if (owner.warning && board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'recover';
  }
  if (owner.warning || owner.status === 'checking' || owner.status === 'degraded') return 'watch';
  return 'ready';
};

const getOwnerStatusLabel = (owner: SavedProviderHealthEntry | null) => {
  if (!owner) {
    return 'No saved provider currently owns enough continuity to keep the source identity honest beside the premium CTA.';
  }
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} still owns the active move strongly enough to keep source identity visible without rescue spin.`;
};

const getMustStayVisible = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: IdentityAnchorTone;
}) => {
  if (!owner) {
    return 'Show that the current move has no stable provider owner yet, so the shell cannot imply continuity it has not earned.';
  }

  if (tone === 'ready') {
    return `${owner.providerName} stays visible as the current owner because auth, expiry posture, and line headroom still support one readable provider identity.`;
  }

  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `${owner.providerName} must stay visible as the fading owner while ${board.recommendedProvider.providerName} is named explicitly as the healthier rescue source.`;
  }

  return `${owner.providerName} must stay on-screen as the source under strain so degraded continuity does not get mistaken for anonymous premium motion.`;
};

const getPreservesMeaning = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: IdentityAnchorTone;
}) => {
  if (!owner) {
    return 'Meaning is preserved only by admitting that provider ownership is unresolved until a saved source proves it can lead safely.';
  }

  if (tone === 'ready') {
    return `${owner.providerName} keeps the CTA tied to one accountable provider, so recovery context and user expectation still point at the same source.`;
  }

  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `Meaning is preserved by naming the handoff from ${owner.providerName} to ${board.recommendedProvider.providerName} instead of letting rescue erase where the move started.`;
  }

  return `${owner.providerName} still gives the user one accountable source to judge, even while the shell downgrades certainty and warns that rescue posture is softening.`;
};

const getBreakTrigger = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (!owner) {
    return 'Identity breaks immediately until a saved provider can prove who owns the next move and what source the user is trusting.';
  }

  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `Restate identity as soon as ${board.recommendedProvider.providerName} becomes the only honest rescue owner or ${owner.providerName} can no longer defend the original move without caveats.`;
  }

  if (board.recoveryRoute?.detail) {
    return board.recoveryRoute.detail;
  }

  return `Restate identity the moment ${owner.providerName} loses enough trust, auth stability, expiry proof, or line headroom that the CTA would otherwise hide who really owns the move.`;
};

const getIdentityStatus = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: IdentityAnchorTone;
}) => {
  if (!owner) return 'No accountable owner';
  if (tone === 'ready') return 'Owner identity intact';
  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'Owner identity is handing off';
  }
  if (tone === 'watch') return 'Owner identity softening';
  return 'Owner identity must be restated';
};

export const buildSavedProviderIdentityAnchorRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceIdentityAnchorDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceIdentityAnchorRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getIdentityAnchorOwner(board);

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime owner visibility, meaning preservation, and handoff restatement now derive from the saved-provider health board instead of staying mock-only.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    anchors: contract.anchors.slice(0, 1).map((anchor) => {
      const tone = getIdentityAnchorTone({ owner, board });

      return {
        ...anchor,
        mustStayVisible: getMustStayVisible({ owner, board, tone }),
        preservesMeaning: getPreservesMeaning({ owner, board, tone }),
        breakTrigger: getBreakTrigger({ owner, board }),
        tone,
        owner,
        ownerStatusLabel: getOwnerStatusLabel(owner),
        identityStatus: getIdentityStatus({ owner, board, tone }),
      };
    }),
  };
};
