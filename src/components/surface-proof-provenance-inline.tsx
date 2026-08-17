'use client';

import { MockProviderManifest } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
} as const;

const toneLabels = {
  ready: 'Fresh proof is still doing the work',
  watch: 'Continuity is helping carry confidence',
  recover: 'Rescue logic is now the main proof source',
} as const;

type SurfaceProofProvenanceInlineProps = {
  contract: MockProviderManifest['surfaceProofProvenances'][number] | null;
  title: string;
  badge: string;
};

export function SurfaceProofProvenanceInline({
  contract,
  title,
  badge,
}: SurfaceProofProvenanceInlineProps) {
  const source = contract?.sources?.[0];

  if (!contract || !source) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[source.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{source.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{contract.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[source.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Current proof source: {source.currentSource}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Why it is still honest: {source.honestyReason}</p>
      <p className="mt-3 text-sm leading-6 text-white/75">Disclosure trigger: {source.disclosureTrigger}</p>
    </div>
  );
}
