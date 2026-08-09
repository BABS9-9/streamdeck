import { buildProviderVariant, buildProviderVariantLookupKeys, getProviderSummaryWarning, normalizeVariantYear, rankProviderVariants, RankedProviderVariant } from './provider-recovery';
import { normalizeSearchText, ProviderIndexedSearchHit, queryProviderSearchIndex } from './provider-search-index';
import { ConnectionStatus, ProviderCatalog, SavedConnection, WatchHistoryItem, XtreamStream } from './types';

export type SearchContinuityMode = 'single-source' | 'provider-choice' | 'series-resume' | 'episode-map-required';

export type SearchContinuityReasonCode =
  | 'exact-title-match'
  | 'duplicate-provider-copy'
  | 'provider-choice-available'
  | 'provider-switch-recommended'
  | 'line-pressure-risk'
  | 'provider-health-risk'
  | 'series-resume-ready'
  | 'episode-map-required';

export type SeriesCompletenessBand = 'complete' | 'strong' | 'partial' | 'thin';

export type SearchResultVariantPayload = RankedProviderVariant & {
  provider: SavedConnection;
  item: XtreamStream;
};

export type SearchContinuityPayload = {
  mode: SearchContinuityMode;
  launchOwnerProviderId: string;
  launchOwnerProviderName: string;
  providerCount: number;
  duplicateCount: number;
  reasonCodes: SearchContinuityReasonCode[];
  summary: string;
  seriesCompletenessBand?: SeriesCompletenessBand;
  canonicalEpisodeMapping?: {
    canonicalSeriesKey: string;
    preferredSeasonNumber: number | null;
    preferredEpisodeNumber: number | null;
    resolver: 'series-info';
    providerIds: string[];
  } | null;
};

export type GroupedSearchResult = {
  canonicalKey: string;
  provider: SavedConnection;
  item: XtreamStream;
  kind: 'live' | 'movie' | 'series';
  score: number;
  matchReason: string;
  duplicateCount: number;
  providerCount: number;
  variants: SearchResultVariantPayload[];
  continuity: SearchContinuityPayload;
};

const buildSearchKey = (title: string, kind: GroupedSearchResult['kind'], year?: string) => {
  const normalizedName = normalizeSearchText(title);
  return `${kind}:${normalizedName}:${normalizeVariantYear(year)}`;
};

const buildSearchLookupKeys = (item: XtreamStream, kind: GroupedSearchResult['kind']) => {
  return buildProviderVariantLookupKeys({
    title: item.name,
    kind,
    year: item.year || item.releasedate?.slice(0, 4) || '',
  });
};

const getSeriesCompletenessBand = ({
  variants,
  historyMatch,
}: {
  variants: SearchResultVariantPayload[];
  historyMatch?: WatchHistoryItem | undefined;
}): SeriesCompletenessBand => {
  if (variants.length >= 3) return 'complete';
  if (variants.length >= 2) return historyMatch ? 'complete' : 'strong';
  if (historyMatch) return 'partial';
  return 'thin';
};

export const describeSeriesCompletenessBand = (band: SeriesCompletenessBand) => {
  if (band === 'complete') return 'Episode continuity looks strong across saved providers.';
  if (band === 'strong') return 'More than one saved provider can likely keep the same series flow moving.';
  if (band === 'partial') return 'Resume context exists, but backup coverage still needs a canonical episode check.';
  return 'Only a thin series fallback is visible right now.';
};

