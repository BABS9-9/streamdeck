'use client';

import { MockProviderManifest } from '@/lib/types';

type ScreenId = 'login' | 'home' | 'live';

const surfaceCopy: Record<ScreenId, { eyebrow: string; title: string; detail: string }> = {
  login: {
    eyebrow: 'Phase 1 edge',
    title: 'Why this login is worth building around',
    detail: 'Saved-provider switching, profile-safe expansion, and cross-provider search all start with the connection shell telling the truth about who owns the next launch.',
  },
  home: {
    eyebrow: 'Home advantage',
    title: 'The product bets visible on Home',
    detail: 'Home should prove collections, resume continuity, and provider-aware browsing together before the user ever reaches a utility-style screen.',
  },
  live: {
    eyebrow: 'Live advantage',
    title: 'The live-browser features that should feel different',
    detail: 'Live has to surface preview, NOW / NEXT, and stream-health truth without slowing channel surfing down.',
  },
};

const spotlightPriority: Record<ScreenId, string[]> = {
  login: ['saved-provider-podium', 'provider-choice-truth', 'launch-readiness', 'launch-scorecard', 'proof-debt', 'proof-provenance', 'hold-receipt', 'claim-ceiling', 'connection-headroom', 'rescue-receipt', 'reset-boundary', 'identity-anchor', 'canonical-provider-identity', 'fallback-ranking', 'fallback-equivalence', 'fallback-expiry-truth', 'guide-freshness-board'],
  home: ['saved-provider-podium', 'provider-choice-truth', 'launch-readiness', 'launch-scorecard', 'proof-debt', 'proof-provenance', 'hold-receipt', 'claim-ceiling', 'connection-headroom', 'rescue-receipt', 'reset-boundary', 'identity-anchor', 'canonical-provider-identity', 'fallback-ranking', 'fallback-equivalence', 'fallback-expiry-truth', 'guide-freshness-board'],
  live: ['saved-provider-podium', 'provider-choice-truth', 'launch-readiness', 'launch-scorecard', 'proof-debt', 'proof-provenance', 'hold-receipt', 'claim-ceiling', 'connection-headroom', 'rescue-receipt', 'reset-boundary', 'identity-anchor', 'canonical-provider-identity', 'fallback-ranking', 'fallback-equivalence', 'fallback-expiry-truth', 'guide-freshness-board'],
};

export function DifferentiatorSpotlight({
  manifest,
  screenId,
  limit = 3,
}: {
  manifest: MockProviderManifest | null;
  screenId: ScreenId;
  limit?: number;
}) {
  const differentiators = manifest?.competitiveDifferentiators
    .filter((item) => item.surfaces.includes(screenId))
    .sort((a, b) => {
      const priority = spotlightPriority[screenId];
      const aIndex = priority.indexOf(a.slug);
      const bIndex = priority.indexOf(b.slug);
      const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return normalizedA - normalizedB;
    })
    .slice(0, limit);

  if (!differentiators?.length) return null;

  const copy = surfaceCopy[screenId];

  return (
    <section className="rounded-[2rem] border border-emerald-400/20 bg-emerald-500/10 p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">{copy.eyebrow}</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold text-white">{copy.title}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-200">{copy.detail}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          Competitive brief
        </span>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        {differentiators.map((item) => (
          <article key={item.slug} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{item.feature}</p>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-100">
                {item.buildPhase}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-200">{item.pitch}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-emerald-200">Gap</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">{item.competitiveGap}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-emerald-200">Architecture</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">{item.architectureNotes}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
