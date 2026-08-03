'use client';

import { MockProviderManifest } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
} as const;

type SurfaceAutonomyBoundaryProps = {
  contract: MockProviderManifest['surfaceAutonomyBoundaries'][number] | null;
  badge?: string;
};

export function SurfaceAutonomyBoundary({
  contract,
  badge = 'Autonomy boundary',
}: SurfaceAutonomyBoundaryProps) {
  if (!contract) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">{badge}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{contract.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{contract.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          What StreamDeck may do for you
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {contract.boundaries.map((boundary) => (
          <article key={boundary.label} className={`rounded-2xl border p-5 ${toneClasses[boundary.tone]}`}>
            <p className="text-sm font-medium text-white">{boundary.label}</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Auto maintains</p>
                <p className="mt-2 text-sm leading-6 text-white">{boundary.autoMaintains}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">User owns</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{boundary.userOwns}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Forced handoff trigger</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{boundary.forcedHandoffTrigger}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
