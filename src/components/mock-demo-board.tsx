'use client';

import { MockProviderHealth, MockProviderManifest } from '@/lib/types';

type MockDemoBoardProps = {
  health: MockProviderHealth | null;
  manifest: MockProviderManifest | null;
  screenId: 'login' | 'home' | 'live';
};

const toneClasses = {
  healthy: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  warning: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
} as const;

export function MockDemoBoard({ health, manifest, screenId }: MockDemoBoardProps) {
  if (!health && !manifest) return null;

  const spotlight = manifest?.scenarioSpotlight;
  const recoveryPlan = manifest?.surfaceRecoveryPlans.find((item) => item.screenId === screenId) ?? null;
  const activeScenario = health?.healthScenarios?.[health.activeScenario];
  const capabilityMatrix = manifest?.capabilityMatrix ?? [];
  const checklist = manifest?.demoChecklist ?? health?.recommendedDemoSequence ?? [];

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Mock provider rehearsal</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            {spotlight?.title || activeScenario?.label || 'Demo-ready adapter'}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            {spotlight?.summary || activeScenario?.summary || 'Use the mock Xtream adapter to validate connection, browse, and playback flows without a live customer account.'}
          </p>
        </div>
        {health ? (
          <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${toneClasses[health.operatorHeadline?.tone || 'healthy']}`}>
            {health.operatorHeadline?.title || activeScenario?.label || 'Healthy mock mode'}
          </span>
        ) : null}
      </div>

      {health?.operatorHeadline?.detail ? (
        <div className={`mt-4 rounded-2xl border p-4 text-sm leading-7 ${toneClasses[health.operatorHeadline.tone]}`}>
          {health.operatorHeadline.detail}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Demo checklist</p>
          <div className="mt-3 space-y-3">
            {checklist.map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm leading-6 text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {recoveryPlan ? (
            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-violet-200">{recoveryPlan.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">{recoveryPlan.summary}</p>
              <div className="mt-4 grid gap-3">
                {recoveryPlan.plans.map((plan) => (
                  <div key={plan.label} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-medium text-white">{plan.label}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-violet-200">Fastest route</p>
                    <p className="mt-1 text-sm leading-6 text-slate-200">{plan.fastestRoute}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-sky-200">Preserved context</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{plan.preservedContext}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {capabilityMatrix.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Adapter coverage</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {capabilityMatrix.map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
