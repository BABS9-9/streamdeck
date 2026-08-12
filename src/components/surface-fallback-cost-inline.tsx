'use client';

import { MockProviderManifest } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
} as const;

const toneLabels = {
  ready: 'Cost still acceptable',
  watch: 'Trade-off now visible',
  recover: 'Fallback is no longer cheap',
} as const;

type SurfaceFallbackCostInlineProps = {
  contract: MockProviderManifest['surfaceFallbackCosts'][number] | null;
  title: string;
  badge: string;
};

export function SurfaceFallbackCostInline({
  contract,
  title,
  badge,
}: SurfaceFallbackCostInlineProps) {
  const cost = contract?.costs?.[0];

  if (!contract || !cost) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[cost.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{cost.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{contract.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[cost.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Visible loss: {cost.visibleLoss}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Preserved value: {cost.preservedValue}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Hard stop when: {cost.hardStopThreshold}</p>
    </div>
  );
}
