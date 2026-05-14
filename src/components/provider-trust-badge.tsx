'use client';

type ProviderTrustBadgeProps = {
  eyebrow?: string;
  label: string;
  detail?: string | null;
  tone?: 'emerald' | 'sky' | 'amber' | 'rose';
  meta?: string | null;
  compact?: boolean;
};

const toneClasses: Record<NonNullable<ProviderTrustBadgeProps['tone']>, { shell: string; eyebrow: string; label: string; detail: string; meta: string }> = {
  emerald: {
    shell: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
    eyebrow: 'text-emerald-200',
    label: 'text-white',
    detail: 'text-emerald-100/75',
    meta: 'text-emerald-100/90',
  },
  sky: {
    shell: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
    eyebrow: 'text-sky-200',
    label: 'text-white',
    detail: 'text-sky-100/75',
    meta: 'text-sky-100/90',
  },
  amber: {
    shell: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
    eyebrow: 'text-amber-200',
    label: 'text-white',
    detail: 'text-amber-100/75',
    meta: 'text-amber-100/90',
  },
  rose: {
    shell: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
    eyebrow: 'text-rose-200',
    label: 'text-white',
    detail: 'text-rose-100/75',
    meta: 'text-rose-100/90',
  },
};

export function ProviderTrustBadge({ eyebrow = 'Provider trust', label, detail, tone = 'emerald', meta, compact = false }: ProviderTrustBadgeProps) {
  const palette = toneClasses[tone];

  return (
    <div className={`rounded-2xl border ${compact ? 'px-3 py-2' : 'px-3 py-3'} ${palette.shell}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={`text-[10px] uppercase tracking-[0.2em] ${palette.eyebrow}`}>{eyebrow}</p>
          <p className={`mt-1 text-sm font-medium ${palette.label}`}>{label}</p>
          {detail ? <p className={`mt-1 text-[11px] leading-5 ${palette.detail}`}>{detail}</p> : null}
        </div>
        {meta ? <span className={`text-[10px] uppercase tracking-[0.2em] ${palette.meta}`}>{meta}</span> : null}
      </div>
    </div>
  );
}
