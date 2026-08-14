'use client';

import { MockProviderManifest } from '@/lib/types';

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
  contract: MockProviderManifest['surfaceFallbackRankingContracts'][number] | null;
  title: string;
  badge: string;
};

export function SurfaceFallbackRankingInline({
  contract,
  title,
  badge,
}: SurfaceFallbackRankingInlineProps) {
  const ranking = contract?.rankings?.[0];

  if (!contract || !ranking) return null;

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
      <p className="mt-3 text-sm leading-6 text-slate-100">{contract.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[ranking.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Current leader: {ranking.currentLeader}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Ranking evidence: {ranking.rankingEvidence}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Rerank when: {ranking.rerankTrigger}</p>
    </div>
  );
}
