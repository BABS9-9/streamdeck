'use client';

import { MockProviderManifest } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
} as const;

type SurfaceActionGateProps = {
  contract: MockProviderManifest['surfaceActionGates'][number] | null;
  badge?: string;
};

export function SurfaceActionGate({ contract, badge = 'Action gate' }: SurfaceActionGateProps) {
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
          Brightest action must earn itself
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {contract.gates.map((gate) => (
          <article key={gate.label} className={`rounded-2xl border p-5 ${toneClasses[gate.tone]}`}>
            <p className="text-sm font-medium text-white">{gate.label}</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Premium action</p>
                <p className="mt-2 text-sm leading-6 text-white">{gate.primaryAction}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Downgraded action</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{gate.downgradedAction}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Unlock condition</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{gate.unlockCondition}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
