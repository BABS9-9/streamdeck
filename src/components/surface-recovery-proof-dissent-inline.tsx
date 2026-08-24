'use client';

import { SurfaceRecoveryProofDissentRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Dissent is nearly cleared',
  watch: 'Dissent is still conditional',
  recover: 'Dissent is blocking recovery',
} as const;

export function SurfaceRecoveryProofDissentInline({
  runtime,
  title,
  badge,
}: {
  runtime: SurfaceRecoveryProofDissentRuntimeContract | null;
  title: string;
  badge: string;
}) {
  const dissent = runtime?.dissents?.[0];

  if (!runtime || !dissent) return null;

  return (
    <section className={`rounded-[1.75rem] border p-5 ${toneStyles[dissent.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.26em] text-white/75">{badge}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-white/90">{runtime.summary}</p>
        </div>
        <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${toneStyles[dissent.tone]}`}>
          {toneLabels[dissent.tone]}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Dissenting signal</p>
          <p className="mt-2 text-sm font-medium text-white">{dissent.dissentingSignal}</p>
        </article>
        <article className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Contradicted owner</p>
          <p className="mt-2 text-sm font-medium text-white">{dissent.contradictedOwner}</p>
        </article>
        <article className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Conflict summary</p>
          <p className="mt-2 text-sm font-medium text-white">{dissent.conflictSummary}</p>
        </article>
        <article className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Repair trigger</p>
          <p className="mt-2 text-sm font-medium text-white">{dissent.repairTrigger}</p>
        </article>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Owner posture</p>
        <p className="mt-2 text-sm leading-6 text-white">{dissent.ownerStatusLabel}</p>
      </div>
    </section>
  );
}
