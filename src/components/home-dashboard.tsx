'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderHealth, fetchMockProviderManifest, getSelectedMockProviderScenario, isMockProviderServer, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { SurfaceActionGate } from '@/components/surface-action-gate';
import { SurfaceAutonomyBoundary } from '@/components/surface-autonomy-boundary';
import { SurfaceClaimCeiling } from '@/components/surface-claim-ceiling';
import { MockDemoBoard } from '@/components/mock-demo-board';
import { MockScenarioControl } from '@/components/mock-scenario-control';
import { DifferentiatorSpotlight } from '@/components/differentiator-spotlight';
import { ProviderRiskStrip } from '@/components/provider-risk-strip';
import { SurfaceCanonicalProviderIdentity } from '@/components/surface-canonical-provider-identity';
import { SurfaceConfidenceFloor } from '@/components/surface-confidence-floor';
import { SurfaceContinuityWindow } from '@/components/surface-continuity-window';
import { SurfaceDowngradeLadder } from '@/components/surface-downgrade-ladder';
import { SurfaceExplanationBoundary } from '@/components/surface-explanation-boundary';
import { SurfaceFallbackEquivalence } from '@/components/surface-fallback-equivalence';
import { SurfaceFallbackRanking } from '@/components/surface-fallback-ranking';
import { SurfaceFallbackCost } from '@/components/surface-fallback-cost';
import { SurfaceFreshnessBoard } from '@/components/surface-freshness-board';
import { SurfaceIdentityAnchor } from '@/components/surface-identity-anchor';
import { SurfaceInterruptionBudget } from '@/components/surface-interruption-budget';
import { SurfaceIntentLock } from '@/components/surface-intent-lock';
import { SurfaceLaunchOwnership } from '@/components/surface-launch-ownership';
import { SurfaceLaunchReadiness } from '@/components/surface-launch-readiness';
import { SurfaceProofDebt } from '@/components/surface-proof-debt';
import { SurfaceProofProvenance } from '@/components/surface-proof-provenance';
import { SurfaceProviderReturnContract } from '@/components/surface-provider-return-contract';
import { SurfaceProviderStabilityContract } from '@/components/surface-provider-stability-contract';
import { SurfaceProviderSwitchContract } from '@/components/surface-provider-switch-contract';
import { SurfaceRecoveryWitness } from '@/components/surface-recovery-witness';
import { SurfaceProviderChoice } from '@/components/surface-provider-choice';
import { SurfaceRecoveryPlan } from '@/components/surface-recovery-plan';
import { SurfaceRetryContract } from '@/components/surface-retry-contract';
import { SurfaceRescueReceipt } from '@/components/surface-rescue-receipt';
import { buildSavedProviderHealthBoard } from '@/lib/saved-provider-health';
import { buildLiveStreamUrl, getArtwork, getCachedHomeSnapshot, getContentId, getHomeData, saveHomeSnapshot } from '@/lib/xtream-api';
import { MockProviderHealth, MockProviderManifest, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { getGuidePayload, useLiveGuideStore } from '@/stores/live-guide-store';
import { usePlayerStore } from '@/stores/player-store';

const MOCK_SERVER = 'http://localhost:3579';

type HomeState = {
  featured: XtreamStream | null;
  quickLive: XtreamStream[];
  spotlight: XtreamStream[];
  summary: { live: number; vod: number; series: number };
};

const emptyHome: HomeState = {
  featured: null,
  quickLive: [],
  spotlight: [],
  summary: { live: 0, vod: 0, series: 0 },
};

const formatTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export function HomeDashboard() {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const connections = useAuthStore((state) => state.connections);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const favorites = useFavoritesStore((state) => activeConnection ? state.getFavoritesForProvider(activeConnection.id) : []);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const playStream = usePlayerStore((state) => state.playStream);
  const lookupStreamGuide = useLiveGuideStore((state) => state.lookupStreamGuide);
  const markGuideFromCache = useLiveGuideStore((state) => state.markGuideFromCache);
  const prefetchStreams = useLiveGuideStore((state) => state.prefetchStreams);

  const [home, setHome] = useState<HomeState>(emptyHome);
  const [guideMessage, setGuideMessage] = useState<string | null>(null);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [manifest, setManifest] = useState<MockProviderManifest | null>(null);
  const [health, setHealth] = useState<MockProviderHealth | null>(null);
  const [scenario, setScenario] = useState(getSelectedMockProviderScenario());

  useEffect(() => {
    return subscribeToMockProviderScenario((nextScenario) => {
      setScenario(nextScenario);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchMockProviderManifest(MOCK_SERVER, scenario)
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch(() => {
        if (!cancelled) setManifest(null);
      });

    return () => {
      cancelled = true;
    };
  }, [scenario]);

  useEffect(() => {
    let cancelled = false;

    fetchMockProviderHealth(MOCK_SERVER, scenario)
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) setHealth(null);
      });

    return () => {
      cancelled = true;
    };
  }, [scenario]);

  useEffect(() => {
    let cancelled = false;

    if (!activeConnection) {
      setLoading(false);
      setHome(emptyHome);
      return;
    }

    const cached = getCachedHomeSnapshot(activeConnection.id, Number.POSITIVE_INFINITY);
    if (cached) {
      setHome({
        featured: cached.featured,
        quickLive: cached.quickLive,
        spotlight: cached.spotlight,
        summary: cached.summary,
      });
      markGuideFromCache(activeConnection.id, cached.quickLive.map((stream) => getContentId(stream)));
      if (cached.featured?.stream_type === 'live') {
        markGuideFromCache(activeConnection.id, [getContentId(cached.featured)]);
      }
      const ageMinutes = Math.max(1, Math.round((Date.now() - cached.updatedAt) / 60000));
      setCacheMessage(`Loaded saved provider data from ${ageMinutes} minute${ageMinutes === 1 ? '' : 's'} ago while refreshing.`);
    } else {
      setCacheMessage(null);
      setHome(emptyHome);
    }

    setLoading(true);
    getHomeData(activeConnection)
      .then(async (data) => {
        if (cancelled) return;

        const featured = data.liveStreams[0] || data.vodStreams[0] || data.series[0] || null;
        const quickLive = data.liveStreams.slice(0, 6);
        const spotlight = [...data.vodStreams.slice(0, 4), ...data.series.slice(0, 2)];
        const summary = {
          live: data.liveStreams.length,
          vod: data.vodStreams.length,
          series: data.series.length,
        };

        const guideTargets = featured?.stream_type === 'live'
          ? [featured, ...quickLive.filter((item) => getContentId(item) !== getContentId(featured))]
          : quickLive;
        const guideResults = await prefetchStreams(activeConnection, guideTargets, 6);
        const liveNow = guideResults.reduce<Record<number, NonNullable<(typeof guideResults)[number]['entry']>>>((acc, result) => {
          if (result.entry) acc[result.streamId] = result.entry;
          return acc;
        }, {});
        const nextHeroGuide = featured?.stream_type === 'live' ? liveNow[getContentId(featured)]?.epg ?? null : null;

        const snapshot = {
          featured,
          quickLive,
          spotlight,
          summary,
          heroEpg: nextHeroGuide,
          liveNow,
          updatedAt: Date.now(),
        };

        saveHomeSnapshot(activeConnection.id, snapshot);
        setHome({ featured, quickLive, spotlight, summary });
        setGuideMessage(nextHeroGuide ? null : 'Guide data is unavailable right now, but browse and playback are still live.');
        setCacheMessage(cached ? 'Provider refreshed successfully.' : null);
      })
      .catch((error) => {
        if (cancelled) return;
        if (!cached) {
          setGuideMessage(error instanceof Error ? error.message : 'Unable to load provider catalog.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, markGuideFromCache, prefetchStreams, scenario]);

  const providerStatus = activeConnection ? connectionStatus[activeConnection.id] : null;
  const isMockConnection = activeConnection ? isMockProviderServer(activeConnection.server) : false;
  const featuredArtwork = home.featured ? getArtwork(home.featured) || '' : '';
  const featuredLive = home.featured?.stream_type === 'live' ? home.featured : null;
  const continueWatching = useMemo(() => {
    if (!activeConnection) return [];
    return watchHistory.filter((item) => item.providerId === activeConnection.id).slice(0, 4);
  }, [activeConnection, watchHistory]);
  const fallbackEquivalence = useMemo(
    () => manifest?.surfaceFallbackEquivalenceContracts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const canonicalProviderIdentity = useMemo(
    () => manifest?.surfaceCanonicalProviderIdentityContracts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const fallbackRanking = useMemo(
    () => manifest?.surfaceFallbackRankingContracts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const launchReadiness = useMemo(
    () => manifest?.surfaceLaunchReadinessContracts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const launchOwnership = useMemo(
    () => manifest?.surfaceLaunchOwnerships.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const continuityWindow = useMemo(
    () => manifest?.surfaceContinuityWindows.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const downgradeLadder = useMemo(
    () => manifest?.surfaceDowngradeLadders.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const providerChoice = useMemo(
    () => manifest?.surfaceProviderChoiceContracts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const providerSwitchContract = useMemo(
    () => manifest?.surfaceProviderSwitchContracts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const providerReturnContract = useMemo(
    () => manifest?.surfaceProviderReturnContracts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const providerStabilityContract = useMemo(
    () => manifest?.surfaceProviderStabilityContracts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const recoveryPlan = useMemo(
    () => manifest?.surfaceRecoveryPlans.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const freshnessBoard = useMemo(
    () => manifest?.surfaceFreshnessBoards.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const proofDebt = useMemo(
    () => manifest?.surfaceProofDebts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const proofProvenance = useMemo(
    () => manifest?.surfaceProofProvenances.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const intentLock = useMemo(
    () => manifest?.surfaceIntentLocks.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const actionGate = useMemo(
    () => manifest?.surfaceActionGates.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const explanationBoundary = useMemo(
    () => manifest?.surfaceExplanationBoundaries.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const autonomyBoundary = useMemo(
    () => manifest?.surfaceAutonomyBoundaries.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const recoveryWitness = useMemo(
    () => manifest?.surfaceRecoveryWitnesses.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const interruptionBudget = useMemo(
    () => manifest?.surfaceInterruptionBudgets.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const retryContract = useMemo(
    () => manifest?.surfaceRetryContracts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const rescueReceipt = useMemo(
    () => manifest?.surfaceRescueReceipts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const fallbackCost = useMemo(
    () => manifest?.surfaceFallbackCosts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const identityAnchor = useMemo(
    () => manifest?.surfaceIdentityAnchors.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const claimCeiling = useMemo(
    () => manifest?.surfaceClaimCeilings.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const confidenceFloor = useMemo(
    () => manifest?.surfaceConfidenceFloors.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const savedProviderBoard = useMemo(
    () => buildSavedProviderHealthBoard({
      connections,
      connectionStatus,
      activeConnectionId: activeConnection?.id,
      surface: 'home',
    }),
    [activeConnection?.id, connectionStatus, connections]
  );
  const heroGuide = activeConnection && featuredLive
    ? getGuidePayload(lookupStreamGuide(activeConnection.id, featuredLive, Number.MAX_SAFE_INTEGER))
    : null;

  if (!activeConnection) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-slate-300">
        No active provider yet. Return to login and connect a mock or real Xtream source first.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isMockConnection ? <MockScenarioControl /> : null}
      {isMockConnection ? <MockDemoBoard health={health} manifest={manifest} screenId="home" /> : null}
      {isMockConnection ? (
        <ProviderRiskStrip
          health={health}
          screenId="home"
          providerLabel={activeConnection.name}
          providerDetail={`${activeConnection.username} · ${providerStatus?.state || 'idle'}`}
          savedProviderBoard={savedProviderBoard}
          onSelectProvider={(providerId) => setActiveConnection(providerId)}
        />
      ) : null}
      {isMockConnection ? <DifferentiatorSpotlight manifest={manifest} screenId="home" /> : null}
      <SurfaceCanonicalProviderIdentity contract={canonicalProviderIdentity} badge="Canonical provider" />
      <SurfaceFallbackRanking contract={fallbackRanking} badge="Fallback ranking" />

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
        <div
          className="relative min-h-[360px] bg-cover bg-center p-8 sm:p-10"
          style={{ backgroundImage: `linear-gradient(125deg, rgba(2,6,23,0.92), rgba(2,6,23,0.5)), url(${featuredArtwork})` }}
        >
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300">Featured now</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {home.featured?.name || 'Provider connected and ready to browse'}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200">
              {home.featured?.plot || 'Jump into live TV, open favorites, or resume your most recent sessions from the same provider.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {featuredLive ? (
                <button
                  onClick={() => playStream(featuredLive, buildLiveStreamUrl(activeConnection, featuredLive), activeConnection.id)}
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
                >
                  Play featured channel
                </button>
              ) : (
                <Link href="/live" className="rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200">
                  Open live TV
                </Link>
              )}
              <Link href="/favorites" className="rounded-full border border-white/15 px-6 py-3 text-sm text-white transition hover:bg-white/5">
                Favorites
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-300">
              <span>{home.summary.live} live channels</span>
              <span>{home.summary.vod} movies</span>
              <span>{home.summary.series} series</span>
              <span>{favorites.length} favorites</span>
            </div>
            {heroGuide?.now ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Now / Next</p>
                <p className="mt-2 text-base font-medium text-white">{heroGuide.now.title}</p>
                {heroGuide.next?.title ? <p className="mt-1 text-sm text-slate-300">Next: {heroGuide.next.title}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Provider" value={activeConnection.name} detail={activeConnection.username} />
        <StatCard label="Status" value={providerStatus?.state || 'idle'} detail={providerStatus?.message || 'Validation pending'} />
        <StatCard label="Expires" value={formatTime(activeConnection.lastAuthSummary?.expiresAt) || 'Unknown'} detail={activeConnection.lastAuthSummary?.status || 'No account summary'} />
        <StatCard label="Continue watching" value={String(continueWatching.length)} detail="Recent plays on this provider" />
      </section>

      {cacheMessage ? (
        <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">{cacheMessage}</div>
      ) : null}
      {guideMessage ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{guideMessage}</div>
      ) : null}

      <SurfaceFallbackEquivalence contract={fallbackEquivalence} badge="Fallback equivalence" />

      <SurfaceLaunchReadiness contract={launchReadiness} badge="Hero launch safety" />
      <SurfaceLaunchOwnership contract={launchOwnership} badge="Launch owner" />
      <SurfaceContinuityWindow contract={continuityWindow} badge="Browse continuity" />
      <SurfaceDowngradeLadder contract={downgradeLadder} badge="Downgrade truth" />
      <SurfaceProviderChoice contract={providerChoice} badge="Choice honesty" />
      <SurfaceProviderSwitchContract contract={providerSwitchContract} badge="Switch honesty" />
      <SurfaceProviderReturnContract contract={providerReturnContract} badge="Return truth" />
      <SurfaceProviderStabilityContract contract={providerStabilityContract} badge="Stability truth" />
      <SurfaceRecoveryPlan contract={recoveryPlan} badge="Recovery route" />
      <SurfaceFreshnessBoard contract={freshnessBoard} badge="Freshness truth" />
      <SurfaceProofDebt contract={proofDebt} badge="Proof debt" />
      <SurfaceProofProvenance contract={proofProvenance} badge="Proof provenance" />
      <SurfaceIntentLock contract={intentLock} badge="Intent lock" />
      <SurfaceActionGate contract={actionGate} badge="Action gate" />
      <SurfaceExplanationBoundary contract={explanationBoundary} badge="Explanation boundary" />
      <SurfaceAutonomyBoundary contract={autonomyBoundary} badge="Autonomy boundary" />
      <SurfaceInterruptionBudget contract={interruptionBudget} badge="Interruption budget" />
      <SurfaceRetryContract contract={retryContract} badge="Retry honesty" />
      <SurfaceRecoveryWitness contract={recoveryWitness} badge="Recovery witness" />
      <SurfaceRescueReceipt contract={rescueReceipt} badge="Rescue receipt" />
      <SurfaceFallbackCost contract={fallbackCost} badge="Fallback cost" />
      <SurfaceIdentityAnchor contract={identityAnchor} badge="Identity anchor" />
      <SurfaceClaimCeiling contract={claimCeiling} badge="Claim ceiling" />
      <SurfaceConfidenceFloor contract={confidenceFloor} badge="Confidence floor" />

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Live highlights</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Fast-launch channels</h2>
          </div>
          <Link href="/live" className="text-sm text-sky-300 hover:text-sky-200">Browse all live TV</Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {home.quickLive.map((stream) => (
            <button
              key={getContentId(stream)}
              onClick={() => playStream(stream, buildLiveStreamUrl(activeConnection, stream), activeConnection.id)}
              className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20 text-left transition hover:-translate-y-0.5 hover:border-sky-400/30 hover:bg-black/30"
            >
              <div
                className="h-36 bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.2), rgba(15,23,42,0.85)), url(${getArtwork(stream) || ''})` }}
              />
              <div className="p-4">
                <p className="text-base font-medium text-white">{stream.name}</p>
                <p className="mt-1 text-sm text-slate-400">{stream.channel_group || 'Live'} channel</p>
                {(() => {
                  const guide = getGuidePayload(lookupStreamGuide(activeConnection.id, stream, Number.MAX_SAFE_INTEGER));
                  if (!guide?.now) return null;
                  return (
                    <div className="mt-3 space-y-1">
                      <p className="truncate text-[11px] uppercase tracking-[0.2em] text-sky-200">Now: {guide.now.title}</p>
                      {guide.next?.title ? <p className="truncate text-[11px] uppercase tracking-[0.2em] text-slate-400">Next: {guide.next.title}</p> : null}
                    </div>
                  );
                })()}
              </div>
            </button>
          ))}
          {!loading && home.quickLive.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 p-6 text-sm text-slate-400">
              No live highlights were returned by this provider yet.
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Spotlight library</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Recent movies and series</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {home.spotlight.map((item) => (
              <div key={`${item.stream_type}-${getContentId(item)}`} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20">
                <div
                  className="h-44 bg-cover bg-center"
                  style={{ backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.15), rgba(15,23,42,0.82)), url(${getArtwork(item) || ''})` }}
                />
                <div className="p-4">
                  <p className="text-base font-medium text-white">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.stream_type === 'series' ? 'Series' : 'Movie'} · {item.genre || item.year || 'Library item'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Continue watching</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Recent activity</h2>
          <div className="mt-5 space-y-3">
            {continueWatching.length > 0 ? continueWatching.map((item) => (
              <div key={item.id} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                <p className="text-base font-medium text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {item.kind === 'live' ? 'Live channel' : item.kind === 'series' ? 'Series episode' : 'Movie'} · {Math.round(item.progress * 100)}% saved
                </p>
              </div>
            )) : (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 p-6 text-sm text-slate-400">
                Playback history will appear here after the first live or on-demand session.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}
