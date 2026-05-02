'use client';

import { useEffect, useState } from 'react';
import { fetchMockProviderHealth, getSelectedMockProviderScenario, setSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { MockProviderHealth, MockProviderScenario, ProviderAuthSummary } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { usePlayerStore } from '@/stores/player-store';

const statusTone: Record<string, string> = {
  idle: 'border-slate-400/30 bg-slate-400/10 text-slate-200',
  checking: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  healthy: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  degraded: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  error: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
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

const formatExpiry = (value: string | null | undefined) => {
  if (!value) return 'Unknown expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown expiry';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const getLinePressure = (summary?: { activeConnections: number | null; maxConnections: number | null } | null) => {
  if (!summary?.maxConnections || summary.activeConnections === null || summary.activeConnections === undefined) return null;
  return summary.activeConnections >= summary.maxConnections
    ? `All ${summary.maxConnections} provider lines are currently in use. Keep this visible before users blame playback.`
    : null;
};

const getProviderRecoveryWarning = (summary?: { status?: string | null; activeConnections: number | null; maxConnections: number | null } | null) => {
  if (!summary) return null;
  if (summary.status && summary.status !== 'Active') return `Provider account is ${String(summary.status).toLowerCase()}. Settings should steer the user toward renewal, fresh credentials, or a healthier saved provider.`;
  return getLinePressure(summary);
};

const getProviderTrustScore = (
  summary?: { status?: string | null; activeConnections: number | null; maxConnections: number | null } | null,
  state?: { state?: string | null } | null
) => {
  let score = 0;

  if (state?.state === 'healthy') score += 120;
  else if (state?.state === 'degraded') score += 35;
  else if (state?.state === 'checking') score += 10;
  else if (state?.state === 'error') score -= 35;

  if (summary?.status === 'Active') score += 45;
  else if (summary?.status) score -= 55;

  if (typeof summary?.maxConnections === 'number' && typeof summary?.activeConnections === 'number') {
    score += Math.max(-40, 30 - Math.max(0, summary.activeConnections - summary.maxConnections + 1) * 22);
  }

  return score;
};

const renderProviderFacts = (summary?: ProviderAuthSummary) => {
  if (!summary) {
    return <p className="mt-3 text-xs text-slate-500">No auth summary yet. Run a validation pass to hydrate provider trust details.</p>;
  }

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-4">
      {[
        ['Status', summary.status],
        ['Expiry', formatExpiry(summary.expiresAt)],
        ['Capacity', `${summary.activeConnections ?? 0}/${summary.maxConnections ?? '?'} in use`],
        ['Timezone', summary.timezone || 'Unknown timezone'],
      ].map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-2 text-sm text-slate-200">{value}</p>
        </div>
      ))}
    </div>
  );
};

