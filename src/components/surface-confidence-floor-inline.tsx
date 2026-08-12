'use client';

import { MockProviderManifest } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Premium posture still has enough proof',
  watch: 'Premium posture is slipping toward downgrade',
  recover: 'Premium posture has lost the floor',
} as const;

type SurfaceConfidenceFloorInlineProps = {
  contract: MockProviderManifest['surfaceConfidenceFloors'][number] | null;
  title: string;
  badge: string;
};

export function SurfaceConfidenceFloorInline({
  contract,
  title,
  badge,
}: SurfaceConfidenceFloorInlineProps) {
  const floor = contract?.floors?.[0];

  if (!contract || !floor) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[floor.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{floor.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{contract.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[floor.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Minimum proof: {floor.minimumProof}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Downgrade to: {floor.downgradeMode}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Hard stop: {floor.hardStopTrigger}</p>
    </div>
  );
}
