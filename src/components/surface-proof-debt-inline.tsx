'use client';

import { MockProviderManifest } from '@/lib/types';

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
  contract: MockProviderManifest['surfaceProofDebts'][number] | null;
  title: string;
  badge: string;
};

export function SurfaceProofDebtInline({
  contract,
  title,
  badge,
}: SurfaceProofDebtInlineProps) {
  const debt = contract?.debts?.[0];

  if (!contract || !debt) return null;

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
      <p className="mt-3 text-sm leading-6 text-slate-100">{contract.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[debt.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Carried uncertainty: {debt.carriedUncertainty}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Borrowed confidence: {debt.borrowedConfidence}</p>
      <p className="mt-3 text-sm leading-6 text-white/75">Repayment trigger: {debt.repaymentTrigger}</p>
    </div>
  );
}
