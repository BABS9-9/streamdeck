'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderHealth, fetchMockProviderManifest } from '@/lib/mock-provider';
import { SurfaceContinuityWindow } from '@/components/surface-continuity-window';
import { SurfaceLaunchReadiness } from '@/components/surface-launch-readiness';
import { useAuthStore } from '@/stores/auth-store';

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
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const [server, setServer] = useState(MOCK_SERVER);
  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('demo');
  const [manifest, setManifest] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let cancelled = false;

    fetchMockProviderManifest(MOCK_SERVER)
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch(() => {
        if (!cancelled) setManifest(null);
      });

    fetchMockProviderHealth(MOCK_SERVER)
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) setHealth(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
  const launchReadiness = useMemo(
    () => manifest?.surfaceLaunchReadinessContracts?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );
  const continuityWindow = useMemo(
    () => manifest?.surfaceContinuityWindows?.find((item) => item.screenId === 'login') ?? null,
    [manifest]
  );

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

          {fallbackEquivalence ? (
            <div className="mt-6 rounded-[1.75rem] border border-violet-400/20 bg-violet-500/10 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-violet-200">{fallbackEquivalence.title}</p>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">{fallbackEquivalence.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
                  Exact vs approximate
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {fallbackEquivalence.equivalence.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-violet-200">Equivalent</p>
                    <p className="mt-1 text-sm leading-6 text-slate-200">{item.equivalentExperience}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-amber-200">Approximate</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{item.approximateExperience}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-rose-200">Restart trigger</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{item.restartTrigger}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <SurfaceLaunchReadiness contract={launchReadiness} badge="Connect honesty" />
          </div>

          <div className="mt-6">
            <SurfaceContinuityWindow contract={continuityWindow} badge="Handoff window" />
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
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50"
                  placeholder="Password"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
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
                className="rounded-full border border-white/10 px-6 py-3 text-sm text-slate-200 transition hover:bg-white/5"
              >
                Load demo credentials
              </button>
            </div>
          </form>

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
                  return (
                    <div key={connection.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-medium text-white">{connection.name}</p>
                          <p className="mt-1 text-sm text-slate-400">{connection.username} · {connection.server}</p>
                          <p className={`mt-2 text-xs uppercase tracking-[0.22em] ${status ? statusTone[status.state] : 'text-slate-500'}`}>
                            {status?.state || 'idle'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setActiveConnection(connection.id);
                              router.push('/home');
                            }}
                            className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${isActive ? 'bg-white text-slate-950' : 'border border-white/10 text-slate-200 hover:bg-white/5'}`}
                          >
                            {isActive ? 'Active' : 'Use'}
                          </button>
                          <button
                            onClick={() => validateConnection(connection.id)}
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
