'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderHealth, fetchMockProviderManifest, getSelectedMockProviderScenario, setSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { buildCanonicalProviderId, getProviderIdentityCandidates } from '@/lib/provider-identity';
import { getHealthiestSavedProvider, getRecoveryActionLabel, getRecoverySupportLabel } from '@/lib/provider-recovery';
import { useAuthStore } from '@/stores/auth-store';
import { MockOperationsConsole } from '@/components/mock-operations-console';
import { ProviderFactGrid } from '@/components/provider-fact-grid';
import { ProviderTrustStack } from '@/components/provider-trust-stack';

const MOCK_SERVER = 'http://localhost:3579';

const statusTone = {
  idle: 'text-slate-400',
  checking: 'text-amber-300',
  healthy: 'text-emerald-300',
  degraded: 'text-amber-300',
  error: 'text-rose-300',
};

const formatExpiry = (value) => {
  if (!value) return 'Unknown expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown expiry';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const getAccountPressure = (summary) => {
  if (!summary) return null;
  if (summary.status && summary.status !== 'Active') return `Provider account is ${String(summary.status).toLowerCase()}. Guide the user toward renewal, updated credentials, or another saved provider before they hit playback.`;
  if (!summary.maxConnections || summary.activeConnections === null || summary.activeConnections === undefined) return null;
  return summary.activeConnections >= summary.maxConnections
    ? `All ${summary.maxConnections} provider lines are currently in use. Playback may fail even though auth still succeeds.`
    : null;
};

export default function LoginPage() {
  const router = useRouter();
  const hydrate = useAuthStore((state) => state.hydrate);
  const connect = useAuthStore((state) => state.connect);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const validateConnection = useAuthStore((state) => state.validateConnection);
  const revalidateMockConnections = useAuthStore((state) => state.revalidateMockConnections);
  const connections = useAuthStore((state) => state.connections);
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const [server, setServer] = useState(MOCK_SERVER);
  const [username, setUsername] = useState('test');
  const [password, setPassword] = useState('test');
  const [mockHealth, setMockHealth] = useState(null);
  const [mockManifest, setMockManifest] = useState(null);
  const [scenario, setScenario] = useState(getSelectedMockProviderScenario());
  const [scenarioRefreshing, setScenarioRefreshing] = useState(false);

  const activeScenario = mockHealth?.healthScenarios?.[mockHealth.activeScenario];
  const mockAccountPressure = getAccountPressure(mockHealth?.accountProfile);
  const evidenceLedger = useMemo(
    () => mockManifest?.surfaceEvidenceLedgers?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const freshnessBoard = useMemo(
    () => mockManifest?.surfaceFreshnessBoards?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const contradictionBoard = useMemo(
    () => mockManifest?.surfaceContradictionBoards?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const resetBoundary = useMemo(
    () => mockManifest?.surfaceResetBoundaries?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const actionGate = useMemo(
    () => mockManifest?.surfaceActionGates?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const intentLock = useMemo(
    () => mockManifest?.surfaceIntentLocks?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const explanationBoundary = useMemo(
    () => mockManifest?.surfaceExplanationBoundaries?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const autonomyBoundary = useMemo(
    () => mockManifest?.surfaceAutonomyBoundaries?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const identityAnchor = useMemo(
    () => mockManifest?.surfaceIdentityAnchors?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const confidenceFloor = useMemo(
    () => mockManifest?.surfaceConfidenceFloors?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const recoveryWitness = useMemo(
    () => mockManifest?.surfaceRecoveryWitnesses?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const fallbackCost = useMemo(
    () => mockManifest?.surfaceFallbackCosts?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const rescueReceipt = useMemo(
    () => mockManifest?.surfaceRescueReceipts?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const proofDebt = useMemo(
    () => mockManifest?.surfaceProofDebts?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const claimCeiling = useMemo(
    () => mockManifest?.surfaceClaimCeilings?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const interruptionBudget = useMemo(
    () => mockManifest?.surfaceInterruptionBudgets?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const retryContract = useMemo(
    () => mockManifest?.surfaceRetryContracts?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const providerSwitchContract = useMemo(
    () => mockManifest?.surfaceProviderSwitchContracts?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const providerChoiceContract = useMemo(
    () => mockManifest?.surfaceProviderChoiceContracts?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const providerReturnContract = useMemo(
    () => mockManifest?.surfaceProviderReturnContracts?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const providerStabilityContract = useMemo(
    () => mockManifest?.surfaceProviderStabilityContracts?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const canonicalProviderIdentityContract = useMemo(
    () => mockManifest?.surfaceCanonicalProviderIdentityContracts?.find((item) => item.screenId === 'login') ?? null,
    [mockManifest]
  );
  const healthiestConnection = useMemo(() => getHealthiestSavedProvider({
    connections,
    connectionStatus,
    activeConnectionId: activeConnection?.id,
  }), [activeConnection?.id, connectionStatus, connections]);
  const loginCanonicalIdentity = useMemo(() => buildCanonicalProviderId({ server, username }), [server, username]);
  const savedProviderAliases = useMemo(() => {
    const aliasSet = new Set(connections.flatMap((connection) => getProviderIdentityCandidates(connection).aliases));
    return aliasSet.size;
  }, [connections]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setScenario(getSelectedMockProviderScenario());
    return subscribeToMockProviderScenario((nextScenario) => {
      setScenario(nextScenario);
      setScenarioRefreshing(true);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchMockProviderHealth(MOCK_SERVER, scenario)
      .then((health) => {
        if (!cancelled) {
          setMockHealth(health);
          setScenarioRefreshing(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMockHealth(null);
          setScenarioRefreshing(false);
        }
      });

    fetchMockProviderManifest(MOCK_SERVER, scenario)
      .then((manifest) => {
        if (!cancelled) setMockManifest(manifest);
      })
      .catch(() => {
        if (!cancelled) setMockManifest(null);
      });

    return () => {
      cancelled = true;
    };
  }, [scenario]);

  useEffect(() => {
    if (!scenarioRefreshing || connections.length === 0) return;
    revalidateMockConnections().catch(() => {});
  }, [connections.length, revalidateMockConnections, scenarioRefreshing]);

  const helperText = useMemo(() => {
    if (connections.length === 0) return 'Use the local mock provider to test the full flow fast.';
    return `${connections.length} saved connection${connections.length === 1 ? '' : 's'} ready for hot-swap.`;
  }, [connections.length]);

  const applyScenario = (nextScenario) => {
    if (nextScenario === scenario) return;
    setScenarioRefreshing(true);
    setSelectedMockProviderScenario(nextScenario);
    setScenario(nextScenario);
  };

  const handleConnect = async (event) => {
    event.preventDefault();
    const ok = await connect({ server, username, password });
    if (ok) router.push('/home');
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.25),_transparent_35%),linear-gradient(180deg,#09090f_0%,#05050a_100%)] px-6 py-10 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between rounded-[2rem] border border-white/10 bg-black/30 p-8 lg:p-10">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-violet-300">BABcorp presents</p>
            <h1 className="mt-5 max-w-xl text-5xl font-semibold tracking-tight text-white">StreamDeck, the IPTV player that finally feels premium.</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">
              Connect Xtream Codes credentials, jump between providers, browse live TV with inline NOW and NEXT guide data,
              and launch playback without falling into a janky admin panel.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {(mockManifest?.differentiators || [
              { title: 'Multi-provider ready', detail: 'Saved connections live locally and can be switched instantly.' },
              { title: 'Inline smart guide', detail: 'Channel cards show NOW and NEXT without a separate guide screen.' },
              { title: 'Playback health HUD', detail: 'Bitrate, buffer, and video telemetry surface in the live browser.' },
            ]).map(({ title, detail }) => (
              <div key={title} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
              </div>
            ))}
          </div>

          {evidenceLedger ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{evidenceLedger.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{evidenceLedger.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Provenance on-screen
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {evidenceLedger.entries.map((entry) => (
                  <div key={entry.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{entry.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{entry.statement}</p>
                    <p className="mt-2 text-sm text-slate-400">{entry.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {freshnessBoard ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{freshnessBoard.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{freshnessBoard.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Staleness budget visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {freshnessBoard.budgets.map((budget) => (
                  <div key={budget.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{budget.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{budget.liveWindow}</p>
                    <p className="mt-2 text-sm text-slate-400">{budget.safeFallbackWindow}</p>
                    <p className="mt-3 text-sm text-slate-300">{budget.recoveryTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {contradictionBoard ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{contradictionBoard.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{contradictionBoard.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Mixed signals resolved
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {contradictionBoard.contradictions.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm text-slate-300">{item.conflictingSignals}</p>
                    <p className="mt-3 text-sm font-semibold text-white">{item.winningTruth}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.suppressRule}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {resetBoundary ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{resetBoundary.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{resetBoundary.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Reset boundary visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {resetBoundary.boundaries.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.refreshesInPlace}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.preserves}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.hardResetTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {actionGate ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{actionGate.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{actionGate.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  CTA gate visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {actionGate.gates.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.primaryAction}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.downgradedAction}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.unlockCondition}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {intentLock ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{intentLock.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{intentLock.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Setup intent protected
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {intentLock.locks.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.protectedIntent}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.allowedDrift}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.breakCondition}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {explanationBoundary ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{explanationBoundary.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{explanationBoundary.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Disclosure guardrails visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {explanationBoundary.boundaries.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.mustSayExplicitly}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.canStayImplied}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.forcedDisclosureTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {autonomyBoundary ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{autonomyBoundary.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{autonomyBoundary.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Automation boundary visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {autonomyBoundary.boundaries.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.autoMaintains}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.userOwns}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.forcedHandoffTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {identityAnchor ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{identityAnchor.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{identityAnchor.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Identity preserved
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {identityAnchor.anchors.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.mustStayVisible}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.preservesMeaning}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.breakTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {canonicalProviderIdentityContract ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{canonicalProviderIdentityContract.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{canonicalProviderIdentityContract.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  {connections.length} saved owner{connections.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-violet-200">Current canonical provider key</p>
                <p className="mt-2 break-all text-sm font-semibold text-white">{loginCanonicalIdentity}</p>
                <p className="mt-2 text-sm text-violet-100/80">Saved alias coverage in browser storage: {savedProviderAliases} recognized provider IDs.</p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {canonicalProviderIdentityContract.identities.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.canonicalOwner}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.aliasCoverage}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.mismatchTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {confidenceFloor ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{confidenceFloor.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{confidenceFloor.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Confidence floor visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {confidenceFloor.floors.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.minimumProof}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.downgradeMode}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.hardStopTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {recoveryWitness ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{recoveryWitness.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{recoveryWitness.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Recovery stays provable
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {recoveryWitness.witnesses.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.requiredEvidence}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.carriesForward}</p>
                    <p className="mt-3 text-sm text-slate-400">{item.trustBreakTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {fallbackCost ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{fallbackCost.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{fallbackCost.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Fallback cost made explicit
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {fallbackCost.costs.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.visibleLoss}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.preservedValue}</p>
                    <p className="mt-3 text-sm text-slate-400">{item.hardStopThreshold}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {rescueReceipt ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{rescueReceipt.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{rescueReceipt.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Rescue receipt
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {rescueReceipt.receipts.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.preservedContext}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.changedUnderTheHood}</p>
                    <p className="mt-3 text-sm text-slate-400">{item.requiresReconfirmation}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {proofDebt ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{proofDebt.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{proofDebt.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Proof debt visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {proofDebt.debts.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.carriedUncertainty}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.borrowedConfidence}</p>
                    <p className="mt-3 text-sm text-slate-400">{item.repaymentTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {claimCeiling ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{claimCeiling.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{claimCeiling.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Claim ceiling visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {claimCeiling.ceilings.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.allowedPromise}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.forbiddenOverclaim}</p>
                    <p className="mt-3 text-sm text-slate-400">{item.upgradeProof}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {interruptionBudget ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{interruptionBudget.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{interruptionBudget.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Delay honesty visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {interruptionBudget.budgets.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.acceptableDelay}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.continuityLayer}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.escalationTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {retryContract ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{retryContract.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{retryContract.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Retry honesty visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {retryContract.retries.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.honestRetryWindow}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.preservesContext}</p>
                    <p className="mt-3 text-sm text-slate-400">{item.giveUpTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {providerSwitchContract ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{providerSwitchContract.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{providerSwitchContract.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Provider-switch honesty visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {providerSwitchContract.switches.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.switchTrigger}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.preservesContext}</p>
                    <p className="mt-3 text-sm text-slate-400">{item.stayProof}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {providerChoiceContract ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{providerChoiceContract.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{providerChoiceContract.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Provider-choice honesty visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {providerChoiceContract.choices.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.autoPickTrigger}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.equivalenceProof}</p>
                    <p className="mt-3 text-sm text-slate-400">{item.userChoiceTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {providerReturnContract ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{providerReturnContract.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{providerReturnContract.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Provider-return honesty visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {providerReturnContract.returns.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.returnTrigger}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.preservesContext}</p>
                    <p className="mt-3 text-sm text-slate-400">{item.stayOnRescueTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {providerStabilityContract ? (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{providerStabilityContract.title}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{providerStabilityContract.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Provider-stability honesty visible
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {providerStabilityContract.stabilities.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.stabilityThreshold}</p>
                    <p className="mt-3 text-sm text-slate-300">{item.toleratedVolatility}</p>
                    <p className="mt-3 text-sm text-slate-400">{item.keepRescuePrimaryTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {mockHealth ? (
            <div className="mt-8 rounded-[1.6rem] border border-violet-400/15 bg-violet-500/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Mock provider readiness</p>
                  <p className="mt-2 text-lg font-semibold text-white">{mockHealth.liveCategories} live groups, {mockHealth.liveStreams} channels, {mockHealth.vodStreams} movies, {mockHealth.series} series.</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                  localhost:3579 ready
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {mockHealth.topCategories.slice(0, 5).map((category) => (
                  <span key={category.id} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
                    {category.name} · {category.channels}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Login flow</p>
                  <p className="mt-2 text-sm text-slate-300">{mockHealth.demoFlows?.login}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Home flow</p>
                  <p className="mt-2 text-sm text-slate-300">{mockHealth.demoFlows?.home}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Live flow</p>
                  <p className="mt-2 text-sm text-slate-300">{mockHealth.demoFlows?.live}</p>
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
                      {healthiestConnection ? (
                        <div className="mt-3 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveConnection(healthiestConnection.id);
                              router.push('/home');
                            }}
                            className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white hover:bg-white/20"
                          >
                            Switch to healthiest saved provider
                          </button>
                          <span className="self-center text-xs text-amber-50/80">{healthiestConnection.name}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
              <ProviderTrustStack
                headline={mockHealth.operatorHeadline}
                signals={mockHealth.trustSignals}
                className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4"
              />
              {healthiestConnection && mockHealth?.surfaceRecoveryPlans?.login ? (
                <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">{mockHealth.surfaceRecoveryPlans.login.title}</p>
                  <p className="mt-2 text-sm text-slate-200">{mockHealth.surfaceRecoveryPlans.login.detail}</p>
                  <p className="mt-2 text-xs text-sky-100/80">{getRecoverySupportLabel('login')}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConnection(healthiestConnection.id);
                        router.push('/home');
                      }}
                      className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white hover:bg-white/20"
                    >
                      {getRecoveryActionLabel('login', healthiestConnection.name)}
                    </button>
                    <span className="text-xs text-sky-50/80">{healthiestConnection.name} · {mockHealth.surfaceRecoveryPlans.login.cta}</span>
                  </div>
                </div>
              ) : null}
              <MockOperationsConsole
                health={mockHealth}
                manifest={mockManifest}
                screenId="login"
                title="Scenario rehearsal"
                intro="Use one adapter-driven operations shell to rehearse healthy launch, trust degradation, and recovery without leaving Login."
                scenario={scenario}
                scenarioRefreshing={scenarioRefreshing}
                onApplyScenario={applyScenario}
                className="mt-4"
              />
            </div>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-violet-950/20 lg:p-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-violet-300">Connect provider</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Login + saved connections</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.25em] text-slate-400">
              {helperText}
            </span>
          </div>

          <form id="connect-form" onSubmit={handleConnect} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Server URL</span>
              <input value={server} onChange={(event) => setServer(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-violet-400" placeholder="http://provider.example.com" />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Username</span>
                <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-violet-400" placeholder="username" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Password</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none placeholder:text-slate-500 focus:border-violet-400" placeholder="password" />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button disabled={loading} className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-70">
                {loading ? 'Connecting...' : 'Connect and open home'}
              </button>
              <button type="button" onClick={() => { setServer(MOCK_SERVER); setUsername('test'); setPassword('test'); }} className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-200 hover:bg-white/5">
                Use mock credentials
              </button>
              <Link href="/live" className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-200 hover:bg-white/5">
                Go straight to live browser
              </Link>
            </div>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </form>

          <div className="mt-8 rounded-[1.4rem] border border-violet-400/15 bg-violet-500/5 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Provider validation is now built into the shell.</p>
            <p className="mt-2 leading-6 text-slate-400">
              New connections are health-checked on connect, and mock rehearsal mode changes now revalidate saved mock providers automatically before you switch into playback.
            </p>
            {mockHealth?.sampleCredentials ? (
              <p className="mt-3 text-xs text-slate-500">
                Demo credentials: {mockHealth.sampleCredentials.server} · {mockHealth.sampleCredentials.username}/{mockHealth.sampleCredentials.password}
              </p>
            ) : null}
            {activeScenario ? (
              <p className="mt-3 text-xs text-violet-200">
                Active rehearsal mode: {activeScenario.label}. {activeScenario.appImpact}
              </p>
            ) : null}
            {mockManifest?.capabilityMatrix?.length ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {mockManifest.capabilityMatrix.map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Saved connections</h3>
              {activeConnection ? <span className="text-sm text-slate-400">Active: {activeConnection.name}</span> : null}
            </div>
            <div className="mt-4 space-y-3">
              {connections.length > 0 ? connections.map((connection) => {
                const isActive = activeConnection?.id === connection.id;
                return (
                  <div
                    key={connection.id}
                    className={`flex items-center justify-between gap-4 rounded-[1.4rem] border px-4 py-4 transition ${isActive ? 'border-violet-400/60 bg-violet-500/10' : 'border-white/10 bg-black/20 hover:bg-white/5'}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConnection(connection.id);
                        router.push('/home');
                      }}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{connection.name}</p>
                        {connectionStatus[connection.id] ? (
                          <span className={`text-[11px] uppercase tracking-[0.22em] ${statusTone[connectionStatus[connection.id].state]}`}>
                            {connectionStatus[connection.id].state}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{connection.username}</p>
                      {connection.lastAuthSummary ? (
                        <>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{connection.lastAuthSummary.status}</span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">exp {formatExpiry(connection.lastAuthSummary.expiresAt)}</span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{connection.lastAuthSummary.activeConnections}/{connection.lastAuthSummary.maxConnections} lines</span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{connection.lastAuthSummary.timezone}</span>
                          </div>
                          {getAccountPressure(connection.lastAuthSummary) ? (
                            <p className="mt-3 text-xs text-amber-300">{getAccountPressure(connection.lastAuthSummary)}</p>
                          ) : null}
                        </>
                      ) : null}
                      {connectionStatus[connection.id]?.message ? (
                        <p className="mt-2 text-xs text-slate-500">{connectionStatus[connection.id].message}</p>
                      ) : null}
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => validateConnection(connection.id)}
                        className="rounded-xl border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-300 hover:bg-white/5"
                      >
                        Retry
                      </button>
                      {healthiestConnection?.id === connection.id ? (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-200">
                          healthiest backup
                        </span>
                      ) : null}
                      <span className="text-xs uppercase tracking-[0.25em] text-slate-500">{isActive ? 'active' : 'switch'}</span>
                    </div>
                  </div>
                );
              }) : <p className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-400">No saved providers yet. Connect once and StreamDeck keeps it locally.</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
