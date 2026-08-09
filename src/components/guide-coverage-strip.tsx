'use client';

import { ProviderGuideContinuityContract, ProviderGuideCoverageReport } from '@/lib/types';

const toneClasses: Record<ProviderGuideCoverageReport['status'], string> = {
  fresh: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  partial: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
  stale: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  error: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
  empty: 'border-white/10 bg-white/[0.04] text-slate-300',
};

const statToneClasses: Record<ProviderGuideCoverageReport['status'], string> = {
  fresh: 'text-emerald-200',
  partial: 'text-sky-200',
  stale: 'text-amber-200',
  error: 'text-rose-200',
  empty: 'text-slate-300',
};

const formatUpdatedAt = (value: number | null) => {
  if (!value) return 'No guide sync yet';
  const diffMinutes = Math.max(1, Math.round((Date.now() - value) / 60000));
  return `Freshest guide sync ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
};

export function GuideCoverageStrip({
  title,
  report,
  emptyMessage,
  streamLabels,
  continuity,
}: {
  title: string;
  report: ProviderGuideCoverageReport | null;
  emptyMessage?: string;
  streamLabels?: Record<number, string>;
  continuity?: ProviderGuideContinuityContract | null;
}) {
  if (!report || report.requestedCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
        {emptyMessage || 'No live-guide targets are loaded yet.'}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClasses[report.status]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{title}</p>
          <p className="mt-2 text-sm font-medium">{report.summary}</p>
        </div>
        <p className={`text-xs uppercase tracking-[0.22em] ${statToneClasses[report.status]}`}>
          {formatUpdatedAt(report.freshestUpdatedAt)}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Fresh</p>
          <p className="mt-1 text-sm font-semibold text-white">{report.freshCount}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Refreshing</p>
          <p className="mt-1 text-sm font-semibold text-white">{report.refreshingCount}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Stale</p>
          <p className="mt-1 text-sm font-semibold text-white">{report.staleCount}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Errors</p>
          <p className="mt-1 text-sm font-semibold text-white">{report.errorCount}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Cache</p>
          <p className="mt-1 text-sm font-semibold text-white">{report.cacheCount}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Network</p>
          <p className="mt-1 text-sm font-semibold text-white">{report.networkCount}</p>
        </div>
      </div>

      {continuity ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Guide owner</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {continuity.ownerLabel}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {continuity.ownerDetail}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Next safe move</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {continuity.nextMoveLabel}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {continuity.nextMoveDetail}
            </p>
          </div>
        </div>
      ) : null}

      {continuity?.issueSummary ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Guide trust note</p>
          <p className="mt-1 text-sm font-medium text-white">{continuity.trustSummary}</p>
          <p className="mt-1 text-xs text-slate-400">{continuity.issueSummary}</p>
        </div>
      ) : null}

      {report.items.some((item) => item.status !== 'fresh') ? (
        <div className="mt-4 grid gap-2">
          {report.items
            .filter((item) => item.status !== 'fresh')
            .slice(0, 3)
            .map((item) => (
              <div key={item.streamId} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-white">{streamLabels?.[item.streamId] || `Channel ${item.streamId}`}</p>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{item.status}</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {item.error
                    ? item.error
                    : item.ageMinutes
                      ? `Last guide sync ${item.ageMinutes} minute${item.ageMinutes === 1 ? '' : 's'} ago`
                      : 'Guide data has not synced yet.'}
                </p>
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}
