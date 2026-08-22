'use client';

import { MockProviderManifest, SurfaceMultiConnectionCustodyRuntimeContract } from '@/lib/types';

type ScreenId = 'login' | 'home' | 'live';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

export function SurfaceMultiConnectionCustodyInline({
  manifest,
  screenId,
  runtime,
}: {
  manifest: MockProviderManifest | null;
  screenId: ScreenId;
  runtime: SurfaceMultiConnectionCustodyRuntimeContract | null;
}) {
  const contract = manifest?.surfaceMultiConnectionCustodyContracts.find((item) => item.screenId === screenId) ?? null;
  if (!contract || !runtime) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">{contract.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{contract.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{contract.summary}</p>
        </div>
        <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${toneStyles[runtime.tone]}`}>
          {runtime.providerCount} saved provider{runtime.providerCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Current owner</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.currentOwner}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Standby owner</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.standbyOwner}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Carries forward</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.carriesForward}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Switch witness</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.switchWitness}</p>
        </article>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">Breaks when: {runtime.breaksWhen}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{runtime.detail}</p>

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {contract.custody.map((item) => (
          <article key={item.label} className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.22em] ${toneStyles[item.tone]}`}>
                {item.tone}
              </span>
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">Owner</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{item.owner}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">Carries forward</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.carriesForward}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">Breaks when</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.breaksWhen}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
