'use client';

import { connectionStatusTone } from '@/lib/provider-signals';
import { SurfaceConnectionHeadroomRuntimeContract } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

type SurfaceConnectionHeadroomProps = {
  runtime: SurfaceConnectionHeadroomRuntimeContract | null;
  badge?: string;
};

export function SurfaceConnectionHeadroom({
  runtime,
  badge = 'Connection headroom',
}: SurfaceConnectionHeadroomProps) {
  if (!runtime) return null;
  const summaryLane = runtime.lanes[0] ?? null;
  const summaryTone = summaryLane?.tone ?? 'watch';

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">{badge}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{runtime.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{runtime.summary}</p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 ${toneClasses[summaryTone]}`}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/75">Provider lines</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {summaryLane?.activeConnections !== null && summaryLane?.activeConnections !== undefined && summaryLane?.maxConnections !== null && summaryLane?.maxConnections !== undefined
              ? `${summaryLane.activeConnections}/${summaryLane.maxConnections}`
              : 'Pending'}
          </p>
          <p className="mt-2 text-sm text-white/85">
            {summaryLane?.remainingConnections === null || summaryLane?.remainingConnections === undefined
              ? 'Waiting on fresh line-capacity proof.'
              : summaryLane.remainingConnections === 0
                ? 'No playback headroom left.'
                : `${summaryLane.remainingConnections} line${summaryLane.remainingConnections === 1 ? '' : 's'} still open.`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {runtime.lanes.map((lane) => (
          <article key={lane.label} className={`rounded-2xl border p-5 ${toneClasses[lane.tone]}`}>
            <p className="text-sm font-medium text-white">{lane.label}</p>
            {lane.owner ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${connectionStatusTone[lane.owner.status]}`}>
                  {lane.owner.status}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {lane.owner.providerName}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {lane.capacityStatus}
                </span>
              </div>
            ) : null}
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Current window</p>
                <p className="mt-2 text-sm leading-6 text-white">{lane.currentWindow}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Warning trigger</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{lane.warningTrigger}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Blocked state</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{lane.blockedState}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Recommended move</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{lane.recommendedMove}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Runtime capacity posture</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{lane.ownerStatusLabel}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
