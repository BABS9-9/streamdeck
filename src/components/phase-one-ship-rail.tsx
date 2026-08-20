'use client';

import { MockProviderManifest } from '@/lib/types';

type ScreenId = 'login' | 'home' | 'live';

const statusTone = {
  shipped: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  wired: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
  'rehearsal-ready': 'border-violet-400/20 bg-violet-500/10 text-violet-100',
} as const;

export function PhaseOneShipRail({
  manifest,
  screenId,
}: {
  manifest: MockProviderManifest | null;
  screenId: ScreenId;
}) {
  const shipLane = manifest?.surfaceShipLanes.find((item) => item.screenId === screenId) ?? null;
  if (!shipLane) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">{shipLane.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{shipLane.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{shipLane.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          Phase 1 ship map
        </span>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        {shipLane.lanes.map((lane) => (
          <article key={lane.label} className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{lane.label}</p>
              <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.22em] ${statusTone[lane.status]}`}>
                {lane.status.replace('-', ' ')}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{lane.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
