'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { buildSearchResultActionKey, GlobalSearchRouteContract } from '@/lib/search-action-contracts';
import { buildSearchContinuityDisplayContract } from '@/lib/search-continuity-contracts';
import { buildSearchFocusMemorySnapshot, buildSearchFocusRuntimeContract } from '@/lib/search-focus-runtime';
import { fetchMockProviderHealth, fetchMockProviderManifest, getSelectedMockProviderScenario, setSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { buildPlaybackResilienceContract } from '@/lib/playback-resilience-runtime';
import { ProviderDropPanel } from '@/components/provider-drop-panel';
import { formatProviderExpiry, getProviderLinePressure } from '@/lib/provider-signals';
import { buildProviderDropRuntime } from '@/lib/provider-drop-runtime';
import { buildSearchSettingsRuntimeContract } from '@/lib/search-settings-runtime';
import { GroupedSearchResult } from '@/lib/search-continuity';
import { getHealthiestSavedProvider, getProviderSummaryWarning, getProviderTrustDisplay } from '@/lib/provider-recovery';
import { getArtwork, getContentId } from '@/lib/xtream-api';
import { MockProviderHealth, MockProviderManifest, MockProviderScenario, ProviderCatalog, SavedConnection } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useSearchStore } from '@/stores/search-store';
import { PlaybackResiliencePanel } from './playback-resilience-panel';
import { ProviderFactGrid } from './provider-fact-grid';
import { ProviderRecoveryRail } from './provider-recovery-rail';
import { ProviderTrustBadge } from './provider-trust-badge';
import { ProviderTrustStack } from './provider-trust-stack';

const scenarioLabels: Record<MockProviderScenario, string> = {
  healthy: 'Healthy',
  degradedSearch: 'Degraded search',
  degradedLive: 'Degraded live',
  degradedEpg: 'Degraded guide',
  lineSaturated: 'Lines maxed',
  expiredAccount: 'Expired account',
  authUnstable: 'Auth unstable',
};

const getProviderRecoveryWarning = (summary?: { status?: string | null; activeConnections: number | null; maxConnections: number | null } | null) => {
  const summaryWarning = getProviderSummaryWarning(summary as SavedConnection['lastAuthSummary']);
  if (summaryWarning === 'All lines in use') {
    return `All ${summary?.maxConnections ?? '?'} provider lines are currently in use. Search can still work while playback becomes risky.`;
  }
  if (summaryWarning) return `Provider account is ${String(summary?.status).toLowerCase()}. Keep cached search useful, but steer playback toward a healthier saved provider.`;
  return getProviderLinePressure(summary, 'Search can still work while playback becomes risky.');
};

