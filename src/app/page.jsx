'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';

const MOCK_SERVER = 'http://localhost:3579';

export default function LoginPage() {
  const router = useRouter();
  const hydrate = useAuthStore((state) => state.hydrate);
  const connect = useAuthStore((state) => state.connect);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const connections = useAuthStore((state) => state.connections);
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const [server, setServer] = useState(MOCK_SERVER);
  const [username, setUsername] = useState('test');
  const [password, setPassword] = useState('test');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const helperText = useMemo(() => {
    if (connections.length === 0) return 'Use the local mock provider to test the full flow fast.';
    return `${connections.length} saved connection${connections.length === 1 ? '' : 's'} ready for hot-swap.`;
  }, [connections.length]);

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

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Saved connections</h3>
              {activeConnection ? <span className="text-sm text-slate-400">Active: {activeConnection.name}</span> : null}
            </div>
            <div className="mt-4 space-y-3">
              {connections.length > 0 ? connections.map((connection) => {
                const isActive = activeConnection?.id === connection.id;
                return (
                  <button
                    key={connection.id}
                    type="button"
                    onClick={() => {
                      setActiveConnection(connection.id);
                      router.push('/home');
                    }}
                    className={`flex w-full items-center justify-between rounded-[1.4rem] border px-4 py-4 text-left transition ${isActive ? 'border-violet-400/60 bg-violet-500/10' : 'border-white/10 bg-black/20 hover:bg-white/5'}`}
                  >
                    <div>
                      <p className="font-medium text-white">{connection.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{connection.username}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.25em] text-slate-500">{isActive ? 'active' : 'switch'}</span>
                  </button>
                );
              }) : <p className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-400">No saved providers yet. Connect once and StreamDeck keeps it locally.</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
