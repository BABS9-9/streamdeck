'use client';

import { SurfaceLaunchOwnershipRuntimeContract } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

type SurfaceLaunchOwnershipProps = {
  runtime: SurfaceLaunchOwnershipRuntimeContract | null;
  badge?: string;
};

export function SurfaceLaunchOwnership({ runtime, badge = 'Launch owner' }: SurfaceLaunchOwnershipProps) {
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
          Who owns the next tap
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {runtime.owners.map((owner) => (
          <article key={owner.label} className={`rounded-2xl border p-5 ${toneClasses[owner.tone]}`}>
            <p className="text-sm font-medium text-white">{owner.label}</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Ownership status</p>
                <p className="mt-2 text-sm leading-6 text-white">{owner.ownershipStatus}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Current owner</p>
                <p className="mt-2 text-sm leading-6 text-white">{owner.currentOwner}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Ownership proof</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{owner.ownershipProof}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Transfer trigger</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{owner.transferTrigger}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Runtime owner</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{owner.ownerStatusLabel}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
