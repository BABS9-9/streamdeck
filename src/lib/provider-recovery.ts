import { buildLiveStreamUrl, getArtwork, getCachedSearchCatalog, getContentId } from './xtream-api';
import { getProviderTrustScore } from './provider-trust';
import { ConnectionStatus, SavedConnection, XtreamStream } from './types';

export type RecoverySurface = 'login' | 'home' | 'live';

export type LiveCategoryRecovery = {
  providerId: string;
  providerName: string;
  categoryId?: string;
  categoryName: string;
  streamId: number;
  title: string;
  artwork?: string;
  playbackUrl: string;
  trustScore: number;
  warning: string | null;
  stream: XtreamStream;
};

export const normalizeRecoveryKey = (value?: string | null) => (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const getProviderRecoveryWarning = (connection: SavedConnection, status?: ConnectionStatus) => {
  const summary = connection.lastAuthSummary;
  const isExpired = summary?.status && summary.status !== 'Active';
  const isMaxed = !!summary?.maxConnections && (summary.activeConnections ?? 0) >= summary.maxConnections;
  const isError = status?.state === 'error';
  const isDegraded = status?.state === 'degraded';

  if (isExpired) return `Status ${summary?.status}`;
  if (isMaxed) return 'All lines in use';
  if (isError) return status?.message || 'Validation failing';
  if (isDegraded) return status?.message || 'Provider degraded';
  return null;
};

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

export const getLiveCategoryRecovery = ({
  activeConnectionId,
  connections,
  connectionStatus,
  exactVariants = [],
  categoryId,
  categoryName,
}: {
  activeConnectionId?: string | null;
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  exactVariants?: Array<{ providerId: string }>;
  categoryId?: string | null;
  categoryName?: string | null;
}) => {
  if (!activeConnectionId || exactVariants.length > 0) return null as LiveCategoryRecovery | null;

  const normalizedCategoryName = normalizeRecoveryKey(categoryName);
  if (!categoryId && !normalizedCategoryName) return null as LiveCategoryRecovery | null;

  const candidates = connections
    .filter((connection) => connection.id !== activeConnectionId)
    .map((connection) => {
      const catalog = getCachedSearchCatalog(connection.id, Number.MAX_SAFE_INTEGER);
      if (!catalog) return null;

      const match = catalog.live.find((item) => {
        const sameCategoryId = item.category_id && categoryId && String(item.category_id) === String(categoryId);
        const sameCategoryName = normalizeRecoveryKey(item.channel_group || item.genre || '') === normalizedCategoryName;
        return sameCategoryId || sameCategoryName;
      });

      if (!match) return null;

      return {
        providerId: connection.id,
        providerName: connection.name,
        categoryId: match.category_id,
        categoryName: match.channel_group || match.genre || categoryName || 'Live',
        streamId: getContentId(match),
        title: match.name,
        artwork: getArtwork(match),
        playbackUrl: buildLiveStreamUrl(connection, match),
        trustScore: getProviderTrustScore(connection, connectionStatus[connection.id]),
        warning: getProviderRecoveryWarning(connection, connectionStatus[connection.id]),
        stream: match,
      } satisfies LiveCategoryRecovery;
    })
    .filter(Boolean) as LiveCategoryRecovery[];

  return candidates.sort((a, b) => b.trustScore - a.trustScore || a.providerName.localeCompare(b.providerName))[0] ?? null;
};
