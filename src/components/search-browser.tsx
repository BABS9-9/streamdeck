'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderHealth, getSelectedMockProviderScenario, setSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { formatProviderExpiry, getProviderLinePressure } from '@/lib/provider-signals';
import { buildProviderVariant, getHealthiestSavedProvider, getProviderSummaryWarning, getProviderTrustDisplay, rankProviderVariants } from '@/lib/provider-recovery';
import { buildLiveStreamUrl, buildVodStreamUrl, getArtwork, getCachedSearchCatalog, getContentId, refreshSearchCatalog } from '@/lib/xtream-api';
import { ConnectionStatus, MockProviderHealth, MockProviderScenario, ProviderCatalog, SavedConnection, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';
import { ProviderRecoveryRail } from './provider-recovery-rail';
import { ProviderTrustBadge } from './provider-trust-badge';

type SearchResultVariant = ReturnType<typeof rankProviderVariants>[number] & {
  provider: SavedConnection;
  item: XtreamStream;
};

type SearchResult = {
  provider: SavedConnection;
  item: XtreamStream;
  kind: 'live' | 'movie' | 'series';
  score: number;
  matchReason: string;
  duplicateCount: number;
  providerCount: number;
  variants: SearchResultVariant[];
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

const buildSearchKey = (item: XtreamStream, kind: SearchResult['kind']) => {
  const normalizedName = normalizeSearchText(item.name);
  const year = item.year || item.releasedate?.slice(0, 4) || '';
  return `${kind}:${normalizedName}:${year}`;
};

const scoreResult = (query: ReturnType<typeof getSearchTerms>, item: XtreamStream, kind: SearchResult['kind']) => {
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

const rankResults = (
  providerCatalogs: Array<{ provider: SavedConnection; catalog: Pick<ProviderCatalog, 'live' | 'vod' | 'series'> }>,
  trimmed: string,
  connectionStatus: Record<string, ConnectionStatus>
) => {
  const query = getSearchTerms(trimmed);
  const deduped = new Map<string, SearchResult>();

  providerCatalogs.forEach(({ provider, catalog }) => {
    const buckets: Array<[SearchResult['kind'], XtreamStream[]]> = [
      ['live', catalog.live],
      ['movie', catalog.vod],
      ['series', catalog.series],
    ];

    buckets.forEach(([kind, items]) => {
      items.forEach((item) => {
        const scored = scoreResult(query, item, kind);
        if (!scored) return;

        const key = buildSearchKey(item, kind);
        const existing = deduped.get(key);
        const candidateVariant = {
          ...buildProviderVariant({
            connection: provider,
            status: connectionStatus[provider.id],
            item,
            kind,
          }),
          provider,
          item,
        } satisfies Omit<SearchResultVariant, 'compositeScore' | 'isPrimary'>;
        const candidateCompositeScore = scored.score + candidateVariant.trustScore;

        if (!existing) {
          deduped.set(key, {
            provider,
            item,
            kind,
            score: candidateCompositeScore,
            matchReason: scored.matchReason,
            duplicateCount: 0,
            providerCount: 1,
            variants: [{
              ...candidateVariant,
              compositeScore: candidateCompositeScore,
              isPrimary: true,
            }],
          });
          return;
        }

        const variantLookup = new Map<string, SearchResultVariant>();
        [...existing.variants, {
          ...candidateVariant,
          compositeScore: candidateCompositeScore,
          isPrimary: false,
        }].forEach((variant) => {
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
          } satisfies SearchResultVariant;
        });

        const primaryVariant = rankedVariants[0];

        deduped.set(key, {
          provider: primaryVariant.provider,
          item: primaryVariant.item,
          kind,
          score: primaryVariant.compositeScore,
          matchReason: primaryVariant.providerId === candidateVariant.providerId
            ? `${scored.matchReason} • healthiest ranked provider copy`
            : `${existing.matchReason} • also found on ${existing.providerCount + 1} providers`,
          duplicateCount: existing.duplicateCount + 1,
          providerCount: existing.providerCount + 1,
          variants: rankedVariants,
        });
      });
    });
  });

  return [...deduped.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 48);
};

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

const getVariantActionLabel = (kind: SearchResult['kind']) => {
  if (kind === 'live') return 'Play live';
  if (kind === 'movie') return 'Play movie';
  return 'Browse series';
};

export function SearchBrowser() {
  const connections = useAuthStore((state) => state.connections);
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const validateConnection = useAuthStore((state) => state.validateConnection);
  const playStream = usePlayerStore((state) => state.playStream);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState('sports');
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
        .map((provider) => ({ provider, catalog: getCachedSearchCatalog(provider.id) }))
        .filter((entry): entry is { provider: SavedConnection; catalog: ProviderCatalog } => Boolean(entry.catalog));

      if (cachedCatalogs.length > 0) {
        setResults(rankResults(cachedCatalogs, trimmed, connectionStatus));
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
        const settled = await Promise.allSettled(
          connections.map(async (provider) => ({
            provider,
            catalog: await refreshSearchCatalog(provider),
          }))
        );

        if (cancelled) return;

        const successfulCatalogs = settled
          .filter((result): result is PromiseFulfilledResult<{ provider: SavedConnection; catalog: ProviderCatalog }> => result.status === 'fulfilled')
          .map((result) => result.value);

        const failedProviders = settled
          .map((result, index) => ({ result, provider: connections[index] }))
          .filter((entry): entry is { result: PromiseRejectedResult; provider: SavedConnection } => entry.result.status === 'rejected')
          .map((entry) => ({
            provider: entry.provider,
            message: entry.result.reason instanceof Error ? entry.result.reason.message : 'Catalog refresh failed',
          }));

        setDegradedProviders(failedProviders);

        if (successfulCatalogs.length > 0) {
          setResults(rankResults(successfulCatalogs, trimmed, connectionStatus));
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
  }, [connectionStatus, connections, query, scenario, scenarioRefreshing]);

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
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                ['Account', mockHealth.accountProfile.status],
                ['Expiry', mockHealth.accountProfile.expiryLabel],
                ['Capacity', `${mockHealth.accountProfile.activeConnections}/${mockHealth.accountProfile.maxConnections} in use`],
                ['Timezone', mockHealth.accountProfile.timezone],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
                  <p className="mt-2 text-sm text-slate-200">{value}</p>
                </div>
              ))}
            </div>
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
                  onClick: () => setActiveConnection(healthiestConnection.id),
                }] : []}
              />
            </div>
          ) : null}
          {healthiestConnection && mockHealth.surfaceRecoveryPlans?.search ? (
            <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">{mockHealth.surfaceRecoveryPlans.search.title}</p>
              <p className="mt-2 text-sm text-slate-100">{mockHealth.surfaceRecoveryPlans.search.detail}</p>
              <button
                onClick={() => setActiveConnection(healthiestConnection.id)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-400/20 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-sky-50 hover:bg-sky-400/30"
              >
                <span>{mockHealth.surfaceRecoveryPlans.search.cta}</span>
                <span className="text-xs text-sky-50/80">{healthiestConnection.name}</span>
              </button>
            </div>
          ) : null}
          {mockHealth.trustSignals?.length ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-violet-300">Trust signals</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {mockHealth.trustSignals.map((signal) => (
                  <div key={signal.id} className={`rounded-2xl border p-4 ${signal.tone === 'healthy' ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-amber-400/20 bg-amber-500/10'}`}>
                    <p className={`text-sm font-semibold ${signal.tone === 'healthy' ? 'text-emerald-100' : 'text-amber-100'}`}>{signal.label}</p>
                    <p className="mt-2 text-sm text-slate-300">{signal.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
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
                    onClick={() => setActiveConnection(result.provider.id)}
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
                      Also on {result.providerCount - 1} more provider{result.providerCount - 1 === 1 ? '' : 's'} · best trust-ranked copy shown
                    </span>
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
                        onClick: () => setActiveConnection(healthiestAlternateConnection.id),
                      }] : []}
                    />
                  </div>
                ) : null}
                {alternateVariants.length > 0 ? (
                  <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="uppercase tracking-[0.2em] text-emerald-200">Provider variants</p>
                        <p className="mt-1 text-[11px] leading-5 text-emerald-100/80">The healthiest copy won the main card, but alternate provider copies are still launchable from here.</p>
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
                                  href={`/series?seriesId=${variant.item.series_id ?? variantContentId}`}
                                  onClick={() => setActiveConnection(variant.provider.id)}
                                  className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                                >
                                  {variantLabel}
                                </Link>
                              ) : (
                                <button
                                  onClick={() => {
                                    setActiveConnection(variant.provider.id);
                                    const url = result.kind === 'live' ? buildLiveStreamUrl(variant.provider, variant.item) : buildVodStreamUrl(variant.provider, variant.item);
                                    playStream(variant.item, url, variant.provider.id);
                                  }}
                                  className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                                >
                                  {variantLabel}
                                </button>
                              )}
                              <button
                                onClick={() => setActiveConnection(variant.provider.id)}
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
                        setActiveConnection(result.provider.id);
                        const url = result.kind === 'live' ? buildLiveStreamUrl(result.provider, result.item) : buildVodStreamUrl(result.provider, result.item);
                        playStream(result.item, url, result.provider.id);
                      }}
                      className="flex-1 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
                    >
                      Play
                    </button>
                  ) : (
                    <Link
                      href={`/series?seriesId=${contentId}`}
                      onClick={() => setActiveConnection(result.provider.id)}
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
