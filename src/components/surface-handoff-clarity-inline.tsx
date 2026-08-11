'use client';

import { MockProviderManifest } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Advance is honest',
  watch: 'Hold if proof slips',
  recover: 'Fallback owns next move',
} as const;

type SurfaceHandoffClarityInlineProps = {
  criteria: MockProviderManifest['surfaceExitCriteria'][number] | null;
  handoff: MockProviderManifest['surfaceHandoffs'][number] | null;
  title: string;
  badge: string;
};

export function SurfaceHandoffClarityInline({
  criteria,
  handoff,
  title,
  badge,
}: SurfaceHandoffClarityInlineProps) {
  if (!criteria || !handoff) return null;

  const tone = handoff.confidenceLabel.startsWith('Go-safe')
    ? 'ready'
    : handoff.confidenceLabel.startsWith('Watch-safe')
      ? 'watch'
      : 'recover';

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{criteria.title}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{criteria.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">Advance when: {criteria.goSignal}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Hold when: {criteria.holdSignal}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Carry forward: {handoff.carriesForward[0] || 'Preserve the active launch context.'}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">{handoff.fallbackLabel}: {handoff.fallbackDetail}</p>
    </div>
  );
}
