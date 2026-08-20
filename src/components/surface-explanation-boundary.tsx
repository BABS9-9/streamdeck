'use client';

import { SurfaceExplanationBoundaryRuntimeContract } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
} as const;

type SurfaceExplanationBoundaryProps = {
  runtime: SurfaceExplanationBoundaryRuntimeContract | null;
  badge?: string;
};

export function SurfaceExplanationBoundary({
  runtime,
  badge = 'Explanation boundary',
}: SurfaceExplanationBoundaryProps) {
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
          What must be said out loud
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {runtime.boundaries.map((boundary) => (
          <article key={boundary.label} className={`rounded-2xl border p-5 ${toneClasses[boundary.tone]}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm font-medium text-white">{boundary.label}</p>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/75">
                {boundary.boundaryStatus}
              </span>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Must say explicitly</p>
                <p className="mt-2 text-sm leading-6 text-white">{boundary.mustSayExplicitly}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Can stay implied</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{boundary.canStayImplied}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Forced disclosure trigger</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{boundary.forcedDisclosureTrigger}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Runtime owner status</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{boundary.ownerStatusLabel}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
