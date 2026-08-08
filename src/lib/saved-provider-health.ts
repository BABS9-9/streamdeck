import { getProviderRecoveryWarning, getProviderTrustLabel } from './provider-recovery';
import { getProviderTrustScore } from './provider-trust';
import { ConnectionStatus, SavedConnection, SavedProviderHealthBoard, SavedProviderHealthEntry, SavedProviderHealthSignal } from './types';

type RecoverySurface = 'login' | 'home' | 'live' | 'settings';

const getStatusState = (status?: ConnectionStatus | null): ConnectionStatus['state'] => status?.state || 'idle';

const buildProviderHealthEntry = ({
  connection,
  status,
  activeConnectionId,
}: {
  connection: SavedConnection;
  status?: ConnectionStatus | null;
  activeConnectionId?: string | null;
}): SavedProviderHealthEntry => {
  const trustScore = getProviderTrustScore(connection, status);
  const warning = getProviderRecoveryWarning(connection, status || undefined);

  return {
    providerId: connection.id,
    providerName: connection.name,
    isActive: connection.id === activeConnectionId,
    trustScore,
    trustLabel: getProviderTrustLabel(trustScore),
    warning,
    status: getStatusState(status),
    statusMessage: status?.message || null,
    activeConnections: connection.lastAuthSummary?.activeConnections ?? null,
    maxConnections: connection.lastAuthSummary?.maxConnections ?? null,
    expiresAt: connection.lastAuthSummary?.expiresAt ?? null,
    checkedAt: status?.checkedAt ?? null,
  };
};

const rankEntries = (entries: SavedProviderHealthEntry[]) =>
  [...entries].sort((left, right) => (
    right.trustScore - left.trustScore
    || Number(left.isActive) - Number(right.isActive)
    || left.providerName.localeCompare(right.providerName)
  ));

const buildHealthySignal = (healthyCount: number): SavedProviderHealthSignal => ({
  id: 'healthy-saved-providers',
  label: `${healthyCount} healthy saved provider${healthyCount === 1 ? '' : 's'}`,
  detail: healthyCount > 1
    ? 'More than one saved provider can keep the shell moving without hiding who owns the next launch.'
    : 'At least one saved provider can carry the current shell honestly if the active source degrades.',
  tone: 'healthy',
});

const buildWarningSignal = (entry: SavedProviderHealthEntry): SavedProviderHealthSignal => ({
  id: `warning-${entry.providerId}`,
  label: `${entry.providerName} needs recovery`,
  detail: entry.warning || entry.statusMessage || `${entry.providerName} is not currently healthy enough to lead the next move.`,
  tone: 'warning',
});

const buildRecommendationSignal = (recommendedProvider: SavedProviderHealthEntry): SavedProviderHealthSignal => ({
  id: `recommend-${recommendedProvider.providerId}`,
  label: `${recommendedProvider.providerName} is the healthiest saved provider`,
  detail: `${recommendedProvider.trustLabel} for the next recovery move. StreamDeck can preserve provider identity while switching to a safer source.`,
  tone: 'healthy',
});

const buildHeadline = ({
  activeProvider,
  recommendedProvider,
  providerCount,
}: {
  activeProvider: SavedProviderHealthEntry | null;
  recommendedProvider: SavedProviderHealthEntry | null;
  providerCount: number;
}) => {
  if (!activeProvider && !recommendedProvider) return null;

  if (!activeProvider && recommendedProvider) {
    return {
      tone: 'healthy' as const,
      title: `${recommendedProvider.providerName} is ready to lead`,
      detail: `No active provider is set right now. ${recommendedProvider.providerName} is the healthiest saved option across ${providerCount} saved provider${providerCount === 1 ? '' : 's'}.`,
    };
  }

  if (!activeProvider) return null;

  if (activeProvider.warning && recommendedProvider && recommendedProvider.providerId !== activeProvider.providerId) {
    return {
      tone: 'warning' as const,
      title: `${activeProvider.providerName} is risky right now`,
      detail: `${activeProvider.warning}. ${recommendedProvider.providerName} is the healthiest saved provider if this surface needs recovery.`,
    };
  }

  if (activeProvider.warning) {
    return {
      tone: 'warning' as const,
      title: `${activeProvider.providerName} needs an honest warning`,
      detail: activeProvider.warning,
    };
  }

  return {
    tone: 'healthy' as const,
    title: `${activeProvider.providerName} still owns the next move`,
    detail: providerCount > 1
      ? `${providerCount} saved providers are available, and the active source still ranks healthiest enough to keep the shell honest.`
      : 'The current provider still looks healthy enough to keep the shell moving without a fallback handoff.',
  };
};

