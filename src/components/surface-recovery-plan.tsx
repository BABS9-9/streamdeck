'use client';

type RecoveryPlanContract = {
  title: string;
  summary: string;
  plans: Array<{
    label: string;
    fastestRoute: string;
    preservedContext: string;
    healthierProviderHandoff: string;
    tone: 'ready' | 'watch' | 'recover';
  }>;
};

type SurfaceRecoveryPlanProps = {
  contract: RecoveryPlanContract | null | undefined;
  badge?: string;
};

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
} as const;

export function SurfaceRecoveryPlan({ contract, badge = 'Recovery route' }: SurfaceRecoveryPlanProps) {
  if (!contract) return null;

  return (
    <section className="rounded-[2rem] border border-sky-400/20 bg-sky-500/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-200">{contract.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-200">{contract.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {contract.plans.map((plan) => (
          <div key={plan.label} className={`rounded-[1.5rem] border p-4 ${toneClasses[plan.tone]}`}>
            <p className="text-sm font-medium text-white">{plan.label}</p>
            <div className="mt-3 grid gap-3 xl:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/70">Fastest route</p>
                <p className="mt-1 text-sm leading-6 text-white">{plan.fastestRoute}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/70">Preserved context</p>
                <p className="mt-1 text-sm leading-6 text-white/85">{plan.preservedContext}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/70">Handoff owner</p>
                <p className="mt-1 text-sm leading-6 text-white/85">{plan.healthierProviderHandoff}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
