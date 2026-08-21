'use client';

import { MockProviderManifest } from '@/lib/types';

type ScreenId = 'login' | 'home' | 'live';

type FirstPictureRuntime = {
  currentPromise: string;
  fastestPath: string;
  blockedBy: string;
  detail: string;
};

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

export function SurfaceFirstPictureInline({
  manifest,
  screenId,
  runtime,
}: {
  manifest: MockProviderManifest | null;
  screenId: ScreenId;
  runtime: FirstPictureRuntime;
}) {
  const contract = manifest?.surfaceFirstPictureContracts.find((item) => item.screenId === screenId) ?? null;
  if (!contract) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">{contract.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{contract.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{contract.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          First picture
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Current promise</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.currentPromise}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Fastest path</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.fastestPath}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Blocked by</p>
          <p className="mt-3 text-sm font-medium text-white">{runtime.blockedBy}</p>
        </article>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">{runtime.detail}</p>

      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        {contract.checkpoints.map((item) => (
          <article key={item.label} className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.22em] ${toneStyles[item.tone]}`}>
                {item.tone}
              </span>
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">Starting point</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{item.startingPoint}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">First-picture path</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.firstPicturePath}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">Breaks on</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.breaksOn}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
