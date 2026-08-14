'use client';

import { connectionStatusTone, formatProviderExpiry } from '@/lib/provider-signals';
import { SurfaceProviderPodiumRuntimeContract } from '@/lib/types';

const slotToneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

export function SurfaceProviderPodium({
  runtime,
  badge = 'Saved-provider podium',
  onSelectProvider,
}: {
  runtime: SurfaceProviderPodiumRuntimeContract | null;
  badge?: string;
  onSelectProvider?: (providerId: string) => void;
}) {
  if (!runtime || runtime.providerCount === 0) return null;

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-sky-200">{badge}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{runtime.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{runtime.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {runtime.providerCount} saved provider{runtime.providerCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {runtime.slots.map((slot) => {
          const provider = slot.provider;
          const isSwitchable = provider && !provider.isActive && onSelectProvider && slot.tone !== 'recover';

          return (
            <div
              key={`${runtime.screenId}-${slot.label}`}
              className={`rounded-[1.4rem] border p-4 ${slotToneClasses[slot.tone]}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/70">{slot.label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {provider?.providerName || 'Waiting for a saved provider'}
                  </p>
                </div>
                {provider ? (
                  <div className="flex flex-wrap gap-2">
                    {provider.isActive ? (
                      <span className="rounded-full border border-sky-300/30 bg-sky-500/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-sky-100">
                        Active
                      </span>
                    ) : null}
                    {runtime.recommendedProviderId === provider.providerId ? (
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">
                        Best next move
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-100/95">{slot.qualification}</p>

              {provider ? (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${connectionStatusTone[provider.status]}`}>
                      {provider.status}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                      {provider.trustLabel}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">Capacity</p>
                      <p className="mt-2 text-sm text-white">{slot.capacityLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">Expiry</p>
                      <p className="mt-2 text-sm text-white">{formatProviderExpiry(provider.expiresAt)}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-200">
                    {slot.postureSummary}
                  </p>
                </>
              ) : (
                <p className="mt-4 text-sm leading-6 text-slate-200">
                  Save another provider to make this slot useful during fallback, validation drift, or line pressure.
                </p>
              )}

              <p className="mt-4 text-sm leading-6 text-slate-200/90">
                Downgrade trigger: {slot.downgradeTrigger}
              </p>

              {isSwitchable ? (
                <button
                  onClick={() => onSelectProvider?.(provider.providerId)}
                  className="mt-4 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
                >
                  Switch now
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
