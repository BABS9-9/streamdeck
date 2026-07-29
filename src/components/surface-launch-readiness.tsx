'use client';

type SurfaceLaunchReadinessContract = {
  title: string;
  summary: string;
  readiness: Array<{
    label: string;
    safeWhen: string;
    blockedWhen: string;
    recoveryMove: string;
    tone: 'ready' | 'watch' | 'recover';
  }>;
};

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
};

const toneLabels = {
  ready: 'Safe now',
  watch: 'Watch closely',
  recover: 'Recover first',
};

export function SurfaceLaunchReadiness({
  contract,
  badge,
}: {
  contract: SurfaceLaunchReadinessContract | null;
  badge: string;
}) {
  if (!contract) return null;

  return (
    <section className="rounded-[2rem] border border-emerald-400/20 bg-emerald-500/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">{contract.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-200">{contract.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {contract.readiness.map((item) => (
          <div key={item.label} className={`rounded-[1.5rem] border p-4 ${toneClasses[item.tone]}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                {toneLabels[item.tone]}
              </span>
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/70">Safe when</p>
            <p className="mt-1 text-sm leading-6 text-slate-100">{item.safeWhen}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/70">Blocked when</p>
            <p className="mt-1 text-sm leading-6 text-slate-200">{item.blockedWhen}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/70">Recovery move</p>
            <p className="mt-1 text-sm leading-6 text-slate-200">{item.recoveryMove}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
