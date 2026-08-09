'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderHealth, getSelectedMockProviderScenario, setSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { formatProviderExpiry, getProviderLinePressure } from '@/lib/provider-signals';
import { describeSeriesCompletenessBand, GroupedSearchResult, SearchResultVariantPayload } from '@/lib/search-continuity';
import { getHealthiestSavedProvider, getProviderSummaryWarning, getProviderTrustDisplay } from '@/lib/provider-recovery';
import { buildLiveStreamUrl, buildVodStreamUrl, getArtwork, getContentId } from '@/lib/xtream-api';
import { ConnectionStatus, MockProviderHealth, MockProviderScenario, ProviderCatalog, SavedConnection, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';
import { useSearchStore } from '@/stores/search-store';
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

const getVariantActionLabel = (kind: GroupedSearchResult['kind']) => {
  if (kind === 'live') return 'Play live';
  if (kind === 'movie') return 'Play movie';
  return 'Browse series';
};

const buildSeriesResultHref = (result: Pick<GroupedSearchResult, 'item' | 'continuity'>) => {
  const contentId = getContentId(result.item);
  const season = result.continuity.canonicalEpisodeMapping?.preferredSeasonNumber;
  const episode = result.continuity.canonicalEpisodeMapping?.preferredEpisodeNumber;
  const params = new URLSearchParams({ seriesId: String(result.item.series_id ?? contentId) });

  if (season) params.set('season', String(season));
  if (episode) params.set('episode', String(episode));

  return `/series?${params.toString()}`;
};

const buildSeriesVariantHref = (
  result: Pick<GroupedSearchResult, 'continuity'>,
  variant: Pick<SearchResultVariantPayload, 'item'>
) => {
  const variantContentId = getContentId(variant.item);
  const season = result.continuity.canonicalEpisodeMapping?.preferredSeasonNumber;
  const episode = result.continuity.canonicalEpisodeMapping?.preferredEpisodeNumber;
  const params = new URLSearchParams({ seriesId: String(variant.item.series_id ?? variantContentId) });

  if (season) params.set('season', String(season));
  if (episode) params.set('episode', String(episode));

  return `/series?${params.toString()}`;
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
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const getIndexSnapshot = useSearchStore((state) => state.getIndexSnapshot);
  const getSearchSnapshot = useSearchStore((state) => state.getSnapshot);
  const queryGlobalIndex = useSearchStore((state) => state.queryGlobalIndex);
  const saveSearchSnapshot = useSearchStore((state) => state.saveSnapshot);
  const syncProviderIndexes = useSearchStore((state) => state.syncProviderIndexes);

  const [results, setResults] = useState<GroupedSearchResult[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Searching all providers...');
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [degradedProviders, setDegradedProviders] = useState<Array<{ provider: SavedConnection; message: string }>>([]);
  const [mockHealth, setMockHealth] = useState<MockProviderHealth | null>(null);
  const [scenario, setScenario] = useState<MockProviderScenario>('healthy');
  const [scenarioRefreshing, setScenarioRefreshing] = useState(false);

  useEffect(() => {
    setScenario(getSelectedMockProviderScenario());
    return subscribeToMockProviderScenario(setScenario);
  }, []);

  useEffect(() => {
    if (!activeConnection) return;
    const snapshot = getSearchSnapshot(activeConnection.id);
    setQuery(snapshot?.query || 'sports');
  }, [activeConnection?.id, getSearchSnapshot]);

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

    if (connections.length === 0) {
      setResults([]);
      setLoading(false);
      setScenarioRefreshing(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
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
        setResults(queryGlobalIndex({
          connections,
          query: trimmed,
          connectionStatus,
          activeConnectionId: activeConnection?.id,
          watchHistory: watchHistory,
        }));
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
          setResults(queryGlobalIndex({
            connections,
            query: trimmed,
            connectionStatus,
            activeConnectionId: activeConnection?.id,
            watchHistory: watchHistory,
          }));
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
    return results.reduce<Record<string, number>>((acc, result) => {
      acc[result.provider.id] = (acc[result.provider.id] || 0) + 1;
      return acc;
    }, {});
  }, [results]);

  const duplicateGroups = useMemo(() => results.filter((result) => result.duplicateCount > 0).length, [results]);
  const activeScenarioDetails = mockHealth?.healthScenarios?.[mockHealth.activeScenario];
  const mockLinePressure = getProviderLinePressure(mockHealth?.accountProfile, 'Search can still work while playback becomes risky.');
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

  useEffect(() => {
    if (!activeConnection) return;
    saveSearchSnapshot(activeConnection.id, {
      query,
      resultCount: results.length,
      duplicateGroups,
      selectedTitle: results[0]?.item.name ?? null,
      selectedKind: results[0]?.kind ?? null,
    });
  }, [activeConnection, duplicateGroups, query, results, saveSearchSnapshot]);

  if (connections.length === 0) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No saved providers yet. Connect on the login screen first.</div>;
  }

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
            {['sports', 'news', 'movie', 'kids', 'atlas'].map((suggestion) => (
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
          {connections.map((connection) => (
            <span key={connection.id} className={`rounded-full border px-3 py-2 ${activeConnection?.id === connection.id ? 'border-violet-400/40 bg-violet-500/10 text-violet-200' : providerStateTone(connection.id)}`}>
              {connection.name} · {groupedCounts[connection.id] || 0} hits · {connectionStatus[connection.id]?.state ?? 'idle'}
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
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
              Best provider version shown first
            </span>
          </div>
        ) : null}
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
            const providerLinePressure = getProviderLinePressure(authSummary, 'Search can still work while playback becomes risky.');
            const providerRecoveryWarning = getProviderRecoveryWarning(authSummary);
            const healthiestAlternateConnection = getHealthiestSavedProvider({
              connections,
              connectionStatus,
              activeConnectionId: result.provider.id,
            });
            const alternateVariants = result.variants.filter((variant) => !variant.isPrimary);
            return (
              <article key={`${result.provider.id}-${result.kind}-${contentId}`} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                <div className="aspect-video rounded-2xl bg-cover bg-center bg-no-repeat" style={{ backgroundImage: artwork ? `url(${artwork})` : undefined }} />
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-white">{result.item.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{result.kind} · {result.provider.name}</p>
                  </div>
                  <button
                    onClick={() => setActiveConnection(result.provider.id, {
                      sourceSurface: 'search',
                      reason: 'variant',
                      preservedQuery: query,
                      preservedResultCount: results.length,
                      preservedDuplicateGroups: duplicateGroups,
                      preservedTitle: result.item.name,
                    })}
                    className={`rounded-full px-3 py-1 text-xs ${activeConnection?.id === result.provider.id ? 'bg-violet-500/20 text-violet-200' : 'bg-black/20 text-slate-300 hover:bg-white/5'}`}
                  >
                    {activeConnection?.id === result.provider.id ? 'Active' : 'Switch'}
                  </button>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{result.item.plot || result.item.genre || 'Ready for playback and browsing in the active provider shell.'}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">{result.matchReason}</span>
                  {authSummary ? (
                    <span className={`rounded-full border px-3 py-2 ${providerLinePressure ? 'border-amber-400/20 bg-amber-500/10 text-amber-100' : 'border-sky-400/20 bg-sky-500/10 text-sky-100'}`}>
                      {authSummary.activeConnections ?? 0}/{authSummary.maxConnections ?? '?'} lines · expires {formatProviderExpiry(authSummary.expiresAt)}
                    </span>
                  ) : null}
                  {result.providerCount > 1 ? (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-emerald-100">
                      Also on {result.providerCount - 1} more provider{result.providerCount - 1 === 1 ? '' : 's'} · {result.continuity.launchOwnerProviderName} owns launch
                    </span>
                  ) : null}
                  {result.kind === 'series' && result.continuity.seriesCompletenessBand ? (
                    <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-sky-100">
                      Series continuity · {result.continuity.seriesCompletenessBand}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                  <p className="uppercase tracking-[0.2em] text-slate-500">Continuity contract</p>
                  <p className="mt-2 leading-5 text-slate-300">{result.continuity.summary}</p>
                  {result.kind === 'series' && result.continuity.seriesCompletenessBand ? (
                    <p className="mt-2 text-[11px] leading-5 text-sky-100">
                      {describeSeriesCompletenessBand(result.continuity.seriesCompletenessBand)}
                    </p>
                  ) : null}
                  {result.continuity.canonicalEpisodeMapping ? (
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">
                      Episode mapping hook: `get_series_info` on {result.continuity.canonicalEpisodeMapping.providerIds.length} provider
                      {result.continuity.canonicalEpisodeMapping.providerIds.length === 1 ? '' : 's'}
                      {result.continuity.canonicalEpisodeMapping.preferredSeasonNumber && result.continuity.canonicalEpisodeMapping.preferredEpisodeNumber
                        ? ` using S${result.continuity.canonicalEpisodeMapping.preferredSeasonNumber}E${result.continuity.canonicalEpisodeMapping.preferredEpisodeNumber} as the preferred resume target.`
                        : ' before claiming an exact resume point.'}
                    </p>
                  ) : null}
                </div>
                {providerRecoveryWarning ? (
                  <div className="mt-3">
                    <ProviderRecoveryRail
                      eyebrow="Result trust warning"
                      title={`${result.provider.name} is risky for launch right now.`}
                      detail={providerRecoveryWarning}
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
                        const variantLabel = getVariantActionLabel(result.kind);
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
                                  href={buildSeriesVariantHref(result, variant)}
                                  onClick={() => setActiveConnection(variant.provider.id, {
                                    sourceSurface: 'search',
                                    reason: 'variant',
                                    preservedQuery: query,
                                    preservedResultCount: results.length,
                                    preservedDuplicateGroups: duplicateGroups,
                                    preservedTitle: variant.item.name,
                                  })}
                                  className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                                >
                                  {variantLabel}
                                </Link>
                              ) : (
                                <button
                                  onClick={() => {
                                    setActiveConnection(variant.provider.id, {
                                      sourceSurface: 'search',
                                      reason: 'launch',
                                      preservedQuery: query,
                                      preservedResultCount: results.length,
                                      preservedDuplicateGroups: duplicateGroups,
                                      preservedTitle: variant.item.name,
                                    });
                                    const url = result.kind === 'live' ? buildLiveStreamUrl(variant.provider, variant.item) : buildVodStreamUrl(variant.provider, variant.item);
                                    playStream(variant.item, url, variant.provider.id);
                                  }}
                                  className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                                >
                                  {variantLabel}
                                </button>
                              )}
                              <button
                                onClick={() => setActiveConnection(variant.provider.id, {
                                  sourceSurface: 'search',
                                  reason: 'manual',
                                  preservedQuery: query,
                                  preservedResultCount: results.length,
                                  preservedDuplicateGroups: duplicateGroups,
                                  preservedTitle: variant.item.name,
                                })}
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
                  {isPlayable ? (
                    <button
                      onClick={() => {
                        setActiveConnection(result.provider.id, {
                          sourceSurface: 'search',
                          reason: 'launch',
                          preservedQuery: query,
                          preservedResultCount: results.length,
                          preservedDuplicateGroups: duplicateGroups,
                          preservedTitle: result.item.name,
                        });
                        const url = result.kind === 'live' ? buildLiveStreamUrl(result.provider, result.item) : buildVodStreamUrl(result.provider, result.item);
                        playStream(result.item, url, result.provider.id);
                      }}
                      className="flex-1 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
                    >
                      Play
                    </button>
                  ) : (
                    <Link
                      href={buildSeriesResultHref(result)}
                      onClick={() => setActiveConnection(result.provider.id, {
                        sourceSurface: 'search',
                        reason: 'variant',
                        preservedQuery: query,
                        preservedResultCount: results.length,
                        preservedDuplicateGroups: duplicateGroups,
                        preservedTitle: result.item.name,
                      })}
                      className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-slate-200 hover:bg-white/5"
                    >
                      Browse series
                    </Link>
                  )}
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
