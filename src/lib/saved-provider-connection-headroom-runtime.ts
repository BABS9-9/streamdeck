import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceConnectionHeadroomRuntimeContract,
} from './types';

type SurfaceConnectionHeadroomDefinition = MockProviderManifest['surfaceConnectionHeadrooms'][number];
type ConnectionHeadroomTone = SurfaceConnectionHeadroomDefinition['lanes'][number]['tone'];

const getConnectionHeadroomOwner = (board: SavedProviderHealthBoard) =>
  board.activeProvider ?? board.recommendedProvider ?? null;

const getRemainingConnections = (owner: SavedProviderHealthEntry | null) => (
  owner?.activeConnections !== null
  && owner?.activeConnections !== undefined
  && owner?.maxConnections !== null
  && owner?.maxConnections !== undefined
    ? Math.max(owner.maxConnections - owner.activeConnections, 0)
    : null
);

const getConnectionHeadroomTone = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): ConnectionHeadroomTone => {
  if (!owner) return 'watch';

  const remainingConnections = getRemainingConnections(owner);
  if (remainingConnections === 0) return 'recover';
  if (remainingConnections === 1) return 'watch';
  if (owner.warning && board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'recover';
  }
  if (owner.warning || owner.status === 'checking' || owner.status === 'degraded') return 'watch';
  return 'ready';
};

const getOwnerStatusLabel = (owner: SavedProviderHealthEntry | null) => {
  if (!owner) return 'Fresh provider-line proof is missing, so the shell cannot honestly claim open launch room yet.';
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} still has enough provider health and line capacity to keep launch room explicit instead of assumed.`;
};

const getCapacityStatus = ({
  owner,
  tone,
  remainingConnections,
}: {
  owner: SavedProviderHealthEntry | null;
  tone: ConnectionHeadroomTone;
  remainingConnections: number | null;
}) => {
  if (!owner || remainingConnections === null) return 'Capacity proof pending';
  if (tone === 'recover') return 'Capacity is saturated';
  if (tone === 'watch') return 'Capacity is thinning';
  return `${remainingConnections} line${remainingConnections === 1 ? '' : 's'} safely open`;
};

const getCurrentWindow = ({
  owner,
  board,
  tone,
  remainingConnections,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: ConnectionHeadroomTone;
  remainingConnections: number | null;
}) => {
  if (!owner || remainingConnections === null) {
    return 'The shell is still waiting on fresh provider-line proof before it can say whether the next move is safely launchable.';
  }

  if (tone === 'ready') {
    return `${owner.providerName} still has ${remainingConnections} spare line${remainingConnections === 1 ? '' : 's'}, so the current CTA can stay premium while capacity truth remains visible.`;
  }

  if (tone === 'recover') {
    if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
      return `${owner.providerName} has no safe playback headroom left, so ${board.recommendedProvider.providerName} now owns the healthier next move.`;
    }
    return `${owner.providerName} is already at the account ceiling, so the shell must stop selling another direct launch as the easy next tap.`;
  }

  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `${owner.providerName} is still visible, but only ${remainingConnections} spare line${remainingConnections === 1 ? '' : 's'} remain and ${board.recommendedProvider.providerName} now reads as the healthier backup.`;
  }

  return `${owner.providerName} can still carry the next move, but only ${remainingConnections} spare line${remainingConnections === 1 ? '' : 's'} remain before capacity pressure outranks launch polish.`;
};

const getWarningTrigger = ({
  owner,
  board,
  remainingConnections,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  remainingConnections: number | null;
}) => {
  if (!owner || remainingConnections === null) {
    return 'Warn until fresh capacity proof lands for the active or healthiest saved provider.';
  }

  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `Warn as soon as ${board.recommendedProvider.providerName} has materially healthier spare capacity than ${owner.providerName}.`;
  }

  if (remainingConnections <= 1) {
    return `Warn immediately because ${owner.providerName} is down to ${remainingConnections} safe remaining line${remainingConnections === 1 ? '' : 's'}.`;
  }

  return `Warn as soon as ${owner.providerName} drops to one remaining line or fresh status checks soften the current headroom story.`;
};

const getBlockedState = ({
  owner,
  board,
  remainingConnections,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  remainingConnections: number | null;
}) => {
  if (!owner || remainingConnections === null) {
    return 'Hold premium launch language until the shell can verify current provider-line capacity again.';
  }

  if (remainingConnections === 0) {
    if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
      return `${owner.providerName} is saturated, so direct launch should stay blocked until ${board.recommendedProvider.providerName} takes over or capacity clears.`;
    }
    return `${owner.providerName} is saturated, so another direct launch attempt should stay blocked until line room returns.`;
  }

  if (owner.warning) {
    return owner.warning;
  }

  return `${owner.providerName} still has some room, but the shell should keep capacity pressure visible before another launch gets treated as routine.`;
};

const getRecommendedMove = ({
  owner,
  board,
  tone,
  remainingConnections,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: ConnectionHeadroomTone;
  remainingConnections: number | null;
}) => {
  if (!owner || remainingConnections === null) {
    return 'Refresh provider status first, then decide whether to keep the current owner or hand off to the healthiest saved source.';
  }

  if (tone === 'ready') {
    return `Keep ${owner.providerName} premium, but continue publishing line usage so capacity never becomes a hidden failure mode.`;
  }

  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `Promote ${board.recommendedProvider.providerName} before ${owner.providerName} turns thin or exhausted headroom into a misleading app-quality failure.`;
  }

  if (tone === 'recover') {
    return `Downgrade into watch-or-wait language until ${owner.providerName} regains safe line capacity.`;
  }

  return `Keep ${owner.providerName} visible, but downgrade the CTA into watched language until spare capacity grows again.`;
};

export const buildSavedProviderConnectionHeadroomRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceConnectionHeadroomDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceConnectionHeadroomRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getConnectionHeadroomOwner(board);
  const tone = getConnectionHeadroomTone({ owner, board });
  const remainingConnections = getRemainingConnections(owner);

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime capacity truth now derives from saved-provider line counts, status, and recovery posture instead of local ad hoc math.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    lanes: contract.lanes.map((lane) => ({
      ...lane,
      currentWindow: getCurrentWindow({
        owner,
        board,
        tone,
        remainingConnections,
      }),
      warningTrigger: getWarningTrigger({
        owner,
        board,
        remainingConnections,
      }),
      blockedState: getBlockedState({
        owner,
        board,
        remainingConnections,
      }),
      recommendedMove: getRecommendedMove({
        owner,
        board,
        tone,
        remainingConnections,
      }),
      tone,
      owner,
      ownerStatusLabel: getOwnerStatusLabel(owner),
      capacityStatus: getCapacityStatus({
        owner,
        tone,
        remainingConnections,
      }),
      activeConnections: owner?.activeConnections ?? null,
      maxConnections: owner?.maxConnections ?? null,
      remainingConnections,
    })),
  };
};
