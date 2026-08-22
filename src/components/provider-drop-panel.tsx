'use client';

import { ProviderDropRuntimeContract } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

export function ProviderDropPanel({
  contract,
  className = '',
}: {
  contract: ProviderDropRuntimeContract | null;
  className?: string;
}) {
  if (!contract) return null;

  return (
    <section className={`rounded-[1.6rem] border p-5 ${toneClasses[contract.tone]} ${className}`.trim()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/80">{contract.title}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{contract.summary}</h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/80">{contract.detail}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {contract.activeDropCount} active drop{contract.activeDropCount === 1 ? '' : 's'}
        </span>
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {contract.entries.map((entry) => (
          <article key={entry.providerId} className={`rounded-[1.35rem] border p-4 ${toneClasses[entry.tone]}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/75">{entry.providerName}</p>
                <p className="mt-1 text-sm font-semibold text-white">{entry.title}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/80">
                {entry.nextActionLabel}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/90">{entry.summary}</p>
            <p className="mt-2 text-xs leading-5 text-white/75">{entry.detail}</p>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/80">
                {entry.cachedCatalogSummary}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/80">
                {entry.cachedSearchSummary}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/80">
                {entry.historySummary}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
