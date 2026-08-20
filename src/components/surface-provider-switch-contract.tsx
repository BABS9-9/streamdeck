'use client';

import { SurfaceProviderSwitchRuntimeContract } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Current provider can stay',
  watch: 'Switch pressure building',
  recover: 'Switch should take over',
} as const;

type SurfaceProviderSwitchContractProps = {
  runtime: SurfaceProviderSwitchRuntimeContract | null;
  badge?: string;
};

export function SurfaceProviderSwitchContract({
  runtime,
  badge = 'Provider-switch truth',
}: SurfaceProviderSwitchContractProps) {
  if (!runtime) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">{badge}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{runtime.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{runtime.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          Switch honesty
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {runtime.switches.map((item) => (
          <article key={item.label} className={`rounded-2xl border p-5 ${toneClasses[item.tone]}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                {toneLabels[item.tone]}
              </span>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Runtime switch status</p>
                <p className="mt-2 text-sm leading-6 text-white">{item.switchStatus}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Runtime owner posture</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{item.ownerStatusLabel}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Switch trigger</p>
                <p className="mt-2 text-sm leading-6 text-white">{item.switchTrigger}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Preserves context</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{item.preservesContext}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Stay proof</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{item.stayProof}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
