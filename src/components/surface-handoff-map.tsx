'use client';

import { MockProviderManifest } from '@/lib/types';

type SurfaceHandoffMapProps = {
  handoff: MockProviderManifest['surfaceHandoffs'][number] | null;
  badge?: string;
};

export function SurfaceHandoffMap({
  handoff,
  badge = 'Handoff map',
}: SurfaceHandoffMapProps) {
  if (!handoff) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">{badge}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{handoff.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{handoff.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {handoff.confidenceLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200">Carry forward</p>
          <div className="mt-3 space-y-2">
            {handoff.carriesForward.map((item) => (
              <p key={item} className="text-sm leading-6 text-white">
                {item}
              </p>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">{handoff.fallbackLabel}</p>
          <p className="mt-3 text-sm leading-6 text-white">{handoff.fallbackDetail}</p>
        </article>
      </div>
    </section>
  );
}
