import {
  MockProviderManifest,
  SavedProviderHealthBoard,
  SavedProviderHealthEntry,
  SurfaceRecoveryAuthorityRuntimeContract,
} from './types';

type SurfaceRecoveryAuthorityDefinition = MockProviderManifest['surfaceRecoveryAuthorityContracts'][number];

const getAuthorityProvider = (board: SavedProviderHealthBoard) => {
  if (board.recoveryRoute?.providerId) {
    return board.byProviderId[board.recoveryRoute.providerId] ?? board.recommendedProvider ?? board.activeProvider ?? null;
  }

  return board.activeProvider ?? board.recommendedProvider ?? board.providers[0] ?? null;
};

const getTone = ({
  authorityProvider,
  activeProvider,
  board,
}: {
  authorityProvider: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}): SurfaceRecoveryAuthorityRuntimeContract['tone'] => {
  if (!authorityProvider) return 'recover';
  if (!activeProvider) return authorityProvider.warning ? 'watch' : 'ready';
  if (authorityProvider.providerId !== activeProvider.providerId) return 'recover';
  if (authorityProvider.warning || board.warningCount > 0) return 'watch';
  return 'ready';
};

const getAuthorityOwner = ({
  authorityProvider,
  activeProvider,
}: {
  authorityProvider: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
}) => {
  if (!authorityProvider) {
    return 'No saved provider has earned recovery authority yet';
  }

  if (activeProvider && authorityProvider.providerId === activeProvider.providerId) {
    return `${authorityProvider.providerName} still owns the next honest move`;
  }

  return `${authorityProvider.providerName} currently owns the honest recovery move`;
};

const getActiveOwner = (activeProvider: SavedProviderHealthEntry | null) => (
  activeProvider
    ? `${activeProvider.providerName} still owns the visible shell`
    : 'No provider currently owns the visible shell'
);

const getFallbackReason = ({
  authorityProvider,
  activeProvider,
  board,
}: {
  authorityProvider: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (!authorityProvider) {
    return 'Recovery stays fail-closed until one saved provider can prove a safer next move.';
  }

  if (!activeProvider || authorityProvider.providerId === activeProvider.providerId) {
    return authorityProvider.warning
      ? authorityProvider.warning
      : authorityProvider.authoritySummary;
  }

  return board.recoveryRoute?.detail
    || authorityProvider.warning
    || `${authorityProvider.providerName} outranks ${activeProvider.providerName} for the next safe move right now.`;
};

const getReturnTrigger = ({
  authorityProvider,
  activeProvider,
}: {
  authorityProvider: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
}) => {
  if (!authorityProvider) {
    return 'Wait for stable auth, headroom, and one clear owner before handing control back.';
  }

  if (!activeProvider) {
    return `Let ${authorityProvider.providerName} stay primary until a different provider can prove a cleaner next move.`;
  }

  if (authorityProvider.providerId === activeProvider.providerId) {
    return `Keep ${activeProvider.providerName} primary only while auth, headroom, and trust still support the same next move.`;
  }

  return `Hand ownership back to ${activeProvider.providerName} only after it restores stable auth, spare line headroom, and the same provider-backed next move.`;
};

const getDetail = ({
  authorityProvider,
  activeProvider,
  board,
}: {
  authorityProvider: SavedProviderHealthEntry | null;
  activeProvider: SavedProviderHealthEntry | null;
  board: SavedProviderHealthBoard;
}) => {
  if (!authorityProvider) {
    return 'StreamDeck should fail closed on recovery authority until one saved provider can explain the next safe move without guesswork.';
  }

  if (!activeProvider) {
    return `${authorityProvider.providerName} is the clearest saved recovery owner right now, so the shell can keep one honest next move visible even before an active provider is set.`;
  }

  if (authorityProvider.providerId !== activeProvider.providerId) {
    return `${activeProvider.providerName} still owns the visible shell, but ${authorityProvider.providerName} now owns the next honest recovery move. StreamDeck should keep that split explicit until the original owner clears the return trigger.`;
  }

  return `${activeProvider.providerName} still owns both the visible shell and the next honest move, but the recovery ledger should stay visible so fallback cannot silently take over later.`;
};

export const buildSavedProviderRecoveryAuthorityRuntime = ({
  contract,
  board,
}: {
  contract: SurfaceRecoveryAuthorityDefinition | null;
  board: SavedProviderHealthBoard;
}): SurfaceRecoveryAuthorityRuntimeContract | null => {
  if (!contract || contract.screenId === 'player' || board.providers.length === 0) return null;

  const authorityProvider = getAuthorityProvider(board);

  return {
    screenId: contract.screenId,
    title: contract.title,
    summary: contract.summary,
    authorityOwner: getAuthorityOwner({
      authorityProvider,
      activeProvider: board.activeProvider,
    }),
    activeOwner: getActiveOwner(board.activeProvider),
    fallbackReason: getFallbackReason({
      authorityProvider,
      activeProvider: board.activeProvider,
      board,
    }),
    returnTrigger: getReturnTrigger({
      authorityProvider,
      activeProvider: board.activeProvider,
    }),
    detail: getDetail({
      authorityProvider,
      activeProvider: board.activeProvider,
      board,
    }),
    tone: getTone({
      authorityProvider,
      activeProvider: board.activeProvider,
      board,
    }),
    providerCount: board.providers.length,
    activeProviderId: board.activeProvider?.providerId ?? null,
    recommendedProviderId: board.recommendedProvider?.providerId ?? null,
    authorityProviderId: authorityProvider?.providerId ?? null,
  };
};
