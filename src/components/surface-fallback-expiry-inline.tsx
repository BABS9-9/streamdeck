'use client';

import { connectionStatusTone } from '@/lib/provider-signals';
import { SurfaceFallbackExpiryRuntimeContract } from '@/lib/types';

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
  runtime: SurfaceFallbackExpiryRuntimeContract | null;
  title: string;
  badge: string;
};

export function SurfaceFallbackExpiryInline({
  runtime,
  title,
  badge,
}: SurfaceFallbackExpiryInlineProps) {
  const expiry = runtime?.expiries?.[0];

  if (!runtime || !expiry) return null;

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
      <p className="mt-3 text-sm leading-6 text-slate-100">{runtime.summary}</p>
      {expiry.owner ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${connectionStatusTone[expiry.owner.status]}`}>
            {expiry.owner.status}
          </span>
          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
            {expiry.owner.providerName}
          </span>
          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
            {expiry.expiryStatus}
          </span>
        </div>
      ) : null}
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[expiry.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Preservation window: {expiry.preservationWindow}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Aging proof: {expiry.agingProof}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Expires when: {expiry.expiryTrigger}</p>
      <p className="mt-3 text-sm leading-6 text-white/75">Runtime owner posture: {expiry.ownerStatusLabel}</p>
    </div>
  );
}
