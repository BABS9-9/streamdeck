'use client';

import { MultiConnectionSwitchRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Quick switch is healthy',
  watch: 'Quick switch needs explicit copy',
  recover: 'Quick switch fails closed',
} as const;

type MultiConnectionSwitchInlineProps = {
  runtime: MultiConnectionSwitchRuntimeContract | null;
  title: string;
  badge: string;
  onSelectProvider?: (providerId: string) => void;
};

export function MultiConnectionSwitchInline({
  runtime,
  title,
  badge,
  onSelectProvider,
}: MultiConnectionSwitchInlineProps) {
  const provider = runtime?.providers[0] ?? null;
  const recommendedProvider = runtime?.providers.find(
    (entry) => entry.providerId === runtime.recommendedProviderId && !entry.isActive && entry.tone !== 'recover'
  ) ?? null;
  if (!runtime || !provider) return null;

  return (
    <div className={`rounded-[1.75rem] border p-6 ${toneStyles[runtime.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/80">{title}</p>
          <p className="mt-2 text-base font-medium text-white">{runtime.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-white/70">{toneLabels[runtime.tone]}</p>
      <p className="mt-2 text-sm leading-6 text-white">{runtime.detail}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Recent handoff: {runtime.recentHandoff}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Recommended move: {runtime.recommendedAction}</p>
      <p className="mt-3 text-sm leading-6 text-white/85">Fail closed: {provider.failClosedReason}</p>
      {recommendedProvider && onSelectProvider ? (
        <button
          onClick={() => onSelectProvider(recommendedProvider.providerId)}
          className="mt-4 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-white transition hover:bg-white/10"
        >
          Switch to {recommendedProvider.providerName}
        </button>
      ) : null}
    </div>
  );
}
