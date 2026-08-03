import { buildProviderVariant, getProviderSummaryWarning, rankProviderVariants, RankedProviderVariant } from './provider-recovery';
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

const SEARCH_ALIASES: Record<string, string[]> = {
  sports: ['sport', 'sports', 'fight', 'goal', 'match', 'arena'],
  news: ['news', 'headline', 'report', 'desk', 'wire'],
  movie: ['movie', 'movies', 'cinema', 'film', 'premiere'],
  kids: ['kids', 'kid', 'cartoon', 'family', 'junior'],
};

const normalizeSearchText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const getSearchTerms = (query: string) => {
  const normalized = normalizeSearchText(query);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const expanded = new Set(tokens);
  tokens.forEach((token) => {
    SEARCH_ALIASES[token]?.forEach((alias) => expanded.add(alias));
  });
  return { normalized, tokens, expandedTokens: [...expanded] };
};

const buildSearchKey = (item: XtreamStream, kind: GroupedSearchResult['kind']) => {
  const normalizedName = normalizeSearchText(item.name);
  const year = item.year || item.releasedate?.slice(0, 4) || '';
  return `${kind}:${normalizedName}:${year}`;
};

const scoreResult = (query: ReturnType<typeof getSearchTerms>, item: XtreamStream, kind: GroupedSearchResult['kind']) => {
  const normalizedName = normalizeSearchText(item.name);
  const haystack = normalizeSearchText(`${item.name} ${item.genre || ''} ${item.plot || ''} ${item.channel_group || ''} ${item.tagline || ''}`);
  if (!haystack) return null;

  let score = 0;
  let matchedTerms = 0;

  if (normalizedName === query.normalized) score += 140;
  else if (normalizedName.startsWith(query.normalized)) score += 90;

  query.expandedTokens.forEach((term) => {
    if (!haystack.includes(term)) return;
    matchedTerms += 1;
    const nameIndex = normalizedName.indexOf(term);
    if (nameIndex === 0) score += 28;
    else if (nameIndex > 0) score += Math.max(10, 24 - nameIndex);
    else if ((item.genre || '').toLowerCase().includes(term)) score += 14;
    else if ((item.channel_group || '').toLowerCase().includes(term)) score += 12;
    else score += 8;
  });

  if (matchedTerms === 0) return null;

  score += matchedTerms * 6;
  if (kind === 'live') score += 12;
  if (kind === 'movie') score += 6;
  if (query.tokens.length > 1 && matchedTerms >= query.tokens.length) score += 18;
  if (item.rating) score += Number(item.rating);

  const matchReason = normalizedName === query.normalized
    ? 'Exact title match'
    : normalizedName.startsWith(query.normalized)
      ? 'Title starts with your search'
      : matchedTerms >= Math.max(2, query.tokens.length)
        ? `Matched ${matchedTerms} search signals`
        : (item.genre || '').toLowerCase().includes(query.tokens[0] || '')
          ? `Genre match in ${item.genre}`
          : kind === 'live'
            ? 'Strong live-channel match'
            : 'Relevant catalog match';

  return { score, matchReason };
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
  const historyMatch = history?.find((item) => (
    item.kind === kind
    && normalizeSearchText(item.seriesTitle || item.title) === normalizeSearchText(title)
    && (!item.year || !primary.item.year || item.year === primary.item.year)
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
      canonicalSeriesKey: `${normalizeSearchText(title)}:${primary.item.year || ''}`,
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
  providerCatalogs: Array<{ provider: SavedConnection; catalog: Pick<ProviderCatalog, 'live' | 'vod' | 'series'> }>;
  query: string;
  connectionStatus: Record<string, ConnectionStatus>;
  activeConnectionId?: string | null;
  watchHistory?: WatchHistoryItem[];
}) => {
  const searchTerms = getSearchTerms(query);
  const deduped = new Map<string, GroupedSearchResult>();

  providerCatalogs.forEach(({ provider, catalog }) => {
    const buckets: Array<[GroupedSearchResult['kind'], XtreamStream[]]> = [
      ['live', catalog.live],
      ['movie', catalog.vod],
      ['series', catalog.series],
    ];

    buckets.forEach(([kind, items]) => {
      items.forEach((item) => {
        const scored = scoreResult(searchTerms, item, kind);
        if (!scored) return;

        const key = buildSearchKey(item, kind);
        const existing = deduped.get(key);
        const candidateVariantBase = buildProviderVariant({
          connection: provider,
          status: connectionStatus[provider.id],
          item,
          kind,
        });
        const candidateCompositeScore = scored.score + candidateVariantBase.trustScore;
        const candidateVariant = {
          ...candidateVariantBase,
          provider,
          item,
          compositeScore: candidateCompositeScore,
          isPrimary: true,
          matchReason: scored.matchReason,
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
            matchReason: scored.matchReason,
            duplicateCount: 0,
            providerCount: 1,
            variants: [candidateVariant],
            continuity,
          });
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
              variant.providerId === candidateVariant.providerId ? scored.score : Math.max(0, Math.round(variant.compositeScore - variant.trustScore)),
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
            ? `${scored.matchReason} • healthiest ranked provider copy`
            : `${existing.matchReason} • also found on ${existing.providerCount + 1} providers`,
          duplicateCount: rankedVariants.length - 1,
          providerCount: rankedVariants.length,
          variants: rankedVariants,
          continuity,
        });
      });
    });
  });

  return [...deduped.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, 48);
};
