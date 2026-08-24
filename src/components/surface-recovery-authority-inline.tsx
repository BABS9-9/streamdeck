'use client';

import { MockProviderManifest, SavedProviderRecoveryAuthorityRuntimeContract, SurfaceRecoveryAuthorityRuntimeContract } from '@/lib/types';

type ScreenId = 'login' | 'home' | 'live' | 'player';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Authority is aligned',
  watch: 'Authority needs watching',
  recover: 'Recovery owns the next move',
} as const;

const getActionLabel = (screenId: ScreenId) => (
  screenId === 'player' ? 'Hand playback to recovery owner' : 'Switch to recovery owner'
);

const isUnifiedRecoveryAuthorityRuntime = (
  runtime: SurfaceRecoveryAuthorityRuntimeContract | SavedProviderRecoveryAuthorityRuntimeContract | null
): runtime is SavedProviderRecoveryAuthorityRuntimeContract => Boolean(runtime && 'finalOwnerLabel' in runtime);

export function SurfaceRecoveryAuthorityInline({
  manifest,
  screenId,
  runtime,
  onSelectProvider,
}: {
  manifest: MockProviderManifest | null;
  screenId: ScreenId;
  runtime: SurfaceRecoveryAuthorityRuntimeContract | SavedProviderRecoveryAuthorityRuntimeContract | null;
  onSelectProvider?: (providerId: string) => void;
}) {
  const contract = manifest?.surfaceRecoveryAuthorityContracts?.find((item) => item.screenId === screenId) ?? null;
  if (!contract || !runtime) return null;

  const authorityOwner = isUnifiedRecoveryAuthorityRuntime(runtime)
    ? runtime.finalOwnerLabel
    : runtime.authorityOwner;
  const activeOwner = isUnifiedRecoveryAuthorityRuntime(runtime)
    ? runtime.visibleOwnerLabel
    : runtime.activeOwner;
  const fallbackReason = isUnifiedRecoveryAuthorityRuntime(runtime)
    ? runtime.failClosedReason
    : runtime.fallbackReason;

  const canSwitchAuthority = onSelectProvider
    && runtime.authorityProviderId
    && runtime.activeProviderId
    && runtime.authorityProviderId !== runtime.activeProviderId;

  return (
    <section className={`rounded-[1.75rem] border p-6 ${toneStyles[runtime.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">{contract.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{contract.title}</h2>
          <p className="mt-3 text-sm leading-7 text-white/90">{runtime.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {runtime.providerCount} saved provider{runtime.providerCount === 1 ? '' : 's'}
        </span>
      </div>

      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[runtime.tone]}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Recovery owner</p>
          <p className="mt-3 text-sm font-medium text-white">{authorityOwner}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Visible owner</p>
          <p className="mt-3 text-sm font-medium text-white">{activeOwner}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Fallback reason</p>
          <p className="mt-3 text-sm font-medium text-white">{fallbackReason}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Return trigger</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.returnTrigger}</p>
        </article>
      </div>

      <p className="mt-4 text-sm leading-6 text-white/75">{runtime.detail}</p>

      {canSwitchAuthority ? (
        <button
          onClick={() => onSelectProvider(runtime.authorityProviderId as string)}
          className="mt-4 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-white transition hover:bg-white/10"
        >
          {getActionLabel(screenId)}
        </button>
      ) : null}

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {contract.authorities.map((item) => (
          <article key={item.label} className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.22em] ${toneStyles[item.tone]}`}>
                {item.tone}
              </span>
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-400">Authority owner</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{item.authorityOwner}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-400">Visible owner</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.activeOwner}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-400">Fallback reason</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.fallbackReason}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-400">Return trigger</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.returnTrigger}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
