'use client';

import { MockProviderManifest } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
} as const;

type SurfaceClaimCeilingProps = {
  contract: MockProviderManifest['surfaceClaimCeilings'][number] | null;
  badge?: string;
};

export function SurfaceClaimCeiling({ contract, badge = 'Claim ceiling' }: SurfaceClaimCeilingProps) {
  if (!contract) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">{badge}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{contract.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{contract.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          Strongest honest promise
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {contract.ceilings.map((ceiling) => (
          <article key={ceiling.label} className={`rounded-2xl border p-5 ${toneClasses[ceiling.tone]}`}>
            <p className="text-sm font-medium text-white">{ceiling.label}</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Allowed promise</p>
                <p className="mt-2 text-sm leading-6 text-white">{ceiling.allowedPromise}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Forbidden overclaim</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{ceiling.forbiddenOverclaim}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Upgrade proof</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{ceiling.upgradeProof}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