export const buildVariantContinuityPayload = ({
  title,
  kind,
  variants,
  activeConnectionId,
  history,
}: {
  title: string;
  kind: GroupedSearchResult['kind'];
  variants: SearchResultVariantPayload[];
  activeConnectionId?: string | null;
  history?: WatchHistoryItem[];
}): SearchContinuityPayload | null => {
  if (variants.length === 0) return null;

  const primary = variants[0];
  const primaryYear = normalizeVariantYear(primary.item.year || primary.item.releasedate?.slice(0, 4) || '');
  const historyMatch = history?.find((item) => (
    item.kind === kind
    && normalizeSearchText(item.seriesTitle || item.title) === normalizeSearchText(title)
    && (!normalizeVariantYear(item.year) || !primaryYear || normalizeVariantYear(item.year) === primaryYear)
  ));
  const reasonCodes = new Set<SearchContinuityReasonCode>();
  let mode: SearchContinuityMode = variants.length > 1 ? 'provider-choice' : 'single-source';

  if (variants.length > 1) {
    reasonCodes.add('duplicate-provider-copy');
    reasonCodes.add('provider-choice-available');
  }

  if (getProviderSummaryWarning(primary.provider.lastAuthSummary) || primary.warning) {
    reasonCodes.add(primary.warning === 'All lines in use' ? 'line-pressure-risk' : 'provider-health-risk');
    if (variants.length > 1) reasonCodes.add('provider-switch-recommended');
  }

  if (kind === 'series') {
    const completenessBand = getSeriesCompletenessBand({ variants, historyMatch });
    const canonicalEpisodeMapping = {
      canonicalSeriesKey: `${normalizeSearchText(title)}:${primaryYear}`,
      preferredSeasonNumber: historyMatch?.seasonNumber ?? null,
      preferredEpisodeNumber: historyMatch?.episodeNumber ?? null,
      resolver: 'series-info' as const,
      providerIds: variants.map((variant) => variant.providerId),
    };

    if (historyMatch?.seasonNumber && historyMatch?.episodeNumber) {
      mode = variants.length > 1 ? 'series-resume' : 'episode-map-required';
      reasonCodes.add('series-resume-ready');
    } else {
      mode = 'episode-map-required';
      reasonCodes.add('episode-map-required');
    }

    return {
      mode,
      launchOwnerProviderId: primary.providerId,
      launchOwnerProviderName: primary.providerName,
      providerCount: variants.length,
      duplicateCount: Math.max(0, variants.length - 1),
      reasonCodes: [...reasonCodes],
      summary: `${primary.providerName} currently owns launch, while ${describeSeriesCompletenessBand(completenessBand).toLowerCase()}`,
      seriesCompletenessBand: completenessBand,
      canonicalEpisodeMapping,
    };
  }

  const summary = variants.length > 1
    ? `${primary.providerName} currently owns launch because it is the healthiest saved copy for this title.`
    : `${primary.providerName} is the only saved provider copy for this title right now.`;

  return {
    mode,
    launchOwnerProviderId: primary.providerId,
    launchOwnerProviderName: primary.providerName,
    providerCount: variants.length,
    duplicateCount: Math.max(0, variants.length - 1),
    reasonCodes: [...reasonCodes],
    summary,
    canonicalEpisodeMapping: null,
  };
};

export const buildGroupedSearchResults = ({
  providerCatalogs,
  query,
  connectionStatus,
  activeConnectionId,
  watchHistory = [],
}: {
  providerCatalogs: Array<{ provider: SavedConnection; catalog: ProviderCatalog }>;
  query: string;
  connectionStatus: Record<string, ConnectionStatus>;
  activeConnectionId?: string | null;
  watchHistory?: WatchHistoryItem[];
}) => {
  const indexedHits = providerCatalogs.flatMap(({ provider, catalog }) =>
    queryProviderSearchIndex({
      snapshot: {
        providerId: provider.id,
        updatedAt: catalog.updatedAt,
        catalogUpdatedAt: catalog.updatedAt,
        counts: {
          live: catalog.live.length,
          movie: catalog.vod.length,
          series: catalog.series.length,
          total: catalog.live.length + catalog.vod.length + catalog.series.length,
        },
        entries: [
          ...catalog.live.map((item) => ({
            providerId: provider.id,
            streamId: Number(item.stream_id ?? item.series_id ?? 0),
            kind: 'live' as const,
            title: item.name,
            normalizedTitle: normalizeSearchText(item.name),
            normalizedSearchText: normalizeSearchText(`${item.name} ${item.genre || ''} ${item.plot || ''} ${item.channel_group || ''} ${item.tagline || ''}`),
            normalizedGenre: normalizeSearchText(item.genre || ''),
            normalizedGroup: normalizeSearchText(item.channel_group || ''),
            year: item.year || item.releasedate?.slice(0, 4) || '',
            item,
          })),
          ...catalog.vod.map((item) => ({
            providerId: provider.id,
            streamId: Number(item.stream_id ?? item.series_id ?? 0),
            kind: 'movie' as const,
            title: item.name,
            normalizedTitle: normalizeSearchText(item.name),
            normalizedSearchText: normalizeSearchText(`${item.name} ${item.genre || ''} ${item.plot || ''} ${item.channel_group || ''} ${item.tagline || ''}`),
            normalizedGenre: normalizeSearchText(item.genre || ''),
            normalizedGroup: normalizeSearchText(item.channel_group || ''),
            year: item.year || item.releasedate?.slice(0, 4) || '',
            item,
          })),
          ...catalog.series.map((item) => ({
            providerId: provider.id,
            streamId: Number(item.stream_id ?? item.series_id ?? 0),
            kind: 'series' as const,
            title: item.name,
            normalizedTitle: normalizeSearchText(item.name),
            normalizedSearchText: normalizeSearchText(`${item.name} ${item.genre || ''} ${item.plot || ''} ${item.channel_group || ''} ${item.tagline || ''}`),
            normalizedGenre: normalizeSearchText(item.genre || ''),
            normalizedGroup: normalizeSearchText(item.channel_group || ''),
            year: item.year || item.releasedate?.slice(0, 4) || '',
            item,
          })),
        ],
      },
      query,
      limit: 80,
    }).map((hit) => ({ ...hit, provider }))
  );

  return buildGroupedSearchResultsFromHits({
    hits: indexedHits,
    connectionStatus,
    activeConnectionId,
    watchHistory,
  });
};

