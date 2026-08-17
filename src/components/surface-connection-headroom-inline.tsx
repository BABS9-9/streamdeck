'use client';

import { connectionStatusTone } from '@/lib/provider-signals';
import { SurfaceConnectionHeadroomRuntimeContract } from '@/lib/types';

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
  runtime: SurfaceConnectionHeadroomRuntimeContract | null;
  title: string;
  badge: string;
};

export function SurfaceConnectionHeadroomInline({
  runtime,
  title,
  badge,
}: SurfaceConnectionHeadroomInlineProps) {
  const lane = runtime?.lanes?.[0];

  if (!runtime || !lane) return null;

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
      <p className="mt-3 text-sm leading-6 text-slate-100">{runtime.summary}</p>
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
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[lane.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">
        Provider lines: {lane.activeConnections !== null && lane.maxConnections !== null ? `${lane.activeConnections}/${lane.maxConnections} in use` : 'Waiting on fresh line proof'}
      </p>
      <p className="mt-3 text-sm leading-6 text-white/85">
        Launch room: {lane.remainingConnections === null ? 'Pending fresh capacity proof.' : `${lane.remainingConnections} line${lane.remainingConnections === 1 ? '' : 's'} still open.`}
      </p>
      <p className="mt-3 text-sm leading-6 text-white/85">Current window: {lane.currentWindow}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Pressure trigger: {lane.warningTrigger}</p>
      <p className="mt-3 text-sm leading-6 text-white/75">Next move: {lane.recommendedMove}</p>
      <p className="mt-3 text-sm leading-6 text-white/75">Runtime capacity posture: {lane.ownerStatusLabel}</p>
    </div>
  );
}
