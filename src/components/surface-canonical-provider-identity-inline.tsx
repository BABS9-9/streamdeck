'use client';

import { MockProviderManifest } from '@/lib/types';

const toneClasses = {
  ready: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Owner is aligned',
  watch: 'Alias drift risk',
  recover: 'Owner mismatch',
} as const;

type SurfaceCanonicalProviderIdentityInlineProps = {
  contract: MockProviderManifest['surfaceCanonicalProviderIdentityContracts'][number] | null;
  title: string;
  badge: string;
};

export function SurfaceCanonicalProviderIdentityInline({
  contract,
  title,
  badge,
}: SurfaceCanonicalProviderIdentityInlineProps) {
  const identity = contract?.identities?.[0];

  if (!contract || !identity) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneClasses[identity.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{identity.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{contract.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[identity.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white/85">Canonical owner: {identity.canonicalOwner}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Alias coverage: {identity.aliasCoverage}</p>
      <p className="mt-3 text-sm leading-6 text-white">Mismatch trigger: {identity.mismatchTrigger}</p>
    </div>
  );
}
