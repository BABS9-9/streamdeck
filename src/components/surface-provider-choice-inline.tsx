'use client';

import { SurfaceProviderChoiceRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Auto-pick allowed',
  watch: 'Choice may split',
  recover: 'Ask explicitly',
} as const;

type SurfaceProviderChoiceInlineProps = {
  runtime: SurfaceProviderChoiceRuntimeContract | null;
  title: string;
  badge: string;
};

export function SurfaceProviderChoiceInline({
  runtime,
  title,
  badge,
}: SurfaceProviderChoiceInlineProps) {
  const choice = runtime?.choices?.[0];

  if (!runtime || !choice) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[choice.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{choice.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{runtime.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[choice.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">{choice.choiceStatus}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">{choice.ownerStatusLabel}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Auto-pick trigger: {choice.autoPickTrigger}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Proof: {choice.equivalenceProof}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Ask the user when: {choice.userChoiceTrigger}</p>
    </div>
  );
}
