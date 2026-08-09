'use client';

import { MockProviderManifest } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Go',
  watch: 'Watch',
  recover: 'Recover',
} as const;

type SurfaceLaunchScorecardProps = {
  scorecard: MockProviderManifest['surfaceScorecards'][number] | null;
  badge?: string;
};

export function SurfaceLaunchScorecard({
  scorecard,
  badge = 'Launch scorecard',
}: SurfaceLaunchScorecardProps) {
  if (!scorecard) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-200">{badge}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{scorecard.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{scorecard.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          Go / Watch / Recover
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {scorecard.metrics.map((metric) => (
          <article key={metric.label} className={`rounded-2xl border p-5 ${toneClasses[metric.tone]}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{metric.label}</p>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                {toneLabels[metric.tone]}
              </span>
            </div>
            <p className="mt-4 text-lg font-semibold text-white">{metric.value}</p>
            <p className="mt-3 text-sm leading-6 text-white/85">{metric.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
