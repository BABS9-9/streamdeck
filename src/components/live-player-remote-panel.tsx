'use client';

import { LivePlayerRemoteRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

export function LivePlayerRemotePanel({
  contract,
}: {
  contract: LivePlayerRemoteRuntimeContract;
}) {
  return (
    <section className={`rounded-[1.4rem] border p-4 ${toneStyles[contract.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/70">{contract.eyebrow}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{contract.title}</h3>
          <p className="mt-2 text-sm font-medium text-white/90">{contract.summary}</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{contract.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">
            {contract.primaryIntentState}
          </span>
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">
            {contract.nextMove.tone}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.nextMove.label}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {contract.nextMove.buttons.map((button) => (
            <span
              key={`${contract.nextMove.label}-${button}`}
              className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/80"
            >
              {button}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm leading-6 text-white/90">{contract.nextMove.detail}</p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {contract.actions.map((action) => (
          <article
            key={action.id}
            className={`rounded-2xl border p-4 ${
              action.tone === 'ready'
                ? 'border-cyan-400/20 bg-cyan-500/10'
                : action.tone === 'watch'
                  ? 'border-amber-400/20 bg-amber-500/10'
                  : 'border-rose-400/20 bg-rose-500/10'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{action.label}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {action.buttons.map((button) => (
                    <span
                      key={`${action.id}-${button}`}
                      className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75"
                    >
                      {button}
                    </span>
                  ))}
                </div>
              </div>
              <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {action.state}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{action.summary}</p>
            <p className="mt-2 text-xs leading-5 text-white/80">{action.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {contract.signals.map((signal) => (
          <article
            key={signal.label}
            className={`rounded-2xl border p-4 ${
              signal.tone === 'ready'
                ? 'border-cyan-400/20 bg-cyan-500/10'
                : signal.tone === 'watch'
                  ? 'border-amber-400/20 bg-amber-500/10'
                  : 'border-rose-400/20 bg-rose-500/10'
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{signal.label}</p>
            <p className="mt-2 text-xl font-semibold text-white">{signal.value}</p>
            <p className="mt-2 text-xs leading-5 text-white/75">{signal.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
