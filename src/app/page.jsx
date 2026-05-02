'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderHealth, getSelectedMockProviderScenario, setSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { useAuthStore } from '@/stores/auth-store';

const MOCK_SERVER = 'http://localhost:3579';

const statusTone = {
  idle: 'text-slate-400',
  checking: 'text-amber-300',
  healthy: 'text-emerald-300',
  degraded: 'text-amber-300',
  error: 'text-rose-300',
};

const scenarioLabels = {
  healthy: 'Healthy',
  degradedSearch: 'Degraded search',
  degradedLive: 'Degraded live',
  degradedEpg: 'Degraded guide',
  lineSaturated: 'Lines maxed',
  expiredAccount: 'Expired account',
  authUnstable: 'Auth unstable',
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

const getHealthScore = (connection, status) => {
  const summary = connection?.lastAuthSummary;
  let score = 0;

  if (status?.state === 'healthy') score += 100;
  else if (status?.state === 'degraded') score += 45;
  else if (status?.state === 'checking') score += 20;
  else if (status?.state === 'error') score -= 25;

  if (summary?.status === 'Active') score += 40;
  else if (summary?.status) score -= 40;

  if (typeof summary?.maxConnections === 'number' && typeof summary?.activeConnections === 'number') {
    score += Math.max(-30, 30 - Math.max(0, summary.activeConnections - summary.maxConnections + 1) * 20);
  }

  return score;
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
  const [scenario, setScenario] = useState(getSelectedMockProviderScenario());
  const [scenarioRefreshing, setScenarioRefreshing] = useState(false);

  const activeScenario = mockHealth?.healthScenarios?.[mockHealth.activeScenario];
  const mockAccountPressure = getAccountPressure(mockHealth?.accountProfile);
  const healthiestConnection = useMemo(() => {
    if (connections.length < 2) return null;
    return [...connections]
      .sort((a, b) => getHealthScore(b, connectionStatus[b.id]) - getHealthScore(a, connectionStatus[a.id]))
      .find((connection) => connection.id !== activeConnection?.id) ?? null;
  }, [activeConnection?.id, connectionStatus, connections]);

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
            {[
              ['Multi-provider ready', 'Saved connections live locally and can be switched instantly.'],
              ['Inline smart guide', 'Channel cards show NOW and NEXT without a separate guide screen.'],
              ['Playback health HUD', 'Bitrate, buffer, and video telemetry surface in the live browser.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
              </div>
            ))}
          </div>

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
              {mockHealth.trustSignals?.length ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Trust signals</p>
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
              {mockHealth.operatorHeadline ? (
                <div className={`mt-4 rounded-2xl border p-4 ${mockHealth.operatorHeadline.tone === 'healthy' ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-amber-400/20 bg-amber-500/10'}`}>
                  <p className={`text-sm font-semibold ${mockHealth.operatorHeadline.tone === 'healthy' ? 'text-emerald-100' : 'text-amber-100'}`}>{mockHealth.operatorHeadline.title}</p>
                  <p className="mt-2 text-sm text-slate-300">{mockHealth.operatorHeadline.detail}</p>
                </div>
              ) : null}
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Scenario rehearsal</p>
                    <p className="mt-2 text-sm text-slate-300">Use these mock-provider health modes to rehearse degraded search and degraded live UX before a real provider ever flakes out.</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-violet-200">
                    Active mode: {mockHealth.healthScenarios?.[mockHealth.activeScenario]?.label ?? mockHealth.activeScenario}
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
                  {Object.keys(scenarioLabels).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyScenario(key)}
                      className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${scenario === key ? 'bg-violet-500 text-white' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
                    >
                      {scenarioRefreshing && scenario === key ? `Applying ${scenarioLabels[key]}` : scenarioLabels[key]}
                    </button>
                  ))}
                </div>
                {mockHealth.scenarioUrls ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                    {Object.entries(mockHealth.scenarioUrls).map(([key, url]) => (
                      <a key={key} href={url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-black/20 px-3 py-2 hover:bg-white/5">
                        {scenarioLabels[key]} health
                      </a>
                    ))}
                  </div>
                ) : null}
                {scenarioRefreshing ? (
                  <div className="mt-4 rounded-2xl border border-violet-400/20 bg-black/20 p-4 text-sm text-violet-100">
                    Applying {scenario.replace(/([A-Z])/g, ' $1').toLowerCase()} rehearsal and refreshing Login in place.
                  </div>
                ) : null}
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {Object.entries(mockHealth.healthScenarios || {}).map(([key, scenarioCard]) => (
                    <div key={key} className={`rounded-2xl border p-4 ${mockHealth.activeScenario === key ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-white/5'}`}>
                      <p className="text-sm font-semibold text-white">{scenarioCard.label}</p>
                      <p className="mt-2 text-sm text-slate-400">{scenarioCard.summary}</p>
                      <p className="mt-3 text-xs text-slate-500">{scenarioCard.appImpact}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {scenarioCard.affectedEndpoints.map((endpoint) => (
                          <span key={endpoint} className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">{endpoint}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {activeScenario?.verificationSteps?.length ? (
                  <div className="mt-4 rounded-2xl border border-violet-400/20 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-violet-300">Active rehearsal checklist</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                      {activeScenario.verificationSteps.map((step) => <li key={step}>• {step}</li>)}
                    </ul>
                  </div>
                ) : null}
                {mockHealth.recoveryActions?.length ? (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200">Recovery actions</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                      {mockHealth.recoveryActions.map((step) => <li key={step}>• {step}</li>)}
                    </ul>
                  </div>
                ) : null}
                {mockHealth.recommendedDemoSequence?.length ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Suggested demo path</p>
                    <ol className="mt-3 space-y-2 text-sm text-slate-300">
                      {mockHealth.recommendedDemoSequence.map((step, index) => <li key={step}>{index + 1}. {step}</li>)}
                    </ol>
                  </div>
                ) : null}
              </div>
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

          <form onSubmit={handleConnect} className="mt-8 space-y-5">
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
