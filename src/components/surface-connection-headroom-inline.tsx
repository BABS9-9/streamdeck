'use client';

import { MockProviderHealth, MockProviderManifest, ProviderAuthSummary } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Launch room is still open',
  watch: 'Line pressure is rising',
  recover: 'Capacity is now the blocker',
} as const;

type SurfaceConnectionHeadroomInlineProps = {
  contract: MockProviderManifest['surfaceConnectionHeadrooms'][number] | null;
  authSummary?: ProviderAuthSummary | null;
  health?: MockProviderHealth | null;
  title: string;
  badge: string;
};

export function SurfaceConnectionHeadroomInline({
  contract,
  authSummary,
  health,
  title,
  badge,
}: SurfaceConnectionHeadroomInlineProps) {
  const lane = contract?.lanes?.[0];

  if (!contract || !lane) return null;

  const activeConnections = authSummary?.activeConnections ?? health?.accountProfile?.activeConnections ?? null;
  const maxConnections = authSummary?.maxConnections ?? health?.accountProfile?.maxConnections ?? null;
  const remainingConnections = activeConnections !== null && maxConnections !== null
    ? Math.max(maxConnections - activeConnections, 0)
    : null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[lane.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{lane.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{contract.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[lane.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">
        Provider lines: {activeConnections !== null && maxConnections !== null ? `${activeConnections}/${maxConnections} in use` : 'Waiting on fresh line proof'}
      </p>
      <p className="mt-3 text-sm leading-6 text-white/85">
        Launch room: {remainingConnections === null ? 'Pending fresh capacity proof.' : `${remainingConnections} line${remainingConnections === 1 ? '' : 's'} still open.`}
      </p>
      <p className="mt-3 text-sm leading-6 text-white/85">Pressure trigger: {lane.warningTrigger}</p>
      <p className="mt-3 text-sm leading-6 text-white/75">Next move: {lane.recommendedMove}</p>
    </div>
  );
}
