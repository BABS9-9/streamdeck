'use client';

import { MockProviderManifest, SurfaceLineReleaseWitnessRuntimeContract } from '@/lib/types';

type ScreenId = 'login' | 'home' | 'live';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Line-release witness is calm',
  watch: 'Line-release witness stays visible',
  recover: 'Line cap blocks launch authority',
} as const;

export function SurfaceLineReleaseWitnessInline({
  manifest,
  screenId,
  runtime,
  onSelectProvider,
}: {
  manifest: MockProviderManifest | null;
  screenId: ScreenId;
  runtime: SurfaceLineReleaseWitnessRuntimeContract | null;
  onSelectProvider?: (providerId: string) => void;
}) {
  const contract = manifest?.surfaceLineReleaseWitnessContracts.find((item) => item.screenId === screenId) ?? null;
  if (!contract || !runtime) return null;

  return (
    <section className={`rounded-[1.75rem] border p-6 ${toneStyles[runtime.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">{contract.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{contract.title}</h2>
          <p className="mt-3 text-sm leading-7 text-white/90">{runtime.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {runtime.saturatedProviderCount} capped provider{runtime.saturatedProviderCount === 1 ? '' : 's'}
        </span>
      </div>

      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[runtime.tone]}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Current owner</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.currentOwner}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Release witness</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.releaseWitness}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Fallback owner</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.fallbackOwner}</p>
        </article>
      </div>

      <p className="mt-4 text-sm leading-6 text-white/90">{runtime.capStatus}</p>
      <p className="mt-3 text-sm leading-6 text-white/75">{runtime.detail}</p>

      {runtime.fallbackProviderId && onSelectProvider ? (
        <button
          onClick={() => onSelectProvider(runtime.fallbackProviderId as string)}
          className="mt-4 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-white transition hover:bg-white/10"
        >
          Switch to healthiest open provider
        </button>
      ) : null}

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {contract.witnesses.map((item) => (
          <article key={item.label} className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.22em] ${toneStyles[item.tone]}`}>
                {item.tone}
              </span>
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-400">Saturated owner</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{item.saturatedOwner}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-400">Release witness</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.releaseWitness}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-400">Fallback owner</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.fallbackOwner}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
