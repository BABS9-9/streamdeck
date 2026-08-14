'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderHealth, fetchMockProviderManifest, getSelectedMockProviderScenario, isMockProviderServer, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { SurfaceActionGate } from '@/components/surface-action-gate';
import { SurfaceAutonomyBoundary } from '@/components/surface-autonomy-boundary';
import { SurfaceClaimCeiling } from '@/components/surface-claim-ceiling';
import { MockDemoBoard } from '@/components/mock-demo-board';
import { MockScenarioControl } from '@/components/mock-scenario-control';
import { DifferentiatorSpotlight } from '@/components/differentiator-spotlight';
import { GuideCoverageStrip } from '@/components/guide-coverage-strip';
import { MultiConnectionGuideRuntime } from '@/components/multi-connection-guide-runtime';
import { ProviderRiskStrip } from '@/components/provider-risk-strip';
import { SurfaceCanonicalProviderIdentity } from '@/components/surface-canonical-provider-identity';
import { SurfaceConnectionHeadroom } from '@/components/surface-connection-headroom';
import { SurfaceConfidenceFloorInline } from '@/components/surface-confidence-floor-inline';
import { SurfaceExitCriteria } from '@/components/surface-exit-criteria';
import { SurfaceHoldReceiptInline } from '@/components/surface-hold-receipt-inline';
import { SurfaceConfidenceFloor } from '@/components/surface-confidence-floor';
import { SurfaceContinuityWindow } from '@/components/surface-continuity-window';
import { SurfaceDowngradeLadder } from '@/components/surface-downgrade-ladder';
import { SurfaceExplanationBoundary } from '@/components/surface-explanation-boundary';
import { SurfaceFallbackEquivalence } from '@/components/surface-fallback-equivalence';
import { SurfaceFallbackRanking } from '@/components/surface-fallback-ranking';
import { SurfaceFallbackRankingInline } from '@/components/surface-fallback-ranking-inline';
import { SurfaceFallbackCost } from '@/components/surface-fallback-cost';
import { SurfaceFallbackCostInline } from '@/components/surface-fallback-cost-inline';
import { SurfaceFreshnessBoardInline } from '@/components/surface-freshness-board-inline';
import { SurfaceFreshnessBoard } from '@/components/surface-freshness-board';
import { SurfaceHandoffMap } from '@/components/surface-handoff-map';
import { SurfaceIdentityAnchor } from '@/components/surface-identity-anchor';
import { SurfaceInterruptionBudget } from '@/components/surface-interruption-budget';
import { SurfaceIntentLock } from '@/components/surface-intent-lock';
import { SurfaceLaunchOwnership } from '@/components/surface-launch-ownership';
import { SurfaceLaunchReadinessInline } from '@/components/surface-launch-readiness-inline';
import { SurfaceLaunchScorecardInline } from '@/components/surface-launch-scorecard-inline';
import { SurfaceHandoffClarityInline } from '@/components/surface-handoff-clarity-inline';
import { SurfaceInterruptionBudgetInline } from '@/components/surface-interruption-budget-inline';
import { SurfaceProviderStabilityInline } from '@/components/surface-provider-stability-inline';
import { SurfaceReturnCooldownInline } from '@/components/surface-return-cooldown-inline';
import { SurfaceRetryHonestyInline } from '@/components/surface-retry-honesty-inline';
import { SurfaceLaunchReadiness } from '@/components/surface-launch-readiness';
import { SurfaceLaunchScorecard } from '@/components/surface-launch-scorecard';
import { SurfaceProofDebt } from '@/components/surface-proof-debt';
import { SurfaceProofProvenance } from '@/components/surface-proof-provenance';
import { SurfaceProviderPodium } from '@/components/surface-provider-podium';
import { SurfaceProviderReturnContract } from '@/components/surface-provider-return-contract';
import { SurfaceProviderStabilityContract } from '@/components/surface-provider-stability-contract';
import { SurfaceProviderSwitchContract } from '@/components/surface-provider-switch-contract';
import { SurfaceRecoveryWitness } from '@/components/surface-recovery-witness';
import { SurfaceRecoveryWitnessInline } from '@/components/surface-recovery-witness-inline';
import { SurfaceProviderChoice } from '@/components/surface-provider-choice';
import { SurfaceProviderChoiceInline } from '@/components/surface-provider-choice-inline';
import { SurfaceRecoveryPlan } from '@/components/surface-recovery-plan';
import { SurfaceRetryContract } from '@/components/surface-retry-contract';
import { SurfaceRescueReceipt } from '@/components/surface-rescue-receipt';
import { buildMultiConnectionGuideRuntimeContract } from '@/lib/multi-connection-guide-runtime';
import { buildProviderGuideContinuity } from '@/lib/provider-guide-continuity';
import { buildSavedProviderFreshnessBoardRuntime } from '@/lib/saved-provider-freshness-board-runtime';
import { buildSavedProviderHealthBoard } from '@/lib/saved-provider-health';
import { buildSavedProviderHoldReceiptRuntime } from '@/lib/saved-provider-hold-receipt-runtime';
import { buildSavedProviderPodiumRuntime } from '@/lib/saved-provider-podium-runtime';
import { buildRuntimeSurfaceContracts } from '@/lib/runtime-surface-contracts';
import { buildLiveStreamUrl, getContentId, getLiveCategories, getLiveStreams } from '@/lib/xtream-api';
import { MockProviderHealth, MockProviderManifest, XtreamCategory, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { getGuidePayload, useLiveGuideStore } from '@/stores/live-guide-store';
import { usePlayerStore } from '@/stores/player-store';
import { VideoPlayer } from './video-player';

const MOCK_SERVER = 'http://localhost:3579';

export function LiveBrowser() {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const connections = useAuthStore((state) => state.connections);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const lastSwitchContext = useAuthStore((state) => state.lastSwitchContext);
  const favorites = useFavoritesStore((state) => activeConnection ? state.getFavoritesForProvider(activeConnection.id) : []);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const playStream = usePlayerStore((state) => state.playStream);
  const streamHealth = usePlayerStore((state) => state.streamHealth);
  const lookupStreamGuide = useLiveGuideStore((state) => state.lookupStreamGuide);
  const markGuideFromCache = useLiveGuideStore((state) => state.markGuideFromCache);
  const prefetchStreams = useLiveGuideStore((state) => state.prefetchStreams);
  const refreshGuideEntry = useLiveGuideStore((state) => state.refreshGuideEntry);
  const getCoverageReport = useLiveGuideStore((state) => state.getCoverageReport);
  const syncByGuideKey = useLiveGuideStore((state) => state.syncByGuideKey);

  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [streams, setStreams] = useState<XtreamStream[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStream, setSelectedStream] = useState<XtreamStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<MockProviderManifest | null>(null);
  const [health, setHealth] = useState<MockProviderHealth | null>(null);
  const [scenario, setScenario] = useState(getSelectedMockProviderScenario());

  useEffect(() => subscribeToMockProviderScenario((nextScenario) => {
    setScenario(nextScenario);
  }), []);

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
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([getLiveCategories(activeConnection), getLiveStreams(activeConnection)])
      .then(([nextCategories, nextStreams]) => {
        if (cancelled) return;
        setCategories(nextCategories);
        setStreams(nextStreams);
        const first = nextStreams[0] || null;
        setSelectedStream(first);
        setPreviewUrl(first ? buildLiveStreamUrl(activeConnection, first) : null);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load live channels.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, scenario]);

  useEffect(() => {
    if (!activeConnection || !selectedStream) {
      return;
    }

    const streamId = getContentId(selectedStream);
    if (!streamId) return;
    markGuideFromCache(activeConnection.id, [streamId]);
    refreshGuideEntry(activeConnection, streamId).catch(() => {});
  }, [activeConnection, markGuideFromCache, refreshGuideEntry, selectedStream]);

  const filteredStreams = useMemo(() => {
    return streams.filter((stream) => {
      const categoryMatch = selectedCategory === 'all' || String(stream.category_id) === String(selectedCategory);
      const searchMatch = stream.name.toLowerCase().includes(search.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [search, selectedCategory, streams]);

  useEffect(() => {
    if (!activeConnection || filteredStreams.length === 0) return;
    const visibleStreams = filteredStreams.slice(0, 8);
    markGuideFromCache(activeConnection.id, visibleStreams.map((stream) => getContentId(stream)));
    prefetchStreams(activeConnection, visibleStreams, 8).catch(() => {});
  }, [activeConnection, filteredStreams, markGuideFromCache, prefetchStreams]);

  const selectStream = (stream: XtreamStream) => {
    if (!activeConnection) return;
    setSelectedStream(stream);
    setPreviewUrl(buildLiveStreamUrl(activeConnection, stream));
  };

  if (!activeConnection) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-slate-300">
        No active provider. Connect on the login screen first.
      </div>
    );
  }

  const providerStatus = connectionStatus[activeConnection.id];
  const isMockConnection = isMockProviderServer(activeConnection.server);
  const canPlaySelected = Boolean(selectedStream && previewUrl);
  const canonicalProviderIdentity = manifest?.surfaceCanonicalProviderIdentityContracts.find((item) => item.screenId === 'live') ?? null;
  const fallbackRanking = manifest?.surfaceFallbackRankingContracts.find((item) => item.screenId === 'live') ?? null;
  const fallbackEquivalence = manifest?.surfaceFallbackEquivalenceContracts.find((item) => item.screenId === 'live') ?? null;
  const launchOwnership = manifest?.surfaceLaunchOwnerships.find((item) => item.screenId === 'live') ?? null;
  const holdReceipt = manifest?.surfaceHoldReceipts.find((item) => item.screenId === 'live') ?? null;
  const continuityWindow = manifest?.surfaceContinuityWindows.find((item) => item.screenId === 'live') ?? null;
  const downgradeLadder = manifest?.surfaceDowngradeLadders.find((item) => item.screenId === 'live') ?? null;
  const providerChoice = manifest?.surfaceProviderChoiceContracts.find((item) => item.screenId === 'live') ?? null;
  const providerSwitchContract = manifest?.surfaceProviderSwitchContracts.find((item) => item.screenId === 'live') ?? null;
  const providerReturnContract = manifest?.surfaceProviderReturnContracts.find((item) => item.screenId === 'live') ?? null;
  const providerStabilityContract = manifest?.surfaceProviderStabilityContracts.find((item) => item.screenId === 'live') ?? null;
  const returnCooldownContract = manifest?.surfaceReturnCooldownContracts.find((item) => item.screenId === 'live') ?? null;
  const recoveryPlan = manifest?.surfaceRecoveryPlans.find((item) => item.screenId === 'live') ?? null;
  const freshnessBoard = manifest?.surfaceFreshnessBoards.find((item) => item.screenId === 'live') ?? null;
  const proofDebt = manifest?.surfaceProofDebts.find((item) => item.screenId === 'live') ?? null;
  const proofProvenance = manifest?.surfaceProofProvenances.find((item) => item.screenId === 'live') ?? null;
  const intentLock = manifest?.surfaceIntentLocks.find((item) => item.screenId === 'live') ?? null;
  const actionGate = manifest?.surfaceActionGates.find((item) => item.screenId === 'live') ?? null;
  const explanationBoundary = manifest?.surfaceExplanationBoundaries.find((item) => item.screenId === 'live') ?? null;
  const manifestAutonomyBoundary = manifest?.surfaceAutonomyBoundaries.find((item) => item.screenId === 'live') ?? null;
  const recoveryWitness = manifest?.surfaceRecoveryWitnesses.find((item) => item.screenId === 'live') ?? null;
  const interruptionBudget = manifest?.surfaceInterruptionBudgets.find((item) => item.screenId === 'live') ?? null;
  const retryContract = manifest?.surfaceRetryContracts.find((item) => item.screenId === 'live') ?? null;
  const rescueReceipt = manifest?.surfaceRescueReceipts.find((item) => item.screenId === 'live') ?? null;
  const fallbackCost = manifest?.surfaceFallbackCosts.find((item) => item.screenId === 'live') ?? null;
  const identityAnchor = manifest?.surfaceIdentityAnchors.find((item) => item.screenId === 'live') ?? null;
  const claimCeiling = manifest?.surfaceClaimCeilings.find((item) => item.screenId === 'live') ?? null;
  const manifestConnectionHeadroom = manifest?.surfaceConnectionHeadrooms.find((item) => item.screenId === 'live') ?? null;
  const confidenceFloor = manifest?.surfaceConfidenceFloors.find((item) => item.screenId === 'live') ?? null;
  const savedProviderBoard = useMemo(
    () => buildSavedProviderHealthBoard({
      connections,
      connectionStatus,
      activeConnectionId: activeConnection?.id,
      surface: 'live',
    }),
    [activeConnection?.id, connectionStatus, connections]
  );
  const providerPodium = manifest?.surfaceProviderPodiums?.find((item) => item.screenId === 'live') ?? null;
  const providerPodiumRuntime = useMemo(
    () => buildSavedProviderPodiumRuntime({
      contract: providerPodium,
      board: savedProviderBoard,
    }),
    [providerPodium, savedProviderBoard]
  );
  const holdReceiptRuntime = useMemo(
    () => buildSavedProviderHoldReceiptRuntime({
      contract: holdReceipt,
      board: savedProviderBoard,
    }),
    [holdReceipt, savedProviderBoard]
  );
  const selectedGuideEntry = selectedStream ? lookupStreamGuide(activeConnection.id, selectedStream, Number.MAX_SAFE_INTEGER) : null;
  const selectedGuide = getGuidePayload(selectedGuideEntry);
  const selectedGuideState = selectedStream ? syncByGuideKey[`${activeConnection.id}:${getContentId(selectedStream)}`] : null;
  const liveGuideCoverage = useMemo(
    () => getCoverageReport(activeConnection.id, filteredStreams.slice(0, 8).map((stream) => getContentId(stream)), Number.MAX_SAFE_INTEGER),
    [activeConnection.id, filteredStreams, getCoverageReport]
  );
  const freshnessBoardRuntime = useMemo(
    () => buildSavedProviderFreshnessBoardRuntime({
      contract: freshnessBoard,
      board: savedProviderBoard,
      report: liveGuideCoverage,
    }),
    [freshnessBoard, liveGuideCoverage, savedProviderBoard]
  );
  const liveGuideContinuity = useMemo(
    () => buildProviderGuideContinuity({
      screenId: 'live',
      report: liveGuideCoverage,
      savedProviderBoard,
      ownerLabel: selectedStream?.name || activeConnection.name,
    }),
    [activeConnection.name, liveGuideCoverage, savedProviderBoard, selectedStream?.name]
  );
  const multiConnectionGuideRuntime = useMemo(() => {
    const coverageByProvider = Object.fromEntries(connections.map((connection) => {
      const report = filteredStreams.length > 0
        ? getCoverageReport(connection.id, filteredStreams.slice(0, 8).map((stream) => getContentId(stream)), Number.MAX_SAFE_INTEGER)
        : null;
      return [connection.id, report];
    }));

    return buildMultiConnectionGuideRuntimeContract({
      screenId: 'live',
      connections,
      connectionStatus,
      savedProviderBoard,
      coverageByProvider,
      selectedLabel: selectedStream?.name || activeConnection.name,
      lastSwitchContext,
    });
  }, [
    activeConnection.name,
    connectionStatus,
    connections,
    filteredStreams,
    getCoverageReport,
    lastSwitchContext,
    savedProviderBoard,
    selectedStream?.name,
  ]);
  const runtimeSurfaceContracts = useMemo(
    () => buildRuntimeSurfaceContracts({
      screenId: 'live',
      providerLabel: activeConnection.name,
      providerStatusLabel: providerStatus?.state || null,
      savedProviderBoard,
      guideCoverage: liveGuideCoverage,
      selectedLabel: selectedStream?.name || activeConnection.name,
      currentNowTitle: selectedGuide?.now?.title ?? null,
      currentNextTitle: selectedGuide?.next?.title ?? null,
      nextHopHref: '/live',
      nextHopLabel: 'Keep Live open',
      streamHealth,
    }),
    [activeConnection.name, liveGuideCoverage, providerStatus?.state, savedProviderBoard, selectedGuide, selectedStream?.name, streamHealth]
  );
  const launchReadiness = runtimeSurfaceContracts.launchReadiness;
  const launchScorecard = runtimeSurfaceContracts.launchScorecard;
  const exitCriteria = runtimeSurfaceContracts.exitCriteria;
  const handoffMap = runtimeSurfaceContracts.handoffMap;
  const autonomyBoundary = runtimeSurfaceContracts.autonomyBoundary || manifestAutonomyBoundary;
  const connectionHeadroom = runtimeSurfaceContracts.connectionHeadroom || manifestConnectionHeadroom;

  return (
    <div className="space-y-6">
      {isMockConnection ? <MockScenarioControl /> : null}
      {isMockConnection ? <MockDemoBoard health={health} manifest={manifest} screenId="live" /> : null}
      {isMockConnection ? (
        <ProviderRiskStrip
          health={health}
          screenId="live"
          providerLabel={activeConnection.name}
          providerDetail={`${activeConnection.username} · ${providerStatus?.state || 'idle'}`}
          savedProviderBoard={savedProviderBoard}
          onSelectProvider={(providerId) => setActiveConnection(providerId)}
        />
      ) : null}
      {isMockConnection ? <DifferentiatorSpotlight manifest={manifest} screenId="live" /> : null}
      <SurfaceConnectionHeadroom
        contract={connectionHeadroom}
        authSummary={activeConnection.lastAuthSummary ?? null}
        health={health}
        badge="Connection headroom"
      />
      <SurfaceCanonicalProviderIdentity contract={canonicalProviderIdentity} badge="Canonical provider" />
      <SurfaceFallbackRanking contract={fallbackRanking} badge="Fallback ranking" />
      <SurfaceProviderPodium
        runtime={providerPodiumRuntime}
        badge="Play-owner podium"
        onSelectProvider={(providerId) => setActiveConnection(providerId, {
          sourceSurface: 'live',
          reason: 'manual',
          preservedTitle: selectedStream?.name || null,
        })}
      />
      <SurfaceFallbackEquivalence contract={fallbackEquivalence} badge="Fallback equivalence" />
      <SurfaceLaunchReadiness contract={launchReadiness} badge="Play confidence" />
      <SurfaceLaunchScorecard scorecard={launchScorecard} badge="Launch scorecard" />
      <SurfaceLaunchOwnership contract={launchOwnership} badge="Launch owner" />
      <SurfaceExitCriteria criteria={exitCriteria} badge="Playback exit criteria" />
      <SurfaceContinuityWindow contract={continuityWindow} badge="Surf continuity" />
      <SurfaceHandoffMap handoff={handoffMap} badge="Playback handoff map" />
      <SurfaceDowngradeLadder contract={downgradeLadder} badge="Downgrade truth" />
      <SurfaceProviderChoice contract={providerChoice} badge="Choice honesty" />
      <SurfaceProviderSwitchContract contract={providerSwitchContract} badge="Switch honesty" />
      <MultiConnectionGuideRuntime
        contract={multiConnectionGuideRuntime}
        onSelectProvider={(providerId) => setActiveConnection(providerId, {
          sourceSurface: 'live',
          reason: 'manual',
          preservedTitle: selectedStream?.name || null,
        })}
      />
      <SurfaceProviderReturnContract contract={providerReturnContract} badge="Return truth" />
      <SurfaceProviderStabilityContract contract={providerStabilityContract} badge="Stability truth" />
      <SurfaceRecoveryPlan contract={recoveryPlan} badge="Recovery route" />
      <SurfaceFreshnessBoard runtime={freshnessBoardRuntime} badge="Freshness truth" />
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

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="aspect-video bg-black">
            <VideoPlayer
              src={previewUrl}
              poster={selectedStream?.stream_icon}
              muted
            />
          </div>
          <div className="p-6">
            <SurfaceLaunchReadinessInline
              contract={launchReadiness}
              title="Play readiness"
              badge="Launch truth"
            />
            <div className="mt-4">
              <SurfaceLaunchScorecardInline
                scorecard={launchScorecard}
                title="Play launch scorecard"
                badge="Go / Watch / Recover"
              />
            </div>
            <div className="mt-4">
              <SurfaceFreshnessBoardInline
                runtime={freshnessBoardRuntime}
                title="Play guide freshness"
                badge="Guide truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceConfidenceFloorInline
                contract={confidenceFloor}
                title="Play confidence floor"
                badge="Minimum proof"
              />
            </div>
            <div className="mt-4">
              <SurfaceInterruptionBudgetInline
                contract={interruptionBudget}
                title="Play interruption budget"
                badge="Delay truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceRetryHonestyInline
                contract={retryContract}
                title="Play retry honesty"
                badge="Retry truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceFallbackCostInline
                contract={fallbackCost}
                title="Play fallback cost"
                badge="Recovery trade-off"
              />
            </div>
            <div className="mt-4">
              <SurfaceFallbackRankingInline
                contract={fallbackRanking}
                title="Play fallback ranking"
                badge="Rescue order"
              />
            </div>
            <div className="mt-4">
              <SurfaceHoldReceiptInline
                runtime={holdReceiptRuntime}
                title="Play hold receipt"
                badge="Hold truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceProviderStabilityInline
                contract={providerStabilityContract}
                title="Play provider stability"
                badge="Stability truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceReturnCooldownInline
                contract={returnCooldownContract}
                title="Play return cooldown"
                badge="Return runway"
              />
            </div>
            <div className="mt-4">
              <SurfaceRecoveryWitnessInline
                contract={recoveryWitness}
                title="Play recovery witness"
                badge="Recovery proof"
              />
            </div>
            <div className="mt-4">
              <SurfaceHandoffClarityInline
                criteria={exitCriteria}
                handoff={handoffMap}
                title="Play handoff clarity"
                badge="Next-screen truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceProviderChoiceInline
                contract={providerChoice}
                title="Selected-channel choice"
                badge="Launch choice"
              />
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-sky-300">Live preview</p>
                <h1 className="mt-2 text-3xl font-semibold text-white">{selectedStream?.name || 'Select a channel'}</h1>
                <p className="mt-2 text-sm text-slate-400">
                  {selectedStream?.channel_group || 'Live TV'} · {providerStatus?.state || 'idle'}
                </p>
              </div>
              {selectedStream ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      if (!selectedStream || !previewUrl) return;
                      playStream(selectedStream, previewUrl, activeConnection.id);
                    }}
                    disabled={!canPlaySelected}
                    className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
                  >
                    Play in dock
                  </button>
                  <button
                    onClick={() => toggleFavorite(activeConnection.id, getContentId(selectedStream), selectedStream)}
                    className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:bg-white/5"
                  >
                    {favorites.includes(getContentId(selectedStream)) ? 'Remove favorite' : 'Add favorite'}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <InfoCard label="Provider" value={activeConnection.name} detail={activeConnection.username} />
              <InfoCard label="Status" value={providerStatus?.state || 'idle'} detail={providerStatus?.message || 'Validation pending'} />
              <InfoCard label="Favorites" value={String(favorites.length)} detail="Saved live channels on this provider" />
            </div>

            <div className="mt-4">
              <SurfaceProviderChoiceInline
                contract={providerChoice}
                title="Playback provider choice"
                badge="Play choice"
              />
            </div>

            <div className="mt-4">
              <GuideCoverageStrip
                title="Live guide continuity"
                report={liveGuideCoverage}
                emptyMessage="Live guide coverage will appear after visible channels sync."
                streamLabels={Object.fromEntries(filteredStreams.slice(0, 8).map((stream) => [getContentId(stream), stream.name]))}
                continuity={liveGuideContinuity}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <InfoCard label="Health" value={streamHealth.status} detail={streamHealth.message || 'Live telemetry will update during preview and playback'} />
              <InfoCard label="Buffer" value={streamHealth.bufferSeconds !== null ? `${streamHealth.bufferSeconds}s` : '--'} detail="Available preview buffer" />
              <InfoCard label="Bitrate" value={streamHealth.bitrateKbps !== null ? `${streamHealth.bitrateKbps} kbps` : '--'} detail={streamHealth.codec || 'Codec pending'} />
              <InfoCard label="Resolution" value={streamHealth.resolution || '--'} detail={streamHealth.droppedFrames !== null ? `${streamHealth.droppedFrames} dropped frames` : 'Frame telemetry pending'} />
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Now / Next</p>
              {selectedGuide?.now ? (
                <>
                  <p className="mt-3 text-lg font-medium text-white">{selectedGuide.now.title}</p>
                  {selectedGuide.now.description ? <p className="mt-2 text-sm leading-7 text-slate-300">{selectedGuide.now.description}</p> : null}
                  {selectedGuide.next?.title ? <p className="mt-4 text-sm text-slate-400">Next: {selectedGuide.next.title}</p> : null}
                  <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    {selectedGuideState?.source === 'cache' ? 'Saved guide snapshot' : 'Live provider guide'}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  {selectedGuideState?.status === 'refreshing'
                    ? 'Refreshing guide data for this channel...'
                    : selectedGuideState?.error
                      ? `Guide refresh failed: ${selectedGuideState.error}`
                  : 'Guide data is unavailable for this channel right now.'}
                </p>
              )}
            </div>

            {proofDebt?.debts?.[0] ? (
              <div className="mt-4 rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-amber-200">Borrowed surf confidence</p>
                    <p className="mt-2 text-base font-medium text-white">{proofDebt.debts[0].label}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
                    Proof debt
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{proofDebt.debts[0].borrowedConfidence}</p>
              </div>
            ) : null}
            {claimCeiling?.ceilings?.[0] ? (
              <div className="mt-4 rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-rose-200">Play claim ceiling</p>
                    <p className="mt-2 text-base font-medium text-white">{claimCeiling.ceilings[0].label}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
                    Copy guardrail
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{claimCeiling.ceilings[0].allowedPromise}</p>
                <p className="mt-3 text-sm leading-6 text-rose-100">Suppress: {claimCeiling.ceilings[0].forbiddenOverclaim}</p>
              </div>
            ) : null}
            {connectionHeadroom?.lanes?.[0] ? (
              <div className="mt-4 rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-amber-200">Play connection headroom</p>
                    <p className="mt-2 text-base font-medium text-white">{connectionHeadroom.lanes[0].label}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
                    {activeConnection.lastAuthSummary?.activeConnections ?? health?.accountProfile?.activeConnections ?? '--'}/
                    {activeConnection.lastAuthSummary?.maxConnections ?? health?.accountProfile?.maxConnections ?? '--'} lines used
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{connectionHeadroom.lanes[0].currentWindow}</p>
                <p className="mt-3 text-sm leading-6 text-amber-100">Next move: {connectionHeadroom.lanes[0].recommendedMove}</p>
              </div>
            ) : null}
            {autonomyBoundary?.boundaries?.[0] ? (
              <div className="mt-4 rounded-[1.5rem] border border-sky-400/20 bg-sky-500/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-sky-200">Play autonomy boundary</p>
                    <p className="mt-2 text-base font-medium text-white">{autonomyBoundary.boundaries[0].label}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
                    Visible handoff
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{autonomyBoundary.boundaries[0].autoMaintains}</p>
                <p className="mt-3 text-sm leading-6 text-sky-100">User owns: {autonomyBoundary.boundaries[0].userOwns}</p>
              </div>
            ) : null}

          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Filters</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Browse live channels</h2>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search channels"
            className="mt-5 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/40"
          />

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-full px-4 py-2 text-sm transition ${selectedCategory === 'all' ? 'bg-white text-slate-950' : 'border border-white/10 text-slate-300 hover:bg-white/5'}`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.category_id}
                onClick={() => setSelectedCategory(category.category_id)}
                className={`rounded-full px-4 py-2 text-sm transition ${selectedCategory === category.category_id ? 'bg-white text-slate-950' : 'border border-white/10 text-slate-300 hover:bg-white/5'}`}
              >
                {category.category_name}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
          ) : null}
          {loading ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">Loading live lineup...</div>
          ) : null}

          <div className="mt-5 space-y-3">
            {filteredStreams.map((stream) => {
              const contentId = getContentId(stream);
              const isSelected = selectedStream && getContentId(selectedStream) === contentId;
              const cardGuide = lookupStreamGuide(activeConnection.id, stream, Number.MAX_SAFE_INTEGER);
              return (
                <button
                  key={contentId}
                  onClick={() => selectStream(stream)}
                  onMouseEnter={() => selectStream(stream)}
                  onFocus={() => selectStream(stream)}
                  className={`flex w-full items-center gap-4 rounded-[1.4rem] border px-4 py-3 text-left transition ${isSelected ? 'border-sky-400/30 bg-sky-500/10' : 'border-white/10 bg-black/20 hover:bg-black/30'}`}
                >
                  <div
                    className="h-14 w-24 shrink-0 rounded-xl bg-cover bg-center"
                    style={{ backgroundImage: `url(${stream.stream_icon || ''})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{stream.name}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{stream.channel_group || 'Live'} · {favorites.includes(contentId) ? 'Favorited' : 'Ready to play'}</p>
                    {cardGuide?.epg?.now ? (
                      <div className="mt-2 space-y-1">
                        <p className="truncate text-[11px] uppercase tracking-[0.2em] text-sky-200">Now: {cardGuide.epg.now?.title}</p>
                        {cardGuide.epg.next?.title ? (
                          <p className="truncate text-[11px] uppercase tracking-[0.2em] text-slate-400">Next: {cardGuide.epg.next?.title}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
            {!loading && filteredStreams.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-white/10 p-5 text-sm text-slate-400">
                No channels matched this search and category filter.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}
