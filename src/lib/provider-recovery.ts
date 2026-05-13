import { buildLiveStreamUrl, buildVodStreamUrl, getArtwork, getCachedSearchCatalog, getContentId } from './xtream-api';
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

export type ProviderVariantKind = 'live' | 'movie' | 'series';

export type ProviderVariant = {
  providerId: string;
  providerName: string;
  title: string;
  streamId: number;
  kind: ProviderVariantKind;
  artwork?: string;
  categoryId?: string;
  categoryName?: string;
  playbackUrl?: string | null;
  seriesId?: number;
  year?: string;
  plot?: string;
  trustScore: number;
  warning?: string | null;
};

export const normalizeRecoveryKey = (value?: string | null) => (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const buildProviderVariantKey = (title: string, kind: ProviderVariantKind, year?: string, seriesTitle?: string) => {
  const name = normalizeRecoveryKey(seriesTitle || title);
  return `${kind}:${name}:${year || ''}`;
};

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

export const getProviderTrustLabel = (trustScore: number) => {
  if (trustScore >= 150) return 'Highest trust';
  if (trustScore >= 90) return 'Healthy backup';
  return 'Fallback copy';
};

export const buildSeriesRecoveryKey = (variant: Pick<ProviderVariant, 'providerId' | 'seriesId' | 'streamId'>, seasonNumber?: number | null, episodeNumber?: number | null) => {
  return `${variant.providerId}-${variant.seriesId ?? variant.streamId}-${seasonNumber || 0}-${episodeNumber || 0}`;
};

export const buildProviderVariantsIndex = ({
  connections,
  connectionStatus,
  includeKinds,
}: {
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  includeKinds?: ProviderVariantKind[];
}) => {
  const allowedKinds = includeKinds ? new Set(includeKinds) : null;

  return connections.reduce<Record<string, ProviderVariant[]>>((acc, connection) => {
    const connectionCatalog = getCachedSearchCatalog(connection.id, Number.MAX_SAFE_INTEGER);
    if (!connectionCatalog) return acc;

    const buckets: Array<[ProviderVariantKind, XtreamStream[]]> = [
      ['live', connectionCatalog.live],
      ['movie', connectionCatalog.vod],
      ['series', connectionCatalog.series],
    ];

    buckets.forEach(([kind, items]) => {
      if (allowedKinds && !allowedKinds.has(kind)) return;

      items.forEach((item) => {
        const key = buildProviderVariantKey(item.name, kind, item.year);
        const variants = acc[key] || [];
        const streamId = getContentId(item);

        if (!variants.some((variant) => variant.providerId === connection.id && variant.streamId === streamId)) {
          variants.push({
            providerId: connection.id,
            providerName: connection.name,
            title: item.name,
            streamId,
            kind,
            artwork: getArtwork(item),
            categoryId: item.category_id,
            categoryName: item.channel_group || item.genre,
            playbackUrl: kind === 'series' ? null : kind === 'live' ? buildLiveStreamUrl(connection, item) : buildVodStreamUrl(connection, item),
            seriesId: item.series_id,
            year: item.year,
            plot: item.plot,
            trustScore: getProviderTrustScore(connection, connectionStatus[connection.id]),
            warning: getProviderRecoveryWarning(connection, connectionStatus[connection.id]),
          });
        }

        acc[key] = variants.sort((left, right) => right.trustScore - left.trustScore || left.providerName.localeCompare(right.providerName));
      });
    });

    return acc;
  }, {});
};

export const getAlternateProviderVariants = ({
  providerVariants,
  activeConnectionId,
  title,
  kind,
  year,
  seriesTitle,
}: {
  providerVariants: Record<string, ProviderVariant[]>;
  activeConnectionId?: string | null;
  title: string;
  kind: ProviderVariantKind;
  year?: string;
  seriesTitle?: string;
}) => {
  const key = buildProviderVariantKey(title, kind, year, seriesTitle);
  return (providerVariants[key] || []).filter((variant) => variant.providerId !== activeConnectionId);
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
