'use client';

import { MockProviderManifest } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Retry still preserves the move',
  watch: 'Retry window is thinning',
  recover: 'Recovery should replace retry',
} as const;

type SurfaceRetryHonestyInlineProps = {
  contract: MockProviderManifest['surfaceRetryContracts'][number] | null;
  title: string;
  badge: string;
};

export function SurfaceRetryHonestyInline({
  contract,
  title,
  badge,
}: SurfaceRetryHonestyInlineProps) {
  const retry = contract?.retries?.[0];

  if (!contract || !retry) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[retry.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{retry.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{contract.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[retry.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Honest while: {retry.honestRetryWindow}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Preserves: {retry.preservesContext}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Give up when: {retry.giveUpTrigger}</p>
    </div>
  );
}
