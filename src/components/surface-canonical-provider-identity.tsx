'use client';

import { MockProviderManifest } from '@/lib/types';

const toneClasses = {
  ready: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Identity aligned',
  watch: 'Alias drift',
  recover: 'Owner changed',
} as const;

type SurfaceCanonicalProviderIdentityProps = {
  contract: MockProviderManifest['surfaceCanonicalProviderIdentityContracts'][number] | null;
  badge?: string;
};

export function SurfaceCanonicalProviderIdentity({
  contract,
  badge = 'Canonical provider',
}: SurfaceCanonicalProviderIdentityProps) {
  if (!contract) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-200">{badge}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{contract.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{contract.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          Owner stays visible
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {contract.identities.map((item) => (
          <article key={item.label} className={`rounded-2xl border p-5 ${toneClasses[item.tone]}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                {toneLabels[item.tone]}
              </span>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Canonical owner</p>
                <p className="mt-2 text-sm leading-6 text-white">{item.canonicalOwner}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Alias coverage</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{item.aliasCoverage}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Mismatch trigger</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{item.mismatchTrigger}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
