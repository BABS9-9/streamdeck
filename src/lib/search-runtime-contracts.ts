import { GroupedSearchResult } from './search-continuity';
import { ConnectionStatus, ProviderSearchIndexSnapshot, SavedConnection } from './types';

export type SearchRuntimeStatus = 'ready' | 'partial' | 'stale' | 'empty';
export type SearchIndexState = 'ready' | 'stale' | 'missing';

export type SearchProviderRuntimeContract = {
  providerId: string;
  providerName: string;
  isActive: boolean;
  connectionState: ConnectionStatus['state'];
  resultCount: number;
  liveCount: number;
  movieCount: number;
  seriesCount: number;
  duplicateResultCount: number;
  indexState: SearchIndexState;
  indexUpdatedAt: number | null;
  indexAgeMinutes: number | null;
  catalogEntryCount: number;
  summary: string;
};

export type GlobalSearchRuntimeContract = {
  query: string;
  totalResults: number;
  duplicateGroups: number;
  providerCount: number;
  matchedProviderCount: number;
  indexedProviderCount: number;
  staleProviderCount: number;
  missingProviderCount: number;
  liveCount: number;
  movieCount: number;
  seriesCount: number;
  providerHitsById: Record<string, number>;
  status: SearchRuntimeStatus;
  summary: string;
  providers: SearchProviderRuntimeContract[];
  results: GroupedSearchResult[];
};

const getIndexState = (snapshot: ProviderSearchIndexSnapshot | null, maxIndexAgeMs: number): SearchIndexState => {
  if (!snapshot) return 'missing';
  if (Date.now() - snapshot.updatedAt > maxIndexAgeMs) return 'stale';
  return 'ready';
};

const getIndexAgeMinutes = (updatedAt: number | null) => {
  if (!updatedAt) return null;
  return Math.max(0, Math.round((Date.now() - updatedAt) / 60000));
};

const buildProviderRuntimeSummary = ({
  provider,
  resultCount,
  indexState,
  connectionState,
}: {
  provider: SavedConnection;
  resultCount: number;
  indexState: SearchIndexState;
  connectionState: ConnectionStatus['state'];
}) => {
  if (resultCount > 0) {
    return `${provider.name} contributed ${resultCount} ranked match${resultCount === 1 ? '' : 'es'}${indexState === 'stale' ? ' from a stale index' : ''}.`;
  }
  if (indexState === 'missing') {
    return `${provider.name} is connected but does not have a cached search index yet.`;
  }
  if (indexState === 'stale') {
    return `${provider.name} has a stale search index and needs a catalog refresh before it should influence launch confidence.`;
  }
  if (connectionState === 'error') {
    return `${provider.name} is currently in an error state, so zero ranked hits may reflect provider health rather than catalog absence.`;
  }
  return `${provider.name} has a ready index but no ranked hits for this query.`;
};

export const buildGlobalSearchRuntimeContract = ({
  query,
  connections,
  activeConnectionId,
  connectionStatus,
  indexSnapshotsByProvider,
  results,
  maxIndexAgeMs,
}: {
  query: string;
  connections: SavedConnection[];
  activeConnectionId?: string | null;
  connectionStatus: Record<string, ConnectionStatus>;
  indexSnapshotsByProvider: Record<string, ProviderSearchIndexSnapshot | null>;
  results: GroupedSearchResult[];
  maxIndexAgeMs: number;
}): GlobalSearchRuntimeContract => {
  const providerHitsById = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.provider.id] = (acc[result.provider.id] || 0) + 1;
    return acc;
  }, {});

  const providers = connections.map((provider) => {
    const snapshot = indexSnapshotsByProvider[provider.id] ?? null;
    const indexState = getIndexState(snapshot, maxIndexAgeMs);
    const providerResults = results.filter((result) => result.provider.id === provider.id);
    const resultKinds = providerResults.reduce(
      (acc, result) => {
        acc[result.kind] += 1;
        if (result.duplicateCount > 0) acc.duplicateResultCount += 1;
        return acc;
      },
      { live: 0, movie: 0, series: 0, duplicateResultCount: 0 }
    );

    return {
      providerId: provider.id,
      providerName: provider.name,
      isActive: activeConnectionId === provider.id,
      connectionState: connectionStatus[provider.id]?.state ?? 'idle',
      resultCount: providerResults.length,
      liveCount: resultKinds.live,
      movieCount: resultKinds.movie,
      seriesCount: resultKinds.series,
      duplicateResultCount: resultKinds.duplicateResultCount,
      indexState,
      indexUpdatedAt: snapshot?.updatedAt ?? null,
      indexAgeMinutes: getIndexAgeMinutes(snapshot?.updatedAt ?? null),
      catalogEntryCount: snapshot?.counts.total ?? 0,
      summary: buildProviderRuntimeSummary({
        provider,
        resultCount: providerResults.length,
        indexState,
        connectionState: connectionStatus[provider.id]?.state ?? 'idle',
      }),
    } satisfies SearchProviderRuntimeContract;
  });

  const duplicateGroups = results.filter((result) => result.duplicateCount > 0).length;
  const kindCounts = results.reduce(
    (acc, result) => {
      acc[result.kind] += 1;
      return acc;
    },
    { live: 0, movie: 0, series: 0 }
  );
  const matchedProviderCount = providers.filter((provider) => provider.resultCount > 0).length;
  const indexedProviderCount = providers.filter((provider) => provider.indexState !== 'missing').length;
  const staleProviderCount = providers.filter((provider) => provider.indexState === 'stale').length;
  const missingProviderCount = providers.filter((provider) => provider.indexState === 'missing').length;

  const status: SearchRuntimeStatus = results.length === 0
    ? 'empty'
    : staleProviderCount > 0
      ? 'stale'
      : missingProviderCount > 0
        ? 'partial'
        : 'ready';

  const summary = results.length === 0
    ? indexedProviderCount > 0
      ? `No ranked matches for "${query}" across ${indexedProviderCount} indexed provider${indexedProviderCount === 1 ? '' : 's'}.`
      : `No cached provider indexes are ready for "${query}" yet.`
    : status === 'ready'
      ? `${results.length} ranked result${results.length === 1 ? '' : 's'} across ${matchedProviderCount} provider${matchedProviderCount === 1 ? '' : 's'}, with ${duplicateGroups} duplicate group${duplicateGroups === 1 ? '' : 's'} collapsed.`
      : status === 'stale'
        ? `${results.length} ranked result${results.length === 1 ? '' : 's'} are visible, but ${staleProviderCount} provider index${staleProviderCount === 1 ? ' is' : 'es are'} stale and need refresh confirmation.`
        : `${results.length} ranked result${results.length === 1 ? '' : 's'} are visible while ${missingProviderCount} provider${missingProviderCount === 1 ? '' : 's'} still need search indexing.`;

  return {
    query,
    totalResults: results.length,
    duplicateGroups,
    providerCount: connections.length,
    matchedProviderCount,
    indexedProviderCount,
    staleProviderCount,
    missingProviderCount,
    liveCount: kindCounts.live,
    movieCount: kindCounts.movie,
    seriesCount: kindCounts.series,
    providerHitsById,
    status,
    summary,
    providers,
    results,
  };
};
