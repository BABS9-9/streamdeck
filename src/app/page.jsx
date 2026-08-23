'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderHealth, fetchMockProviderManifest, getSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { MockDemoBoard } from '@/components/mock-demo-board';
import { PhaseOneShipRail } from '@/components/phase-one-ship-rail';
import { DifferentiatorSpotlight } from '@/components/differentiator-spotlight';
import { ProviderRiskStrip } from '@/components/provider-risk-strip';
import { SurfaceActionGate } from '@/components/surface-action-gate';
import { SurfaceAutonomyBoundary } from '@/components/surface-autonomy-boundary';
import { SurfaceClaimCeiling } from '@/components/surface-claim-ceiling';
import { SurfaceClaimCeilingInline } from '@/components/surface-claim-ceiling-inline';
import { SurfaceConnectionHeadroomInline } from '@/components/surface-connection-headroom-inline';
import { SurfaceLineReleaseWitnessInline } from '@/components/surface-line-release-witness-inline';
import { SurfaceLineClearancePriorityInline } from '@/components/surface-line-clearance-priority-inline';
import { SavedProviderRecoveryAuthorityPanel } from '@/components/saved-provider-recovery-authority-panel';
import { SurfaceConnectionHeadroom } from '@/components/surface-connection-headroom';
import { SurfaceContinuityWindowInline } from '@/components/surface-continuity-window-inline';
import { SurfaceConfidenceFloorInline } from '@/components/surface-confidence-floor-inline';
import { SurfaceCanonicalProviderIdentity } from '@/components/surface-canonical-provider-identity';
import { SurfaceCanonicalProviderIdentityInline } from '@/components/surface-canonical-provider-identity-inline';
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
import { GuideCoverageStrip } from '@/components/guide-coverage-strip';
import { buildProviderGuideContinuity } from '@/lib/provider-guide-continuity';
import { buildSavedProviderConnectionHeadroomRuntime } from '@/lib/saved-provider-connection-headroom-runtime';
import { buildSavedProviderLineReleaseRuntime } from '@/lib/saved-provider-line-release-runtime';
import { buildSavedProviderLineClearancePriorityRuntime } from '@/lib/saved-provider-line-clearance-priority-runtime';
import { buildSavedProviderRecoveryAuthorityRuntime } from '@/lib/saved-provider-recovery-authority-runtime';
import { buildSavedProviderRecoveryAuthorityResolver } from '@/lib/saved-provider-recovery-authority-resolver';
import { buildSavedProviderChoiceRuntime } from '@/lib/saved-provider-choice-runtime';
import { buildSurfaceContinuityWindowRuntime } from '@/lib/surface-continuity-window-runtime';
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
import { getContentId, getLiveStreams } from '@/lib/xtream-api';
import { useAuthStore } from '@/stores/auth-store';
import { getGuidePayload, useLiveGuideStore } from '@/stores/live-guide-store';
import { usePlayerStore } from '@/stores/player-store';

const MOCK_SERVER = 'http://localhost:3579';

const statusTone = {
  idle: 'text-slate-400',
  checking: 'text-amber-300',
  healthy: 'text-emerald-300',
  degraded: 'text-amber-300',
  error: 'text-rose-300',
};

