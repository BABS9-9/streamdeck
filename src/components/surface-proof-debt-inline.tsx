'use client';

import { connectionStatusTone } from '@/lib/provider-signals';
import { SurfaceProofDebtRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
} as const;

const toneLabels = {
  ready: 'Borrowed confidence is small and named',
  watch: 'Borrowed confidence is visible and aging',
  recover: 'Borrowed confidence is now the main risk',
} as const;

type SurfaceProofDebtInlineProps = {
  runtime: SurfaceProofDebtRuntimeContract | null;
  title: string;
  badge: string;
};

export function SurfaceProofDebtInline({
  runtime,
  title,
  badge,
}: SurfaceProofDebtInlineProps) {
  const debt = runtime?.debts?.[0];

  if (!runtime || !debt) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[debt.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{debt.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{runtime.summary}</p>
      {debt.owner ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${connectionStatusTone[debt.owner.status]}`}>
            {debt.owner.status}
          </span>
          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
            {debt.owner.providerName}
          </span>
          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
            {debt.debtStatus}
          </span>
        </div>
      ) : null}
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[debt.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Carried uncertainty: {debt.carriedUncertainty}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Borrowed confidence: {debt.borrowedConfidence}</p>
      <p className="mt-3 text-sm leading-6 text-white/75">Repayment trigger: {debt.repaymentTrigger}</p>
      <p className="mt-3 text-sm leading-6 text-white/75">Runtime owner posture: {debt.ownerStatusLabel}</p>
    </div>
  );
}
