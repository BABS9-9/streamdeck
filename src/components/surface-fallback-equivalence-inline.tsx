'use client';

import { connectionStatusTone } from '@/lib/provider-signals';
import { SurfaceFallbackEquivalenceRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Same destination',
  watch: 'Approximate rescue',
  recover: 'Honest restart',
} as const;

type SurfaceFallbackEquivalenceInlineProps = {
  runtime: SurfaceFallbackEquivalenceRuntimeContract | null;
  title: string;
  badge: string;
};

export function SurfaceFallbackEquivalenceInline({
  runtime,
  title,
  badge,
}: SurfaceFallbackEquivalenceInlineProps) {
  const equivalence = runtime?.equivalence?.[0];

  if (!runtime || !equivalence) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[equivalence.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{equivalence.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{runtime.summary}</p>
      {equivalence.leader ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${connectionStatusTone[equivalence.leader.status]}`}>
            {equivalence.leader.status}
          </span>
          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
            {equivalence.leader.providerName}
          </span>
          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
            {equivalence.equivalenceStatus}
          </span>
        </div>
      ) : null}
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[equivalence.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Equivalent: {equivalence.equivalentExperience}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Approximate: {equivalence.approximateExperience}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Restart when: {equivalence.restartTrigger}</p>
      <p className="mt-3 text-sm leading-6 text-white/75">Runtime leader posture: {equivalence.leaderStatusLabel}</p>
    </div>
  );
}
