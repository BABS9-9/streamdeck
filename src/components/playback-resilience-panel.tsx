'use client';

import { PlaybackResilienceContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

export function PlaybackResiliencePanel({
  contract,
  className = '',
}: {
  contract: PlaybackResilienceContract;
  className?: string;
}) {
  return (
    <section className={`rounded-[1.75rem] border p-5 ${toneStyles[contract.tone]} ${className}`.trim()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/75">{contract.title}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{contract.summary}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85">{contract.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">
            {contract.droppedProviderCount} dropped
          </span>
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">
            {contract.degradedProviderCount} degraded
          </span>
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">
            {contract.cachedResultCount} cached
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.actionLabel}</p>
        <p className="mt-2 text-sm leading-6 text-white/90">{contract.actionDetail}</p>
      </div>

      {contract.playbackWitness ? (
        <div className={`mt-4 rounded-2xl border p-4 ${
          contract.playbackWitness.tone === 'ready'
            ? 'border-emerald-400/20 bg-emerald-500/10'
            : contract.playbackWitness.tone === 'watch'
              ? 'border-amber-400/20 bg-amber-500/10'
              : 'border-rose-400/20 bg-rose-500/10'
        }`}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.playbackWitness.label}</p>
          <p className="mt-2 text-sm font-semibold text-white">{contract.playbackWitness.summary}</p>
          <p className="mt-2 text-sm leading-6 text-white/85">{contract.playbackWitness.detail}</p>
        </div>
      ) : null}

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
            <p className="mt-2 text-2xl font-semibold text-white">{signal.value}</p>
            <p className="mt-2 text-xs leading-5 text-white/75">{signal.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Recovery sequence</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {contract.recoverySteps.map((step) => (
            <article
              key={step.label}
              className={`rounded-2xl border p-4 ${
                step.tone === 'ready'
                  ? 'border-emerald-400/20 bg-emerald-500/10'
                  : step.tone === 'watch'
                    ? 'border-amber-400/20 bg-amber-500/10'
                    : 'border-rose-400/20 bg-rose-500/10'
              }`}
            >
              <p className="text-sm font-semibold text-white">{step.label}</p>
              <p className="mt-2 text-xs leading-5 text-white/80">{step.detail}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {contract.providers.map((provider) => (
          <article
            key={provider.providerId}
            className={`rounded-2xl border p-4 ${
              provider.tone === 'ready'
                ? 'border-emerald-400/20 bg-emerald-500/10'
                : provider.tone === 'watch'
                  ? 'border-amber-400/20 bg-amber-500/10'
                  : 'border-rose-400/20 bg-rose-500/10'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{provider.providerName}</p>
              <div className="flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.18em] text-white/70">
                {provider.isActive ? <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1">Active</span> : null}
                {provider.isPlaybackOwner ? <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1">Playback owner</span> : null}
                <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1">{provider.state}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-white">{provider.summary}</p>
            <p className="mt-2 text-xs leading-5 text-white/75">{provider.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
