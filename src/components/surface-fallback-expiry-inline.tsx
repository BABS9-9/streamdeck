'use client';

import { MockProviderManifest } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Sameness window is healthy',
  watch: 'Sameness window is aging',
  recover: 'Sameness window expired',
} as const;

type SurfaceFallbackExpiryInlineProps = {
  contract: MockProviderManifest['surfaceFallbackExpiryContracts'][number] | null;
  title: string;
  badge: string;
};

export function SurfaceFallbackExpiryInline({
  contract,
  title,
  badge,
}: SurfaceFallbackExpiryInlineProps) {
  const expiry = contract?.expiries?.[0];

  if (!contract || !expiry) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[expiry.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{expiry.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{contract.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[expiry.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Preservation window: {expiry.preservationWindow}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Aging proof: {expiry.agingProof}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Expires when: {expiry.expiryTrigger}</p>
    </div>
  );
}
