'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderHealth, fetchMockProviderManifest, getSelectedMockProviderScenario, setSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { getProviderAccountPressure } from '@/lib/provider-signals';
import { buildProviderVariantsIndex, getAlternateProviderVariants, getHealthiestSavedProvider, getLiveCategoryRecovery, getProviderTrustDisplay, getRecoveryActionLabel, getRecoverySupportLabel, ProviderVariant } from '@/lib/provider-recovery';
import { buildLiveStreamUrl, getCachedHomeSnapshot, getContentId, getHomeData, getShortEpg, saveHomeSnapshot } from '@/lib/xtream-api';
import { MockProviderHealth, MockProviderManifest, MockProviderScenario, NormalizedEpg, ProviderHomeSnapshot, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';
import { MockOperationsConsole } from './mock-operations-console';
import { ProviderFactGrid } from './provider-fact-grid';
import { ProviderRecoveryRail } from './provider-recovery-rail';
import { ProviderTrustBadge } from './provider-trust-badge';
import { ProviderTrustStack } from './provider-trust-stack';

type HomeState = {
  featured: XtreamStream | null;
  spotlight: XtreamStream[];
  quickLive: XtreamStream[];
  summary: { live: number; vod: number; series: number };
};

type CacheState = {
  mode: 'live' | 'cached' | 'offline';
  message: string | null;
  updatedAt: number | null;
};

type CategoryFallback = ReturnType<typeof getLiveCategoryRecovery>;

const emptyState: HomeState = {
  featured: null,
  spotlight: [],
  quickLive: [],
  summary: { live: 0, vod: 0, series: 0 },
};

const emptyCacheState: CacheState = {
  mode: 'live',
  message: null,
  updatedAt: null,
};

export function HomeDashboard() {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const connections = useAuthStore((state) => state.connections);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const revalidateMockConnections = useAuthStore((state) => state.revalidateMockConnections);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const playStream = usePlayerStore((state) => state.playStream);

  const [home, setHome] = useState<HomeState>(emptyState);
  const [heroEpg, setHeroEpg] = useState<NormalizedEpg | null>(null);
  const [liveNow, setLiveNow] = useState<Record<number, NormalizedEpg>>({});
  const [cacheState, setCacheState] = useState<CacheState>(emptyCacheState);
  const [mockHealth, setMockHealth] = useState<MockProviderHealth | null>(null);
  const [mockManifest, setMockManifest] = useState<MockProviderManifest | null>(null);
  const [guideMessage, setGuideMessage] = useState<string | null>(null);
  const [scenario, setScenario] = useState(getSelectedMockProviderScenario());
  const [scenarioRefreshing, setScenarioRefreshing] = useState(false);
  const [providerVariants, setProviderVariants] = useState<Record<string, ProviderVariant[]>>({});

  useEffect(() => {
    setScenario(getSelectedMockProviderScenario());
    return subscribeToMockProviderScenario((nextScenario) => {
      setScenario(nextScenario);
      setScenarioRefreshing(true);
      revalidateMockConnections().catch(() => {});
    });
  }, [revalidateMockConnections]);

  useEffect(() => {
    let cancelled = false;
    if (!activeConnection) return;

    const scenarioLabel = scenario.replace(/([A-Z])/g, ' $1').toLowerCase();

    fetchMockProviderHealth(activeConnection, scenario)
      .then((health) => {
        if (!cancelled) setMockHealth(health);
      })
      .catch(() => {
        if (!cancelled) setMockHealth(null);
      });

    fetchMockProviderManifest(activeConnection, scenario)
      .then((manifest) => {
        if (!cancelled) setMockManifest(manifest);
      })
      .catch(() => {
        if (!cancelled) setMockManifest(null);
      });

    const applySnapshot = (snapshot: ProviderHomeSnapshot, mode: CacheState['mode'], message: string | null) => {
      if (cancelled) return;
      setHome({
        featured: snapshot.featured,
        summary: snapshot.summary,
        spotlight: snapshot.spotlight,
        quickLive: snapshot.quickLive,
      });
      setHeroEpg(snapshot.heroEpg);
      setLiveNow(snapshot.liveNow);
      setCacheState({ mode, message, updatedAt: snapshot.updatedAt });
      setGuideMessage(null);
    };

    const cached = getCachedHomeSnapshot(activeConnection.id, Number.POSITIVE_INFINITY);
    if (cached) {
      const cacheAgeMinutes = Math.round((Date.now() - cached.updatedAt) / 60000);
      applySnapshot(
        cached,
        'cached',
        scenarioRefreshing
          ? `Applying ${scenarioLabel} rehearsal while keeping saved Home data live.`
          : cacheAgeMinutes <= 15
            ? 'Loaded instantly from saved provider cache while refreshing live data.'
            : `Loaded from saved cache (${cacheAgeMinutes} min old) while refreshing live data.`
      );
    } else {
      setHome(emptyState);
      setHeroEpg(null);
      setLiveNow({});
      setCacheState(emptyCacheState);
      setGuideMessage(null);
    }

    getHomeData(activeConnection)
      .then(async (data) => {
        if (cancelled) return;
        const featured = data.liveStreams[0] ?? null;
        const quickLive = data.liveStreams.slice(0, 4);
        const nextHome = {
          featured,
          summary: { live: data.liveStreams.length, vod: data.vodStreams.length, series: data.series.length },
          spotlight: [...data.liveStreams.slice(1, 4), ...data.vodStreams.slice(0, 3)],
          quickLive,
        };

        const epgPairs = await Promise.all(
          quickLive.map(async (stream) => {
            const streamId = getContentId(stream);
            try {
              return [streamId, await getShortEpg(activeConnection, streamId)] as const;
            } catch {
              return [streamId, null] as const;
            }
          })
        );
        if (cancelled) return;
        const nextLiveNow = epgPairs.reduce<Record<number, NormalizedEpg>>((acc, [streamId, guide]) => {
          if (guide) acc[streamId] = guide;
          return acc;
        }, {});
        const featuredId = featured ? getContentId(featured) : null;
        let nextHeroEpg = featuredId ? nextLiveNow[featuredId] ?? null : null;
        if (!nextHeroEpg && featuredId) {
          try {
            nextHeroEpg = await getShortEpg(activeConnection, featuredId);
          } catch {
            nextHeroEpg = null;
          }
        }
        if (cancelled) return;

        setHome(nextHome);
        setLiveNow(nextLiveNow);
        setHeroEpg(nextHeroEpg);
        setGuideMessage(Object.keys(nextLiveNow).length === 0 ? 'Guide data is temporarily unavailable. Home is staying useful with cached artwork, counts, and launch actions.' : null);
        const snapshot: ProviderHomeSnapshot = {
          ...nextHome,
          heroEpg: nextHeroEpg,
          liveNow: nextLiveNow,
          updatedAt: Date.now(),
        };
        saveHomeSnapshot(activeConnection.id, snapshot);
        setCacheState({ mode: 'live', message: cached ? (scenarioRefreshing ? `Home refreshed in place for ${scenarioLabel}.` : 'Provider refreshed successfully. Home is live again.') : null, updatedAt: snapshot.updatedAt });
        setScenarioRefreshing(false);
      })
      .catch(() => {
        if (cancelled) return;
        if (cached) {
          const cacheAgeMinutes = Math.round((Date.now() - cached.updatedAt) / 60000);
          applySnapshot(cached, 'offline', scenarioRefreshing ? `Home could not fully reload for ${scenarioLabel}, so saved provider data stayed on screen.` : `Provider refresh failed. Showing saved home data from ${cacheAgeMinutes} min ago.`);
          setScenarioRefreshing(false);
          return;
        }
        setHome(emptyState);
        setHeroEpg(null);
        setLiveNow({});
        setCacheState({ mode: 'offline', message: scenarioRefreshing ? `Home could not reload for ${scenarioLabel} and there is no saved home cache yet.` : 'Provider is unavailable and no saved home cache exists yet.', updatedAt: null });
        setScenarioRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, scenario, scenarioRefreshing]);

  const providerHistory = useMemo(
    () => (activeConnection ? watchHistory.filter((item) => item.providerId === activeConnection.id) : []),
    [activeConnection, watchHistory]
  );

  useEffect(() => {
    setProviderVariants(buildProviderVariantsIndex({ connections, connectionStatus }));
  }, [connectionStatus, connections]);

  const quickActions = useMemo(
    () => [
      { label: 'Browse live channels', href: '/live', meta: `${home.summary.live} channels ready` },
      { label: 'Open favorites', href: '/favorites', meta: 'Saved live channels and on-demand picks' },
      { label: 'Curate collections', href: '/collections', meta: 'Build custom folders like Game Day or Kids Bedtime' },
      { label: 'Resume watching', href: '/continue', meta: 'Unified history for this provider' },
      { label: 'Search all providers', href: '/search', meta: 'Ranked results across live, movies, and series' },
      { label: 'Review settings', href: '/settings', meta: 'Connections and playback preferences' },
    ],
    [home.summary]
  );

  const providerLabel = useMemo(() => {
    if (!activeConnection) return 'No provider';
    return `${activeConnection.name} · ${activeConnection.username}`;
  }, [activeConnection]);
  const healthiestConnection = useMemo(() => {
    if (!activeConnection || connections.length < 2) return null;
    return getHealthiestSavedProvider({
      connections,
      connectionStatus,
      activeConnectionId: activeConnection.id,
    });
  }, [activeConnection, connectionStatus, connections]);

  const applyScenario = (nextScenario: MockProviderScenario) => {
    if (nextScenario === scenario) return;
    setScenarioRefreshing(true);
    setSelectedMockProviderScenario(nextScenario);
    setScenario(nextScenario);
  };

  const liveCategoryBreakdown = useMemo(() => {
    const counts = home.quickLive.reduce<Record<string, number>>((acc, stream) => {
      const key = stream.channel_group || stream.genre || 'Live';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [home.quickLive]);

  const cacheTone = cacheState.mode === 'offline'
    ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
    : cacheState.mode === 'cached'
      ? 'border-sky-400/30 bg-sky-500/10 text-sky-100'
      : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100';
  const activeScenario = mockHealth?.healthScenarios?.[mockHealth.activeScenario];
  const providerAccountPressure = getProviderAccountPressure(activeConnection?.lastAuthSummary, {
    statusContext: 'Keep renewal or provider-switch guidance visible before the user blames playback.',
    lineContext: 'Keep this warning visible before the user blames playback.',
  });
  const mockAccountPressure = getProviderAccountPressure(mockHealth?.accountProfile, {
    statusContext: 'Keep renewal or provider-switch guidance visible before the user blames playback.',
    lineContext: 'Keep this warning visible before the user blames playback.',
  });
  const getLiveCategoryFallback = (stream: XtreamStream, variants: ProviderVariant[]) => {
    if (!activeConnection) return null as CategoryFallback | null;
    return getLiveCategoryRecovery({
      activeConnectionId: activeConnection.id,
      connections,
      connectionStatus,
      exactVariants: variants,
      categoryId: stream.category_id,
      categoryName: stream.channel_group || stream.genre || 'Live',
    });
  };

  const featuredVariants = useMemo(() => {
    if (!home.featured || !activeConnection) return [] as ProviderVariant[];
    return getAlternateProviderVariants({
      providerVariants,
      activeConnectionId: activeConnection.id,
      title: home.featured.name,
      kind: 'live',
      year: home.featured.year,
    });
  }, [activeConnection, home.featured, providerVariants]);
  const featuredCategoryFallback = useMemo(
    () => (home.featured ? getLiveCategoryFallback(home.featured, featuredVariants) : null),
    [featuredVariants, home.featured]
  );
  const evidenceLedger = useMemo(
    () => mockManifest?.surfaceEvidenceLedgers?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const freshnessBoard = useMemo(
    () => mockManifest?.surfaceFreshnessBoards?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const contradictionBoard = useMemo(
    () => mockManifest?.surfaceContradictionBoards?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const resetBoundary = useMemo(
    () => mockManifest?.surfaceResetBoundaries?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const actionGate = useMemo(
    () => mockManifest?.surfaceActionGates?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const intentLock = useMemo(
    () => mockManifest?.surfaceIntentLocks?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const explanationBoundary = useMemo(
    () => mockManifest?.surfaceExplanationBoundaries?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const autonomyBoundary = useMemo(
    () => mockManifest?.surfaceAutonomyBoundaries?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const identityAnchor = useMemo(
    () => mockManifest?.surfaceIdentityAnchors?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const confidenceFloor = useMemo(
    () => mockManifest?.surfaceConfidenceFloors?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const recoveryWitness = useMemo(
    () => mockManifest?.surfaceRecoveryWitnesses?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const fallbackCost = useMemo(
    () => mockManifest?.surfaceFallbackCosts?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const rescueReceipt = useMemo(
    () => mockManifest?.surfaceRescueReceipts?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const proofDebt = useMemo(
    () => mockManifest?.surfaceProofDebts?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const claimCeiling = useMemo(
    () => mockManifest?.surfaceClaimCeilings?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const interruptionBudget = useMemo(
    () => mockManifest?.surfaceInterruptionBudgets?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const retryContract = useMemo(
    () => mockManifest?.surfaceRetryContracts?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );
  const providerSwitchContract = useMemo(
    () => mockManifest?.surfaceProviderSwitchContracts?.find((item) => item.screenId === 'home') ?? null,
    [mockManifest]
  );

  if (!activeConnection) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No active provider. Go back to login and connect first.</div>;
  }

  return (
    <div className="space-y-8">
      {cacheState.message ? (
        <section className={`rounded-[1.5rem] border px-5 py-4 text-sm ${cacheTone}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{cacheState.message}</p>
            <span className="text-xs uppercase tracking-[0.22em] text-white/70">
              {cacheState.updatedAt ? `Updated ${new Date(cacheState.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'No cached timestamp'}
            </span>
          </div>
        </section>
      ) : null}

      {guideMessage ? (
        <section className="rounded-[1.5rem] border border-amber-400/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{guideMessage}</p>
            <span className="text-xs uppercase tracking-[0.22em] text-amber-50/80">
              {activeScenario?.label ?? 'Guide fallback active'}
            </span>
          </div>
        </section>
      ) : null}

      {evidenceLedger ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{evidenceLedger.title}</p>
              <p className="mt-2 text-sm text-slate-300">{evidenceLedger.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Live vs cache visible
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {evidenceLedger.entries.map((entry) => (
              <div key={entry.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{entry.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{entry.statement}</p>
                <p className="mt-2 text-sm text-slate-400">{entry.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {freshnessBoard ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{freshnessBoard.title}</p>
              <p className="mt-2 text-sm text-slate-300">{freshnessBoard.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Refresh budget visible
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {freshnessBoard.budgets.map((budget) => (
              <div key={budget.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{budget.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{budget.liveWindow}</p>
                <p className="mt-2 text-sm text-slate-400">{budget.safeFallbackWindow}</p>
                <p className="mt-3 text-sm text-slate-300">{budget.recoveryTrigger}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {contradictionBoard ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{contradictionBoard.title}</p>
              <p className="mt-2 text-sm text-slate-300">{contradictionBoard.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Winning truth visible
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {contradictionBoard.contradictions.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm text-slate-300">{item.conflictingSignals}</p>
                <p className="mt-3 text-sm font-semibold text-white">{item.winningTruth}</p>
                <p className="mt-2 text-sm text-slate-400">{item.suppressRule}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {resetBoundary ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{resetBoundary.title}</p>
              <p className="mt-2 text-sm text-slate-300">{resetBoundary.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Recovery reset rules visible
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {resetBoundary.boundaries.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.refreshesInPlace}</p>
                <p className="mt-2 text-sm text-slate-400">{item.preserves}</p>
                <p className="mt-3 text-sm text-slate-300">{item.hardResetTrigger}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {actionGate ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{actionGate.title}</p>
              <p className="mt-2 text-sm text-slate-300">{actionGate.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Hero CTA gate
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {actionGate.gates.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.primaryAction}</p>
                <p className="mt-2 text-sm text-slate-400">{item.downgradedAction}</p>
                <p className="mt-3 text-sm text-slate-300">{item.unlockCondition}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {intentLock ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{intentLock.title}</p>
              <p className="mt-2 text-sm text-slate-300">{intentLock.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Browse intent protected
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {intentLock.locks.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.protectedIntent}</p>
                <p className="mt-2 text-sm text-slate-400">{item.allowedDrift}</p>
                <p className="mt-3 text-sm text-slate-300">{item.breakCondition}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {explanationBoundary ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{explanationBoundary.title}</p>
              <p className="mt-2 text-sm text-slate-300">{explanationBoundary.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Hero disclosure rules
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {explanationBoundary.boundaries.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.mustSayExplicitly}</p>
                <p className="mt-2 text-sm text-slate-400">{item.canStayImplied}</p>
                <p className="mt-3 text-sm text-slate-300">{item.forcedDisclosureTrigger}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {autonomyBoundary ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{autonomyBoundary.title}</p>
              <p className="mt-2 text-sm text-slate-300">{autonomyBoundary.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Browse automation visible
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {autonomyBoundary.boundaries.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.autoMaintains}</p>
                <p className="mt-2 text-sm text-slate-400">{item.userOwns}</p>
                <p className="mt-3 text-sm text-slate-300">{item.forcedHandoffTrigger}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {identityAnchor ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{identityAnchor.title}</p>
              <p className="mt-2 text-sm text-slate-300">{identityAnchor.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Browse identity visible
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {identityAnchor.anchors.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.mustStayVisible}</p>
                <p className="mt-2 text-sm text-slate-400">{item.preservesMeaning}</p>
                <p className="mt-3 text-sm text-slate-300">{item.breakTrigger}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {confidenceFloor ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{confidenceFloor.title}</p>
              <p className="mt-2 text-sm text-slate-300">{confidenceFloor.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Hero confidence floor
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {confidenceFloor.floors.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.minimumProof}</p>
                <p className="mt-2 text-sm text-slate-400">{item.downgradeMode}</p>
                <p className="mt-3 text-sm text-slate-300">{item.hardStopTrigger}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {recoveryWitness ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{recoveryWitness.title}</p>
              <p className="mt-2 text-sm text-slate-300">{recoveryWitness.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Fallback must show its proof
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {recoveryWitness.witnesses.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.requiredEvidence}</p>
                <p className="mt-3 text-sm text-slate-300">{item.carriesForward}</p>
                <p className="mt-3 text-sm text-slate-400">{item.trustBreakTrigger}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {fallbackCost ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{fallbackCost.title}</p>
              <p className="mt-2 text-sm text-slate-300">{fallbackCost.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Browse downgrade cost visible
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {fallbackCost.costs.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.visibleLoss}</p>
                <p className="mt-3 text-sm text-slate-300">{item.preservedValue}</p>
                <p className="mt-3 text-sm text-slate-400">{item.hardStopThreshold}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {rescueReceipt ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{rescueReceipt.title}</p>
              <p className="mt-2 text-sm text-slate-300">{rescueReceipt.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Rescue receipt visible
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {rescueReceipt.receipts.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.preservedContext}</p>
                <p className="mt-3 text-sm text-slate-300">{item.changedUnderTheHood}</p>
                <p className="mt-3 text-sm text-slate-400">{item.requiresReconfirmation}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {proofDebt ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{proofDebt.title}</p>
              <p className="mt-2 text-sm text-slate-300">{proofDebt.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Proof debt visible
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {proofDebt.debts.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.carriedUncertainty}</p>
                <p className="mt-3 text-sm text-slate-300">{item.borrowedConfidence}</p>
                <p className="mt-3 text-sm text-slate-400">{item.repaymentTrigger}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {claimCeiling ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{claimCeiling.title}</p>
              <p className="mt-2 text-sm text-slate-300">{claimCeiling.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Claim ceiling visible
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {claimCeiling.ceilings.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.allowedPromise}</p>
                <p className="mt-3 text-sm text-slate-300">{item.forbiddenOverclaim}</p>
                <p className="mt-3 text-sm text-slate-400">{item.upgradeProof}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {interruptionBudget ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{interruptionBudget.title}</p>
              <p className="mt-2 text-sm text-slate-300">{interruptionBudget.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Delay honesty visible
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {interruptionBudget.budgets.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.acceptableDelay}</p>
                <p className="mt-3 text-sm text-slate-300">{item.continuityLayer}</p>
                <p className="mt-3 text-sm text-slate-400">{item.escalationTrigger}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {retryContract ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{retryContract.title}</p>
              <p className="mt-2 text-sm text-slate-300">{retryContract.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Browse retry honesty visible
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {retryContract.retries.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.honestRetryWindow}</p>
                <p className="mt-3 text-sm text-slate-300">{item.preservesContext}</p>
                <p className="mt-3 text-sm text-slate-400">{item.giveUpTrigger}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {providerSwitchContract ? (
        <section className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{providerSwitchContract.title}</p>
              <p className="mt-2 text-sm text-slate-300">{providerSwitchContract.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Browse switch honesty visible
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {providerSwitchContract.switches.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.switchTrigger}</p>
                <p className="mt-3 text-sm text-slate-300">{item.preservesContext}</p>
                <p className="mt-3 text-sm text-slate-400">{item.stayProof}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {mockHealth ? (
        <section className="rounded-[1.6rem] border border-violet-400/20 bg-violet-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-violet-300">Provider demo readiness</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{mockHealth.service} is feeding the shell cleanly.</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
              {mockHealth.liveStreams} live · {mockHealth.vodStreams} VOD · {mockHealth.series} series
            </span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Home flow</p>
              <p className="mt-2 text-sm text-slate-300">{mockHealth.demoFlows?.home}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Preview friendly</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  mockHealth.playerCapabilities.livePreview ? 'Live preview' : null,
                  mockHealth.playerCapabilities.previewFallbackFriendly ? 'Fallback art' : null,
                  mockHealth.playerCapabilities.cachedCatalogFriendly ? 'Cached catalogs' : null,
                  mockHealth.playerCapabilities.trustFactGridFriendly ? 'Trust fact grids' : null,
                ].filter((item): item is string => Boolean(item)).map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">{item}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Featured mock channels</p>
              <div className="mt-2 space-y-2">
                {mockHealth.featuredChannels?.slice(0, 3).map((channel) => (
                  <div key={channel.name} className="rounded-xl bg-white/5 px-3 py-2">
                    <p className="text-sm font-medium text-white">{channel.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{channel.category} · {channel.guide}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {mockHealth.accountProfile ? (
            <>
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
              {mockAccountPressure ? (
                <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  {mockAccountPressure}
                </div>
              ) : null}
              <ProviderTrustStack
                headline={mockHealth.operatorHeadline}
                className="mt-4"
              />
              {healthiestConnection && mockHealth.surfaceRecoveryPlans?.home ? (
                <div className="mt-4">
                  <ProviderRecoveryRail
                    eyebrow={mockHealth.surfaceRecoveryPlans.home.title}
                    title={mockHealth.surfaceRecoveryPlans.home.detail}
                    detail={getRecoverySupportLabel('home')}
                    tone="sky"
                    actions={[
                      {
                        label: getRecoveryActionLabel('home', healthiestConnection.name),
                        meta: `${healthiestConnection.name} · ${mockHealth.surfaceRecoveryPlans.home.cta}`,
                        onClick: () => setActiveConnection(healthiestConnection.id),
                      },
                    ]}
                  />
                </div>
              ) : null}
            </>
          ) : null}
          <ProviderTrustStack
            signals={mockHealth.trustSignals}
            className="mt-4"
            columnsClassName="grid gap-3 xl:grid-cols-2"
          />
          <MockOperationsConsole
            health={mockHealth}
            manifest={mockManifest}
            screenId="home"
            title="Mock rehearsal modes"
            intro="Home now shares one adapter-driven operations shell with Login and Live, so rehearsals refresh in place and keep the same launch and recovery language."
            scenario={scenario}
            scenarioRefreshing={scenarioRefreshing}
            onApplyScenario={applyScenario}
            className="mt-4"
          />
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
        <div className="grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Featured live preview</p>
            <h2 className="mt-4 text-4xl font-semibold text-white">{home.featured?.name ?? 'Loading featured channel...'}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              StreamDeck leads with saved provider hot-swap, inline NOW and NEXT guide context, and launch-to-play flow directly from the browse surface.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (home.featured) playStream(home.featured, buildLiveStreamUrl(activeConnection, home.featured), activeConnection.id);
                }}
                className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-medium text-white hover:bg-violet-400"
              >
                Play featured channel
              </button>
              <Link href="/live" className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-200 hover:bg-white/5">
                Open live browser
              </Link>
            </div>
            {featuredVariants.length > 0 || featuredCategoryFallback ? (
              <div className="mt-5 rounded-[1.3rem] border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200">Featured provider variants</p>
                    <p className="mt-2 text-sm text-white">The featured channel can recover onto healthier saved providers without dumping the user out of Home.</p>
                    <p className="mt-2 text-xs leading-5 text-emerald-100/80">When an exact duplicate is missing, Home now preserves the live category on the healthiest saved provider instead of dead-ending the featured rail.</p>
                  </div>
                  {providerAccountPressure ? (
                    <span className="rounded-full border border-amber-300/30 bg-amber-500/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-amber-100">
                      Recovery mode
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 space-y-2">
                  {featuredVariants.slice(0, 2).map((variant) => {
                    const trust = getProviderTrustDisplay(variant.trustScore, variant.warning);
                    return (
                    <div key={`${variant.providerId}-${variant.streamId}-${variant.kind}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                      <div className="min-w-[15rem] flex-1">
                        <ProviderTrustBadge
                          eyebrow={variant.providerName}
                          label="Trust-ranked live fallback"
                          detail={trust.detail}
                          tone={trust.tone}
                          compact
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            if (!variant.playbackUrl || !home.featured) return;
                            setActiveConnection(variant.providerId);
                            playStream({ ...home.featured, stream_id: variant.streamId, category_id: variant.categoryId || home.featured.category_id, stream_icon: variant.artwork || home.featured.stream_icon }, variant.playbackUrl, variant.providerId);
                          }}
                          className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                        >
                          Play on {variant.providerName}
                        </button>
                        <button
                          onClick={() => setActiveConnection(variant.providerId)}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:bg-white/10"
                        >
                          Switch only
                        </button>
                      </div>
                    </div>
                  )})}
                  {!featuredVariants.length && featuredCategoryFallback ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-emerald-300/30 bg-black/20 px-3 py-3">
                      <div className="min-w-[15rem] flex-1">
                        <ProviderTrustBadge
                          eyebrow={featuredCategoryFallback.providerName}
                          label="Same-category live fallback"
                          detail={`Open ${featuredCategoryFallback.categoryName} on a healthier provider when the featured channel itself is missing.`}
                          tone="sky"
                          compact
                        />
                      </div>
                      <button
                        onClick={() => {
                          setActiveConnection(featuredCategoryFallback.providerId);
                          playStream({ ...home.featured, name: featuredCategoryFallback.title, stream_type: 'live', stream_id: featuredCategoryFallback.streamId, category_id: featuredCategoryFallback.categoryId || home.featured?.category_id || 'alternate', stream_icon: featuredCategoryFallback.artwork || home.featured?.stream_icon || '' }, featuredCategoryFallback.playbackUrl, featuredCategoryFallback.providerId);
                        }}
                        className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                      >
                        Open same category
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Provider</p>
                <p className="mt-2 text-xl font-semibold text-white">{activeConnection.name}</p>
                <p className="mt-2 text-sm text-slate-500">{providerLabel}</p>
              </div>
              {connections.length > 1 ? (
                <select
                  value={activeConnection.id}
                  onChange={(event) => setActiveConnection(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                >
                  {connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name}</option>)}
                </select>
              ) : null}
            </div>
            <p className="mt-5 text-sm text-slate-400">Now playing</p>
            <p className="mt-3 text-xl font-semibold text-white">{heroEpg?.now?.title ?? (guideMessage ? 'Guide temporarily unavailable' : 'Fetching guide...')}</p>
            <p className="mt-2 text-sm text-slate-400">Next: {heroEpg?.next?.title ?? (guideMessage ? 'Browse live to keep surfing while guide recovers' : 'Loading next slot')}</p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                ['Live', home.summary.live],
                ['Movies', home.summary.vod],
                ['Series', home.summary.series],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            {activeConnection.lastAuthSummary ? (
              <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Provider trust cockpit</p>
                <ProviderFactGrid summary={activeConnection.lastAuthSummary} className="mt-3 grid gap-3 sm:grid-cols-2" />
                {providerAccountPressure ? (
                  <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
                    <p>{providerAccountPressure}</p>
                    {healthiestConnection ? (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveConnection(healthiestConnection.id)}
                          className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white hover:bg-white/20"
                        >
                          Switch to healthiest saved provider
                        </button>
                        <span className="text-xs text-amber-50/80">{healthiestConnection.name}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            {liveCategoryBreakdown.length > 0 ? (
              <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Quick live mix</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {liveCategoryBreakdown.map((category) => (
                    <span key={category.name} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
                      {category.name} · {category.count}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Quick launch</h3>
          <span className="text-sm text-slate-500">{activeConnection.name}</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-violet-400/40 hover:bg-white/8">
              <p className="text-lg font-semibold text-white">{action.label}</p>
              <p className="mt-2 text-sm text-slate-400">{action.meta}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Live now</h3>
          <span className="text-sm text-slate-500">Inline NOW and NEXT, straight from the home screen</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {home.quickLive.map((stream) => (
            <article key={stream.stream_id} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
              <div className="aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${stream.preview_art || stream.stream_icon})` }} />
              <p className="mt-4 text-lg font-semibold text-white">{stream.name}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">{stream.channel_group || 'Live channel'}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-slate-500">Now</p>
              <p className="mt-1 text-sm text-slate-200">{liveNow[getContentId(stream)]?.now?.title ?? (guideMessage ? 'Guide unavailable right now' : 'Loading guide...')}</p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-slate-500">Next</p>
              <p className="mt-1 text-sm text-slate-400">{liveNow[getContentId(stream)]?.next?.title ?? (guideMessage ? 'Preview and playback still work' : 'Fetching next slot')}</p>
              {liveNow[getContentId(stream)]?.listings?.length ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Guide strip</p>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {liveNow[getContentId(stream)].listings.slice(0, 3).map((listing) => (
                      <div key={listing.id} className="min-w-[140px] rounded-xl bg-white/5 p-2">
                        <p className="text-[11px] text-slate-500">{new Date(listing.start_timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                        <p className="mt-1 text-xs text-slate-200">{listing.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <button
                onClick={() => playStream(stream, buildLiveStreamUrl(activeConnection, stream), activeConnection.id)}
                className="mt-4 w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
              >
                Play now
              </button>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Spotlight picks</h3>
          <Link href="/live" className="text-sm text-violet-300 hover:text-violet-200">Open browser</Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {home.spotlight.map((item) => {
            const kind = item.stream_type === 'live' ? 'live' : item.stream_type === 'series' ? 'series' : 'movie';
            const variants = getAlternateProviderVariants({
              providerVariants,
              activeConnectionId: activeConnection.id,
              title: item.name,
              kind,
              year: item.year,
            });
            const categoryFallback = kind === 'live' ? getLiveCategoryFallback(item, variants) : null;
            return (
              <article key={`${item.stream_type}-${item.stream_id}`} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                <div className="aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${item.stream_icon})` }} />
                <p className="mt-4 text-lg font-semibold text-white">{item.name}</p>
                <p className="mt-2 text-sm text-slate-400">{item.stream_type === 'live' ? 'Live channel' : item.genre || 'On-demand title'}</p>
                {variants[0] || categoryFallback ? (
                  <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                    <p className="uppercase tracking-[0.2em] text-emerald-200">Also available elsewhere</p>
                    <p className="mt-1 text-[11px] leading-5 text-emerald-100/80">{variants.length > 0 ? `${variants.length} healthier provider option${variants.length === 1 ? '' : 's'} ready from Home discovery.` : `Exact duplicate missing, but ${categoryFallback?.categoryName || 'the same category'} can still open on the healthiest saved provider.`}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {variants.slice(0, 2).map((variant) => (
                        <button
                          key={`${variant.providerId}-${variant.streamId}`}
                          onClick={() => {
                            if (variant.kind === 'series') {
                              setActiveConnection(variant.providerId);
                              return;
                            }
                            if (!variant.playbackUrl) return;
                            setActiveConnection(variant.providerId);
                            playStream({ ...item, stream_id: variant.streamId, category_id: variant.categoryId || item.category_id, stream_icon: variant.artwork || item.stream_icon }, variant.playbackUrl, variant.providerId);
                          }}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                        >
                          {variant.kind === 'series' ? `Switch to ${variant.providerName}` : `Play on ${variant.providerName}`}
                        </button>
                      ))}
                      {!variants.length && categoryFallback ? (
                        <button
                          onClick={() => {
                            setActiveConnection(categoryFallback.providerId);
                            playStream({ ...item, name: categoryFallback.title, stream_type: 'live', stream_id: categoryFallback.streamId, category_id: categoryFallback.categoryId || item.category_id || 'alternate', stream_icon: categoryFallback.artwork || item.stream_icon || '' }, categoryFallback.playbackUrl, categoryFallback.providerId);
                          }}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                        >
                          Open same category on {categoryFallback.providerName}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white">Continue watching</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {providerHistory.length > 0 ? providerHistory.map((item) => (
            <div key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${item.artwork})` }} />
              <p className="mt-4 font-medium text-white">{item.title}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-slate-500">{item.kind}</p>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.max(8, item.progress * 100)}%` }} />
              </div>
            </div>
          )) : <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">Start a stream from this provider and it will appear here.</div>}
        </div>
      </section>
    </div>
  );
}
