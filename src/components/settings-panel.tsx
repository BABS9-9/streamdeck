'use client';

import { useAuthStore } from '@/stores/auth-store';

export function SettingsPanel() {
  const { connections, activeConnection, setActiveConnection } = useAuthStore();
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Settings</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Connections and prototype architecture</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          This ship keeps providers in local storage, exposes a stable provider-aware connection model, and gives us the right base for multi-connection switching, search across providers, and shared continue-watching state.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/30 p-6">
          <h3 className="text-lg font-semibold text-white">Saved providers</h3>
          <div className="mt-4 space-y-3">
            {connections.map((connection) => (
              <button
                key={connection.id}
                onClick={() => setActiveConnection(connection.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${activeConnection?.id === connection.id ? 'border-violet-400 bg-violet-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-300'}`}
              >
                <span>{connection.name}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{connection.username}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Next implementation beats</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>• Add multi-provider hot-swap in the top bar.</li>
            <li>• Expand continue watching into a shared live + VOD rail with resume positions.</li>
            <li>• Add telemetry-driven stream health HUD from HLS.js stats.</li>
            <li>• Turn series cards into season and episode drill-down screens.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
