'use client';

import { MockProviderManifest } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
} as const;

const toneLabels = {
  ready: 'Current provider still owns the move',
  watch: 'Ownership is conditional',
  recover: 'Rescue owns the move',
} as const;

type SurfaceLaunchOwnershipInlineProps = {
  contract: MockProviderManifest['surfaceLaunchOwnerships'][number] | null;
  title: string;
  badge: string;
};

export function SurfaceLaunchOwnershipInline({
  contract,
  title,
  badge,
}: SurfaceLaunchOwnershipInlineProps) {
  const owner = contract?.owners?.[0];

  if (!contract || !owner) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[owner.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{owner.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{contract.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[owner.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Current owner: {owner.currentOwner}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Ownership proof: {owner.ownershipProof}</p>
      <p className="mt-3 text-sm leading-6 text-white/75">Transfer trigger: {owner.transferTrigger}</p>
    </div>
  );
}
