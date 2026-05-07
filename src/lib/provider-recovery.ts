import { getProviderTrustScore } from './provider-trust';
import { ConnectionStatus, SavedConnection } from './types';

export type RecoverySurface = 'login' | 'home' | 'live';

export const getHealthiestSavedProvider = ({
  connections,
  connectionStatus,
  activeConnectionId,
}: {
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  activeConnectionId?: string | null;
}) => {
  return [...connections]
    .filter((connection) => connection.id !== activeConnectionId)
    .sort((a, b) => getProviderTrustScore(b, connectionStatus[b.id]) - getProviderTrustScore(a, connectionStatus[a.id]))[0] ?? null;
};

export const getRecoveryActionLabel = (surface: RecoverySurface, providerName: string) => {
  if (surface === 'login') return `Open Home on ${providerName}`;
  if (surface === 'home') return `Switch Home to ${providerName}`;
  return `Open Live on ${providerName}`;
};

export const getRecoverySupportLabel = (surface: RecoverySurface) => {
  if (surface === 'login') return 'Keep the connect flow moving with the healthiest saved provider instead of retrying a bad source blindly.';
  if (surface === 'home') return 'Keep the same browse session alive by moving Home onto the healthiest saved provider before rails go stale.';
  return 'Keep channel surfing alive by moving Live onto the healthiest saved provider, and preserve category context when an exact duplicate channel is missing.';
};
