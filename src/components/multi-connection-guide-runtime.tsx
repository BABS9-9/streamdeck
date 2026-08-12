'use client';

import { MultiConnectionGuideRuntimeContract } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Ready to own',
  watch: 'Watch before switch',
  recover: 'Recovery-first only',
} as const;

export function MultiConnectionGuideRuntime({
  contract,
  onSelectProvider,
}: {
  contract: MultiConnectionGuideRuntimeContract | null;
  onSelectProvider?: ((providerId: string) => void) | null;
}) {
  if (!contract) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.28em] text-sky-300">Multi-connection runtime</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{contract.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{contract.summary}</p>
        </div>
        <div className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${toneClasses[contract.recommendedAction.tone]}`}>
          {toneLabels[contract.recommendedAction.tone]}
        </div>
      </div>

      <div className={`mt-5 rounded-2xl border p-5 ${toneClasses[contract.recommendedAction.tone]}`}>
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Recommended next move</p>
        <h3 className="mt-2 text-lg font-semibold text-white">{contract.recommendedAction.title}</h3>
        <p className="mt-3 text-sm leading-6 text-white/85">{contract.recommendedAction.detail}</p>
        {contract.recommendedAction.ctaLabel && contract.recommendedAction.targetProviderId && onSelectProvider ? (
          <button
            onClick={() => onSelectProvider(contract.recommendedAction.targetProviderId as string)}
            className="mt-4 rounded-full border border-white/15 bg-black/25 px-4 py-2 text-sm font-medium text-white transition hover:bg-black/35"
          >
            {contract.recommendedAction.ctaLabel}
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {contract.providers.map((provider) => (
          <article key={provider.providerId} className={`rounded-2xl border p-5 ${toneClasses[provider.tone]}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{provider.providerName}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/70">
                  {provider.isActive ? 'Active owner' : provider.isRecommended ? 'Healthiest saved option' : 'Saved provider'}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                {provider.guideStatus}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Switch trigger</p>
                <p className="mt-2 text-sm leading-6 text-white">{provider.switchTrigger}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Guide window</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{provider.guideSummary}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">{provider.freshnessWindow}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Normalized short EPG</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{provider.shortEpgSummary}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Preserved context</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{provider.preservedContext}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Current blocker</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{provider.blockedBy}</p>
              </div>
            </div>

            {!provider.isActive && onSelectProvider ? (
              <button
                onClick={() => onSelectProvider(provider.providerId)}
                className="mt-4 rounded-full border border-white/15 bg-black/25 px-4 py-2 text-sm font-medium text-white transition hover:bg-black/35"
              >
                Switch to {provider.providerName}
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