export default function LoginPage() {
  const router = useRouter();
  const hydrate = useAuthStore((state) => state.hydrate);
  const connect = useAuthStore((state) => state.connect);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const validateConnection = useAuthStore((state) => state.validateConnection);
  const connections = useAuthStore((state) => state.connections);
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const lastSwitchContext = useAuthStore((state) => state.lastSwitchContext);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const lookupStreamGuide = useLiveGuideStore((state) => state.lookupStreamGuide);
  const markGuideFromCache = useLiveGuideStore((state) => state.markGuideFromCache);
  const prefetchStreams = useLiveGuideStore((state) => state.prefetchStreams);
  const getCoverageReport = useLiveGuideStore((state) => state.getCoverageReport);
  const syncByGuideKey = useLiveGuideStore((state) => state.syncByGuideKey);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const providerDrops = usePlayerStore((state) => state.providerDrops);

  const [server, setServer] = useState(MOCK_SERVER);
  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('demo');
  const [manifest, setManifest] = useState(null);
  const [health, setHealth] = useState(null);
  const [scenario, setScenario] = useState('healthy');
  const [loginGuideStreams, setLoginGuideStreams] = useState([]);
  const [loginFocusAnchor, setLoginFocusAnchor] = useState('Server URL');

  const selectSavedProvider = (providerId, reason = 'manual') => {
    const connection = connections.find((item) => item.id === providerId);
    if (!connection) return;
    setServer(connection.server);
    setUsername(connection.username);
    setPassword(connection.password);
    setLoginFocusAnchor(`Saved provider ${connection.name}`);
    const switched = setActiveConnection(providerId, {
      sourceSurface: 'login',
      reason,
      preservedTitle: watchHistory[0]?.title ?? null,
    });
    if (switched) router.push('/home');
  };

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setScenario(getSelectedMockProviderScenario());
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
      setLoginGuideStreams([]);
      return () => {
        cancelled = true;
      };
    }

    getLiveStreams(activeConnection)
      .then(async (streams) => {
        if (cancelled) return;
        const nextStreams = streams.slice(0, 2);
        setLoginGuideStreams(nextStreams);
        markGuideFromCache(activeConnection.id, nextStreams.map((stream) => getContentId(stream)));
        await prefetchStreams(activeConnection, nextStreams, 2).catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setLoginGuideStreams([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, markGuideFromCache, prefetchStreams]);

  const handleConnect = async (event) => {
    event.preventDefault();
    const ok = await connect({ server, username, password });
    if (ok) router.push('/home');
  };

  const mockDifferentiators = useMemo(
    () => (manifest?.differentiators || []).filter((item) => item.surface === 'login').slice(0, 3),
    [manifest]
  );
  const fallbackEquivalence = useMemo(
    () => manifest?.surfaceFallbackEquivalenceContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const fallbackExpiry = useMemo(
    () => manifest?.surfaceFallbackExpiryContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const canonicalProviderIdentity = useMemo(
    () => manifest?.surfaceCanonicalProviderIdentityContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const fallbackRanking = useMemo(
    () => manifest?.surfaceFallbackRankingContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const launchOwnershipContract = useMemo(
    () => manifest?.surfaceLaunchOwnerships?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const holdReceipt = useMemo(
    () => manifest?.surfaceHoldReceipts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const continuityWindow = useMemo(
    () => manifest?.surfaceContinuityWindows?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const downgradeLadder = useMemo(
    () => manifest?.surfaceDowngradeLadders?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const providerChoice = useMemo(
    () => manifest?.surfaceProviderChoiceContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const providerSwitchContract = useMemo(
    () => manifest?.surfaceProviderSwitchContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const providerReturnContract = useMemo(
    () => manifest?.surfaceProviderReturnContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const providerStabilityContract = useMemo(
    () => manifest?.surfaceProviderStabilityContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const returnCooldownContract = useMemo(
    () => manifest?.surfaceReturnCooldownContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const recoveryPlan = useMemo(
    () => manifest?.surfaceRecoveryPlans?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const freshnessBoard = useMemo(
    () => manifest?.surfaceFreshnessBoards?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const proofDebt = useMemo(
    () => manifest?.surfaceProofDebts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const proofProvenance = useMemo(
    () => manifest?.surfaceProofProvenances?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const intentLock = useMemo(
    () => manifest?.surfaceIntentLocks?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const actionGate = useMemo(
    () => manifest?.surfaceActionGates?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const explanationBoundary = useMemo(
    () => manifest?.surfaceExplanationBoundaries?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const manifestAutonomyBoundary = useMemo(
    () => manifest?.surfaceAutonomyBoundaries?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const recoveryWitness = useMemo(
    () => manifest?.surfaceRecoveryWitnesses?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const interruptionBudget = useMemo(
    () => manifest?.surfaceInterruptionBudgets?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const retryContract = useMemo(
    () => manifest?.surfaceRetryContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const rescueReceipt = useMemo(
    () => manifest?.surfaceRescueReceipts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const resetBoundary = useMemo(
    () => manifest?.surfaceResetBoundaries?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const fallbackCost = useMemo(
    () => manifest?.surfaceFallbackCosts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const identityAnchor = useMemo(
    () => manifest?.surfaceIdentityAnchors?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const claimCeiling = useMemo(
    () => manifest?.surfaceClaimCeilings?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const manifestConnectionHeadroom = useMemo(
    () => manifest?.surfaceConnectionHeadrooms?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const confidenceFloor = useMemo(
    () => manifest?.surfaceConfidenceFloors?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const providerPodium = useMemo(
    () => manifest?.surfaceProviderPodiums?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const multiConnectionCustody = useMemo(
    () => manifest?.surfaceMultiConnectionCustodyContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const lineReleaseWitness = useMemo(
    () => manifest?.surfaceLineReleaseWitnessContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const lineClearancePriority = useMemo(
    () => manifest?.surfaceLineClearancePriorityContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const recoveryAuthority = useMemo(
    () => manifest?.surfaceRecoveryAuthorityContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const savedProviderBoard = useMemo(
    () => buildSavedProviderHealthBoard({
      connections,
      connectionStatus,
      activeConnectionId: activeConnection?.id,
      surface: 'login',
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
      screenId: 'login',
      board: savedProviderBoard,
      resumeTitle: watchHistory[0]?.title ?? null,
    }),
    [multiConnectionCustody, savedProviderBoard, watchHistory]
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
      screenId: 'login',
      board: savedProviderBoard,
      lastSwitchContext,
      subjectTitle: watchHistory[0]?.title ?? null,
    }),
    [lastSwitchContext, savedProviderBoard, watchHistory]
  );
  const lineReleaseWitnessRuntime = useMemo(
    () => buildSavedProviderLineReleaseRuntime({
      contract: lineReleaseWitness,
      board: savedProviderBoard,
    }),
    [lineReleaseWitness, savedProviderBoard]
  );
  const lineClearancePriorityRuntime = useMemo(
    () => buildSavedProviderLineClearancePriorityRuntime({
      contract: lineClearancePriority,
      board: savedProviderBoard,
    }),
    [lineClearancePriority, savedProviderBoard]
  );
  const recoveryAuthorityRuntime = useMemo(
    () => buildSavedProviderRecoveryAuthorityRuntime({
      contract: recoveryAuthority,
      board: savedProviderBoard,
    }),
    [recoveryAuthority, savedProviderBoard]
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
  const loginGuideCards = useMemo(
    () => activeConnection
      ? loginGuideStreams.map((stream) => ({
          stream,
          guide: getGuidePayload(lookupStreamGuide(activeConnection.id, stream, Number.MAX_SAFE_INTEGER)),
          sync: syncByGuideKey[`${activeConnection.id}:${getContentId(stream)}`] ?? null,
        }))
      : [],
    [activeConnection, loginGuideStreams, lookupStreamGuide, syncByGuideKey]
  );
  const loginGuideCoverage = useMemo(
    () => activeConnection
      ? getCoverageReport(activeConnection.id, loginGuideStreams.map((stream) => getContentId(stream)), Number.MAX_SAFE_INTEGER)
      : null,
    [activeConnection, getCoverageReport, loginGuideStreams]
  );
  const freshnessBoardRuntime = useMemo(
    () => buildSavedProviderFreshnessBoardRuntime({
      contract: freshnessBoard,
      board: savedProviderBoard,
      report: loginGuideCoverage,
    }),
    [freshnessBoard, loginGuideCoverage, savedProviderBoard]
  );
  const loginGuideContinuity = useMemo(
    () => buildProviderGuideContinuity({
      screenId: 'login',
      report: loginGuideCoverage,
      savedProviderBoard,
      ownerLabel: activeConnection?.name || loginGuideStreams[0]?.name || null,
    }),
    [activeConnection?.name, loginGuideCoverage, loginGuideStreams, savedProviderBoard]
  );
  const runtimeSurfaceContracts = useMemo(
    () => activeConnection
      ? buildRuntimeSurfaceContracts({
          screenId: 'login',
          providerLabel: activeConnection.name,
          providerStatusLabel: connectionStatus[activeConnection.id]?.state || null,
          savedProviderBoard,
          guideCoverage: loginGuideCoverage,
          selectedLabel: loginGuideStreams[0]?.name || activeConnection.name,
          currentNowTitle: loginGuideCards.find((item) => item.guide?.now)?.guide?.now?.title ?? null,
          currentNextTitle: loginGuideCards.find((item) => item.guide?.next)?.guide?.next?.title ?? null,
          nextHopHref: '/home',
          nextHopLabel: 'Open Home',
        })
      : null,
    [activeConnection, connectionStatus, loginGuideCards, loginGuideCoverage, loginGuideStreams, savedProviderBoard]
  );
  const launchReadiness = runtimeSurfaceContracts?.launchReadiness || manifest?.surfaceLaunchReadinessContracts?.find((item) => item.screenId === 'login') || null;
  const launchScorecard = runtimeSurfaceContracts?.launchScorecard || manifest?.surfaceScorecards?.find((item) => item.screenId === 'login') || null;
  const exitCriteria = runtimeSurfaceContracts?.exitCriteria || manifest?.surfaceExitCriteria?.find((item) => item.screenId === 'login') || null;
  const handoffMap = runtimeSurfaceContracts?.handoffMap || manifest?.surfaceHandoffs?.find((item) => item.screenId === 'login') || null;
  const autonomyBoundary = runtimeSurfaceContracts?.autonomyBoundary || manifestAutonomyBoundary;
  const connectionHeadroom = connectionHeadroomRuntime || null;
  const loginLineReleaseWitness = lineReleaseWitnessRuntime || null;
  const loginLineClearancePriority = lineClearancePriorityRuntime || null;
  const loginRecoveryAuthority = useMemo(
    () => buildSavedProviderRecoveryAuthorityResolver({
      screenId: 'login',
      board: savedProviderBoard,
      subjectTitle: watchHistory[0]?.title ?? null,
      switchRuntime: multiConnectionSwitchRuntime,
      recoveryAuthorityRuntime,
      lineReleaseRuntime: lineReleaseWitnessRuntime,
      lineClearanceRuntime: lineClearancePriorityRuntime,
    }),
    [
      lineClearancePriorityRuntime,
      lineReleaseWitnessRuntime,
      multiConnectionSwitchRuntime,
      recoveryAuthorityRuntime,
      savedProviderBoard,
      watchHistory,
    ]
  );
  const loginFocusReturnRuntime = useMemo(() => {
    const savedLaneActive = loginFocusAnchor.toLowerCase().includes('saved');
    return {
      currentAnchor: loginFocusAnchor,
      backTarget: savedLaneActive ? 'Saved providers' : 'Last trusted setup field',
      recoveryTarget: activeConnection ? `${activeConnection.name} reconnect lane` : 'Demo connect lane',
      detail: savedLaneActive
        ? 'Back now returns to the saved-provider lane because that is the last reconnect anchor the user earned.'
        : 'Back now returns to the last trusted setup field so Login preserves the same remote-first connect path.',
    };
  }, [activeConnection, loginFocusAnchor]);
  const loginSelectionCustodyRuntime = useMemo(() => ({
    activeSubject: activeConnection?.name || `${server} · ${username}`,
    carriesForward: activeConnection?.name
      ? `${activeConnection.name} owns the next Home handoff`
      : 'The typed provider owns the next Home handoff if Connect succeeds',
    breaksWhen: 'A saved-provider shortcut or rescue path would hand Home to a different provider owner',
    detail: activeConnection
      ? 'Connect is currently attached to the active saved provider, so quick reconnect should still name the same owner before Home opens.'
      : 'Connect is currently attached to the typed provider identity, so setup should not quietly change owners just because a faster shortcut exists.',
  }), [activeConnection, server, username]);
  const loginFirstPictureRuntime = useMemo(() => {
    const readyToConnect = Boolean(server.trim() && username.trim() && password.trim());
    const usingSavedProvider = Boolean(activeConnection);

    return {
      currentPromise: usingSavedProvider
        ? `${activeConnection.name} can hand off into Home without retyping setup`
        : readyToConnect
          ? 'Connect can move straight from setup into the first playable Home lane'
          : 'Finish setup fields to unlock the shortest route to picture',
      fastestPath: usingSavedProvider
        ? `Reconnect ${activeConnection.name}, open Home, then launch the featured live lane`
        : 'Connect, land on Home, and open the featured or quick-live launch',
      blockedBy: readyToConnect
        ? 'Auth failure, line saturation, or a healthier saved provider taking ownership'
        : 'Missing setup fields keep first picture behind form completion',
      detail: usingSavedProvider
        ? 'The active saved provider already owns the fastest honest setup-to-picture path, so Login should keep reconnect and the first Home launch visibly attached.'
      : 'Login should make the shortest route to first picture legible before Connect fires so typed setup feels like a launch path, not a utility chore.',
    };
  }, [activeConnection, password, server, username]);
  const loginResumeEntry = useMemo(
    () => watchHistory.find((item) => !activeConnection || item.providerId === activeConnection.id) ?? watchHistory[0] ?? null,
    [activeConnection, watchHistory]
  );
  const loginResumeCustodyRuntime = useMemo(() => ({
    activeResume: loginResumeEntry
      ? `${loginResumeEntry.title} is the current return target after reconnect`
      : 'No saved return target yet, so Connect is still establishing the first resume path',
    carriesForward: loginResumeEntry
      ? `${loginResumeEntry.title} stays attached to the next Home handoff while provider ownership stays the same`
      : 'The first successful provider handoff becomes the seed for future resume custody',
    breaksWhen: loginResumeEntry
      ? 'A provider switch, stale watch-history owner, or rescue-only launch would detach reconnect from that saved return target'
      : 'No return target exists yet, so any reconnect claim must stay generic until watch history is earned',
    detail: loginResumeEntry
      ? 'Login should keep reconnect pointed at the same believable return target before setup polish turns a user’s comeback into a generic browse reset.'
      : 'Until the user has earned a real watch-history target, Login should avoid implying that reconnect is already preserving a known return path.',
  }), [loginResumeEntry]);
  const loginProviderDropEntries = useMemo(
    () => Object.values(providerDrops).filter((item) => !item.recoveredAt).sort((left, right) => right.happenedAt - left.happenedAt),
    [providerDrops]
  );
  const loginProviderDropRuntime = useMemo(() => {
    const activeDrop = activeConnection ? providerDrops[activeConnection.id] ?? null : null;
    const latestDrop = activeDrop ?? loginProviderDropEntries[0] ?? null;
    return {
      droppedOwner: latestDrop
        ? `${latestDrop.providerName} most recently lost fresh setup ownership`
        : 'No recent provider drop is attached to Connect yet',
      preserves: latestDrop
        ? latestDrop.lastPlaybackTitle
          ? `${latestDrop.lastPlaybackTitle} and saved Home continuity still survive while reconnect stays explicit`
          : 'Saved Home continuity and provider identity still survive while reconnect stays explicit'
        : 'Connect currently has no dropped-provider continuity to preserve',
      reclaimsWhen: latestDrop
        ? 'Fresh auth, stable line headroom, and a clean Home handoff all agree on the same provider again'
        : 'A future provider drop would need explicit recovery proof before Connect hands ownership back',
      detail: latestDrop
        ? 'Login should keep the dropped provider visible so reconnect can preserve cached continuity without pretending that saved setup proof is already fresh again.'
        : 'Without a recent provider drop, Login can stay focused on the active saved provider or the typed setup path.',
      activeDropCount: loginProviderDropEntries.length,
    };
  }, [activeConnection, loginProviderDropEntries, providerDrops]);
  const loginContinuityWindowRuntime = useMemo(() => buildSurfaceContinuityWindowRuntime({
    contract: continuityWindow,
    screenId: 'login',
    activeDropCount: loginProviderDropEntries.length,
    activeProviderName: activeConnection?.name ?? null,
  }), [activeConnection?.name, continuityWindow, loginProviderDropEntries.length]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.15),_transparent_28%),linear-gradient(180deg,#06070d_0%,#090b13_48%,#04050a_100%)] px-6 py-8 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30 backdrop-blur lg:p-10">
          <p className="text-xs uppercase tracking-[0.35em] text-sky-300">BABcorp StreamDeck</p>
          <h1 className="mt-4 max-w-2xl text-5xl font-semibold tracking-tight text-white">
            Connect your Xtream provider once. Browse like it is a real streaming app.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            StreamDeck is a premium IPTV player prototype focused on fast connection, clean browsing, useful provider status,
            and in-browser playback without the usual reseller-panel feel.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Saved providers</p>
              <p className="mt-3 text-3xl font-semibold text-white">{connections.length}</p>
              <p className="mt-2 text-sm text-slate-400">Multiple connections stay ready for quick re-entry and fallback.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Mock adapter</p>
              <p className="mt-3 text-3xl font-semibold text-white">{health?.providerName ? 'Ready' : 'Offline'}</p>
              <p className="mt-2 text-sm text-slate-400">Local Xtream-style auth, categories, EPG, and streams for demos.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Phase 1</p>
              <p className="mt-3 text-3xl font-semibold text-white">Live</p>
              <p className="mt-2 text-sm text-slate-400">Login, home, live browsing, favorites, and playback are wired now.</p>
            </div>
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-sky-400/20 bg-sky-500/10 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-200">Demo path</p>
            <p className="mt-3 text-lg font-semibold text-white">{manifest?.providerName || 'Mock Xtream provider'}</p>
            <p className="mt-2 text-sm leading-7 text-slate-200">
              Use `http://localhost:3579` with `demo / demo` to walk the full product flow without waiting on a live customer provider.
            </p>
            {mockDifferentiators.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {mockDifferentiators.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {activeConnection ? (
            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-black/20 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Saved provider now / next</p>
              <div className="mt-4">
                <GuideCoverageStrip
                  title="Login guide continuity"
                  report={loginGuideCoverage}
                  emptyMessage="Connect or reuse a provider to load shared guide coverage before entering Home."
                  streamLabels={Object.fromEntries(loginGuideStreams.map((stream) => [getContentId(stream), stream.name]))}
                  continuity={loginGuideContinuity}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {loginGuideCards.map(({ stream, guide, sync }) => (
                  <div key={getContentId(stream)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm font-medium text-white">{stream.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">{stream.channel_group || 'Live'}</p>
                    {guide?.now ? (
                      <>
                        <p className="mt-3 text-sm text-sky-100">Now: {guide.now.title}</p>
                        {guide.next?.title ? <p className="mt-1 text-sm text-slate-300">Next: {guide.next.title}</p> : null}
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">
                        {sync?.status === 'refreshing'
                          ? 'Refreshing guide...'
                          : sync?.error
                            ? `Guide unavailable: ${sync.error}`
                            : 'Guide data is unavailable for this channel right now.'}
                      </p>
                    )}
                  </div>
                ))}
                {loginGuideCards.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                    Connect or reuse a provider to load a shared now / next guide snapshot here before entering Home.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <SurfaceProviderPodium
              runtime={providerPodiumRuntime}
              badge="Saved-provider podium"
              onSelectProvider={(providerId) => setActiveConnection(providerId, {
                sourceSurface: 'login',
                reason: 'manual',
              })}
            />
          </div>

          <div className="mt-6">
            <MockDemoBoard health={health} manifest={manifest} screenId="login" />
          </div>

          <div className="mt-6">
            <ProviderRiskStrip
              health={health}
              screenId="login"
              providerLabel={activeConnection?.name || manifest?.providerName || 'Mock provider'}
              providerDetail={activeConnection ? `${activeConnection.username} · ${activeConnection.server}` : `Scenario: ${scenario}`}
              savedProviderBoard={savedProviderBoard}
              onSelectProvider={(providerId) => setActiveConnection(providerId)}
            />
          </div>

          <div className="mt-6">
            <DifferentiatorSpotlight manifest={manifest} screenId="login" />
          </div>

          <div className="mt-6">
            <PhaseOneShipRail manifest={manifest} screenId="login" />
          </div>

          <div className="mt-6">
            <SurfaceRemotePathInline manifest={manifest} screenId="login" />
          </div>

          <div className="mt-6">
            <SurfaceFocusReturnInline manifest={manifest} screenId="login" runtime={loginFocusReturnRuntime} />
          </div>

          <div className="mt-6">
            <SurfaceSelectionCustodyInline manifest={manifest} screenId="login" runtime={loginSelectionCustodyRuntime} />
          </div>

          <div className="mt-6">
            <SurfaceFirstPictureInline manifest={manifest} screenId="login" runtime={loginFirstPictureRuntime} />
          </div>

          <div className="mt-6">
            <SurfaceResumeCustodyInline manifest={manifest} screenId="login" runtime={loginResumeCustodyRuntime} />
          </div>

          <div className="mt-6">
            <SurfaceProviderDropContinuityInline manifest={manifest} screenId="login" runtime={loginProviderDropRuntime} />
          </div>

          <div className="mt-6">
            <SurfaceContinuityWindowInline manifest={manifest} screenId="login" runtime={loginContinuityWindowRuntime} />
          </div>

          <div className="mt-6">
            <SurfaceMultiConnectionCustodyInline manifest={manifest} screenId="login" runtime={multiConnectionCustodyRuntime} />
          </div>

          <div className="mt-6">
            <MultiConnectionSwitchInline
              runtime={multiConnectionSwitchRuntime}
              title="Fast provider switch"
              badge="Runtime honesty"
              onSelectProvider={(providerId) => selectSavedProvider(providerId, 'quick-switch')}
            />
          </div>

          <div className="mt-6">
            <SurfaceLineReleaseWitnessInline
              manifest={manifest}
              screenId="login"
              runtime={loginLineReleaseWitness}
              onSelectProvider={(providerId) => selectSavedProvider(providerId, 'quick-switch')}
            />
          </div>

          <div className="mt-6">
            <SurfaceLineClearancePriorityInline
              manifest={manifest}
              screenId="login"
              runtime={loginLineClearancePriority}
              onSelectProvider={(providerId) => selectSavedProvider(providerId, 'quick-switch')}
            />
          </div>

          <div className="mt-6">
            <SavedProviderRecoveryAuthorityPanel
              runtime={loginRecoveryAuthority}
              onSelectProvider={(providerId) => selectSavedProvider(providerId, 'quick-switch')}
            />
          </div>

          {connectionHeadroom?.lanes?.[0] ? (
            <div className="mt-6 rounded-[1.75rem] border border-amber-400/20 bg-amber-500/10 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-amber-200">Connection headroom</p>
                  <p className="mt-2 text-base font-medium text-white">{connectionHeadroom.lanes[0].label}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
                  {activeConnection?.lastAuthSummary?.activeConnections ?? health?.accountProfile?.activeConnections ?? '--'}/
                  {activeConnection?.lastAuthSummary?.maxConnections ?? health?.accountProfile?.maxConnections ?? '--'} lines used
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200">{connectionHeadroom.lanes[0].currentWindow}</p>
              <p className="mt-3 text-sm leading-6 text-amber-100">Next move: {connectionHeadroom.lanes[0].recommendedMove}</p>
            </div>
          ) : null}

          {autonomyBoundary?.boundaries?.[0] ? (
            <div className="mt-6 rounded-[1.75rem] border border-sky-400/20 bg-sky-500/10 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-sky-200">Autonomy boundary</p>
                  <p className="mt-2 text-base font-medium text-white">{autonomyBoundary.boundaries[0].label}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
                  User-owned handoff
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200">{autonomyBoundary.boundaries[0].autoMaintains}</p>
              <p className="mt-3 text-sm leading-6 text-sky-100">User owns: {autonomyBoundary.boundaries[0].userOwns}</p>
              <p className="mt-3 text-sm leading-6 text-sky-50">Trigger: {autonomyBoundary.boundaries[0].forcedHandoffTrigger}</p>
            </div>
          ) : null}

          <div className="mt-6">
            <SurfaceLaunchReadinessInline
              contract={launchReadiness}
              title="Connect readiness"
              badge="Launch truth"
            />
          </div>

          <div className="mt-6">
            <SurfaceLaunchScorecardInline
              scorecard={launchScorecard}
              title="Connect launch scorecard"
              badge="Go / Watch / Recover"
            />
          </div>

          <div className="mt-6">
            <SurfaceLaunchOwnershipInline
              runtime={launchOwnershipRuntime}
              title="Connect launch ownership"
              badge="Owner truth"
            />
          </div>

          <div className="mt-6">
            <SurfaceProviderPodiumInline
              runtime={providerPodiumRuntime}
              title="Connect saved-provider podium"
              badge="Saved-provider podium"
              onSelectProvider={(providerId) => setActiveConnection(providerId, {
                sourceSurface: 'login',
                reason: 'manual',
              })}
            />
          </div>

          <div className="mt-6">
            <SurfaceProviderChoiceInline
              runtime={providerChoiceRuntime}
              title="Connect provider choice"
              badge="Launch choice"
            />
          </div>

          <div className="mt-6">
            <SurfaceProviderSwitchInline
              runtime={providerSwitchRuntime}
              title="Connect provider switch"
              badge="Switch truth"
            />
          </div>

          <div className="mt-6">
            <SurfaceProofDebtInline
              runtime={proofDebtRuntime}
              title="Connect proof debt"
              badge="Borrowed confidence"
            />
          </div>

          <div className="mt-6">
            <SurfaceProofProvenanceInline
              runtime={proofProvenanceRuntime}
              title="Connect proof provenance"
              badge="Trust source"
            />
          </div>

          <div className="mt-6">
            <SurfaceExplanationBoundaryInline
              runtime={explanationBoundaryRuntime}
              title="Connect explanation boundary"
              badge="Say this out loud"
            />
          </div>

          <div className="mt-6">
            <SurfaceFreshnessBoardInline
              runtime={freshnessBoardRuntime}
              title="Connect guide freshness"
              badge="Guide truth"
            />
          </div>

          <div className="mt-6">
            <SurfaceConfidenceFloorInline
              contract={confidenceFloor}
              title="Connect confidence floor"
              badge="Minimum proof"
            />
          </div>

          <div className="mt-6">
            <SurfaceInterruptionBudgetInline
              contract={interruptionBudget}
              title="Connect interruption budget"
              badge="Delay truth"
            />
          </div>

          <div className="mt-6">
            <SurfaceRetryHonestyInline
              contract={retryContract}
              title="Connect retry honesty"
              badge="Retry truth"
            />
          </div>

          <div className="mt-6">
            <SurfaceFallbackCostInline
              contract={fallbackCost}
              title="Connect fallback cost"
              badge="Recovery trade-off"
            />
          </div>

          <div className="mt-6">
            <SurfaceCanonicalProviderIdentityInline
              contract={canonicalProviderIdentity}
              title="Connect canonical provider identity"
              badge="Owner truth"
            />
          </div>

          <div className="mt-6">
            <SurfaceProviderStabilityInline
              runtime={providerStabilityRuntime}
              title="Connect provider stability"
              badge="Stability truth"
            />
          </div>

          <div className="mt-6">
            <SurfaceReturnCooldownInline
              runtime={returnCooldownRuntime}
              title="Connect return cooldown"
              badge="Return runway"
            />
          </div>

          <div className="mt-6">
            <SurfaceRecoveryWitnessInline
              contract={recoveryWitness}
              title="Connect recovery witness"
              badge="Recovery proof"
            />
          </div>

          <div className="mt-6">
            <SurfaceFallbackRankingInline
              runtime={fallbackRankingRuntime}
              title="Connect fallback ranking"
              badge="Rescue order"
            />
          </div>

          <div className="mt-6">
            <SurfaceFallbackEquivalenceInline
              runtime={fallbackEquivalenceRuntime}
              title="Connect fallback equivalence"
              badge="Same vs restart"
            />
          </div>

          <div className="mt-6">
            <SurfaceFallbackExpiryInline
              runtime={fallbackExpiryRuntime}
              title="Connect fallback expiry"
              badge="Sameness window"
            />
          </div>

          <div className="mt-6">
            <SurfaceHoldReceiptInline
              runtime={holdReceiptRuntime}
              title="Connect hold receipt"
              badge="Hold truth"
            />
          </div>

          <div className="mt-6">
            <SurfaceRescueReceiptInline
              contract={rescueReceipt}
              title="Connect rescue receipt"
              badge="What changed"
            />
          </div>

          <div className="mt-6">
            <SurfaceResetBoundaryInline
              contract={resetBoundary}
              title="Connect reset boundary"
              badge="Refresh vs reset"
            />
          </div>

          <div className="mt-6">
            <SurfaceIdentityAnchorInline
              runtime={identityAnchorRuntime}
              title="Connect identity anchor"
              badge="Owner truth"
            />
          </div>

          <div className="mt-6">
            <SurfaceHandoffClarityInline
              criteria={exitCriteria}
              handoff={handoffMap}
              title="Connect handoff clarity"
              badge="Next-screen truth"
            />
          </div>

          <div className="mt-6">
            <SurfaceClaimCeilingInline
              contract={claimCeiling}
              title="Connect claim ceiling"
              badge="Copy guardrail"
            />
          </div>

          <div className="mt-6">
            <SurfaceConnectionHeadroomInline
              runtime={connectionHeadroom}
              title="Connect connection headroom"
              badge="Capacity truth"
            />
          </div>

          <div className="mt-6">
            <SurfaceConnectionHeadroom
              contract={connectionHeadroom}
              authSummary={activeConnection?.lastAuthSummary ?? null}
              health={health}
              badge="Connection headroom"
            />
          </div>

          <div className="mt-6">
            <SurfaceCanonicalProviderIdentity contract={canonicalProviderIdentity} badge="Canonical provider" />
          </div>

          <div className="mt-6">
            <SurfaceFallbackRanking runtime={fallbackRankingRuntime} badge="Fallback ranking" />
          </div>

          <div className="mt-6">
            <SurfaceFallbackEquivalence runtime={fallbackEquivalenceRuntime} badge="Fallback equivalence" />
          </div>

          <div className="mt-6">
            <SurfaceLaunchReadiness contract={launchReadiness} badge="Connect honesty" />
          </div>

          <div className="mt-6">
            <SurfaceLaunchScorecard scorecard={launchScorecard} badge="Launch scorecard" />
          </div>

          <div className="mt-6">
            <SurfaceLaunchOwnership runtime={launchOwnershipRuntime} badge="Launch owner" />
          </div>

          <div className="mt-6">
            <SurfaceExitCriteria criteria={exitCriteria} badge="Home exit criteria" />
          </div>

          <div className="mt-6">
            <SurfaceContinuityWindow contract={continuityWindow} badge="Handoff window" />
          </div>

          <div className="mt-6">
            <SurfaceHandoffMap handoff={handoffMap} badge="Home handoff map" />
          </div>

          <div className="mt-6">
            <SurfaceDowngradeLadder contract={downgradeLadder} badge="Downgrade truth" />
          </div>

          <div className="mt-6">
            <SurfaceProviderChoice runtime={providerChoiceRuntime} badge="Choice honesty" />
          </div>

          <div className="mt-6">
            <SurfaceProviderSwitchContract runtime={providerSwitchRuntime} badge="Switch honesty" />
          </div>

          <div className="mt-6">
            <MultiConnectionSwitchPanel
              runtime={multiConnectionSwitchRuntime}
              badge="Multi-connection switch runtime"
              onSelectProvider={(providerId) => selectSavedProvider(providerId, 'quick-switch')}
            />
          </div>

          <div className="mt-6">
            <SurfaceProviderReturnContract contract={providerReturnContract} badge="Return truth" />
          </div>

          <div className="mt-6">
            <SurfaceProviderStabilityContract runtime={providerStabilityRuntime} badge="Stability truth" />
          </div>

          <div className="mt-6">
            <SurfaceRecoveryPlan contract={recoveryPlan} badge="Recovery route" />
          </div>

          <div className="mt-6">
            <SurfaceFreshnessBoard runtime={freshnessBoardRuntime} badge="Freshness truth" />
          </div>

          <div className="mt-6">
            <SurfaceProofDebt runtime={proofDebtRuntime} badge="Proof debt" />
          </div>

          <div className="mt-6">
            <SurfaceProofProvenance runtime={proofProvenanceRuntime} badge="Proof provenance" />
          </div>

          <div className="mt-6">
            <SurfaceIntentLock contract={intentLock} badge="Intent lock" />
          </div>

          <div className="mt-6">
            <SurfaceActionGate contract={actionGate} badge="Action gate" />
          </div>

          <div className="mt-6">
            <SurfaceExplanationBoundary runtime={explanationBoundaryRuntime} badge="Explanation boundary" />
          </div>

          <div className="mt-6">
            <SurfaceAutonomyBoundary contract={autonomyBoundary} badge="Autonomy boundary" />
          </div>

          <div className="mt-6">
            <SurfaceInterruptionBudget contract={interruptionBudget} badge="Interruption budget" />
          </div>

          <div className="mt-6">
            <SurfaceRetryContract contract={retryContract} badge="Retry honesty" />
          </div>

          <div className="mt-6">
            <SurfaceRecoveryWitness contract={recoveryWitness} badge="Recovery witness" />
          </div>

          <div className="mt-6">
            <SurfaceRescueReceipt contract={rescueReceipt} badge="Rescue receipt" />
          </div>

          <div className="mt-6">
            <SurfaceFallbackCost contract={fallbackCost} badge="Fallback cost" />
          </div>

          <div className="mt-6">
            <SurfaceIdentityAnchor runtime={identityAnchorRuntime} badge="Identity anchor" />
          </div>

          <div className="mt-6">
            <SurfaceClaimCeiling contract={claimCeiling} badge="Claim ceiling" />
          </div>

          <div className="mt-6">
            <SurfaceConfidenceFloor contract={confidenceFloor} badge="Confidence floor" />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#0b1020]/80 p-8 shadow-2xl shadow-black/40 backdrop-blur lg:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Connect</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Login with Xtream Codes</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Server URL, username, and password are stored locally in the browser for quick reconnects.
              </p>
            </div>
            {activeConnection ? (
              <button
                onFocus={() => setLoginFocusAnchor('Open home')}
                onClick={() => router.push('/home')}
                className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-200 transition hover:bg-white/5"
              >
                Open home
              </button>
            ) : null}
          </div>

          <form onSubmit={handleConnect} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-500">Server URL</span>
              <input
                value={server}
                onChange={(event) => setServer(event.target.value)}
                onFocus={() => setLoginFocusAnchor('Server URL')}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50"
                placeholder="http://provider.example:8080"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-500">Username</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  onFocus={() => setLoginFocusAnchor('Username')}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50"
                  placeholder="Username"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-500">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={() => setLoginFocusAnchor('Password')}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50"
                  placeholder="Password"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                onFocus={() => setLoginFocusAnchor('Connect provider')}
                className="rounded-full bg-sky-400 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Connecting...' : 'Connect provider'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setServer(MOCK_SERVER);
                  setUsername('demo');
                  setPassword('demo');
                }}
                onFocus={() => setLoginFocusAnchor('Load demo credentials')}
                className="rounded-full border border-white/10 px-6 py-3 text-sm text-slate-200 transition hover:bg-white/5"
              >
                Load demo credentials
              </button>
            </div>
          </form>

          {proofDebt?.debts?.[0] ? (
            <div className="mt-6 rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-amber-200">Borrowed confidence</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{proofDebt.debts[0].label}</h3>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
                  Proof debt
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-200">{proofDebt.debts[0].borrowedConfidence}</p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-amber-100">Repayment trigger</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{proofDebt.debts[0].repaymentTrigger}</p>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Saved connections</p>
            {connections.length === 0 ? (
              <p className="mt-3 text-sm leading-7 text-slate-400">
                No providers saved yet. Start with the demo adapter, then connect a real Xtream Codes server when credentials are ready.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {connections.map((connection) => {
                  const status = connectionStatus[connection.id];
                  const isActive = activeConnection?.id === connection.id;
                  const healthEntry = savedProviderBoard.byProviderId[connection.id];
                  return (
                    <div key={connection.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-medium text-white">{connection.name}</p>
                          <p className="mt-1 text-sm text-slate-400">{connection.username} · {connection.server}</p>
                          <p className={`mt-2 text-xs uppercase tracking-[0.22em] ${status ? statusTone[status.state] : 'text-slate-500'}`}>
                            {status?.state || 'idle'}
                          </p>
                          {healthEntry ? (
                            <p className="mt-2 text-xs text-slate-400">
                              {healthEntry.trustLabel}
                              {healthEntry.warning ? ` · ${healthEntry.warning}` : ' · Saved-provider trust looks healthy enough for quick reuse.'}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              selectSavedProvider(connection.id, 'manual');
                            }}
                            onFocus={() => setLoginFocusAnchor(`Saved provider ${connection.name}`)}
                            className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${isActive ? 'bg-white text-slate-950' : 'border border-white/10 text-slate-200 hover:bg-white/5'}`}
                          >
                            {isActive ? 'Active' : 'Use'}
                          </button>
                          <button
                            onClick={() => validateConnection(connection.id)}
                            onFocus={() => setLoginFocusAnchor(`Validate ${connection.name}`)}
                            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-200 transition hover:bg-white/5"
                          >
                            Validate
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
