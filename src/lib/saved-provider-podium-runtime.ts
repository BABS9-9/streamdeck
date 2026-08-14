import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceProviderPodiumRuntimeContract,
} from './types';

type SurfaceProviderPodiumDefinition = MockProviderManifest['surfaceProviderPodiums'][number];

const getCapacityLabel = (provider: SavedProviderHealthEntry | null) => {
  if (!provider) return 'No saved provider yet';
  if (provider.activeConnections === null || provider.maxConnections === null) return 'Capacity unknown';
  return `${provider.activeConnections}/${provider.maxConnections} lines in use`;
};

const pickSlotProviders = (board: SavedProviderHealthBoard) => {
  const owner = board.recommendedProvider ?? board.activeProvider ?? null;
  const standby = board.providers.find((provider) => (
    provider.providerId !== owner?.providerId
    && !provider.warning
  )) ?? board.providers.find((provider) => provider.providerId !== owner?.providerId) ?? null;
  const blocked = board.providers.find((provider) => (
    provider.providerId !== owner?.providerId
    && provider.providerId !== standby?.providerId
    && Boolean(provider.warning)
  )) ?? board.providers.find((provider) => (
    provider.providerId !== owner?.providerId
    && provider.providerId !== standby?.providerId
  )) ?? null;

  return [owner, standby, blocked];
};

const getPostureSummary = ({
  provider,
  board,
  tone,
}: {
  provider: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
  tone: SurfaceProviderPodiumDefinition['slots'][number]['tone'];
}) => {
  if (!provider) {
    return 'Save another provider to make this slot useful during fallback, validation drift, or line pressure.';
  }

  if (provider.warning) return provider.warning;
  if (provider.statusMessage) return provider.statusMessage;
  if (tone === 'recover' && board.recoveryRoute?.providerId === provider.providerId) {
    return board.recoveryRoute.detail;
  }

  return 'Provider posture is stable enough to stay visible on this surface.';
};

export const buildSavedProviderPodiumRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceProviderPodiumDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceProviderPodiumRuntimeContract | null => {
  if (!contract || board.providers.length === 0) return null;

  const slotProviders = pickSlotProviders(board);

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: contract.summary,
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    slots: contract.slots.slice(0, 3).map((slot, index) => {
      const provider = slotProviders[index] ?? null;

      return {
        ...slot,
        provider,
        capacityLabel: getCapacityLabel(provider),
        postureSummary: getPostureSummary({
          provider,
          board,
          tone: slot.tone,
        }),
      };
    }),
  };
};
