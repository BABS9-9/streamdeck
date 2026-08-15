'use client';

import { connectionStatusTone } from '@/lib/provider-signals';
import { SurfaceFallbackRankingRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Exact rescue leads',
  watch: 'Approximate rescue leads',
  recover: 'Hard recovery leads',
} as const;

type SurfaceFallbackRankingInlineProps = {
  runtime: SurfaceFallbackRankingRuntimeContract | null;
  title: string;
  badge: string;
};

export function SurfaceFallbackRankingInline({
  runtime,
  title,
  badge,
}: SurfaceFallbackRankingInlineProps) {
  const ranking = runtime?.rankings?.[0];

  if (!runtime || !ranking) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[ranking.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{ranking.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{runtime.summary}</p>
      {ranking.leader ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${connectionStatusTone[ranking.leader.status]}`}>
            {ranking.leader.status}
          </span>
          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
            {ranking.leader.providerName}
          </span>
        </div>
      ) : null}
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[ranking.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Current leader: {ranking.currentLeader}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Ranking evidence: {ranking.rankingEvidence}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Rerank when: {ranking.rerankTrigger}</p>
      <p className="mt-3 text-sm leading-6 text-white/75">Rescue order: {ranking.rescueOrder}</p>
      <p className="mt-3 text-sm leading-6 text-white/75">Runtime leader posture: {ranking.leaderStatusLabel}</p>
    </div>
  );
}
