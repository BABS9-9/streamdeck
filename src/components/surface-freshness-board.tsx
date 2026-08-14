'use client';

import { SurfaceFreshnessBoardRuntimeContract } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Fresh now',
  watch: 'Fallback safe',
  recover: 'Recovery first',
} as const;

export function SurfaceFreshnessBoard({
  runtime,
  badge,
}: {
  runtime: SurfaceFreshnessBoardRuntimeContract | null;
  badge: string;
}) {
  if (!runtime) return null;

  return (
    <section className="rounded-[2rem] border border-emerald-400/20 bg-emerald-500/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">{runtime.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-200">{runtime.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {runtime.budgets.map((item) => (
          <div key={item.label} className={`rounded-[1.5rem] border p-4 ${toneClasses[item.tone]}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                {toneLabels[item.tone]}
              </span>
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/70">Live window</p>
            <p className="mt-1 text-sm leading-6 text-white">{item.liveWindow}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/70">Safe fallback window</p>
            <p className="mt-1 text-sm leading-6 text-white/85">{item.safeFallbackWindow}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/70">Recovery trigger</p>
            <p className="mt-1 text-sm leading-6 text-white/85">{item.recoveryTrigger}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
