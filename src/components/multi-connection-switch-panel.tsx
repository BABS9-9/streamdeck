'use client';

import { MultiConnectionSwitchRuntimeContract } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Ready for background switching',
  watch: 'Visible switch pressure',
  recover: 'Fail-closed posture',
} as const;

type MultiConnectionSwitchPanelProps = {
  runtime: MultiConnectionSwitchRuntimeContract | null;
  badge?: string;
  onSelectProvider?: (providerId: string) => void;
};

export function MultiConnectionSwitchPanel({
  runtime,
  badge = 'Fast provider switching',
  onSelectProvider,
}: MultiConnectionSwitchPanelProps) {
  if (!runtime) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">{badge}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{runtime.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{runtime.summary}</p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{runtime.detail}</p>
        </div>
        <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${toneClasses[runtime.tone]}`}>
          {runtime.blockedProviderCount === 0
            ? `${runtime.providerCount} switchable providers`
            : `${runtime.blockedProviderCount} fail-closed`}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Recent handoff</p>
          <p className="mt-3 text-sm leading-6 text-white">{runtime.recentHandoff}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Recommended move</p>
          <p className="mt-3 text-sm leading-6 text-white">{runtime.recommendedAction}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Runtime posture</p>
          <p className="mt-3 text-sm leading-6 text-white">{toneLabels[runtime.tone]}</p>
        </article>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {runtime.providers.map((provider) => (
          <article key={provider.providerId} className={`rounded-2xl border p-5 ${toneClasses[provider.tone]}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{provider.providerName}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/70">
                  {provider.isActive ? 'Current authority' : 'Saved standby'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {runtime.recommendedProviderId === provider.providerId ? (
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-100">
                    Healthiest target
                  </span>
                ) : null}
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {toneLabels[provider.tone]}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Authority</p>
                <p className="mt-2 text-sm leading-6 text-white">{provider.authorityLabel}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Reconnect trust</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{provider.reconnectTrust}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Quick-switch truth</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{provider.quickSwitchTruth}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Fail-closed guard</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{provider.failClosedReason}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Line headroom</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{provider.headroomLabel}</p>
              </div>
              {!provider.isActive && provider.tone !== 'recover' && onSelectProvider ? (
                <button
                  onClick={() => onSelectProvider(provider.providerId)}
                  className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-white transition hover:bg-white/10"
                >
                  {runtime.recommendedProviderId === provider.providerId ? 'Switch to healthiest' : 'Switch here'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
