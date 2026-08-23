'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderHealth, fetchMockProviderManifest, getSelectedMockProviderScenario, isMockProviderServer, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { SurfaceActionGate } from '@/components/surface-action-gate';
import { SurfaceAutonomyBoundary } from '@/components/surface-autonomy-boundary';
import { SurfaceClaimCeiling } from '@/components/surface-claim-ceiling';
import { SurfaceClaimCeilingInline } from '@/components/surface-claim-ceiling-inline';
import { MockDemoBoard } from '@/components/mock-demo-board';
import { PhaseOneShipRail } from '@/components/phase-one-ship-rail';
import { MockScenarioControl } from '@/components/mock-scenario-control';
import { DifferentiatorSpotlight } from '@/components/differentiator-spotlight';
import { GuideCoverageStrip } from '@/components/guide-coverage-strip';
import { MultiConnectionGuideRuntime } from '@/components/multi-connection-guide-runtime';
import { ProviderRiskStrip } from '@/components/provider-risk-strip';
import { SurfaceCanonicalProviderIdentity } from '@/components/surface-canonical-provider-identity';
import { SurfaceCanonicalProviderIdentityInline } from '@/components/surface-canonical-provider-identity-inline';
import { SurfaceConnectionHeadroomInline } from '@/components/surface-connection-headroom-inline';
import { SurfaceLineReleaseWitnessInline } from '@/components/surface-line-release-witness-inline';
import { SurfaceConnectionHeadroom } from '@/components/surface-connection-headroom';
import { SurfaceContinuityWindowInline } from '@/components/surface-continuity-window-inline';
import { SurfaceConfidenceFloorInline } from '@/components/surface-confidence-floor-inline';
import { SurfaceExitCriteria } from '@/components/surface-exit-criteria';
import { SurfaceHoldReceiptInline } from '@/components/surface-hold-receipt-inline';
import { SurfaceConfidenceFloor } from '@/components/surface-confidence-floor';
import { SurfaceContinuityWindow } from '@/components/surface-continuity-window';
import { SurfaceDowngradeLadder } from '@/components/surface-downgrade-ladder';
import { SurfaceExplanationBoundary } from '@/components/surface-explanation-boundary';
import { SurfaceFallbackEquivalence } from '@/components/surface-fallback-equivalence';
import { SurfaceFallbackEquivalenceInline } from '@/components/surface-fallback-equivalence-inline';
import { SurfaceFallbackExpiryInline } from '@/components/surface-fallback-expiry-inline';
import { SurfaceFallbackRanking } from '@/components/surface-fallback-ranking';
import { SurfaceFallbackRankingInline } from '@/components/surface-fallback-ranking-inline';
import { SurfaceFallbackCost } from '@/components/surface-fallback-cost';
import { SurfaceFallbackCostInline } from '@/components/surface-fallback-cost-inline';
import { SurfaceFreshnessBoardInline } from '@/components/surface-freshness-board-inline';
import { SurfaceFreshnessBoard } from '@/components/surface-freshness-board';
import { SurfaceHandoffMap } from '@/components/surface-handoff-map';
import { SurfaceIdentityAnchor } from '@/components/surface-identity-anchor';
import { SurfaceIdentityAnchorInline } from '@/components/surface-identity-anchor-inline';
import { SurfaceInterruptionBudget } from '@/components/surface-interruption-budget';
import { SurfaceIntentLock } from '@/components/surface-intent-lock';
import { SurfaceLaunchOwnership } from '@/components/surface-launch-ownership';
import { SurfaceLaunchReadinessInline } from '@/components/surface-launch-readiness-inline';
import { SurfaceLaunchOwnershipInline } from '@/components/surface-launch-ownership-inline';
import { SurfaceLaunchScorecardInline } from '@/components/surface-launch-scorecard-inline';
import { SurfaceHandoffClarityInline } from '@/components/surface-handoff-clarity-inline';
import { SurfaceInterruptionBudgetInline } from '@/components/surface-interruption-budget-inline';
import { SurfaceProviderStabilityInline } from '@/components/surface-provider-stability-inline';
import { SurfaceReturnCooldownInline } from '@/components/surface-return-cooldown-inline';
import { SurfaceRetryHonestyInline } from '@/components/surface-retry-honesty-inline';
import { SurfaceLaunchReadiness } from '@/components/surface-launch-readiness';
import { SurfaceLaunchScorecard } from '@/components/surface-launch-scorecard';
import { SurfaceProofDebtInline } from '@/components/surface-proof-debt-inline';
import { SurfaceProofProvenanceInline } from '@/components/surface-proof-provenance-inline';
import { SurfaceExplanationBoundaryInline } from '@/components/surface-explanation-boundary-inline';
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
import { SurfaceProviderSwitchInline } from '@/components/surface-provider-switch-inline';
import { SurfaceProviderPodiumInline } from '@/components/surface-provider-podium-inline';
import { SurfaceFocusReturnInline } from '@/components/surface-focus-return-inline';
import { SurfaceFirstPictureInline } from '@/components/surface-first-picture-inline';
import { SurfaceProviderDropContinuityInline } from '@/components/surface-provider-drop-continuity-inline';
import { SurfaceMultiConnectionCustodyInline } from '@/components/surface-multi-connection-custody-inline';
import { MultiConnectionSwitchInline } from '@/components/multi-connection-switch-inline';
import { MultiConnectionSwitchPanel } from '@/components/multi-connection-switch-panel';
import { SurfaceRemotePathInline } from '@/components/surface-remote-path-inline';
import { SurfaceResumeCustodyInline } from '@/components/surface-resume-custody-inline';
import { SurfaceSelectionCustodyInline } from '@/components/surface-selection-custody-inline';
import { SurfaceRecoveryPlan } from '@/components/surface-recovery-plan';
import { SurfaceRescueReceiptInline } from '@/components/surface-rescue-receipt-inline';
import { SurfaceResetBoundaryInline } from '@/components/surface-reset-boundary-inline';
import { SurfaceRetryContract } from '@/components/surface-retry-contract';
import { SurfaceRescueReceipt } from '@/components/surface-rescue-receipt';
import { buildMultiConnectionGuideRuntimeContract } from '@/lib/multi-connection-guide-runtime';
import { buildSurfaceContinuityWindowRuntime } from '@/lib/surface-continuity-window-runtime';
import { buildPlaybackHistoryRuntime } from '@/lib/playback-history-runtime';
import { buildProviderGuideContinuity } from '@/lib/provider-guide-continuity';
import { buildSavedProviderConnectionHeadroomRuntime } from '@/lib/saved-provider-connection-headroom-runtime';
import { buildSavedProviderLineReleaseRuntime } from '@/lib/saved-provider-line-release-runtime';
import { buildSavedProviderChoiceRuntime } from '@/lib/saved-provider-choice-runtime';
import { buildSavedProviderExplanationBoundaryRuntime } from '@/lib/saved-provider-explanation-boundary-runtime';
import { buildSavedProviderFallbackExpiryRuntime } from '@/lib/saved-provider-fallback-expiry-runtime';
import { buildSavedProviderFallbackEquivalenceRuntime, buildSavedProviderFallbackRankingRuntime } from '@/lib/saved-provider-fallback-runtime';
import { buildSavedProviderFreshnessBoardRuntime } from '@/lib/saved-provider-freshness-board-runtime';
import { buildSavedProviderHealthBoard } from '@/lib/saved-provider-health';
import { buildSavedProviderHoldReceiptRuntime } from '@/lib/saved-provider-hold-receipt-runtime';
import { buildSavedProviderIdentityAnchorRuntime } from '@/lib/saved-provider-identity-anchor-runtime';
import { buildSavedProviderLaunchOwnershipRuntime } from '@/lib/saved-provider-launch-ownership-runtime';
import { buildSavedProviderPodiumRuntime } from '@/lib/saved-provider-podium-runtime';
import { buildSavedProviderProofDebtRuntime } from '@/lib/saved-provider-proof-debt-runtime';
import { buildSavedProviderProofProvenanceRuntime } from '@/lib/saved-provider-proof-provenance-runtime';
import { buildSavedProviderReturnCooldownRuntime } from '@/lib/saved-provider-return-cooldown-runtime';
import { buildSavedProviderStabilityRuntime } from '@/lib/saved-provider-stability-runtime';
import { buildSavedProviderSwitchRuntime } from '@/lib/saved-provider-switch-runtime';
import { buildSurfaceMultiConnectionCustodyRuntime } from '@/lib/multi-connection-custody-runtime';
import { buildMultiConnectionSwitchRuntime } from '@/lib/multi-connection-switch-runtime';
import { buildRuntimeSurfaceContracts } from '@/lib/runtime-surface-contracts';
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
  const lastSwitchContext = useAuthStore((state) => state.lastSwitchContext);
  const favorites = useFavoritesStore((state) => activeConnection ? state.getFavoritesForProvider(activeConnection.id) : []);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const providerDrops = usePlayerStore((state) => state.providerDrops);
  const playStream = usePlayerStore((state) => state.playStream);
  const lookupStreamGuide = useLiveGuideStore((state) => state.lookupStreamGuide);
  const markGuideFromCache = useLiveGuideStore((state) => state.markGuideFromCache);
  const prefetchStreams = useLiveGuideStore((state) => state.prefetchStreams);
  const getCoverageReport = useLiveGuideStore((state) => state.getCoverageReport);

  const [home, setHome] = useState<HomeState>(emptyHome);
  const [guideMessage, setGuideMessage] = useState<string | null>(null);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [manifest, setManifest] = useState<MockProviderManifest | null>(null);
  const [health, setHealth] = useState<MockProviderHealth | null>(null);
  const [scenario, setScenario] = useState(getSelectedMockProviderScenario());
  const [focusAnchor, setFocusAnchor] = useState('Hero launch');

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
  const homeGuideCoverage = useMemo(() => {
    if (!activeConnection) return null;
    const guideTargets = [...(featuredLive ? [featuredLive] : []), ...home.quickLive];
    return getCoverageReport(activeConnection.id, guideTargets.map((stream) => getContentId(stream)), Number.MAX_SAFE_INTEGER);
  }, [activeConnection, featuredLive, getCoverageReport, home.quickLive]);
  const continueWatching = useMemo(() => {
    if (!activeConnection) return [];
    return buildPlaybackHistoryRuntime({
      history: watchHistory.filter((item) => item.providerId === activeConnection.id),
      connections,
      connectionStatus,
      activeConnectionId: activeConnection.id,
    }).items.slice(0, 4);
  }, [activeConnection, connectionStatus, connections, watchHistory]);
  const fallbackEquivalence = useMemo(
    () => manifest?.surfaceFallbackEquivalenceContracts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const fallbackExpiry = useMemo(
    () => manifest?.surfaceFallbackExpiryContracts.find((item) => item.screenId === 'home') ?? null,
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
  const launchOwnershipContract = useMemo(
    () => manifest?.surfaceLaunchOwnerships.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const holdReceipt = useMemo(
    () => manifest?.surfaceHoldReceipts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const continuityWindow = useMemo(
    () => manifest?.surfaceContinuityWindows.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const multiConnectionCustody = useMemo(
    () => manifest?.surfaceMultiConnectionCustodyContracts?.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const lineReleaseWitness = useMemo(
    () => manifest?.surfaceLineReleaseWitnessContracts?.find((item) => item.screenId === 'home') ?? null,
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
  const returnCooldownContract = useMemo(
    () => manifest?.surfaceReturnCooldownContracts.find((item) => item.screenId === 'home') ?? null,
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
  const manifestAutonomyBoundary = useMemo(
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
  const resetBoundary = useMemo(
    () => manifest?.surfaceResetBoundaries.find((item) => item.screenId === 'home') ?? null,
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
  const manifestConnectionHeadroom = useMemo(
    () => manifest?.surfaceConnectionHeadrooms.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const confidenceFloor = useMemo(
    () => manifest?.surfaceConfidenceFloors.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const providerPodium = useMemo(
    () => manifest?.surfaceProviderPodiums?.find((item) => item.screenId === 'home') ?? null,
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
  const providerPodiumRuntime = useMemo(
    () => buildSavedProviderPodiumRuntime({
      contract: providerPodium,
      board: savedProviderBoard,
    }),
    [providerPodium, savedProviderBoard]
  );
  const multiConnectionCustodyRuntime = useMemo(
    () => buildSurfaceMultiConnectionCustodyRuntime({
      contract: multiConnectionCustody,
      screenId: 'home',
      board: savedProviderBoard,
      lastSwitchContext,
      featuredTitle: home.featured?.name ?? null,
      resumeTitle: continueWatching[0]?.title ?? null,
    }),
    [continueWatching, home.featured?.name, lastSwitchContext, multiConnectionCustody, savedProviderBoard]
  );
  const providerChoiceRuntime = useMemo(
    () => buildSavedProviderChoiceRuntime({
      contract: providerChoice,
      board: savedProviderBoard,
    }),
    [providerChoice, savedProviderBoard]
  );
  const providerSwitchRuntime = useMemo(
    () => buildSavedProviderSwitchRuntime({
      contract: providerSwitchContract,
      board: savedProviderBoard,
    }),
    [providerSwitchContract, savedProviderBoard]
  );
  const multiConnectionSwitchRuntime = useMemo(
    () => buildMultiConnectionSwitchRuntime({
      screenId: 'home',
      board: savedProviderBoard,
      lastSwitchContext,
      subjectTitle: home.featured?.name ?? continueWatching[0]?.title ?? null,
    }),
    [continueWatching, home.featured?.name, lastSwitchContext, savedProviderBoard]
  );
  const lineReleaseWitnessRuntime = useMemo(
    () => buildSavedProviderLineReleaseRuntime({
      contract: lineReleaseWitness,
      board: savedProviderBoard,
    }),
    [lineReleaseWitness, savedProviderBoard]
  );
  const fallbackRankingRuntime = useMemo(
    () => buildSavedProviderFallbackRankingRuntime({
      contract: fallbackRanking,
      board: savedProviderBoard,
    }),
    [fallbackRanking, savedProviderBoard]
  );
  const fallbackEquivalenceRuntime = useMemo(
    () => buildSavedProviderFallbackEquivalenceRuntime({
      contract: fallbackEquivalence,
      board: savedProviderBoard,
    }),
    [fallbackEquivalence, savedProviderBoard]
  );
  const fallbackExpiryRuntime = useMemo(
    () => buildSavedProviderFallbackExpiryRuntime({
      contract: fallbackExpiry,
      board: savedProviderBoard,
    }),
    [fallbackExpiry, savedProviderBoard]
  );
  const holdReceiptRuntime = useMemo(
    () => buildSavedProviderHoldReceiptRuntime({
      contract: holdReceipt,
      board: savedProviderBoard,
    }),
    [holdReceipt, savedProviderBoard]
  );
  const launchOwnershipRuntime = useMemo(
    () => buildSavedProviderLaunchOwnershipRuntime({
      contract: launchOwnershipContract,
      board: savedProviderBoard,
    }),
    [launchOwnershipContract, savedProviderBoard]
  );
  const connectionHeadroomRuntime = useMemo(
    () => buildSavedProviderConnectionHeadroomRuntime({
      contract: manifestConnectionHeadroom,
      board: savedProviderBoard,
    }),
    [manifestConnectionHeadroom, savedProviderBoard]
  );
  const proofDebtRuntime = useMemo(
    () => buildSavedProviderProofDebtRuntime({
      contract: proofDebt,
      board: savedProviderBoard,
    }),
    [proofDebt, savedProviderBoard]
  );
  const proofProvenanceRuntime = useMemo(
    () => buildSavedProviderProofProvenanceRuntime({
      contract: proofProvenance,
      board: savedProviderBoard,
    }),
    [proofProvenance, savedProviderBoard]
  );
  const explanationBoundaryRuntime = useMemo(
    () => buildSavedProviderExplanationBoundaryRuntime({
      contract: explanationBoundary,
      board: savedProviderBoard,
    }),
    [explanationBoundary, savedProviderBoard]
  );
  const providerStabilityRuntime = useMemo(
    () => buildSavedProviderStabilityRuntime({
      contract: providerStabilityContract,
      board: savedProviderBoard,
    }),
    [providerStabilityContract, savedProviderBoard]
  );
  const returnCooldownRuntime = useMemo(
    () => buildSavedProviderReturnCooldownRuntime({
      contract: returnCooldownContract,
      board: savedProviderBoard,
    }),
    [returnCooldownContract, savedProviderBoard]
  );
  const identityAnchorRuntime = useMemo(
    () => buildSavedProviderIdentityAnchorRuntime({
      contract: identityAnchor,
      board: savedProviderBoard,
    }),
    [identityAnchor, savedProviderBoard]
  );
  const freshnessBoardRuntime = useMemo(
    () => buildSavedProviderFreshnessBoardRuntime({
      contract: freshnessBoard,
      board: savedProviderBoard,
      report: homeGuideCoverage,
    }),
    [freshnessBoard, homeGuideCoverage, savedProviderBoard]
  );
  const heroGuide = activeConnection && featuredLive
    ? getGuidePayload(lookupStreamGuide(activeConnection.id, featuredLive, Number.MAX_SAFE_INTEGER))
    : null;
  const homeGuideContinuity = useMemo(
    () => buildProviderGuideContinuity({
      screenId: 'home',
      report: homeGuideCoverage,
      savedProviderBoard,
      ownerLabel: featuredLive?.name || home.featured?.name || activeConnection?.name || null,
    }),
    [activeConnection?.name, featuredLive?.name, home.featured?.name, homeGuideCoverage, savedProviderBoard]
  );
  const multiConnectionGuideRuntime = useMemo(() => {
    const coverageByProvider = Object.fromEntries(connections.map((connection) => {
      const cachedHome = getCachedHomeSnapshot(connection.id, Number.POSITIVE_INFINITY);
      const guideTargets = [
        ...(cachedHome?.featured?.stream_type === 'live' && cachedHome?.featured ? [cachedHome.featured] : []),
        ...(cachedHome?.quickLive || []),
      ];
      const report = guideTargets.length
        ? getCoverageReport(connection.id, guideTargets.map((stream) => getContentId(stream)), Number.MAX_SAFE_INTEGER)
        : null;
      return [connection.id, report];
    }));

    return buildMultiConnectionGuideRuntimeContract({
      screenId: 'home',
      connections,
      connectionStatus,
      savedProviderBoard,
      coverageByProvider,
      selectedLabel: featuredLive?.name || home.featured?.name || activeConnection?.name || null,
      lastSwitchContext,
    });
  }, [
    activeConnection?.name,
    connectionStatus,
    connections,
    featuredLive?.name,
    getCoverageReport,
    home.featured?.name,
    lastSwitchContext,
    savedProviderBoard,
  ]);
  const runtimeSurfaceContracts = useMemo(
    () => activeConnection
      ? buildRuntimeSurfaceContracts({
          screenId: 'home',
          providerLabel: activeConnection.name,
          providerStatusLabel: connectionStatus[activeConnection.id]?.state || null,
          savedProviderBoard,
          guideCoverage: homeGuideCoverage,
          selectedLabel: featuredLive?.name || home.featured?.name || activeConnection.name,
          currentNowTitle: heroGuide?.now?.title ?? null,
          currentNextTitle: heroGuide?.next?.title ?? null,
          nextHopHref: '/live',
          nextHopLabel: 'Open Live',
        })
      : null,
    [activeConnection, connectionStatus, featuredLive, heroGuide, home.featured?.name, homeGuideCoverage, savedProviderBoard]
  );
  const launchReadiness = runtimeSurfaceContracts?.launchReadiness || manifest?.surfaceLaunchReadinessContracts.find((item) => item.screenId === 'home') || null;
  const launchScorecard = runtimeSurfaceContracts?.launchScorecard || manifest?.surfaceScorecards.find((item) => item.screenId === 'home') || null;
  const exitCriteria = runtimeSurfaceContracts?.exitCriteria || manifest?.surfaceExitCriteria.find((item) => item.screenId === 'home') || null;
  const handoffMap = runtimeSurfaceContracts?.handoffMap || manifest?.surfaceHandoffs.find((item) => item.screenId === 'home') || null;
  const autonomyBoundary = runtimeSurfaceContracts?.autonomyBoundary || manifestAutonomyBoundary;
  const connectionHeadroom = connectionHeadroomRuntime || null;
  const homeLineReleaseWitness = lineReleaseWitnessRuntime || null;
  const homeFocusReturnRuntime = useMemo(() => ({
    currentAnchor: focusAnchor,
    backTarget: focusAnchor.toLowerCase().includes('rail') ? 'Last earned rail' : 'Featured hero lane',
    recoveryTarget: featuredLive?.name || home.featured?.name || activeConnection?.name || 'Featured launch',
    detail: focusAnchor.toLowerCase().includes('rail')
      ? 'Back now returns to the last earned rail so Home preserves the same discovery lane instead of rebuilding from the top.'
      : 'Back now returns to the featured hero lane so the primary browse anchor stays calm and TV-native.',
  }), [activeConnection?.name, featuredLive?.name, focusAnchor, home.featured?.name]);
  const homeSelectionCustodyRuntime = useMemo(() => ({
    activeSubject: home.featured?.name || activeConnection?.name || 'Featured launch',
    carriesForward: featuredLive?.name
      ? `${featuredLive.name} stays attached to Play and Live handoff`
      : `${home.featured?.name || 'Featured title'} stays attached to the hero CTA`,
    breaksWhen: 'A hero refresh, provider rescue, or rail change makes the featured CTA target a different title or owner',
    detail: featuredLive
      ? 'The hero CTA is still naming the same live subject, so the next move should feel like opening that exact channel instead of a vague featured idea.'
      : 'The hero CTA is still naming the same featured subject, so browse polish does not get to change the launch target silently.',
  }), [activeConnection?.name, featuredLive?.name, home.featured?.name]);
  const homeFirstPictureRuntime = useMemo(() => ({
    currentPromise: featuredLive?.name
      ? `${featuredLive.name} is the shortest visible route from Home to motion`
      : `${home.featured?.name || 'The featured hero'} owns the fastest Home launch`,
    fastestPath: featuredLive?.name
      ? `Press Play on ${featuredLive.name} or drop one move into quick live for the same provider-backed picture path`
      : 'Use the hero CTA, then fall into quick live if the featured launch is not the fastest honest motion path',
    blockedBy: 'Hero refresh, provider rescue, or line pressure can demote the featured route before playback opens',
    detail: featuredLive?.name
      ? 'Home already knows which live subject reaches a picture fastest, so the hero and quick-live lane should keep that route readable instead of hiding it behind cinematic chrome.'
      : 'When the hero is not a live target, Home should still say whether the hero or the quick-live rail is the shortest honest route to visible playback.',
  }), [featuredLive?.name, home.featured?.name]);
  const homeResumeEntry = useMemo(
    () => activeConnection ? watchHistory.find((item) => item.providerId === activeConnection.id) ?? null : null,
    [activeConnection, watchHistory]
  );
  const homeResumeCustodyRuntime = useMemo(() => ({
    activeResume: homeResumeEntry
      ? `${homeResumeEntry.title} is still the strongest return target on Home`
      : `${home.featured?.name || 'The featured hero'} is acting as the current return story until watch history exists`,
    carriesForward: homeResumeEntry
      ? `${homeResumeEntry.title} keeps its progress and provider owner while the hero stays a suggestion, not a silent replacement`
      : 'Home is still building the first explicit resume target, so featured browse must not pretend to be a true return path yet',
    breaksWhen: homeResumeEntry
      ? 'A hero refresh, provider rescue, or featured detour would break custody if it stops naming the same saved return target'
      : 'Without a watch-history target, featured refresh must stay honest that it is only browse momentum',
    detail: homeResumeEntry
      ? 'Home should keep the user’s real return target visible even when the hero is selling a different premium story, so resume continuity stays user-owned.'
      : 'Until Home earns a real resume target, the hero should stay explicit that it is promoting a browse path rather than reviving prior watch intent.',
  }), [home.featured?.name, homeResumeEntry]);
  const homeProviderDropEntries = useMemo(
    () => Object.values(providerDrops).filter((item) => !item.recoveredAt).sort((left, right) => right.happenedAt - left.happenedAt),
    [providerDrops]
  );
  const homeProviderDropRuntime = useMemo(() => {
    const activeDrop = activeConnection ? providerDrops[activeConnection.id] ?? null : null;
    const latestDrop = activeDrop ?? homeProviderDropEntries[0] ?? null;
    return {
      droppedOwner: latestDrop
        ? `${latestDrop.providerName} most recently dropped out of the featured browse story`
        : 'No recent provider drop is attached to the hero yet',
      preserves: latestDrop
        ? homeResumeEntry
          ? `${homeResumeEntry.title} plus the current hero shell still survive on cached continuity`
          : 'The current hero shell and quick-live continuity still survive on cached provider proof'
        : 'Home is currently browsing on fresh or at least non-dropped provider posture',
      reclaimsWhen: latestDrop
        ? 'Featured browse, guide posture, and provider health all point back at the same provider owner again'
        : 'A future dropped provider would need fresh browse proof before the hero could feel fully reclaimed',
      detail: latestDrop
        ? 'Home should keep the dropped provider visible so the hero can preserve cached browse or continue-watching continuity without quietly selling it as fresh ownership.'
        : 'Without a recent provider drop, Home can let the current hero story stand on its active provider posture.',
      activeDropCount: homeProviderDropEntries.length,
    };
  }, [activeConnection, homeProviderDropEntries, homeResumeEntry, providerDrops]);
  const homeContinuityWindowRuntime = useMemo(() => buildSurfaceContinuityWindowRuntime({
    contract: continuityWindow,
    screenId: 'home',
    activeDropCount: homeProviderDropEntries.length,
    featuredTitle: home.featured?.name ?? null,
    resumeTitle: homeResumeEntry?.title ?? null,
  }), [continuityWindow, home.featured?.name, homeProviderDropEntries.length, homeResumeEntry?.title]);

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
      {isMockConnection ? <PhaseOneShipRail manifest={manifest} screenId="home" /> : null}
      {isMockConnection ? <SurfaceRemotePathInline manifest={manifest} screenId="home" /> : null}
      {isMockConnection ? <SurfaceFocusReturnInline manifest={manifest} screenId="home" runtime={homeFocusReturnRuntime} /> : null}
      {isMockConnection ? <SurfaceSelectionCustodyInline manifest={manifest} screenId="home" runtime={homeSelectionCustodyRuntime} /> : null}
      {isMockConnection ? <SurfaceFirstPictureInline manifest={manifest} screenId="home" runtime={homeFirstPictureRuntime} /> : null}
      {isMockConnection ? <SurfaceResumeCustodyInline manifest={manifest} screenId="home" runtime={homeResumeCustodyRuntime} /> : null}
      {isMockConnection ? <SurfaceProviderDropContinuityInline manifest={manifest} screenId="home" runtime={homeProviderDropRuntime} /> : null}
      {isMockConnection ? <SurfaceContinuityWindowInline manifest={manifest} screenId="home" runtime={homeContinuityWindowRuntime} /> : null}
      <SurfaceConnectionHeadroom
        runtime={connectionHeadroom}
        badge="Connection headroom"
      />
      <SurfaceCanonicalProviderIdentity contract={canonicalProviderIdentity} badge="Canonical provider" />
      <SurfaceFallbackRanking runtime={fallbackRankingRuntime} badge="Fallback ranking" />
      <SurfaceProviderPodium
        runtime={providerPodiumRuntime}
        badge="Featured-provider podium"
        onSelectProvider={(providerId) => setActiveConnection(providerId, {
          sourceSurface: 'home',
          reason: 'manual',
          preservedTitle: home.featured?.name || null,
        })}
      />

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
                  onFocus={() => setFocusAnchor('Hero launch')}
                  onClick={() => playStream(featuredLive, buildLiveStreamUrl(activeConnection, featuredLive), activeConnection.id)}
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
                >
                  Play featured channel
                </button>
              ) : (
                <Link href="/live" onFocus={() => setFocusAnchor('Hero launch')} className="rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200">
                  Open live TV
                </Link>
              )}
              <Link href="/favorites" onFocus={() => setFocusAnchor('Favorites action')} className="rounded-full border border-white/15 px-6 py-3 text-sm text-white transition hover:bg-white/5">
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
            {proofDebt?.debts?.[0] ? (
              <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-amber-200">Borrowed browse confidence</p>
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
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-rose-200">Hero claim ceiling</p>
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
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-amber-200">Hero connection headroom</p>
                    <p className="mt-2 text-base font-medium text-white">{connectionHeadroom.lanes[0].label}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
                    {activeConnection.lastAuthSummary?.activeConnections ?? health?.accountProfile?.activeConnections ?? '--'}/
                    {activeConnection.lastAuthSummary?.maxConnections ?? health?.accountProfile?.maxConnections ?? '--'} lines used
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{connectionHeadroom.lanes[0].currentWindow}</p>
              </div>
            ) : null}
            {autonomyBoundary?.boundaries?.[0] ? (
              <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-sky-200">Hero autonomy boundary</p>
                    <p className="mt-2 text-base font-medium text-white">{autonomyBoundary.boundaries[0].label}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
                    User-owned choice
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{autonomyBoundary.boundaries[0].autoMaintains}</p>
                <p className="mt-3 text-sm leading-6 text-sky-100">User owns: {autonomyBoundary.boundaries[0].userOwns}</p>
              </div>
            ) : null}
            <div className="mt-4">
              <SurfaceLaunchReadinessInline
                contract={launchReadiness}
                title="Hero launch readiness"
                badge="Launch truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceLaunchScorecardInline
                scorecard={launchScorecard}
                title="Hero launch scorecard"
                badge="Go / Watch / Recover"
              />
            </div>
            <div className="mt-4">
              <SurfaceLaunchOwnershipInline
                runtime={launchOwnershipRuntime}
                title="Hero launch ownership"
                badge="Owner truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceProviderPodiumInline
                runtime={providerPodiumRuntime}
                title="Hero saved-provider podium"
                badge="Saved-provider podium"
                onSelectProvider={(providerId) => setActiveConnection(providerId, {
                  sourceSurface: 'home',
                  reason: 'manual',
                  preservedTitle: home.featured?.name || null,
                })}
              />
            </div>
            <div className="mt-4">
              <SurfaceMultiConnectionCustodyInline manifest={manifest} screenId="home" runtime={multiConnectionCustodyRuntime} />
            </div>
            <div className="mt-4">
              <MultiConnectionSwitchInline
                runtime={multiConnectionSwitchRuntime}
                title="Hero fast provider switch"
                badge="Runtime honesty"
                onSelectProvider={(providerId) => setActiveConnection(providerId, {
                  sourceSurface: 'home',
                  reason: 'quick-switch',
                  preservedTitle: home.featured?.name || null,
                })}
              />
            </div>
            <div className="mt-4">
              <SurfaceProviderChoiceInline
                runtime={providerChoiceRuntime}
                title="Hero provider choice"
                badge="Launch choice"
              />
            </div>
            <div className="mt-4">
              <SurfaceProviderSwitchInline
                runtime={providerSwitchRuntime}
                title="Hero provider switch"
                badge="Switch truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceProofDebtInline
                runtime={proofDebtRuntime}
                title="Hero proof debt"
                badge="Borrowed confidence"
              />
            </div>
            <div className="mt-4">
              <SurfaceProofProvenanceInline
                runtime={proofProvenanceRuntime}
                title="Hero proof provenance"
                badge="Trust source"
              />
            </div>
            <div className="mt-4">
              <SurfaceExplanationBoundaryInline
                runtime={explanationBoundaryRuntime}
                title="Hero explanation boundary"
                badge="Say this out loud"
              />
            </div>
            <div className="mt-4">
              <SurfaceFreshnessBoardInline
                runtime={freshnessBoardRuntime}
                title="Hero guide freshness"
                badge="Guide truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceConfidenceFloorInline
                contract={confidenceFloor}
                title="Hero confidence floor"
                badge="Minimum proof"
              />
            </div>
            <div className="mt-4">
              <SurfaceInterruptionBudgetInline
                contract={interruptionBudget}
                title="Hero interruption budget"
                badge="Delay truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceRetryHonestyInline
                contract={retryContract}
                title="Hero retry honesty"
                badge="Retry truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceFallbackCostInline
                contract={fallbackCost}
                title="Hero fallback cost"
                badge="Recovery trade-off"
              />
            </div>
            <div className="mt-4">
              <SurfaceCanonicalProviderIdentityInline
                contract={canonicalProviderIdentity}
                title="Hero canonical provider identity"
                badge="Owner truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceFallbackRankingInline
                runtime={fallbackRankingRuntime}
                title="Hero fallback ranking"
                badge="Rescue order"
              />
            </div>
            <div className="mt-4">
                <SurfaceProviderStabilityInline
                  runtime={providerStabilityRuntime}
                  title="Hero provider stability"
                  badge="Stability truth"
                />
            </div>
            <div className="mt-4">
                <SurfaceReturnCooldownInline
                  runtime={returnCooldownRuntime}
                  title="Hero return cooldown"
                  badge="Return runway"
                />
            </div>
            <div className="mt-4">
              <SurfaceRecoveryWitnessInline
                contract={recoveryWitness}
                title="Hero recovery witness"
                badge="Recovery proof"
              />
            </div>
            <div className="mt-4">
              <SurfaceFallbackEquivalenceInline
                runtime={fallbackEquivalenceRuntime}
                title="Hero fallback equivalence"
                badge="Same vs restart"
              />
            </div>
            <div className="mt-4">
              <SurfaceFallbackExpiryInline
                runtime={fallbackExpiryRuntime}
                title="Hero fallback expiry"
                badge="Sameness window"
              />
            </div>
            <div className="mt-4">
              <SurfaceHoldReceiptInline
                runtime={holdReceiptRuntime}
                title="Hero hold receipt"
                badge="Hold truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceRescueReceiptInline
                contract={rescueReceipt}
                title="Hero rescue receipt"
                badge="What changed"
              />
            </div>
            <div className="mt-4">
              <SurfaceResetBoundaryInline
                contract={resetBoundary}
                title="Hero reset boundary"
                badge="Refresh vs reset"
              />
            </div>
            <div className="mt-4">
              <SurfaceIdentityAnchorInline
                runtime={identityAnchorRuntime}
                title="Hero identity anchor"
                badge="Owner truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceHandoffClarityInline
                criteria={exitCriteria}
                handoff={handoffMap}
                title="Hero handoff clarity"
                badge="Next-screen truth"
              />
            </div>
            <div className="mt-4">
              <SurfaceClaimCeilingInline
                contract={claimCeiling}
                title="Hero claim ceiling"
                badge="Copy guardrail"
              />
            </div>
            <div className="mt-4">
              <SurfaceConnectionHeadroomInline
                runtime={connectionHeadroom}
                title="Hero connection headroom"
                badge="Capacity truth"
              />
            </div>
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
      <GuideCoverageStrip
        title="Home guide continuity"
        report={homeGuideCoverage}
        emptyMessage="Home will publish saved-provider guide coverage after the first live-guide sync."
        streamLabels={Object.fromEntries([...(featuredLive ? [featuredLive] : []), ...home.quickLive].map((stream) => [getContentId(stream), stream.name]))}
        continuity={homeGuideContinuity}
      />
      <MultiConnectionGuideRuntime
        contract={multiConnectionGuideRuntime}
        onSelectProvider={(providerId) => setActiveConnection(providerId, {
          sourceSurface: 'home',
          reason: 'manual',
          preservedTitle: home.featured?.name || featuredLive?.name || null,
        })}
      />
      {guideMessage ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{guideMessage}</div>
      ) : null}

      <SurfaceFallbackEquivalence runtime={fallbackEquivalenceRuntime} badge="Fallback equivalence" />

      <SurfaceLaunchReadiness contract={launchReadiness} badge="Hero launch safety" />
      <SurfaceLaunchScorecard scorecard={launchScorecard} badge="Launch scorecard" />
      <SurfaceLaunchOwnership runtime={launchOwnershipRuntime} badge="Launch owner" />
      <SurfaceExitCriteria criteria={exitCriteria} badge="Live exit criteria" />
      <SurfaceContinuityWindow contract={continuityWindow} badge="Browse continuity" />
      <SurfaceHandoffMap handoff={handoffMap} badge="Live handoff map" />
      <SurfaceDowngradeLadder contract={downgradeLadder} badge="Downgrade truth" />
      <MultiConnectionSwitchPanel
        runtime={multiConnectionSwitchRuntime}
        badge="Multi-connection switch runtime"
        onSelectProvider={(providerId) => setActiveConnection(providerId, {
          sourceSurface: 'home',
          reason: 'quick-switch',
          preservedTitle: home.featured?.name || null,
        })}
      />
      <SurfaceLineReleaseWitnessInline
        manifest={manifest}
        screenId="home"
        runtime={homeLineReleaseWitness}
        onSelectProvider={(providerId) => setActiveConnection(providerId, {
          sourceSurface: 'home',
          reason: 'quick-switch',
          preservedTitle: home.featured?.name || null,
        })}
      />
      <SurfaceProviderChoice runtime={providerChoiceRuntime} badge="Choice honesty" />
      <SurfaceProviderSwitchContract runtime={providerSwitchRuntime} badge="Switch honesty" />
      <SurfaceProviderReturnContract contract={providerReturnContract} badge="Return truth" />
      <SurfaceProviderStabilityContract runtime={providerStabilityRuntime} badge="Stability truth" />
      <SurfaceRecoveryPlan contract={recoveryPlan} badge="Recovery route" />
      <SurfaceFreshnessBoard runtime={freshnessBoardRuntime} badge="Freshness truth" />
      <SurfaceProofDebt runtime={proofDebtRuntime} badge="Proof debt" />
      <SurfaceProofProvenance runtime={proofProvenanceRuntime} badge="Proof provenance" />
      <SurfaceIntentLock contract={intentLock} badge="Intent lock" />
      <SurfaceActionGate contract={actionGate} badge="Action gate" />
      <SurfaceExplanationBoundary runtime={explanationBoundaryRuntime} badge="Explanation boundary" />
      <SurfaceAutonomyBoundary contract={autonomyBoundary} badge="Autonomy boundary" />
      <SurfaceInterruptionBudget contract={interruptionBudget} badge="Interruption budget" />
      <SurfaceRetryContract contract={retryContract} badge="Retry honesty" />
      <SurfaceRecoveryWitness contract={recoveryWitness} badge="Recovery witness" />
      <SurfaceRescueReceipt contract={rescueReceipt} badge="Rescue receipt" />
      <SurfaceFallbackCost contract={fallbackCost} badge="Fallback cost" />
      <SurfaceIdentityAnchor runtime={identityAnchorRuntime} badge="Identity anchor" />
      <SurfaceClaimCeiling contract={claimCeiling} badge="Claim ceiling" />
      <SurfaceConfidenceFloor contract={confidenceFloor} badge="Confidence floor" />

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Live highlights</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Fast-launch channels</h2>
          </div>
          <Link href="/live" onFocus={() => setFocusAnchor('Quick-live rail')} className="text-sm text-sky-300 hover:text-sky-200">Browse all live TV</Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {home.quickLive.map((stream) => (
            <button
              key={getContentId(stream)}
              onClick={() => {
                setFocusAnchor(`Quick-live rail · ${stream.name}`);
                playStream(stream, buildLiveStreamUrl(activeConnection, stream), activeConnection.id);
              }}
              onFocus={() => setFocusAnchor(`Quick-live rail · ${stream.name}`)}
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
              <div
                key={`${item.stream_type}-${getContentId(item)}`}
                onMouseEnter={() => setFocusAnchor(`Spotlight rail · ${item.name}`)}
                className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20"
              >
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
                  {item.kind === 'live' ? 'Live channel' : item.kind === 'series' ? 'Series episode' : 'Movie'} · {item.progressPercent ?? 0}% saved
                </p>
                <p className="mt-2 text-xs leading-5 text-sky-100">{item.lastOwner.summary}</p>
                <p className="mt-1 text-xs leading-5 text-emerald-100/90">{item.checkpoint?.summary || 'Resume checkpoint will appear after the first progress update.'}</p>
                <p className={`mt-1 text-xs leading-5 ${item.staleSession.status === 'recover' ? 'text-amber-200' : item.staleSession.status === 'watch' ? 'text-amber-100/90' : 'text-slate-400'}`}>{item.staleSession.summary}</p>
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
