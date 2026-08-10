import { buildProviderVariant, ProviderVariant, rankProviderVariants } from './provider-recovery';
import { buildVariantContinuityPayload, SearchContinuityPayload, SearchResultVariantPayload } from './search-continuity';
import { ConnectionStatus, SavedConnection, WatchHistoryItem, XtreamStream } from './types';

export type MediaDetailRuntimeContract = {
  variants: SearchResultVariantPayload[];
  continuity: SearchContinuityPayload | null;
  providerCount: number;
  alternateProviderCount: number;
};

const toSearchVariantPayload = ({
  variant,
  provider,
  item,
}: {
  variant: Pick<ProviderVariant, 'providerId' | 'providerName' | 'title' | 'streamId' | 'kind' | 'artwork' | 'categoryId' | 'categoryName' | 'playbackUrl' | 'seriesId' | 'year' | 'plot' | 'trustScore' | 'warning'> & {
    compositeScore: number;
    isPrimary: boolean;
  };
  provider: SavedConnection;
  item: XtreamStream;
}): SearchResultVariantPayload => ({
  ...variant,
  stream: item,
  provider,
  item,
});

const toVariantStream = (variant: ProviderVariant, kind: 'movie' | 'series'): XtreamStream => ({
  stream_id: variant.kind === 'movie' ? variant.streamId : undefined,
  series_id: variant.seriesId ?? (variant.kind === 'series' ? variant.streamId : undefined),
  name: variant.title,
  stream_type: kind,
  category_id: variant.categoryId || 'alternate',
  stream_icon: variant.artwork,
  cover: variant.artwork,
  plot: variant.plot,
  year: variant.year,
});

export const buildSeriesContinuityHref = ({
  item,
  continuity,
}: {
  item: Pick<XtreamStream, 'series_id' | 'stream_id'>;
  continuity?: Pick<SearchContinuityPayload, 'canonicalEpisodeMapping'> | null;
}) => {
  const contentId = item.stream_id ?? item.series_id ?? 0;
  const season = continuity?.canonicalEpisodeMapping?.preferredSeasonNumber;
  const episode = continuity?.canonicalEpisodeMapping?.preferredEpisodeNumber;
  const params = new URLSearchParams({ seriesId: String(item.series_id ?? contentId) });

  if (season) params.set('season', String(season));
  if (episode) params.set('episode', String(episode));

  return `/series?${params.toString()}`;
};

export const buildMediaDetailRuntimeContract = ({
  item,
  kind,
  activeConnection,
  connections,
  connectionStatus,
  alternateVariants,
  watchHistory = [],
}: {
  item: XtreamStream | null;
  kind: 'movie' | 'series';
  activeConnection?: SavedConnection | null;
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  alternateVariants: ProviderVariant[];
  watchHistory?: WatchHistoryItem[];
}): MediaDetailRuntimeContract => {
  if (!item || !activeConnection) {
    return {
      variants: [],
      continuity: null,
      providerCount: 0,
      alternateProviderCount: 0,
    };
  }

  const activeVariant = buildProviderVariant({
    connection: activeConnection,
    status: connectionStatus[activeConnection.id],
    item,
    kind,
  });

  const variantLookup = new Map<string, SearchResultVariantPayload>();
  const registerVariant = (variant: ProviderVariant, provider: SavedConnection, sourceItem: XtreamStream) => {
    variantLookup.set(`${variant.providerId}-${variant.streamId}`, toSearchVariantPayload({
      variant: {
        ...variant,
        compositeScore: variant.trustScore,
        isPrimary: false,
      },
      provider,
      item: sourceItem,
    }));
  };

  registerVariant(activeVariant, activeConnection, item);

  alternateVariants.forEach((variant) => {
    const provider = connections.find((connection) => connection.id === variant.providerId);
    if (!provider) return;
    registerVariant(variant, provider, variant.stream || toVariantStream(variant, kind));
  });

  const variants = rankProviderVariants([...variantLookup.values()]).map((variant) => {
    const matched = variantLookup.get(`${variant.providerId}-${variant.streamId}`);
    if (!matched) return null;
    return {
      ...variant,
      provider: matched.provider,
      item: matched.item,
    } satisfies SearchResultVariantPayload;
  }).filter(Boolean) as SearchResultVariantPayload[];

  return {
    variants,
    continuity: buildVariantContinuityPayload({
      title: item.name,
      kind,
      variants,
      activeConnectionId: activeConnection.id,
      history: watchHistory,
    }),
    providerCount: variants.length,
    alternateProviderCount: Math.max(0, variants.length - 1),
  };
};