export function SearchBrowser() {
  const connections = useAuthStore((state) => state.connections);
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const validateConnection = useAuthStore((state) => state.validateConnection);
  const getCatalogSnapshot = useLibraryStore((state) => state.getCatalogSnapshot);
  const markCatalogFromCache = useLibraryStore((state) => state.markCatalogFromCache);
  const refreshProviderCatalogs = useLibraryStore((state) => state.refreshProviderCatalogs);
  const playStream = usePlayerStore((state) => state.playStream);
  const providerDrops = usePlayerStore((state) => state.providerDrops);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const favoriteEntriesByProvider = useFavoritesStore((state) => state.favoriteEntriesByProvider);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const lastSwitchContext = useAuthStore((state) => state.lastSwitchContext);
  const preferences = usePreferencesStore((state) => state.preferences);
  const hydratePreferences = usePreferencesStore((state) => state.hydrate);
  const getIndexSnapshot = useSearchStore((state) => state.getIndexSnapshot);
  const getSearchSnapshot = useSearchStore((state) => state.getSnapshot);
  const getRecentQueries = useSearchStore((state) => state.getRecentQueries);
  const queryGlobalIndex = useSearchStore((state) => state.queryGlobalIndex);
  const saveResultsSnapshot = useSearchStore((state) => state.saveResultsSnapshot);
  const saveRecentQuery = useSearchStore((state) => state.saveRecentQuery);
  const syncProviderIndexes = useSearchStore((state) => state.syncProviderIndexes);

  const [results, setResults] = useState<GroupedSearchResult[]>([]);
  const [runtimeContract, setRuntimeContract] = useState<GlobalSearchRouteContract | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Searching all providers...');
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [degradedProviders, setDegradedProviders] = useState<Array<{ provider: SavedConnection; message: string }>>([]);
  const [mockHealth, setMockHealth] = useState<MockProviderHealth | null>(null);
  const [mockManifest, setMockManifest] = useState<MockProviderManifest | null>(null);
  const [scenario, setScenario] = useState<MockProviderScenario>('healthy');
  const [scenarioRefreshing, setScenarioRefreshing] = useState(false);
  const [selectedResultKey, setSelectedResultKey] = useState<string | null>(null);

  useEffect(() => {
    hydratePreferences();
  }, [hydratePreferences]);

  useEffect(() => {
    setScenario(getSelectedMockProviderScenario());
    return subscribeToMockProviderScenario(setScenario);
  }, []);

  useEffect(() => {
    if (!activeConnection) return;
    const snapshot = getSearchSnapshot(activeConnection.id);
    setQuery(snapshot?.query || 'sports');
    setSelectedResultKey(snapshot?.selectedResultKey ?? null);
  }, [activeConnection?.id, getSearchSnapshot]);

  useEffect(() => {
    if (!runtimeContract?.results.length) {
      setSelectedResultKey(null);
      return;
    }

    if (selectedResultKey && runtimeContract.actionsByResultKey[selectedResultKey]) return;
    setSelectedResultKey(buildSearchResultActionKey(runtimeContract.results[0]));
  }, [runtimeContract, selectedResultKey]);

  useEffect(() => {
    let cancelled = false;

    fetchMockProviderHealth(activeConnection, scenario)
      .then((health) => {
        if (!cancelled) setMockHealth(health);
      })
      .catch(() => {
        if (!cancelled) setMockHealth(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, scenario]);

  useEffect(() => {
    let cancelled = false;

    fetchMockProviderManifest(activeConnection, scenario)
      .then((manifest) => {
        if (!cancelled) setMockManifest(manifest);
      })
      .catch(() => {
        if (!cancelled) setMockManifest(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, scenario]);

  useEffect(() => {
    let cancelled = false;

    if (connections.length === 0) {
      setResults([]);
      setRuntimeContract(null);
      setLoading(false);
      setScenarioRefreshing(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setRuntimeContract(null);
      setLoading(false);
      setError(null);
      setUsingCache(false);
      return;
    }

    const timer = setTimeout(async () => {
      const cachedCatalogs = connections
        .map((provider) => {
          const catalog = getCatalogSnapshot(provider.id);
          if (catalog) markCatalogFromCache(provider.id);
          return { provider, catalog };
        })
        .filter((entry): entry is { provider: SavedConnection; catalog: ProviderCatalog } => Boolean(entry.catalog));

      if (cachedCatalogs.length > 0) {
        const missingCachedIndexes = cachedCatalogs
          .filter(({ provider, catalog }) => {
            const currentIndex = getIndexSnapshot(provider.id);
            return !currentIndex || currentIndex.catalogUpdatedAt < catalog.updatedAt;
          })
          .map(({ provider, catalog }) => ({ providerId: provider.id, catalog }));

        if (missingCachedIndexes.length > 0) {
          syncProviderIndexes(missingCachedIndexes);
        }
      }

      if (cachedCatalogs.length > 0) {
        const cachedContract = queryGlobalIndex({
          connections,
          query: trimmed,
          connectionStatus,
          activeConnectionId: activeConnection?.id,
          watchHistory: watchHistory,
          favoriteEntriesByProvider,
        });
        setRuntimeContract(cachedContract);
        setResults(cachedContract.results);
        setUsingCache(true);
        setLoading(true);
        setLoadingLabel(scenarioRefreshing ? `Applying ${scenarioLabels[scenario].toLowerCase()} rehearsal...` : 'Refreshing cached provider catalogs...');
      } else {
        setLoading(true);
        setLoadingLabel(scenarioRefreshing ? `Applying ${scenarioLabels[scenario].toLowerCase()} rehearsal...` : 'Searching all providers...');
        setUsingCache(false);
        setResults([]);
      }

      setError(null);

      try {
        const settled = await refreshProviderCatalogs(connections);

        if (cancelled) return;

        const successfulCatalogs = settled
          .filter((result): result is { providerId: string; catalog: ProviderCatalog } => Boolean(result.catalog))
          .map((result) => ({
            provider: connections.find((provider) => provider.id === result.providerId),
            catalog: result.catalog,
          }))
          .filter((entry): entry is { provider: SavedConnection; catalog: ProviderCatalog } => Boolean(entry.provider && entry.catalog));

        const failedProviders = settled
          .filter((result) => !result.catalog)
          .map((result) => ({
            provider: connections.find((provider) => provider.id === result.providerId),
            message: result.error || 'Catalog refresh failed',
          }))
          .filter((entry): entry is { provider: SavedConnection; message: string } => Boolean(entry.provider));

        setDegradedProviders(failedProviders);

        if (successfulCatalogs.length > 0) {
          syncProviderIndexes(successfulCatalogs.map(({ provider, catalog }) => ({
            providerId: provider.id,
            catalog,
          })));
          const networkContract = queryGlobalIndex({
            connections,
            query: trimmed,
            connectionStatus,
            activeConnectionId: activeConnection?.id,
            watchHistory: watchHistory,
            favoriteEntriesByProvider,
          });
          setRuntimeContract(networkContract);
          setResults(networkContract.results);
          setUsingCache(cachedCatalogs.length > 0 || failedProviders.length > 0);
          if (failedProviders.length > 0) {
            setError(null);
          }
        } else {
          setError(failedProviders[0]?.message ?? 'Search failed');
          if (cachedCatalogs.length === 0) setResults([]);
        }
      } catch (searchError) {
        if (cancelled) return;
        setError(searchError instanceof Error ? searchError.message : 'Search failed');
        if (cachedCatalogs.length === 0) setResults([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setScenarioRefreshing(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    activeConnection?.id,
    connectionStatus,
    connections,
    favoriteEntriesByProvider,
    getCatalogSnapshot,
    getIndexSnapshot,
    markCatalogFromCache,
    query,
    queryGlobalIndex,
    refreshProviderCatalogs,
    scenario,
    scenarioRefreshing,
    syncProviderIndexes,
    watchHistory,
  ]);

  const groupedCounts = useMemo(() => {
    return runtimeContract?.providerHitsById ?? {};
  }, [runtimeContract]);

  const duplicateGroups = runtimeContract?.duplicateGroups ?? 0;
  const activeScenarioDetails = mockHealth?.healthScenarios?.[mockHealth.activeScenario];
  const mockRecoveryWarning = getProviderRecoveryWarning(mockHealth?.accountProfile);
  const healthiestConnection = getHealthiestSavedProvider({
    connections,
    connectionStatus,
    activeConnectionId: activeConnection?.id,
  });

  const providerStateTone = (providerId: string) => {
    const state = connectionStatus[providerId]?.state;
    if (state === 'healthy') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100';
    if (state === 'checking') return 'border-amber-400/40 bg-amber-500/10 text-amber-100';
    if (state === 'error') return 'border-rose-400/40 bg-rose-500/10 text-rose-100';
    if (state === 'degraded') return 'border-amber-400/40 bg-amber-500/10 text-amber-100';
    return 'border-white/10 bg-black/20 text-slate-400';
  };

  const applyScenario = (nextScenario: MockProviderScenario) => {
    if (nextScenario === scenario) return;
    setScenarioRefreshing(true);
    setSelectedMockProviderScenario(nextScenario);
  };

  const activeSearchSnapshot = activeConnection ? getSearchSnapshot(activeConnection.id) : null;
  const focusMemory = useMemo(() => buildSearchFocusMemorySnapshot({
    query,
    runtimeContract,
    snapshot: activeSearchSnapshot,
    recentQueries: getRecentQueries(),
    preferences,
    activeProviderId: activeConnection?.id,
    degradedProviderCount: degradedProviders.length,
    selectedResultKey,
  }), [activeConnection?.id, activeSearchSnapshot, degradedProviders.length, getRecentQueries, preferences, query, runtimeContract, selectedResultKey]);
  const focusRuntime = useMemo(() => buildSearchFocusRuntimeContract({
    memory: focusMemory,
    recentQueries: getRecentQueries(),
    runtimeContract,
  }), [focusMemory, getRecentQueries, runtimeContract]);

  useEffect(() => {
    if (!activeConnection) return;
    if (query.trim().length < 2) return;
    saveResultsSnapshot({
      providerId: activeConnection.id,
      query,
      results,
      duplicateGroups,
      focusMemory,
    });
    saveRecentQuery({
      providerId: activeConnection.id,
      providerName: activeConnection.name,
      query,
      normalizedQuery: query.trim().toLowerCase(),
      resultCount: results.length,
      duplicateGroups,
      liveCount: runtimeContract?.liveCount ?? 0,
      movieCount: runtimeContract?.movieCount ?? 0,
      seriesCount: runtimeContract?.seriesCount ?? 0,
      status: runtimeContract?.status ?? 'empty',
      focusMemory,
      updatedAt: Date.now(),
    });
  }, [activeConnection, duplicateGroups, focusMemory, query, results, runtimeContract?.liveCount, runtimeContract?.movieCount, runtimeContract?.seriesCount, runtimeContract?.status, saveRecentQuery, saveResultsSnapshot]);

  const searchSettingsRuntime = useMemo(() => buildSearchSettingsRuntimeContract({
    connections,
    activeConnectionId: activeConnection?.id,
    connectionStatus,
    searchRouteContract: runtimeContract,
    recentQueries: getRecentQueries(),
    preferences,
    watchHistory,
    favoriteEntriesByProvider,
    lastSwitchContext,
  }), [activeConnection?.id, connectionStatus, connections, favoriteEntriesByProvider, getRecentQueries, lastSwitchContext, preferences, runtimeContract, watchHistory]);
  const playbackResilience = useMemo(() => buildPlaybackResilienceContract({
    screenId: 'search',
    connections,
    activeConnectionId: activeConnection?.id ?? null,
    connectionStatus,
    watchHistory,
    selectedLabel: query.trim() || null,
    cachedResultCount: usingCache
      ? Math.max(results.length, activeSearchSnapshot?.resultCount ?? 0)
      : activeSearchSnapshot?.resultCount ?? 0,
    droppedProviderIds: degradedProviders.map(({ provider }) => provider.id),
    degradedProviderCount: degradedProviders.length,
  }), [
    activeConnection?.id,
    activeSearchSnapshot?.resultCount,
    connectionStatus,
    connections,
    degradedProviders,
    query,
    results.length,
    usingCache,
    watchHistory,
  ]);
  const providerDropRuntime = useMemo(() => buildProviderDropRuntime({
    screenId: 'search',
    connections,
    activeConnectionId: activeConnection?.id,
    connectionStatus,
    providerDrops,
    catalogsByProvider: Object.fromEntries(
      connections
        .map((connection) => [connection.id, getCatalogSnapshot(connection.id, Number.MAX_SAFE_INTEGER)])
        .filter((entry): entry is [string, ProviderCatalog] => Boolean(entry[1]))
    ),
    searchSnapshotsByProvider: Object.fromEntries(
      connections
        .map((connection) => [connection.id, getSearchSnapshot(connection.id)])
        .filter((entry): entry is [string, NonNullable<ReturnType<typeof getSearchSnapshot>>] => Boolean(entry[1]))
    ),
    watchHistory,
  }), [
    activeConnection?.id,
    connectionStatus,
    connections,
    getCatalogSnapshot,
    getSearchSnapshot,
    providerDrops,
    watchHistory,
  ]);

  if (connections.length === 0) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No saved providers yet. Connect on the login screen first.</div>;
  }

  const browseLaunchScorecard = mockManifest?.browseLaunchScorecards?.find((item) => item.screenId === 'search') ?? null;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Cross-provider search</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Search live TV, movies, and series across every saved connection.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              This is the differentiator the big IPTV players keep missing. One query, one ranked result set, every provider in the same surface.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
            {connections.length} provider{connections.length === 1 ? '' : 's'} indexed client-side
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search everything, for example sports, news, movie, atlas"
            className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-base text-white outline-none placeholder:text-slate-500 focus:border-violet-400"
          />
          <div className="flex flex-wrap gap-2">
            {[...new Set([
              ...searchSettingsRuntime.recentQueries.map((entry) => entry.query),
              'sports',
              'news',
              'movie',
              'kids',
              'atlas',
            ])].slice(0, 6).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuery(suggestion)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.22em] text-slate-500">
          {(runtimeContract?.providers ?? connections.map((connection) => ({
            providerId: connection.id,
            providerName: connection.name,
            resultCount: groupedCounts[connection.id] || 0,
            indexState: 'missing',
          }))).map((provider) => (
            <span key={provider.providerId} className={`rounded-full border px-3 py-2 ${activeConnection?.id === provider.providerId ? 'border-violet-400/40 bg-violet-500/10 text-violet-200' : providerStateTone(provider.providerId)}`}>
              {provider.providerName} · {provider.resultCount} hits · {provider.indexState} index
            </span>
          ))}
        </div>
        {query.trim().length >= 2 ? (
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
              {results.length} ranked result{results.length === 1 ? '' : 's'}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
              {duplicateGroups} duplicate group{duplicateGroups === 1 ? '' : 's'} collapsed
            </span>
            {runtimeContract ? (
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                {runtimeContract.liveCount} live · {runtimeContract.movieCount} movies · {runtimeContract.seriesCount} series
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
              Best provider version shown first
            </span>
          </div>
        ) : null}
        {runtimeContract?.summary ? (
          <p className="mt-4 text-sm text-slate-400">{runtimeContract.summary}</p>
        ) : null}
        <div className={`mt-4 rounded-[1.5rem] border p-4 ${
          focusRuntime.tone === 'ready'
            ? 'border-emerald-400/20 bg-emerald-500/10'
            : focusRuntime.tone === 'watch'
              ? 'border-amber-400/20 bg-amber-500/10'
              : 'border-rose-400/20 bg-rose-500/10'
        }`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/80">{focusRuntime.title}</p>
              <p className="mt-2 text-sm font-semibold text-white">{focusRuntime.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-white/80">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">{focusRuntime.entryFocusState}</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">{focusRuntime.returnFocusState}</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">{focusRuntime.backLayerState}</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">{focusRuntime.pointerCompatibilityState}</span>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
              <p className="uppercase tracking-[0.2em] text-slate-500">Entry focus</p>
              <p className="mt-2 leading-5">{focusRuntime.entrySummary}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
              <p className="uppercase tracking-[0.2em] text-slate-500">Return focus</p>
              <p className="mt-2 leading-5">{focusRuntime.returnSummary}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
              <p className="uppercase tracking-[0.2em] text-slate-500">Back layer</p>
              <p className="mt-2 leading-5">{focusRuntime.backLayerSummary}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
              <p className="uppercase tracking-[0.2em] text-slate-500">Recovery reason</p>
              <p className="mt-2 leading-5">{focusRuntime.focusRecoveryReason}</p>
              <p className="mt-2 leading-5 text-slate-400">{focusRuntime.pointerSummary}</p>
            </div>
          </div>
        </div>
        <PlaybackResiliencePanel contract={playbackResilience} className="mt-4" />
        <ProviderDropPanel contract={providerDropRuntime} className="mt-4" />
        {runtimeContract?.indexing ? (
          <div className="mt-4 rounded-[1.5rem] border border-sky-400/20 bg-sky-500/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">{runtimeContract.indexing.title}</p>
                <h3 className="mt-2 text-base font-semibold text-white">{runtimeContract.indexing.query.summary}</h3>
                <p className="mt-2 max-w-3xl text-sm text-slate-200">{runtimeContract.indexing.summary}</p>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300">{runtimeContract.indexing.freshnessSummary}</p>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300">{runtimeContract.indexing.ownership.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-white/80">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                  Query: {runtimeContract.indexing.query.normalizedQuery || 'pending'}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                  {runtimeContract.indexing.query.expandedTokens.length} ranking signals
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                  {runtimeContract.indexing.duplicateCollapse.duplicateGroups} duplicate groups
                </span>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                <p className="uppercase tracking-[0.2em] text-slate-500">Duplicate collapse</p>
                <p className="mt-2 leading-5 text-slate-100">{runtimeContract.indexing.duplicateCollapse.summary}</p>
                <p className="mt-2 leading-5 text-slate-400">
                  {runtimeContract.indexing.duplicateCollapse.multiProviderResultCount} multi-provider result{runtimeContract.indexing.duplicateCollapse.multiProviderResultCount === 1 ? '' : 's'} · {runtimeContract.indexing.duplicateCollapse.singleProviderResultCount} single-provider result{runtimeContract.indexing.duplicateCollapse.singleProviderResultCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                <p className="uppercase tracking-[0.2em] text-slate-500">Matched content kinds</p>
                <p className="mt-2 leading-5 text-slate-100">
                  {runtimeContract.indexing.query.matchedKinds.length > 0
                    ? runtimeContract.indexing.query.matchedKinds.join(' · ')
                    : 'No content kinds matched yet.'}
                </p>
                <p className="mt-2 leading-5 text-slate-400">
                  Expanded terms: {runtimeContract.indexing.query.expandedTokens.join(', ') || 'none yet'}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 lg:grid-cols-3">
              {runtimeContract.indexing.providerFreshness.map((provider) => (
                <div
                  key={provider.providerId}
                  className={`rounded-2xl border p-3 text-xs ${
                    provider.tone === 'ready'
                      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                      : provider.tone === 'watch'
                        ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
                        : 'border-rose-400/20 bg-rose-500/10 text-rose-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="uppercase tracking-[0.2em] text-white/80">{provider.providerName}</p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">{provider.indexState}</p>
                  </div>
                  <p className="mt-2 leading-5">{provider.freshnessSummary}</p>
                  <p className="mt-2 leading-5 text-white/75">{provider.ownershipSummary}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-violet-300">Recent query persistence</p>
                <p className="mt-2 text-sm font-semibold text-white">{searchSettingsRuntime.querySummary}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{searchSettingsRuntime.summary}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/80">
                {searchSettingsRuntime.recentQueries.length} recent
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {searchSettingsRuntime.recentQueries.length > 0 ? searchSettingsRuntime.recentQueries.map((entry) => (
                <button
                  key={entry.key}
                  onClick={() => setQuery(entry.query)}
                  className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left hover:bg-white/[0.06] ${
                    focusRuntime.highlightedRecentQueryKey === entry.key
                      ? 'border-violet-400/40 bg-violet-500/10'
                      : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{entry.query}</p>
                    <p className="mt-1 text-xs text-slate-400">{entry.summary}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${
                    entry.tone === 'ready'
                      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                      : entry.tone === 'watch'
                        ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
                        : 'border-rose-400/20 bg-rose-500/10 text-rose-100'
                  }`}>
                    {entry.providerName}
                  </span>
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                  Run a few provider-wide searches and they will persist here for warm-started route recovery.
                </div>
              )}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-violet-300">Shared settings posture</p>
            <p className="mt-2 text-sm font-semibold text-white">{searchSettingsRuntime.playbackSummary}</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">{searchSettingsRuntime.displaySummary}</p>
            <div className="mt-3 grid gap-2">
              {[...searchSettingsRuntime.playbackCards.slice(0, 2), ...searchSettingsRuntime.displayCards.slice(0, 2)].map((card) => (
                <div key={card.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/80">{card.value}</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{card.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {mockHealth ? (
        <section className="rounded-[1.6rem] border border-violet-400/20 bg-violet-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-violet-300">Search rehearsal visibility</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Search now knows when the mock provider is rehearsing degraded catalog states.</h3>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">{mockHealth.demoFlows?.search || 'Use the mock adapter to verify cached search, partial-result messaging, and retry behavior.'}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
              {mockHealth.healthScenarios?.[mockHealth.activeScenario]?.label ?? mockHealth.activeScenario}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(mockHealth.endpointHealth || {}).map(([key, value]) => (
              <span key={key} className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.22em] ${value === 'healthy' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-amber-400/20 bg-amber-500/10 text-amber-100'}`}>
                {key} · {value}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(scenarioLabels) as MockProviderScenario[]).map((key) => (
              <button
                key={key}
                onClick={() => applyScenario(key)}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${scenario === key ? 'bg-violet-500 text-white' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
              >
                {scenarioLabels[key]}
              </button>
            ))}
          </div>
          {mockHealth.accountProfile ? (
            <ProviderFactGrid
              summary={{
                status: mockHealth.accountProfile.status,
                expiresAt: mockHealth.accountProfile.expiryLabel,
                activeConnections: mockHealth.accountProfile.activeConnections,
                maxConnections: mockHealth.accountProfile.maxConnections,
                timezone: mockHealth.accountProfile.timezone,
                serverTime: null,
              }}
            />
          ) : null}
          {mockRecoveryWarning ? (
            <div className="mt-4">
              <ProviderRecoveryRail
                eyebrow="Search trust warning"
                title="Keep cached search useful, but move playback to a healthier source."
                detail={mockRecoveryWarning}
                tone="amber"
                actions={healthiestConnection ? [{
                  label: 'Switch to healthiest saved provider',
                  meta: healthiestConnection.name,
                  onClick: () => setActiveConnection(healthiestConnection.id, {
                    sourceSurface: 'search',
                    reason: 'recovery',
                    preservedQuery: query,
                    preservedResultCount: results.length,
                    preservedDuplicateGroups: duplicateGroups,
                  }),
                }] : []}
              />
            </div>
          ) : null}
          {healthiestConnection && mockHealth.surfaceRecoveryPlans?.search ? (
            <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">{mockHealth.surfaceRecoveryPlans.search.title}</p>
              <p className="mt-2 text-sm text-slate-100">{mockHealth.surfaceRecoveryPlans.search.detail}</p>
              <button
                onClick={() => setActiveConnection(healthiestConnection.id, {
                  sourceSurface: 'search',
                  reason: 'recovery',
                  preservedQuery: query,
                  preservedResultCount: results.length,
                  preservedDuplicateGroups: duplicateGroups,
                })}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-400/20 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-sky-50 hover:bg-sky-400/30"
              >
                <span>{mockHealth.surfaceRecoveryPlans.search.cta}</span>
                <span className="text-xs text-sky-50/80">{healthiestConnection.name}</span>
              </button>
            </div>
          ) : null}
          {browseLaunchScorecard ? (
            <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">Browse launch scorecard</p>
                  <h4 className="mt-2 text-base font-semibold text-white">{browseLaunchScorecard.title}</h4>
                  <p className="mt-2 max-w-3xl text-sm text-slate-300">{browseLaunchScorecard.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/80">
                  {browseLaunchScorecard.metrics.map((metric) => metric.label).join(' / ')}
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {browseLaunchScorecard.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className={`rounded-2xl border p-3 text-xs ${
                      metric.tone === 'ready'
                        ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                        : metric.tone === 'watch'
                          ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
                          : 'border-rose-400/20 bg-rose-500/10 text-rose-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="uppercase tracking-[0.2em] text-white/80">{metric.label}</p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">{metric.value}</p>
                    </div>
                    <p className="mt-2 leading-5">{metric.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <ProviderTrustStack
            signals={mockHealth.trustSignals}
            title="Trust signals"
            className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4"
          />
          {activeScenarioDetails?.expectedUx?.length ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-violet-300">Expected search behavior</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {activeScenarioDetails.expectedUx.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          ) : null}
          {mockHealth.recoveryActions?.length ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-violet-300">Recovery actions</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {mockHealth.recoveryActions.map((action) => <li key={action}>• {action}</li>)}
              </ul>
            </div>
          ) : null}
          {mockHealth.scenarioUrls ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
              {(Object.entries(mockHealth.scenarioUrls) as Array<[MockProviderScenario, string]>).map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-black/20 px-3 py-2 hover:bg-white/5">
                  {scenarioLabels[key]} health
                </a>
              ))}
            </div>
          ) : null}
          {mockHealth.healthScenarios?.[mockHealth.activeScenario]?.verificationSteps?.length ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-violet-300">Active verification steps</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {mockHealth.healthScenarios[mockHealth.activeScenario].verificationSteps.map((step) => <li key={step}>• {step}</li>)}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {loading ? <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-slate-400">{loadingLabel}</div> : null}
      {usingCache && results.length > 0 ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">Loaded cached or partial results instantly, now refreshing provider data in the background.</div> : null}
      {degradedProviders.length > 0 ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium text-white">Some providers failed to refresh, but search stayed up with partial results.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {degradedProviders.map(({ provider, message }) => (
              <button
                key={provider.id}
                onClick={() => validateConnection(provider.id)}
                className="rounded-full border border-white/20 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-white/10"
                title={message}
              >
                Retry {provider.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {!loading && query.trim().length < 2 ? <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">Type at least 2 characters to search across saved providers.</div> : null}

      {results.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((result) => {
            const contentId = getContentId(result.item);
            const artwork = getArtwork(result.item);
            const isPlayable = result.kind !== 'series';
            const authSummary = result.provider.lastAuthSummary;
            const healthiestAlternateConnection = getHealthiestSavedProvider({
              connections,
              connectionStatus,
              activeConnectionId: result.provider.id,
            });
            const alternateVariants = result.variants.filter((variant) => !variant.isPrimary);
            const actionContract = runtimeContract?.actionsByResultKey[buildSearchResultActionKey(result)];
            const primaryAction = actionContract?.primaryAction ?? null;
            const favoriteContract = actionContract?.favorite ?? null;
            const continueWatching = actionContract?.continueWatching ?? null;
            const switchIntent = actionContract?.switchIntent ?? null;
            const trustContract = actionContract?.trust ?? null;
            const rankingContract = runtimeContract?.indexing.rankingByResultKey[result.canonicalKey] ?? null;
            const continuityDisplay = buildSearchContinuityDisplayContract({
              continuity: result.continuity,
              kind: result.kind,
            });
            const resultActionKey = buildSearchResultActionKey(result);
            return (
              <article
                key={`${result.provider.id}-${result.kind}-${contentId}`}
                className={`rounded-[1.6rem] border p-4 ${
                  focusRuntime.highlightedResultKey === resultActionKey
                    ? 'border-violet-400/40 bg-violet-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="aspect-video rounded-2xl bg-cover bg-center bg-no-repeat" style={{ backgroundImage: artwork ? `url(${artwork})` : undefined }} />
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-white">{result.item.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{result.kind} · {result.provider.name}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedResultKey(resultActionKey);
                      setActiveConnection(result.provider.id, {
                        sourceSurface: 'search',
                        reason: 'variant',
                        preservedQuery: query,
                        preservedResultCount: results.length,
                        preservedDuplicateGroups: duplicateGroups,
                        preservedTitle: result.item.name,
                      });
                    }}
                    className={`rounded-full px-3 py-1 text-xs ${activeConnection?.id === result.provider.id ? 'bg-violet-500/20 text-violet-200' : 'bg-black/20 text-slate-300 hover:bg-white/5'}`}
                  >
                    {activeConnection?.id === result.provider.id ? 'Active' : 'Switch'}
                  </button>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{result.item.plot || result.item.genre || 'Ready for playback and browsing in the active provider shell.'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">{result.matchReason}</span>
                  {authSummary ? (
                    <span className={`rounded-full border px-3 py-2 ${trustContract?.connectionHeadroom.tone === 'recover' ? 'border-amber-400/20 bg-amber-500/10 text-amber-100' : 'border-sky-400/20 bg-sky-500/10 text-sky-100'}`}>
                      {authSummary.activeConnections ?? 0}/{authSummary.maxConnections ?? '?'} lines · expires {formatProviderExpiry(authSummary.expiresAt)}
                    </span>
                  ) : null}
                  {result.providerCount > 1 ? (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-emerald-100">
                      Also on {result.providerCount - 1} more provider{result.providerCount - 1 === 1 ? '' : 's'} · {continuityDisplay?.launchOwnerLabel || result.continuity.launchOwnerProviderName} owns launch
                    </span>
                  ) : null}
                  {result.kind === 'series' && result.continuity.seriesCompletenessBand ? (
                    <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-sky-100">
                      Series continuity · {result.continuity.seriesCompletenessBand}
                    </span>
                  ) : null}
                  {continuityDisplay ? (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                      {continuityDisplay.modeLabel}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                  <p className="uppercase tracking-[0.2em] text-slate-500">Continuity contract</p>
                  <p className="mt-2 leading-5 text-slate-300">{actionContract?.summary || continuityDisplay?.summary || result.continuity.summary}</p>
                  {continuityDisplay?.detail ? (
                    <p className="mt-2 text-[11px] leading-5 text-sky-100">
                      {continuityDisplay.detail}
                    </p>
                  ) : null}
                  {continuityDisplay?.episodeMappingLabel ? (
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">
                      {continuityDisplay.episodeMappingLabel}
                    </p>
                  ) : null}
                  {continuityDisplay && continuityDisplay.reasonList.length > 0 ? (
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">
                      Reason codes: {continuityDisplay.reasonList.map((reason) => reason.label).join(' · ')}
                    </p>
                  ) : null}
                  {continueWatching ? (
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">
                      Continue watching: {continueWatching.summary}
                    </p>
                  ) : null}
                  {favoriteContract ? (
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">
                      Favorite state: {favoriteContract.summary}
                    </p>
                  ) : null}
                  {switchIntent ? (
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">
                      Launch intent: {switchIntent.summary}
                    </p>
                  ) : null}
                </div>
                {rankingContract ? (
                  <div className="mt-3 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3 text-xs text-sky-100">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="uppercase tracking-[0.2em] text-sky-200">Ranking contract</p>
                        <p className="mt-2 leading-5 text-slate-100">{rankingContract.summary}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-sky-100">
                        Rank #{rankingContract.rank}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                        Owner · {rankingContract.launchOwnerProviderName}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                        Score · {Math.round(rankingContract.score)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                        Query overlap · {rankingContract.queryOverlap.join(', ') || 'title-led'}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-slate-200">
                        <p className="uppercase tracking-[0.2em] text-slate-500">Ownership</p>
                        <p className="mt-2 leading-5">{rankingContract.ownershipSummary}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-slate-200">
                        <p className="uppercase tracking-[0.2em] text-slate-500">Freshness</p>
                        <p className="mt-2 leading-5">{rankingContract.freshnessSummary}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-slate-200">
                        <p className="uppercase tracking-[0.2em] text-slate-500">Duplicate collapse</p>
                        <p className="mt-2 leading-5">{rankingContract.duplicateSummary}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {rankingContract.providerStandings.slice(0, 3).map((standing) => (
                        <div key={standing.providerId} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-slate-200">
                          <div className="flex items-center justify-between gap-3">
                            <p className="uppercase tracking-[0.2em] text-slate-500">{standing.providerName}</p>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                              {standing.isOwner ? 'owner' : `-${Math.max(0, Math.round(standing.trustDeltaFromOwner))}`}
                            </p>
                          </div>
                          <p className="mt-2 leading-5">Composite score {Math.round(standing.compositeScore)}</p>
                          <p className="mt-2 leading-5 text-slate-400">{standing.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {trustContract ? (
                  <div className="mt-3 grid gap-3">
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">Go / Watch / Recover</p>
                          <p className="mt-2 text-sm font-semibold text-white">{trustContract.launchScorecard.title}</p>
                          <p className="mt-2 text-xs leading-5 text-slate-300">{trustContract.launchScorecard.summary}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/80">
                          {trustContract.launchScorecard.metrics.map((metric) => metric.label).join(' / ')}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        {trustContract.launchScorecard.metrics.map((metric) => (
                          <div
                            key={metric.label}
                            className={`rounded-2xl border p-3 text-xs ${
                              metric.tone === 'ready'
                                ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                                : metric.tone === 'watch'
                                  ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
                                  : 'border-rose-400/20 bg-rose-500/10 text-rose-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="uppercase tracking-[0.2em] text-white/80">{metric.label}</p>
                              <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">{metric.value}</p>
                            </div>
                            <p className="mt-2 leading-5">{metric.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      {trustContract.launchReadiness.map((card) => (
                        <div
                          key={card.label}
                          className={`rounded-2xl border p-3 text-xs ${
                            card.tone === 'ready'
                              ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                              : card.tone === 'watch'
                                ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
                                : 'border-rose-400/20 bg-rose-500/10 text-rose-100'
                          }`}
                        >
                          <p className="uppercase tracking-[0.2em] text-white/80">{card.label}</p>
                          <p className="mt-2 leading-5">{card.safeWhen}</p>
                          <p className="mt-2 leading-5 text-white/75">{card.blockedWhen}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="uppercase tracking-[0.2em] text-slate-500">{trustContract.providerChoice.title}</p>
                        <p className="mt-2 leading-5 text-slate-200">{trustContract.providerChoice.summary}</p>
                        <p className="mt-2 leading-5">Auto choice: {trustContract.providerChoice.autoChoice}</p>
                        <p className="mt-2 leading-5">User choice: {trustContract.providerChoice.userChoice}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="uppercase tracking-[0.2em] text-slate-500">{trustContract.claimCeiling.title}</p>
                        <p className="mt-2 leading-5 text-slate-200">Allowed promise: {trustContract.claimCeiling.strongestPromise}</p>
                        <p className="mt-2 leading-5">Suppress: {trustContract.claimCeiling.suppressedPromise}</p>
                        <p className="mt-2 leading-5 text-slate-400">{trustContract.claimCeiling.reason}</p>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="uppercase tracking-[0.2em] text-slate-500">{trustContract.proofDebt.title}</p>
                        <p className="mt-2 leading-5 text-slate-200">{trustContract.proofDebt.summary}</p>
                        <p className="mt-2 leading-5">Debt source: {trustContract.proofDebt.debtSource}</p>
                        <p className="mt-2 leading-5 text-slate-400">{trustContract.proofDebt.repaymentMove}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="uppercase tracking-[0.2em] text-slate-500">{trustContract.autonomyBoundary.title}</p>
                        <p className="mt-2 leading-5 text-slate-200">{trustContract.autonomyBoundary.summary}</p>
                        <p className="mt-2 leading-5">Search may keep: {trustContract.autonomyBoundary.autoMaintains}</p>
                        <p className="mt-2 leading-5">User owns: {trustContract.autonomyBoundary.userOwns}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="uppercase tracking-[0.2em] text-slate-500">{trustContract.connectionHeadroom.title}</p>
                        <p className="mt-2 leading-5 text-slate-200">{trustContract.connectionHeadroom.summary}</p>
                        <p className="mt-2 leading-5">{trustContract.connectionHeadroom.currentWindow}</p>
                        <p className="mt-2 leading-5 text-slate-400">{trustContract.connectionHeadroom.warningTrigger}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="uppercase tracking-[0.2em] text-slate-500">{trustContract.providerStability.title}</p>
                        <p className="mt-2 leading-5 text-slate-200">{trustContract.providerStability.summary}</p>
                        <p className="mt-2 leading-5">Stable when: {trustContract.providerStability.stabilityThreshold}</p>
                        <p className="mt-2 leading-5">Normal volatility: {trustContract.providerStability.toleratedVolatility}</p>
                        <p className="mt-2 leading-5 text-slate-400">Keep rescue primary when: {trustContract.providerStability.keepRescuePrimaryTrigger}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="uppercase tracking-[0.2em] text-slate-500">{trustContract.returnCooldown.title}</p>
                        <p className="mt-2 leading-5 text-slate-200">{trustContract.returnCooldown.summary}</p>
                        <p className="mt-2 leading-5">Cooldown window: {trustContract.returnCooldown.cooldownWindow}</p>
                        <p className="mt-2 leading-5">Cooldown shrinks when: {trustContract.returnCooldown.shrinkingProof}</p>
                        <p className="mt-2 leading-5 text-slate-400">Restart cooldown when: {trustContract.returnCooldown.resetTrigger}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="uppercase tracking-[0.2em] text-slate-500">{trustContract.actionGate.title}</p>
                        <p className="mt-2 leading-5 text-slate-200">{trustContract.actionGate.summary}</p>
                        <p className="mt-2 leading-5">Primary CTA: {trustContract.actionGate.primaryAction}</p>
                        <p className="mt-2 leading-5">Downgrade to: {trustContract.actionGate.downgradedAction}</p>
                        <p className="mt-2 leading-5 text-slate-400">Unlock condition: {trustContract.actionGate.unlockCondition}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="uppercase tracking-[0.2em] text-slate-500">{trustContract.confidenceFloor.title}</p>
                        <p className="mt-2 leading-5 text-slate-200">{trustContract.confidenceFloor.summary}</p>
                        <p className="mt-2 leading-5">Minimum proof: {trustContract.confidenceFloor.minimumProof}</p>
                        <p className="mt-2 leading-5">Downgrade to: {trustContract.confidenceFloor.downgradeMode}</p>
                        <p className="mt-2 leading-5 text-slate-400">Hard stop: {trustContract.confidenceFloor.hardStopTrigger}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="uppercase tracking-[0.2em] text-slate-500">{trustContract.recoveryWitness.title}</p>
                        <p className="mt-2 leading-5 text-slate-200">{trustContract.recoveryWitness.summary}</p>
                        <p className="mt-2 leading-5">Witness proof: {trustContract.recoveryWitness.evidence}</p>
                        <p className="mt-2 leading-5">Carry forward: {trustContract.recoveryWitness.preservedContext}</p>
                        <p className="mt-2 leading-5 text-slate-400">Break trust when: {trustContract.recoveryWitness.contradictionTrigger}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="uppercase tracking-[0.2em] text-slate-500">{trustContract.interruptionBudget.title}</p>
                        <p className="mt-2 leading-5 text-slate-200">{trustContract.interruptionBudget.summary}</p>
                        <p className="mt-2 leading-5">Acceptable delay: {trustContract.interruptionBudget.acceptableDelay}</p>
                        <p className="mt-2 leading-5">Continuity layer: {trustContract.interruptionBudget.continuityLayer}</p>
                        <p className="mt-2 leading-5 text-slate-400">Escalate when: {trustContract.interruptionBudget.escalationTrigger}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        <p className="uppercase tracking-[0.2em] text-slate-500">{trustContract.retryHonesty.title}</p>
                        <p className="mt-2 leading-5 text-slate-200">{trustContract.retryHonesty.summary}</p>
                        <p className="mt-2 leading-5">Honest while: {trustContract.retryHonesty.honestRetryWindow}</p>
                        <p className="mt-2 leading-5">Preserves: {trustContract.retryHonesty.preservesContext}</p>
                        <p className="mt-2 leading-5 text-slate-400">Give up when: {trustContract.retryHonesty.giveUpTrigger}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
                {trustContract && trustContract.connectionHeadroom.tone === 'recover' ? (
                  <div className="mt-3">
                    <ProviderRecoveryRail
                      eyebrow="Result trust warning"
                      title={`${result.provider.name} is risky for launch right now.`}
                      detail={trustContract.connectionHeadroom.blockedState}
                      tone="amber"
                      actions={healthiestAlternateConnection ? [{
                        label: 'Switch to healthiest saved provider',
                        meta: healthiestAlternateConnection.name,
                        onClick: () => setActiveConnection(healthiestAlternateConnection.id, {
                          sourceSurface: 'search',
                          reason: 'recovery',
                          preservedQuery: query,
                          preservedResultCount: results.length,
                          preservedDuplicateGroups: duplicateGroups,
                          preservedTitle: result.item.name,
                        }),
                      }] : []}
                    />
                  </div>
                ) : null}
                {alternateVariants.length > 0 ? (
                  <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="uppercase tracking-[0.2em] text-emerald-200">Provider variants</p>
                        <p className="mt-1 text-[11px] leading-5 text-emerald-100/80">{result.continuity.summary}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">
                        {result.providerCount} providers
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {alternateVariants.slice(0, 3).map((variant) => {
                        const variantContentId = getContentId(variant.item);
                        const variantAction = actionContract?.alternateActions.find(
                          (entry) => entry.providerId === variant.provider.id && entry.streamId === variantContentId
                        );
                        const trust = getProviderTrustDisplay(variant.trustScore, variant.warning);
                        return (
                          <div key={`${variant.provider.id}-${variantContentId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                            <div className="min-w-[15rem] flex-1">
                              <ProviderTrustBadge
                                eyebrow={variant.provider.name}
                                label={`${trust.label} · score ${Math.round(variant.compositeScore)}`}
                                detail={trust.detail}
                                tone={trust.tone}
                                compact
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {result.kind === 'series' ? (
                                <Link
                                  href={variantAction?.href || '#'}
                                  onClick={() => {
                                    setSelectedResultKey(resultActionKey);
                                    setActiveConnection(variant.provider.id, {
                                      sourceSurface: 'search',
                                      reason: 'variant',
                                      preservedQuery: query,
                                      preservedResultCount: results.length,
                                      preservedDuplicateGroups: duplicateGroups,
                                      preservedTitle: variant.item.name,
                                    });
                                  }}
                                  className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                                >
                                  {variantAction?.label || 'Browse series'}
                                </Link>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedResultKey(resultActionKey);
                                    setActiveConnection(variant.provider.id, {
                                      sourceSurface: 'search',
                                      reason: 'launch',
                                      preservedQuery: query,
                                      preservedResultCount: results.length,
                                      preservedDuplicateGroups: duplicateGroups,
                                      preservedTitle: variant.item.name,
                                    });
                                    const url = variantAction?.playbackUrl;
                                    if (!url) return;
                                    playStream(variant.item, url, variant.provider.id);
                                  }}
                                  className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                                >
                                  {variantAction?.label || 'Play'}
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedResultKey(resultActionKey);
                                  setActiveConnection(variant.provider.id, {
                                    sourceSurface: 'search',
                                    reason: 'manual',
                                    preservedQuery: query,
                                    preservedResultCount: results.length,
                                    preservedDuplicateGroups: duplicateGroups,
                                    preservedTitle: variant.item.name,
                                  });
                                }}
                                className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:bg-white/10"
                              >
                                Switch only
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 flex gap-3">
                  {isPlayable && primaryAction ? (
                    <button
                      onClick={() => {
                        setSelectedResultKey(resultActionKey);
                        setActiveConnection(primaryAction.providerId, {
                          sourceSurface: 'search',
                          reason: 'launch',
                          preservedQuery: query,
                          preservedResultCount: results.length,
                          preservedDuplicateGroups: duplicateGroups,
                          preservedTitle: result.item.name,
                        });
                        const url = primaryAction.playbackUrl;
                        if (!url) return;
                        playStream(result.item, url, primaryAction.providerId);
                      }}
                      className="flex-1 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
                    >
                      {primaryAction.label}
                    </button>
                  ) : primaryAction ? (
                    <Link
                      href={primaryAction.href || '#'}
                      onClick={() => {
                        setSelectedResultKey(resultActionKey);
                        setActiveConnection(primaryAction.providerId, {
                          sourceSurface: 'search',
                          reason: 'variant',
                          preservedQuery: query,
                          preservedResultCount: results.length,
                          preservedDuplicateGroups: duplicateGroups,
                          preservedTitle: result.item.name,
                        });
                      }}
                      className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-slate-200 hover:bg-white/5"
                    >
                      {primaryAction.label}
                    </Link>
                  ) : null}
                  {favoriteContract ? (
                    <button
                      onClick={() => toggleFavorite(favoriteContract.ownerProviderId, getContentId(result.item), result.item)}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:bg-white/5"
                    >
                      {favoriteContract.ctaLabel}
                    </button>
                  ) : null}
                  <div className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-400">
                    Score {Math.round(result.score)}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {query.trim().length >= 2 && results.length === 0 && !error && !loading ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">No matches yet. Try provider names, genres, or broader terms like news, movie, or sports.</div>
      ) : null}
    </div>
  );
}