export const buildGroupedSearchResultsFromHits = ({
  hits,
  connectionStatus,
  activeConnectionId,
  watchHistory = [],
}: {
  hits: Array<ProviderIndexedSearchHit & { provider: SavedConnection }>;
  connectionStatus: Record<string, ConnectionStatus>;
  activeConnectionId?: string | null;
  watchHistory?: WatchHistoryItem[];
}) => {
  const deduped = new Map<string, GroupedSearchResult>();
  const aliasToCanonicalKey = new Map<string, string>();

  hits.forEach(({ provider, item, kind, score, matchReason }) => {
    const lookupKeys = buildSearchLookupKeys(item, kind);
    const matchedAlias = lookupKeys.find((candidate) => aliasToCanonicalKey.has(candidate));
    const key = matchedAlias
      ? aliasToCanonicalKey.get(matchedAlias)!
      : buildSearchKey(item.name, kind, item.year || item.releasedate?.slice(0, 4) || '');
    const existing = deduped.get(key);
    const candidateVariantBase = buildProviderVariant({
      connection: provider,
      status: connectionStatus[provider.id],
      item,
      kind,
    });
    const candidateCompositeScore = score + candidateVariantBase.trustScore;
    const candidateVariant = {
      ...candidateVariantBase,
      provider,
      item,
      compositeScore: candidateCompositeScore,
      isPrimary: true,
      matchReason,
    } satisfies SearchResultVariantPayload & { matchReason: string };

    if (!existing) {
      const continuity = buildVariantContinuityPayload({
        title: item.name,
        kind,
        variants: [candidateVariant],
        activeConnectionId,
        history: watchHistory,
      })!;

      deduped.set(key, {
        canonicalKey: key,
        provider,
        item,
        kind,
        score: candidateCompositeScore,
        matchReason,
        duplicateCount: 0,
        providerCount: 1,
        variants: [candidateVariant],
        continuity,
      });
      lookupKeys.forEach((aliasKey) => aliasToCanonicalKey.set(aliasKey, key));
      return;
    }

    const variantLookup = new Map<string, SearchResultVariantPayload>();
    [...existing.variants, candidateVariant].forEach((variant) => {
      variantLookup.set(`${variant.providerId}-${variant.streamId}`, variant);
    });

    const rankedVariants = rankProviderVariants(
      [...variantLookup.values()].map((variant) => variant),
      Object.fromEntries(
        [...variantLookup.values()].map((variant) => [
          variant.providerId,
          variant.providerId === candidateVariant.providerId ? score : Math.max(0, Math.round(variant.compositeScore - variant.trustScore)),
        ])
      )
    ).map((variant) => {
      const matched = variantLookup.get(`${variant.providerId}-${variant.streamId}`)!;
      return {
        ...variant,
        provider: matched.provider,
        item: matched.item,
      } satisfies SearchResultVariantPayload;
    });

    const primaryVariant = rankedVariants[0];
    const continuity = buildVariantContinuityPayload({
      title: primaryVariant.title,
      kind,
      variants: rankedVariants,
      activeConnectionId,
      history: watchHistory,
    })!;

    deduped.set(key, {
      canonicalKey: key,
      provider: primaryVariant.provider,
      item: primaryVariant.item,
      kind,
      score: primaryVariant.compositeScore,
      matchReason: primaryVariant.providerId === candidateVariant.providerId
        ? `${matchReason} • healthiest ranked provider copy`
        : `${existing.matchReason} • also found on ${existing.providerCount + 1} providers`,
      duplicateCount: rankedVariants.length - 1,
      providerCount: rankedVariants.length,
      variants: rankedVariants,
      continuity,
    });
    lookupKeys.forEach((aliasKey) => aliasToCanonicalKey.set(aliasKey, key));
  });

  return [...deduped.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, 48);
};
