'use client';

import { SavedProviderRecoveryAuthorityRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Final owner is aligned',
  watch: 'Final owner is visible',
  recover: 'Recovery owner is split',
} as const;

export function SurfaceRecoveryAuthorityResolverInline({
  runtime,
  title,
  badge,
  onSelectProvider,
}: {
  runtime: SavedProviderRecoveryAuthorityRuntimeContract | null;
  title: string;
  badge: string;
  onSelectProvider?: (providerId: string) => void;
}) {
  if (!runtime) return null;

  const canRouteToAuthority = onSelectProvider
    && runtime.authorityProviderId
    && runtime.authorityProviderId !== runtime.activeProviderId;

  return (
    <section className={`rounded-[1.75rem] border p-5 ${toneStyles[runtime.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.26em] text-white/75">{badge}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-white/90">{runtime.summary}</p>
        </div>
        <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${toneStyles[runtime.tone]}`}>
          {toneLabels[runtime.tone]}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Visible owner</p>
          <p className="mt-2 text-sm font-medium text-white">{runtime.visibleOwnerLabel}</p>
        </article>
        <article className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Final owner</p>
          <p className="mt-2 text-sm font-medium text-white">{runtime.finalOwnerLabel}</p>
        </article>
        <article className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Fail-closed reason</p>
          <p className="mt-2 text-sm font-medium text-white">{runtime.failClosedReason}</p>
        </article>
        <article className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Return trigger</p>
          <p className="mt-2 text-sm font-medium text-white">{runtime.returnTrigger}</p>
        </article>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{runtime.nextMove.label}</p>
        <p className="mt-2 text-sm leading-6 text-white">{runtime.nextMove.detail}</p>
      </div>

      {canRouteToAuthority && runtime.nextMove.primaryActionLabel ? (
        <button
          onClick={() => onSelectProvider(runtime.authorityProviderId as string)}
          className="mt-4 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-white transition hover:bg-white/10"
        >
          {runtime.nextMove.primaryActionLabel}
        </button>
      ) : null}
    </section>
  );
}
