'use client';

import { connectionStatusTone } from '@/lib/provider-signals';
import { SurfaceFallbackEquivalenceRuntimeContract } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Same destination',
  watch: 'Approximate rescue',
  recover: 'Honest restart',
} as const;

type SurfaceFallbackEquivalenceProps = {
  runtime: SurfaceFallbackEquivalenceRuntimeContract | null;
  badge?: string;
};

export function SurfaceFallbackEquivalence({
  runtime,
  badge = 'Fallback equivalence',
}: SurfaceFallbackEquivalenceProps) {
  if (!runtime) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-violet-200">{badge}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{runtime.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{runtime.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          Same vs approximate
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {runtime.equivalence.map((item) => (
          <article key={item.label} className={`rounded-2xl border p-5 ${toneClasses[item.tone]}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                {toneLabels[item.tone]}
              </span>
            </div>
            {item.leader ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${connectionStatusTone[item.leader.status]}`}>
                  {item.leader.status}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {item.leader.providerName}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {item.equivalenceStatus}
                </span>
              </div>
            ) : null}
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Equivalent</p>
                <p className="mt-2 text-sm leading-6 text-white">{item.equivalentExperience}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Approximate</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{item.approximateExperience}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Restart trigger</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{item.restartTrigger}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Runtime leader posture</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{item.leaderStatusLabel}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
