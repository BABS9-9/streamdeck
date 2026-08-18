import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceProviderStabilityRuntimeContract,
  SurfaceProviderStabilityRuntimeEntry,
} from './types';

type SurfaceProviderStabilityDefinition = MockProviderManifest['surfaceProviderStabilityContracts'][number];
type ProviderStabilityTone = SurfaceProviderStabilityDefinition['stabilities'][number]['tone'];

const getProviderStabilityOwner = (board: SavedProviderHealthBoard) =>
  board.activeProvider ?? board.recommendedProvider ?? null;

const getProviderStabilityTone = ({
  owner,
  board,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): ProviderStabilityTone => {
  if (!owner) return 'recover';
  if (owner.warning && board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return 'recover';
  }
  if (owner.warning || owner.status === 'checking' || owner.status === 'degraded') return 'watch';
  return 'ready';
};

const getOwnerStatusLabel = (owner: SavedProviderHealthEntry | null) => {
  if (!owner) {
    return 'No saved provider currently owns enough stable trust to let premium CTA language imply calm recovery conditions.';
  }
  if (owner.warning) return owner.warning;
  if (owner.statusMessage) return owner.statusMessage;
  return `${owner.providerName} still has enough trusted provider posture to keep stability claims attached to a real owner instead of wishful copy.`;
};

const getStabilityStatus = ({
  owner,
  board,
  tone,
}: {
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: ProviderStabilityTone;
}) => {
  if (!owner) return 'Stability ownership is unproven';
  if (tone === 'ready') return 'Current owner is boringly stable';
  if (board.recommendedProvider && board.recommendedProvider.providerId !== owner.providerId) {
    return `${board.recommendedProvider.providerName} is the steadier rescue owner`;
  }
  if (tone === 'watch') return 'Stability is improving but still brittle';
  return 'Rescue should stay primary';
};

const buildRuntimeText = ({
  screenId,
  label,
  tone,
  owner,
  board,
}: {
  screenId: SurfaceProviderStabilityDefinition['screenId'];
  label: string;
  tone: ProviderStabilityTone;
  owner: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  const ownerName = owner?.providerName ?? 'the current shell';
  const rescueName = board.recommendedProvider && board.recommendedProvider.providerId !== owner?.providerId
    ? board.recommendedProvider.providerName
    : null;

  if (screenId === 'login' && label === 'Keep current-provider login ownership') {
    return {
      stabilityThreshold: tone === 'ready'
        ? `${ownerName} still has clean enough auth, expiry, and line posture to keep Home ownership feeling routine instead of borrowed.`
        : rescueName
          ? `${ownerName} has not stayed calm long enough, so ${rescueName} remains the steadier owner until the same Home handoff survives repeated checks.`
          : `${ownerName} has not stayed calm long enough to let Login call the next Home handoff safely boring yet.`,
      toleratedVolatility: rescueName
        ? `A brief auth wobble is only tolerable while ${rescueName} remains visible as the healthier fallback and the same Home destination stays explicit.`
        : `A brief auth wobble is only tolerable while the same provider identity and same Home destination remain visibly intact.`,
      keepRescuePrimaryTrigger: rescueName
        ? `Keep rescue primary as soon as ${ownerName} stops holding the same safe Home story more steadily than ${rescueName}.`
        : `Keep rescue primary once auth, expiry posture, or line pressure make ${ownerName} explain the setup story more than simply carry it.`,
    };
  }

  if (screenId === 'home' && label === 'Keep featured browse ownership') {
    return {
      stabilityThreshold: tone === 'ready'
        ? `${ownerName} still keeps the hero, quick rails, and next launch attached to one calm browse story.`
        : rescueName
          ? `${ownerName} is still wobbling, so ${rescueName} remains the steadier browse owner until the same featured story survives multiple refreshes.`
          : `${ownerName} is still wobbling enough that Home cannot call the featured path fully stable yet.`,
      toleratedVolatility: rescueName
        ? `A short guide miss is only acceptable while ${rescueName} stays ready to preserve the same featured launch if live browse proof softens again.`
        : 'A short guide miss is only acceptable while the same featured title, same rail meaning, and same next-safe launch remain obvious.',
      keepRescuePrimaryTrigger: rescueName
        ? `Keep rescue primary once ${ownerName} needs more explanation than ${rescueName} to hold the same featured launch story.`
        : `Keep rescue primary once the hero or rail owner changes faster than the current provider can prove calm browse continuity.`,
    };
  }

  if (screenId === 'live' && label === 'Keep selected-card Play ownership') {
    return {
      stabilityThreshold: tone === 'ready'
        ? `${ownerName} still keeps preview, guide truth, and the next Play tap aligned around the same selected card.`
        : rescueName
          ? `${ownerName} has not stayed calm on the same channel long enough, so ${rescueName} remains the steadier Play owner for now.`
          : `${ownerName} has not stayed calm on the same selected card long enough to reclaim boring Play ownership yet.`,
      toleratedVolatility: rescueName
        ? `A short preview wobble is only acceptable while ${rescueName} stays visible as the safer owner of the same surf intent.`
        : 'A short preview wobble is only acceptable while the same channel identity and same safest Play owner stay obvious.',
      keepRescuePrimaryTrigger: rescueName
        ? `Keep rescue primary once ${ownerName} cannot hold the same card as safely as ${rescueName} across repeated checks.`
        : `Keep rescue primary once preview, guide confidence, or line posture make the same selected card ambiguous again.`,
    };
  }

  return {
    stabilityThreshold: tone === 'ready'
      ? `${ownerName} can keep owning this surface while the same next move stays calmly repeatable.`
      : rescueName
        ? `${ownerName} has not earned stable ownership back yet, so ${rescueName} remains the healthier rescue owner.`
        : `${ownerName} has not earned stable ownership back yet.`,
    toleratedVolatility: rescueName
      ? `Minor jitter is only acceptable while ${rescueName} remains ready to preserve the same user intent without surprise.`
      : 'Minor jitter is only acceptable while the same provider meaning and same next move remain visibly intact.',
    keepRescuePrimaryTrigger: rescueName
      ? `Keep rescue primary once ${ownerName} becomes less steady than ${rescueName} at preserving the same next move.`
      : `Keep rescue primary once the current provider stops preserving the same user intent without explanation.`,
  };
};

export const buildSavedProviderStabilityRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceProviderStabilityDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceProviderStabilityRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const owner = getProviderStabilityOwner(board);
  const tone = getProviderStabilityTone({ owner, board });

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: `${contract.summary} Runtime stability truth now derives from saved-provider trust, status, and rescue posture instead of staying mock-only beside premium CTAs.`,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    stabilities: contract.stabilities.map((stability): SurfaceProviderStabilityRuntimeEntry => ({
      ...stability,
      ...buildRuntimeText({
        screenId: contract.screenId,
        label: stability.label,
        tone,
        owner,
        board,
      }),
      tone,
      owner,
      ownerStatusLabel: getOwnerStatusLabel(owner),
      stabilityStatus: getStabilityStatus({ owner, board, tone }),
    })),
  };
};