const buildRecoveryRoute = ({
  surface,
  activeProvider,
  recommendedProvider,
}: {
  surface: RecoverySurface;
  activeProvider: SavedProviderHealthEntry | null;
  recommendedProvider: SavedProviderHealthEntry | null;
}) => {
  if (!recommendedProvider) return null;

  const defaultCta = surface === 'login'
    ? 'Use healthiest saved provider'
    : surface === 'home'
      ? 'Open healthiest Home provider'
      : surface === 'live'
        ? 'Switch Live to healthiest provider'
        : 'Switch to healthiest provider';

  if (!activeProvider) {
    return {
      providerId: recommendedProvider.providerId,
      title: `${recommendedProvider.providerName} is ready`,
      detail: 'Use the healthiest saved provider first instead of reconnecting blindly or guessing which source is still safe.',
      cta: defaultCta,
    };
  }

  if (recommendedProvider.providerId === activeProvider.providerId && !activeProvider.warning) {
    return null;
  }

  const detail = surface === 'login'
    ? `Keep the connect flow moving by routing into ${recommendedProvider.providerName} before risky auth, expiry, or line pressure gets mistaken for a generic login failure.`
    : surface === 'home'
      ? `Keep the same browse intent visible while ${recommendedProvider.providerName} takes over as the safest saved provider for the next launch.`
      : surface === 'live'
        ? `Preserve channel-surf intent and move playback onto ${recommendedProvider.providerName} before the user blames the selected stream for provider instability.`
        : `Use ${recommendedProvider.providerName} as the safest saved fallback before provider instability spreads deeper into the shell.`;

  return {
    providerId: recommendedProvider.providerId,
    title: `${recommendedProvider.providerName} is the healthiest saved recovery path`,
    detail,
    cta: defaultCta,
  };
};

export const buildSavedProviderHealthBoard = ({
  connections,
  connectionStatus,
  activeConnectionId,
  surface,
}: {
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  activeConnectionId?: string | null;
  surface: RecoverySurface;
}): SavedProviderHealthBoard => {
  const providers = rankEntries(connections.map((connection) => buildProviderHealthEntry({
    connection,
    status: connectionStatus[connection.id],
    activeConnectionId,
  })));
  const byProviderId = Object.fromEntries(providers.map((provider) => [provider.providerId, provider]));
  const activeProvider = providers.find((provider) => provider.isActive) ?? null;
  const recommendedProvider = providers[0] ?? null;
  const warningProviders = providers.filter((provider) => Boolean(provider.warning));
  const healthyCount = providers.filter((provider) => !provider.warning && (provider.status === 'healthy' || provider.trustScore >= 90)).length;

  const trustSignals: SavedProviderHealthSignal[] = [];
  if (recommendedProvider) {
    trustSignals.push(buildRecommendationSignal(recommendedProvider));
  }
  if (healthyCount > 0) {
    trustSignals.push(buildHealthySignal(healthyCount));
  }
  warningProviders.slice(0, 2).forEach((provider) => {
    trustSignals.push(buildWarningSignal(provider));
  });

  return {
    providers,
    byProviderId,
    activeProvider,
    recommendedProvider,
    warningCount: warningProviders.length,
    healthyCount,
    headline: buildHeadline({
      activeProvider,
      recommendedProvider,
      providerCount: providers.length,
    }),
    trustSignals,
    recoveryRoute: buildRecoveryRoute({
      surface,
      activeProvider,
      recommendedProvider,
    }),
  };
};
