'use client';

import { MockProviderHealth, MockProviderManifest, ProviderAuthSummary } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

type SurfaceConnectionHeadroomProps = {
  contract: MockProviderManifest['surfaceConnectionHeadrooms'][number] | null;
  authSummary?: ProviderAuthSummary | null;
  health?: MockProviderHealth | null;
  badge?: string;
};

export function SurfaceConnectionHeadroom({
  contract,
  authSummary,
  health,
  badge = 'Connection headroom',
}: SurfaceConnectionHeadroomProps) {
  if (!contract) return null;

  const activeConnections = authSummary?.activeConnections ?? health?.accountProfile?.activeConnections ?? null;
  const maxConnections = authSummary?.maxConnections ?? health?.accountProfile?.maxConnections ?? null;
  const remainingConnections = activeConnections !== null && maxConnections !== null
    ? Math.max(maxConnections - activeConnections, 0)
    : null;
  const summaryTone = remainingConnections === null
    ? 'watch'
    : remainingConnections === 0
      ? 'recover'
      : remainingConnections === 1
        ? 'watch'
        : 'ready';

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">{badge}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{contract.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{contract.summary}</p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 ${toneClasses[summaryTone]}`}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/75">Provider lines</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {activeConnections !== null && maxConnections !== null ? `${activeConnections}/${maxConnections}` : 'Pending'}
          </p>
          <p className="mt-2 text-sm text-white/85">
            {remainingConnections === null
              ? 'Waiting on fresh line-capacity proof.'
              : remainingConnections === 0
                ? 'No playback headroom left.'
                : `${remainingConnections} line${remainingConnections === 1 ? '' : 's'} still open.`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {contract.lanes.map((lane) => (
          <article key={lane.label} className={`rounded-2xl border p-5 ${toneClasses[lane.tone]}`}>
            <p className="text-sm font-medium text-white">{lane.label}</p>
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
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
