'use client';

import { connectionStatusTone, formatProviderExpiry } from '@/lib/provider-signals';
import { MockProviderManifest, SavedProviderHealthBoard, SavedProviderHealthEntry } from '@/lib/types';

type SurfaceProviderPodiumContract = NonNullable<MockProviderManifest['surfaceProviderPodiums']>[number];

const slotToneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const pickSlotProviders = (board: SavedProviderHealthBoard) => {
  const owner = board.recommendedProvider ?? board.activeProvider ?? null;
  const standby = board.providers.find((provider) => (
    provider.providerId !== owner?.providerId
    && !provider.warning
  )) ?? board.providers.find((provider) => provider.providerId !== owner?.providerId) ?? null;
  const blocked = board.providers.find((provider) => (
    provider.providerId !== owner?.providerId
    && provider.providerId !== standby?.providerId
    && Boolean(provider.warning)
  )) ?? board.providers.find((provider) => (
    provider.providerId !== owner?.providerId
    && provider.providerId !== standby?.providerId
  )) ?? null;

  return [owner, standby, blocked];
};

const getCapacityLabel = (provider: SavedProviderHealthEntry | null) => {
  if (!provider) return 'No saved provider yet';
  if (provider.activeConnections === null || provider.maxConnections === null) return 'Capacity unknown';
  return `${provider.activeConnections}/${provider.maxConnections} lines in use`;
};

export function SurfaceProviderPodium({
  contract,
  board,
  badge = 'Saved-provider podium',
  onSelectProvider,
}: {
  contract: SurfaceProviderPodiumContract | null;
  board: SavedProviderHealthBoard;
  badge?: string;
  onSelectProvider?: (providerId: string) => void;
}) {
  if (!contract || board.providers.length === 0) return null;

  const slotProviders = pickSlotProviders(board);

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-sky-200">{badge}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{contract.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{contract.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {board.providers.length} saved provider{board.providers.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {contract.slots.slice(0, 3).map((slot, index) => {
          const provider = slotProviders[index];
          const isSwitchable = provider && !provider.isActive && onSelectProvider && slot.tone !== 'recover';

          return (
            <div
              key={`${contract.screenId}-${slot.label}`}
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
                    {board.recommendedProvider?.providerId === provider.providerId ? (
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
                      <p className="mt-2 text-sm text-white">{getCapacityLabel(provider)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">Expiry</p>
                      <p className="mt-2 text-sm text-white">{formatProviderExpiry(provider.expiresAt)}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-200">
                    {provider.warning || provider.statusMessage || 'Provider posture is stable enough to stay visible on this surface.'}
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
