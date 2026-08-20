'use client';

import { MockProviderManifest } from '@/lib/types';

const toneStyles = {
  ready: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Current owner can stay',
  watch: 'Switch pressure building',
  recover: 'Switch should take over',
} as const;

type SurfaceProviderSwitchInlineProps = {
  contract: MockProviderManifest['surfaceProviderSwitchContracts'][number] | null;
  title: string;
  badge: string;
};

export function SurfaceProviderSwitchInline({
  contract,
  title,
  badge,
}: SurfaceProviderSwitchInlineProps) {
  const switchLane = contract?.switches?.[0];

  if (!contract || !switchLane) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[switchLane.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{switchLane.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{contract.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[switchLane.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Switch when: {switchLane.switchTrigger}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Keeps: {switchLane.preservesContext}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Stay only if: {switchLane.stayProof}</p>
    </div>
  );
}
