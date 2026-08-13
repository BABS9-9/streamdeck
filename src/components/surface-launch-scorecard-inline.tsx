'use client';

import { MockProviderManifest } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/25 bg-emerald-500/12 text-emerald-100',
  watch: 'border-amber-400/25 bg-amber-500/12 text-amber-100',
  recover: 'border-rose-400/25 bg-rose-500/12 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Go',
  watch: 'Watch',
  recover: 'Recover',
} as const;

type SurfaceLaunchScorecardInlineProps = {
  scorecard: MockProviderManifest['surfaceScorecards'][number] | null;
  title: string;
  badge?: string;
};

export function SurfaceLaunchScorecardInline({
  scorecard,
  title,
  badge = 'Go / Watch / Recover',
}: SurfaceLaunchScorecardInlineProps) {
  if (!scorecard) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-sky-200">{badge}</p>
          <h2 className="mt-2 text-lg font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{scorecard.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {scorecard.metrics.map((metric) => toneLabels[metric.tone]).join(' / ')}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {scorecard.metrics.map((metric) => (
          <article key={metric.label} className={`rounded-2xl border p-4 ${toneClasses[metric.tone]}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.22em] text-white/70">{metric.label}</p>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/80">
                {toneLabels[metric.tone]}
              </span>
            </div>
            <p className="mt-3 text-lg font-semibold text-white">{metric.value}</p>
            <p className="mt-2 text-sm leading-6 text-white/85">{metric.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
