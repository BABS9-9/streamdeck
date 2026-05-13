'use client';

import Link from 'next/link';

type RecoveryAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  meta?: string;
  tone?: 'primary' | 'secondary';
};

type ProviderRecoveryRailProps = {
  eyebrow: string;
  title: string;
  detail: string;
  tone?: 'amber' | 'emerald' | 'sky';
  actions?: RecoveryAction[];
};

const toneClasses: Record<NonNullable<ProviderRecoveryRailProps['tone']>, { shell: string; eyebrow: string; detail: string; primary: string; secondary: string; meta: string }> = {
  amber: {
    shell: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
    eyebrow: 'text-amber-200',
    detail: 'text-slate-100',
    primary: 'bg-white/10 text-white hover:bg-white/20',
    secondary: 'border-white/10 bg-black/20 text-white/85 hover:bg-white/10',
    meta: 'text-amber-50/80',
  },
  emerald: {
    shell: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
    eyebrow: 'text-emerald-200',
    detail: 'text-slate-100',
    primary: 'bg-emerald-400 text-black hover:bg-emerald-300',
    secondary: 'border-white/10 bg-black/20 text-white/85 hover:bg-white/10',
    meta: 'text-emerald-50/80',
  },
  sky: {
    shell: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
    eyebrow: 'text-sky-200',
    detail: 'text-slate-100',
    primary: 'bg-sky-400 text-slate-950 hover:bg-sky-300',
    secondary: 'border-white/10 bg-black/20 text-white/85 hover:bg-white/10',
    meta: 'text-sky-50/80',
  },
};

export function ProviderRecoveryRail({ eyebrow, title, detail, tone = 'amber', actions = [] }: ProviderRecoveryRailProps) {
  const palette = toneClasses[tone];

  return (
    <div className={`rounded-2xl border p-4 ${palette.shell}`}>
      <p className={`text-[11px] uppercase tracking-[0.22em] ${palette.eyebrow}`}>{eyebrow}</p>
      <p className={`mt-2 text-sm ${palette.detail}`}>
        <span className="font-medium text-white">{title}</span>
        {' '}
        {detail}
      </p>
      {actions.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action) => {
            const className = `rounded-xl border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.22em] transition ${action.tone === 'secondary' ? palette.secondary : palette.primary}`;

            if (action.href) {
              return (
                <Link
                  key={`${action.label}-${action.meta || ''}`}
                  href={action.href}
                  onClick={action.onClick}
                  className={className}
                >
                  {action.label}
                  {action.meta ? <span className={`ml-2 ${palette.meta}`}>{action.meta}</span> : null}
                </Link>
              );
            }

            return (
              <button
                key={`${action.label}-${action.meta || ''}`}
                onClick={action.onClick}
                className={className}
              >
                {action.label}
                {action.meta ? <span className={`ml-2 ${palette.meta}`}>{action.meta}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
