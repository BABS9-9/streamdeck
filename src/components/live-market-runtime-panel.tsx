'use client';

import { LiveMarketRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

export function LiveMarketRuntimePanel({
  contract,
}: {
  contract: LiveMarketRuntimeContract;
}) {
  return (
    <section className={`rounded-[1.75rem] border p-5 ${toneStyles[contract.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-4xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/70">{contract.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{contract.title}</h2>
          <p className="mt-3 text-sm font-medium leading-7 text-white/90">{contract.summary}</p>
          <p className="mt-2 text-sm leading-7 text-white/80">{contract.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">{contract.launchPromiseState}</span>
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">{contract.confidenceState}</span>
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-white/15 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.nextMove.label}</p>
        <p className="mt-3 text-sm leading-6 text-white/90">{contract.nextMove.detail}</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Event</p>
          <p className="mt-3 text-sm font-semibold text-white">{contract.eventLabel}</p>
          <p className="mt-2 text-xs leading-5 text-white/75">{contract.networkLabel}</p>
        </article>
        <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Home market</p>
          <p className="mt-3 text-sm font-semibold text-white">{contract.homeMarketLabel}</p>
          <p className="mt-2 text-xs leading-5 text-white/75">Account-side anchor</p>
        </article>
        <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Playback market</p>
          <p className="mt-3 text-sm font-semibold text-white">{contract.currentPlaybackMarketLabel}</p>
          <p className="mt-2 text-xs leading-5 text-white/75">{contract.authorityLabel}</p>
        </article>
        <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Affiliate</p>
          <p className="mt-3 text-sm font-semibold text-white">{contract.affiliateLabel}</p>
          <p className="mt-2 text-xs leading-5 text-white/75">{contract.affiliateResolutionState}</p>
        </article>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {contract.entries.map((entry) => (
          <article
            key={entry.id}
            className={`rounded-2xl border p-4 ${
              entry.tone === 'ready'
                ? 'border-emerald-400/20 bg-emerald-500/10'
                : entry.tone === 'watch'
                  ? 'border-amber-400/20 bg-amber-500/10'
                  : 'border-rose-400/20 bg-rose-500/10'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{entry.label}</p>
              <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {entry.state}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{entry.summary}</p>
            <p className="mt-2 text-xs leading-5 text-white/80">{entry.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {contract.signals.map((signal) => (
          <article
            key={signal.label}
            className={`rounded-2xl border p-4 ${
              signal.tone === 'ready'
                ? 'border-emerald-400/20 bg-emerald-500/10'
                : signal.tone === 'watch'
                  ? 'border-amber-400/20 bg-amber-500/10'
                  : 'border-rose-400/20 bg-rose-500/10'
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{signal.label}</p>
            <p className="mt-2 text-lg font-semibold text-white">{signal.value}</p>
            <p className="mt-2 text-xs leading-5 text-white/75">{signal.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-white/15 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Copy state</p>
        <p className="mt-3 text-sm leading-6 text-white/90">{contract.copyState}</p>
      </div>
    </section>
  );
}
