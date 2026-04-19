'use client';

import { useState } from 'react';
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

export function SettingsPanel() {
  const { connections, activeConnection, setActiveConnection, renameConnection, removeConnection, validateConnection, validateAllConnections, connectionStatus } = useAuthStore();
  const getFavoritesForProvider = useFavoritesStore((state) => state.getFavoritesForProvider);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});

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
          <h3 className="text-lg font-semibold text-white">What ships next</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>• Expand continue watching into a shared live + VOD rail with stronger resume positions.</li>
            <li>• Add cross-provider search with ranked live, movie, and series results.</li>
            <li>• Turn folders into a first-class organization layer beyond favorites.</li>
            <li>• Deepen the player into full-screen live and VOD routes with richer telemetry overlays.</li>
          </ul>

          <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-violet-300">Architecture check</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>• Provider identity is stable and already scopes favorites plus watch history.</li>
              <li>• Connection management is now editable in-app, not trapped in the login entry point.</li>
              <li>• This keeps the multi-provider differentiator real enough for demo flows today.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
