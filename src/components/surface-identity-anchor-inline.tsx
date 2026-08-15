'use client';

import { SurfaceIdentityAnchorRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Identity is intact',
  watch: 'Identity is softening',
  recover: 'Identity must be restated',
} as const;

type SurfaceIdentityAnchorInlineProps = {
  runtime: SurfaceIdentityAnchorRuntimeContract | null;
  title: string;
  badge: string;
};

export function SurfaceIdentityAnchorInline({
  runtime,
  title,
  badge,
}: SurfaceIdentityAnchorInlineProps) {
  const anchor = runtime?.anchors?.[0];

  if (!runtime || !anchor) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[anchor.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{anchor.label}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-100">{runtime.summary}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[anchor.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white/85">Owner status: {anchor.identityStatus}</p>
      <p className="mt-2 text-sm leading-6 text-white">Must stay visible: {anchor.mustStayVisible}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Preserves meaning: {anchor.preservesMeaning}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Break trigger: {anchor.breakTrigger}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Runtime owner: {anchor.ownerStatusLabel}</p>
    </div>
  );
}