export function SettingsPanel() {
  const { connections, activeConnection, setActiveConnection, renameConnection, removeConnection, validateConnection, validateAllConnections, connectionStatus } = useAuthStore();
  const getFavoritesForProvider = useFavoritesStore((state) => state.getFavoritesForProvider);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [mockHealth, setMockHealth] = useState<MockProviderHealth | null>(null);
  const [scenario, setScenario] = useState<MockProviderScenario>(getSelectedMockProviderScenario());
  const [scenarioRefreshing, setScenarioRefreshing] = useState(false);

  useEffect(() => {
    setScenario(getSelectedMockProviderScenario());
    return subscribeToMockProviderScenario((nextScenario) => {
      setScenario(nextScenario);
      setScenarioRefreshing(true);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchMockProviderHealth(activeConnection, scenario)
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

    return () => {
      cancelled = true;
    };
  }, [activeConnection, scenario]);

  const activeScenario = mockHealth?.healthScenarios?.[mockHealth.activeScenario];
  const mockRecoveryWarning = getProviderRecoveryWarning(mockHealth?.accountProfile);
  const healthiestConnection = activeConnection
    ? [...connections]
        .filter((connection) => connection.id !== activeConnection.id)
        .sort((a, b) => getProviderTrustScore(b.lastAuthSummary, connectionStatus[b.id]) - getProviderTrustScore(a.lastAuthSummary, connectionStatus[a.id]))[0] ?? null
    : null;

  const applyScenario = (nextScenario: MockProviderScenario) => {
    if (nextScenario === scenario) return;
    setScenarioRefreshing(true);
    setSelectedMockProviderScenario(nextScenario);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Settings</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Connections and prototype architecture</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          This ship keeps providers in local storage, exposes a stable provider-aware connection model, and now lets users rename,
          switch, and remove saved providers without re-entering credentials. That keeps the prototype aligned with the multi-connection
          differentiator instead of treating provider switching like an afterthought.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/30 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Saved providers</h3>
              <p className="mt-1 text-sm text-slate-400">Rename, switch, validate, and clean up IPTV connections in place.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => validateAllConnections()}
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-300 hover:bg-white/5"
              >
                Retry all
              </button>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-500">
                {connections.length} total
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {connections.length > 0 ? connections.map((connection) => {
              const draftName = draftNames[connection.id] ?? connection.name;
              const isActive = activeConnection?.id === connection.id;
              const recentItems = watchHistory.filter((item) => item.providerId === connection.id).length;
              const status = connectionStatus[connection.id];
              return (
                <div
                  key={connection.id}
                  className={`rounded-[1.6rem] border p-4 ${isActive ? 'border-violet-400 bg-violet-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-300'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-white">{connection.name}</p>
                        {status ? (
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] ${statusTone[status.state]}`}>
                            {status.state}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{connection.username} · {connection.server}</p>
                      {status?.message ? <p className="mt-2 text-xs text-slate-400">{status.message}</p> : null}
                    </div>
                    <button
                      onClick={() => setActiveConnection(connection.id)}
                      className={`rounded-xl px-3 py-2 text-xs uppercase tracking-[0.2em] ${isActive ? 'bg-violet-400/20 text-violet-100' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
                    >
                      {isActive ? 'Active' : 'Make active'}
                    </button>
                  </div>

                  {renderProviderFacts(connection.lastAuthSummary)}
                  {getProviderRecoveryWarning(connection.lastAuthSummary) ? (
                    <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
                      {getProviderRecoveryWarning(connection.lastAuthSummary)}
                      {isActive && healthiestConnection ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => setActiveConnection(healthiestConnection.id)}
                            className="rounded-xl bg-white/10 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white hover:bg-white/20"
                          >
                            Switch to healthiest saved provider
                          </button>
                          <span className="self-center text-[11px] text-amber-50/80">{healthiestConnection.name}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
                    <input
                      value={draftName}
                      onChange={(event) => setDraftNames((current) => ({ ...current, [connection.id]: event.target.value }))}
                      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                      placeholder="Provider name"
                    />
                    <button
                      onClick={() => renameConnection(connection.id, draftName)}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:bg-white/5"
                    >
                      Save name
                    </button>
                    <button
                      onClick={() => validateConnection(connection.id)}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:bg-white/5"
                    >
                      Retry check
                    </button>
                    <button
                      onClick={() => removeConnection(connection.id)}
                      className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 hover:bg-rose-500/20"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>{getFavoritesForProvider(connection.id).length} favorites</span>
                    <span>•</span>
                    <span>{recentItems} recent items</span>
                    <span>•</span>
                    <span>Saved {new Date(connection.connectedAt).toLocaleString()}</span>
                  </div>
                </div>
              );
            }) : <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-slate-400">No saved providers yet. Connect from the login screen first.</div>}
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Provider trust cockpit</h3>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Settings should be the operator surface for trust, recovery, and rehearsal state, not just a rename screen.
          </p>
          {mockHealth ? (
            <>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-violet-400/20 bg-violet-500/10 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Mock provider</p>
                  <p className="mt-2 text-sm text-slate-200">{activeScenario?.summary || 'Use this panel to verify trust, recovery, and degraded-provider rehearsal states.'}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-200">
                  {activeScenario?.label ?? scenarioLabels[scenario]}
                </span>
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
                <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  {mockRecoveryWarning}
                  {healthiestConnection ? (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        onClick={() => setActiveConnection(healthiestConnection.id)}
                        className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white hover:bg-white/20"
                      >
                        Switch to healthiest saved provider
                      </button>
                      <span className="self-center text-xs text-amber-50/80">{healthiestConnection.name}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {mockHealth.trustSignals?.length ? (
                <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Trust signals</p>
                  <div className="mt-4 space-y-3">
                    {mockHealth.trustSignals.map((signal) => (
                      <div key={signal.id} className={`rounded-2xl border p-4 ${signal.tone === 'healthy' ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-amber-400/20 bg-amber-500/10'}`}>
                        <p className={`text-sm font-semibold ${signal.tone === 'healthy' ? 'text-emerald-100' : 'text-amber-100'}`}>{signal.label}</p>
                        <p className="mt-2 text-sm text-slate-300">{signal.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {(Object.keys(scenarioLabels) as MockProviderScenario[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => applyScenario(key)}
                    className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${scenario === key ? 'bg-violet-500 text-white' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
                  >
                    {scenarioRefreshing && scenario === key ? `Applying ${scenarioLabels[key]}` : scenarioLabels[key]}
                  </button>
                ))}
              </div>

              {mockHealth.recoveryActions?.length ? (
                <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Recovery actions</p>
                  <ul className="mt-4 space-y-3 text-sm text-slate-300">
                    {mockHealth.recoveryActions.map((action) => <li key={action}>• {action}</li>)}
                  </ul>
                </div>
              ) : null}

              {activeScenario?.verificationSteps?.length ? (
                <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Verification checklist</p>
                  <ul className="mt-4 space-y-3 text-sm text-slate-300">
                    {activeScenario.verificationSteps.map((step) => <li key={step}>• {step}</li>)}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Architecture check</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>• Provider identity is stable and already scopes favorites, watch history, and auth summary state.</li>
              <li>• Search, Login, Home, Live, and Settings now all share the same trust language and healthiest-provider recovery move instead of drifting by surface.</li>
              <li>• Mock-provider rehearsal can now validate recovery guidance and line-capacity risk from the same settings cockpit.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
