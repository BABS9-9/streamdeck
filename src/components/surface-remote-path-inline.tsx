'use client';

import { MockProviderManifest } from '@/lib/types';

type ScreenId = 'login' | 'home' | 'live';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

export function SurfaceRemotePathInline({
  manifest,
  screenId,
}: {
  manifest: MockProviderManifest | null;
  screenId: ScreenId;
}) {
  const remotePath = manifest?.surfaceRemotePaths.find((item) => item.screenId === screenId) ?? null;
  if (!remotePath) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">{remotePath.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{remotePath.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{remotePath.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          Remote-first path
        </span>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        {remotePath.paths.map((path) => (
          <article key={path.label} className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{path.label}</p>
              <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.22em] ${toneStyles[path.tone]}`}>
                {path.tone}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {path.buttons.map((button) => (
                <span
                  key={`${path.label}-${button}`}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-slate-200"
                >
                  {button}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{path.result}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
