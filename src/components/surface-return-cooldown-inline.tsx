'use client';

import { MockProviderManifest } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Return runway is earned',
  watch: 'Cooldown still shrinking',
  recover: 'Cooldown reset is active',
} as const;

type SurfaceReturnCooldownInlineProps = {
  contract: MockProviderManifest['surfaceReturnCooldownContracts'][number] | null;
  title: string;
  badge: string;
};

export function SurfaceReturnCooldownInline({
  contract,
  title,
  badge,
}: SurfaceReturnCooldownInlineProps) {
  const cooldown = contract?.cooldowns?.[0];

  if (!contract || !cooldown) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[cooldown.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{cooldown.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{contract.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[cooldown.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">{cooldown.cooldownWindow}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Cooldown shrinks when: {cooldown.shrinkingProof}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Restart cooldown when: {cooldown.resetTrigger}</p>
    </div>
  );
}
