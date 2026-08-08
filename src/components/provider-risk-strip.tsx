'use client';

import { MockProviderHealth } from '@/lib/types';
import { ProviderRecoveryRail } from './provider-recovery-rail';
import { ProviderTrustStack } from './provider-trust-stack';

type ScreenId = 'login' | 'home' | 'live';

const surfaceCopy: Record<ScreenId, { eyebrow: string; title: string; detail: string; tone: 'sky' | 'amber' }> = {
  login: {
    eyebrow: 'Provider risk strip',
    title: 'Connect with the current provider story in view',
    detail: 'Login should show provider pressure before Connect implies the current source still safely owns Home.',
    tone: 'sky',
  },
  home: {
    eyebrow: 'Provider risk strip',
    title: 'Keep browse trust attached to the hero',
    detail: 'Home should carry the same provider-risk story as the featured rail so the next launch stays honest.',
    tone: 'sky',
  },
  live: {
    eyebrow: 'Provider risk strip',
    title: 'Warn before the user blames the channel',
    detail: 'Live should surface auth, expiry, and line pressure before the selected card gets blamed for provider trouble.',
    tone: 'amber',
  },
};

export function ProviderRiskStrip({
  health,
  screenId,
  providerLabel,
  providerDetail,
}: {
  health: MockProviderHealth | null;
  screenId: ScreenId;
  providerLabel?: string | null;
  providerDetail?: string | null;
}) {
  if (!health) return null;

  const copy = surfaceCopy[screenId];
  const recoveryPlan = health.surfaceRecoveryPlans?.[screenId];
  const riskCount = health.trustSignals?.filter((signal) => signal.tone === 'warning').length ?? 0;
  const headlineMeta = providerLabel
    ? `${providerLabel}${providerDetail ? ` · ${providerDetail}` : ''}`
    : providerDetail || null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{copy.eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{copy.title}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-300">{copy.detail}</p>
        </div>
        <div className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.24em] ${riskCount > 0 ? 'border-amber-400/20 bg-amber-500/10 text-amber-100' : 'border-sky-400/20 bg-sky-500/10 text-sky-100'}`}>
          {riskCount > 0 ? `${riskCount} risk signal${riskCount === 1 ? '' : 's'}` : 'All clear'}
        </div>
      </div>

      <ProviderTrustStack
        className="mt-5"
        title="Cross-surface provider health"
        headline={health.operatorHeadline ? {
          ...health.operatorHeadline,
          detail: headlineMeta ? `${health.operatorHeadline.detail} ${headlineMeta}` : health.operatorHeadline.detail,
        } : null}
        signals={health.trustSignals || []}
        columnsClassName="grid gap-3 lg:grid-cols-3"
      />

      {recoveryPlan ? (
        <ProviderRecoveryRail
          eyebrow="Recovery route"
          title={recoveryPlan.title}
          detail={recoveryPlan.detail}
          tone={copy.tone}
          actions={[{ label: recoveryPlan.cta, tone: 'secondary' }]}
        />
      ) : null}
    </section>
  );
}
