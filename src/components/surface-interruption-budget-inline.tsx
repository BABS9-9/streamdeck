'use client';

import { MockProviderManifest } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Delay is still within budget',
  watch: 'Delay budget is thinning',
  recover: 'Delay budget is exhausted',
} as const;

type SurfaceInterruptionBudgetInlineProps = {
  contract: MockProviderManifest['surfaceInterruptionBudgets'][number] | null;
  title: string;
  badge: string;
};

export function SurfaceInterruptionBudgetInline({
  contract,
  title,
  badge,
}: SurfaceInterruptionBudgetInlineProps) {
  const budget = contract?.budgets?.[0];

  if (!contract || !budget) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[budget.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{budget.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{contract.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[budget.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">{budget.acceptableDelay}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Continuity layer: {budget.continuityLayer}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Escalate when: {budget.escalationTrigger}</p>
    </div>
  );
}
