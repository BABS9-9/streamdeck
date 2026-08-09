'use client';

import Link from 'next/link';
import { MockProviderManifest } from '@/lib/types';

type SurfaceExitCriteriaProps = {
  criteria: MockProviderManifest['surfaceExitCriteria'][number] | null;
  badge?: string;
};

export function SurfaceExitCriteria({
  criteria,
  badge = 'Exit criteria',
}: SurfaceExitCriteriaProps) {
  if (!criteria) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200">{badge}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{criteria.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{criteria.summary}</p>
        </div>
        <Link
          href={criteria.nextHopHref}
          className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80 transition hover:bg-white/5"
        >
          {criteria.nextHopLabel}
        </Link>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200">Advance when</p>
          <p className="mt-3 text-sm leading-6 text-white">{criteria.goSignal}</p>
        </article>
        <article className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200">Hold when</p>
          <p className="mt-3 text-sm leading-6 text-white">{criteria.holdSignal}</p>
        </article>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
        <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Recovery owner</p>
          <p className="mt-3 text-sm font-medium text-white">{criteria.recoveryOwner}</p>
        </article>
        <article className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">Recovery move</p>
          <p className="mt-3 text-sm leading-6 text-white">{criteria.recoveryMove}</p>
        </article>
      </div>
    </section>
  );
}
