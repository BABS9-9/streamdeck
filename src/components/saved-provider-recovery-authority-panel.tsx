'use client';

import { SavedProviderRecoveryAuthorityRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Authority aligned',
  watch: 'Authority under pressure',
  recover: 'Recovery owner split',
} as const;

export function SavedProviderRecoveryAuthorityPanel({
  runtime,
  onSelectProvider,
}: {
  runtime: SavedProviderRecoveryAuthorityRuntimeContract | null;
  onSelectProvider?: (providerId: string) => void;
}) {
  if (!runtime) return null;

  const canRouteToAuthority = onSelectProvider
    && runtime.authorityProviderId
    && runtime.authorityProviderId !== runtime.activeProviderId;

  return (
    <section className={`rounded-[1.75rem] border p-6 ${toneStyles[runtime.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">{runtime.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{runtime.title}</h2>
          <p className="mt-3 text-sm leading-7 text-white/90">{runtime.summary}</p>
          <p className="mt-3 text-sm leading-7 text-white/75">{runtime.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
            {runtime.providerCount} saved provider{runtime.providerCount === 1 ? '' : 's'}
          </span>
          <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${toneStyles[runtime.tone]}`}>
            {toneLabels[runtime.tone]}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Visible owner</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.visibleOwnerLabel}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Final owner</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.finalOwnerLabel}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Fail-closed reason</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.failClosedReason}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Return trigger</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.returnTrigger}</p>
        </article>
      </div>

      <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Recent handoff</p>
        <p className="mt-3 text-sm leading-6 text-white">{runtime.recentHandoff}</p>
      </div>

      <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{runtime.nextMove.label}</p>
        <p className="mt-3 text-sm leading-6 text-white">{runtime.nextMove.detail}</p>
        {runtime.nextMove.primaryActionLabel && canRouteToAuthority ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => onSelectProvider?.(runtime.authorityProviderId as string)}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-white transition hover:bg-white/15"
            >
              {runtime.nextMove.primaryActionLabel}
            </button>
            {runtime.nextMove.secondaryActionLabel ? (
              <button
                onClick={() => onSelectProvider?.(runtime.authorityProviderId as string)}
                className="rounded-full border border-white/15 bg-black/20 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-white/85 transition hover:bg-white/10"
              >
                {runtime.nextMove.secondaryActionLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {runtime.supportEntries.length ? (
        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          {runtime.supportEntries.map((entry) => (
            <article key={entry.id} className={`rounded-[1.35rem] border p-4 ${toneStyles[entry.tone]}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{entry.label}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {entry.tone}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white">{entry.summary}</p>
              <p className="mt-3 text-xs leading-5 text-white/80">{entry.detail}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
