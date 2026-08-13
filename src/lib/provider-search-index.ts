import { ProviderCatalog, ProviderSearchIndexEntry, ProviderSearchIndexSnapshot, XtreamStream } from './types';

export type ProviderIndexedSearchHit = {
  providerId: string;
  streamId: number;
  kind: 'live' | 'movie' | 'series';
  item: XtreamStream;
  score: number;
  matchReason: string;
};

export type SearchTermPayload = {
  normalized: string;
  tokens: string[];
  expandedTokens: string[];
};

const SEARCH_ALIASES: Record<string, string[]> = {
  sports: ['sport', 'sports', 'fight', 'goal', 'match', 'arena'],
  news: ['news', 'headline', 'report', 'desk', 'wire'],
  movie: ['movie', 'movies', 'cinema', 'film', 'premiere'],
  kids: ['kids', 'kid', 'cartoon', 'family', 'junior'],
};

export const normalizeSearchText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const buildSearchTerms = (query: string): SearchTermPayload => {
  const normalized = normalizeSearchText(query);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const expanded = new Set(tokens);
  tokens.forEach((token) => {
    SEARCH_ALIASES[token]?.forEach((alias) => expanded.add(alias));
  });

  return {
    normalized,
    tokens,
    expandedTokens: [...expanded],
  };
};

const buildIndexEntry = (providerId: string, item: XtreamStream, kind: ProviderSearchIndexEntry['kind']): ProviderSearchIndexEntry | null => {
  const streamId = Number(item.stream_id ?? item.series_id ?? 0);
  if (!Number.isFinite(streamId) || streamId <= 0) return null;

  return {
    providerId,
    streamId,
    kind,
    title: item.name,
    normalizedTitle: normalizeSearchText(item.name),
    normalizedSearchText: normalizeSearchText(`${item.name} ${item.genre || ''} ${item.plot || ''} ${item.channel_group || ''} ${item.tagline || ''}`),
    normalizedGenre: normalizeSearchText(item.genre || ''),
    normalizedGroup: normalizeSearchText(item.channel_group || ''),
    year: item.year || item.releasedate?.slice(0, 4) || '',
    item,
  };
};

export const buildProviderSearchIndexSnapshot = ({
  providerId,
  catalog,
  updatedAt = Date.now(),
}: {
  providerId: string;
  catalog: ProviderCatalog;
  updatedAt?: number;
}): ProviderSearchIndexSnapshot => {
  const entries = [
    ...catalog.live.map((item) => buildIndexEntry(providerId, item, 'live')),
    ...catalog.vod.map((item) => buildIndexEntry(providerId, item, 'movie')),
    ...catalog.series.map((item) => buildIndexEntry(providerId, item, 'series')),
  ].filter((entry): entry is ProviderSearchIndexEntry => Boolean(entry));

  return {
    providerId,
    updatedAt,
    catalogUpdatedAt: catalog.updatedAt,
    counts: {
      live: catalog.live.length,
      movie: catalog.vod.length,
      series: catalog.series.length,
      total: entries.length,
    },
    entries,
  };
};

const scoreIndexedEntry = (query: SearchTermPayload, entry: ProviderSearchIndexEntry) => {
  if (!entry.normalizedSearchText) return null;

  let score = 0;
  let matchedTerms = 0;

  if (entry.normalizedTitle === query.normalized) score += 140;
  else if (entry.normalizedTitle.startsWith(query.normalized)) score += 90;

  query.expandedTokens.forEach((term) => {
    if (!entry.normalizedSearchText.includes(term)) return;
    matchedTerms += 1;
    const nameIndex = entry.normalizedTitle.indexOf(term);
    if (nameIndex === 0) score += 28;
    else if (nameIndex > 0) score += Math.max(10, 24 - nameIndex);
    else if (entry.normalizedGenre.includes(term)) score += 14;
    else if (entry.normalizedGroup.includes(term)) score += 12;
    else score += 8;
  });

  if (matchedTerms === 0) return null;

  score += matchedTerms * 6;
  if (entry.kind === 'live') score += 12;
  if (entry.kind === 'movie') score += 6;
  if (query.tokens.length > 1 && matchedTerms >= query.tokens.length) score += 18;
  if (entry.item.rating) score += Number(entry.item.rating);

  const matchReason = entry.normalizedTitle === query.normalized
    ? 'Exact title match'
    : entry.normalizedTitle.startsWith(query.normalized)
      ? 'Title starts with your search'
      : matchedTerms >= Math.max(2, query.tokens.length)
        ? `Matched ${matchedTerms} search signals`
        : entry.normalizedGenre.includes(query.tokens[0] || '')
          ? `Genre match in ${entry.item.genre}`
          : entry.kind === 'live'
            ? 'Strong live-channel match'
            : 'Relevant catalog match';

  return { score, matchReason };
};

export const queryProviderSearchIndex = ({
  snapshot,
  query,
  limit = 80,
}: {
  snapshot: ProviderSearchIndexSnapshot;
  query: string;
  limit?: number;
}): ProviderIndexedSearchHit[] => {
  const searchTerms = buildSearchTerms(query);
  if (!searchTerms.normalized || searchTerms.normalized.length < 2) return [];

  return snapshot.entries
    .map((entry) => {
      const scored = scoreIndexedEntry(searchTerms, entry);
      if (!scored) return null;
      return {
        providerId: entry.providerId,
        streamId: entry.streamId,
        kind: entry.kind,
        item: entry.item,
        score: scored.score,
        matchReason: scored.matchReason,
      } satisfies ProviderIndexedSearchHit;
    })
    .filter((entry): entry is ProviderIndexedSearchHit => Boolean(entry))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
};
