import {
  ProviderSwitchContext,
  SavedProviderHealthBoard,
  SurfaceMultiConnectionCustodyRuntimeContract,
  MockProviderManifest,
} from './types';

type SurfaceMultiConnectionCustodyDefinition = MockProviderManifest['surfaceMultiConnectionCustodyContracts'][number];

type BuildSurfaceMultiConnectionCustodyRuntimeArgs = {
  contract: SurfaceMultiConnectionCustodyDefinition | null;
  screenId: SurfaceMultiConnectionCustodyRuntimeContract['screenId'];
  board: SavedProviderHealthBoard;
  lastSwitchContext?: ProviderSwitchContext | null;
  featuredTitle?: string | null;
  selectedTitle?: string | null;
  resumeTitle?: string | null;
};

const pickTone = (board: SavedProviderHealthBoard): SurfaceMultiConnectionCustodyRuntimeContract['tone'] => {
  if (!board.activeProvider) return 'recover';
  if (board.activeProvider.status === 'healthy') return 'ready';
  if (board.activeProvider.status === 'checking' || board.activeProvider.status === 'degraded') return 'watch';
  return 'recover';
};

const buildWitness = ({
  screenId,
  lastSwitchContext,
  featuredTitle,
  selectedTitle,
  resumeTitle,
}: BuildSurfaceMultiConnectionCustodyRuntimeArgs) => {
  if (lastSwitchContext?.fromProviderId && lastSwitchContext?.toProviderId) {
    return `Latest handoff came from ${lastSwitchContext.fromProviderId} to ${lastSwitchContext.toProviderId}${lastSwitchContext.reason ? ` via ${lastSwitchContext.reason}` : ''}.`;
  }

  if (screenId === 'home' && featuredTitle) {
    return `Hero custody is still pinned to ${featuredTitle}.`;
  }

  if (screenId === 'live' && selectedTitle) {
    return `Selected-card custody is still pinned to ${selectedTitle}.`;
  }

  if (resumeTitle) {
    return `Resume custody is still pinned to ${resumeTitle}.`;
  }

  return 'No prior provider handoff has displaced the current owner yet.';
};

export const buildSurfaceMultiConnectionCustodyRuntime = ({
  contract,
  screenId,
  board,
  lastSwitchContext = null,
  featuredTitle = null,
  selectedTitle = null,
  resumeTitle = null,
}: BuildSurfaceMultiConnectionCustodyRuntimeArgs): SurfaceMultiConnectionCustodyRuntimeContract | null => {
  if (!contract) return null;

  const primary = contract.custody[0];
  const secondary = contract.custody[1];
  const activeProvider = board.activeProvider;
  const standbyProvider = board.recommendedProvider && board.recommendedProvider.providerId !== activeProvider?.providerId
    ? board.recommendedProvider
    : board.providers.find((provider) => provider.providerId !== activeProvider?.providerId) ?? null;

  return {
    screenId,
    currentOwner: activeProvider
      ? `${activeProvider.providerName} (${activeProvider.trustLabel})`
      : primary?.owner ?? 'No active provider owner',
    standbyOwner: standbyProvider
      ? `${standbyProvider.providerName} (${standbyProvider.trustLabel})`
      : secondary?.owner ?? 'No standby provider',
    carriesForward: primary?.carriesForward ?? 'Keep the same provider owner and current surface meaning attached to the next move.',
    breaksWhen: secondary?.breaksWhen ?? primary?.breaksWhen ?? 'Break custody when a healthier saved provider becomes the only honest owner.',
    switchWitness: buildWitness({
      contract,
      screenId,
      board,
      lastSwitchContext,
      featuredTitle,
      selectedTitle,
      resumeTitle,
    }),
    detail: activeProvider
      ? `${activeProvider.providerName} currently owns the next move while ${board.providers.length > 1 ? 'saved-provider standby logic stays visible' : 'no alternate provider is warm enough to take custody yet'}.`
      : 'No active provider owns the next move yet, so the shell should stay explicit about which saved provider would take custody first.',
    tone: pickTone(board),
    providerCount: board.providers.length,
  };
};
