'use client';

import { connectionStatusTone } from '@/lib/provider-signals';
import { SurfaceProviderPodiumRuntimeContract } from '@/lib/types';

const toneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

export function SurfaceProviderPodiumInline({
  runtime,
  title,
  badge = 'Saved-provider podium',
  onSelectProvider,
}: {
  runtime: SurfaceProviderPodiumRuntimeContract | null;
  title: string;
  badge?: string;
  onSelectProvider?: (providerId: string) => void;
}) {
  if (!runtime || runtime.providerCount === 0) return null;

  return (
    <section className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-sky-200">{badge}</p>
          <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{runtime.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {runtime.providerCount} saved
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {runtime.slots.map((slot) => {
          const provider = slot.provider;
          const canSwitch = provider && onSelectProvider && !provider.isActive && slot.tone !== 'recover';

          return (
            <article
              key={`${runtime.screenId}-${slot.label}`}
              className={`rounded-[1.2rem] border p-3 ${toneClasses[slot.tone]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/65">{slot.label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {provider?.providerName || 'No saved provider'}
                  </p>
                </div>
                {provider ? (
                  <span className={`rounded-full border px-2 py-1 text-[9px] uppercase tracking-[0.2em] ${connectionStatusTone[provider.status]}`}>
                    {provider.status}
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-100/95">{slot.qualification}</p>
              <p className="mt-3 text-xs leading-5 text-slate-200/90">{slot.postureSummary}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/60">{slot.capacityLabel}</p>

              {canSwitch ? (
                <button
                  onClick={() => onSelectProvider?.(provider.providerId)}
                  className="mt-3 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
                >
                  Switch now
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
