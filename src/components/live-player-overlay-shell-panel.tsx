'use client';

import { LivePlayerOverlayRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

export function LivePlayerOverlayShellPanel({
  contract,
  onPrimaryAction,
  onSecondaryAction,
}: {
  contract: LivePlayerOverlayRuntimeContract;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}) {
  return (
    <section className={`rounded-[1.4rem] border p-4 ${toneStyles[contract.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/70">{contract.eyebrow}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{contract.title}</h3>
          <p className="mt-2 text-sm font-medium text-white/90">{contract.summary}</p>
          <p className="mt-2 text-sm leading-6 text-white/80">{contract.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">
            {contract.infoBarState}
          </span>
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">
            {contract.progressState}
          </span>
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">
            {contract.actionKind}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-[1.6rem] border border-white/15 bg-black/25 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Overlay hero</p>
            <h4 className="mt-2 text-xl font-semibold text-white">{contract.nowPlayingLabel}</h4>
            <p className="mt-2 text-sm text-white/80">{contract.providerLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {contract.statusChips.map((chip) => (
              <span
                key={`${chip.label}-${chip.value}`}
                className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.18em] ${
                  chip.tone === 'ready'
                    ? 'border-sky-300/20 bg-sky-500/10 text-sky-100'
                    : chip.tone === 'watch'
                      ? 'border-amber-300/20 bg-amber-500/10 text-amber-100'
                      : 'border-rose-300/20 bg-rose-500/10 text-rose-100'
                }`}
              >
                {chip.label}: {chip.value}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.nowLabel}</p>
            <p className="mt-3 text-sm leading-6 text-white/90">{contract.nextLabel}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Overlay continuity</p>
            <p className="mt-3 text-sm font-semibold text-white">{contract.continuityLabel}</p>
            <p className="mt-2 text-xs leading-5 text-white/75">{contract.overlayCopy}</p>
          </article>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Progress lane</p>
            <p className="mt-3 text-sm font-semibold text-white">{contract.progressLabel}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Seek posture</p>
            <p className="mt-3 text-sm font-semibold text-white">{contract.seekWindowLabel}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Audio</p>
            <p className="mt-3 text-sm font-semibold text-white">{contract.audioLabel}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Subtitles</p>
            <p className="mt-3 text-sm font-semibold text-white">{contract.subtitleLabel}</p>
          </article>
        </div>

        <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.focusRuntime.eyebrow}</p>
              <p className="mt-2 text-sm font-semibold text-white">{contract.focusRuntime.summary}</p>
              <p className="mt-2 text-xs leading-5 text-white/75">{contract.focusRuntime.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {contract.focusRuntime.railState}
              </span>
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {contract.focusRuntime.primaryFocusLabel}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Primary focus</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.focusRuntime.primaryFocusLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Secondary focus</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.focusRuntime.secondaryFocusLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Support lane</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.focusRuntime.supportFocusLabel}</p>
            </article>
          </div>

          <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.focusRuntime.nextMove.label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {contract.focusRuntime.nextMove.buttons.map((button) => (
                <span
                  key={`${contract.focusRuntime.nextMove.label}-${button}`}
                  className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/80"
                >
                  {button}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-white/90">{contract.focusRuntime.nextMove.detail}</p>
          </div>
        </div>

        {contract.primaryActionLabel ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={onPrimaryAction}
              disabled={!onPrimaryAction}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {contract.primaryActionLabel}
            </button>
            {contract.secondaryActionLabel ? (
              <button
                onClick={onSecondaryAction}
                disabled={!onSecondaryAction}
                className="rounded-full border border-white/15 bg-black/20 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {contract.secondaryActionLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {contract.quickActions.map((action) => (
          <article
            key={action.id}
            className={`rounded-2xl border p-4 ${
              action.tone === 'ready'
                ? 'border-sky-300/20 bg-sky-500/10'
                : action.tone === 'watch'
                  ? 'border-amber-300/20 bg-amber-500/10'
                  : 'border-rose-300/20 bg-rose-500/10'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{action.label}</p>
              <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {action.state}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{action.summary}</p>
            <p className="mt-2 text-xs leading-5 text-white/80">{action.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {contract.lanes.map((lane) => (
          <article
            key={lane.id}
            className={`rounded-2xl border p-4 ${
              lane.tone === 'ready'
                ? 'border-sky-300/20 bg-sky-500/10'
                : lane.tone === 'watch'
                  ? 'border-amber-300/20 bg-amber-500/10'
                  : 'border-rose-300/20 bg-rose-500/10'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{lane.label}</p>
              <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {lane.state}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{lane.summary}</p>
            <p className="mt-2 text-xs leading-5 text-white/80">{lane.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {contract.focusRuntime.focusGroups.map((group) => (
          <article
            key={group.id}
            className={`rounded-2xl border p-4 ${
              group.tone === 'ready'
                ? 'border-sky-300/20 bg-sky-500/10'
                : group.tone === 'watch'
                  ? 'border-amber-300/20 bg-amber-500/10'
                  : 'border-rose-300/20 bg-rose-500/10'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{group.label}</p>
              <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {group.railState}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{group.summary}</p>
            <p className="mt-2 text-xs leading-5 text-white/80">{group.detail}</p>
            <div className="mt-3 space-y-3">
              {group.steps.map((step) => (
                <div key={step.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">{step.label}</p>
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">
                      {step.state}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {step.buttons.map((button) => (
                      <span
                        key={`${step.id}-${button}`}
                        className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75"
                      >
                        {button}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-medium text-white">{step.summary}</p>
                  <p className="mt-2 text-xs leading-5 text-white/75">{step.detail}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.nextMove.label}</p>
        <p className="mt-3 text-sm leading-6 text-white/90">{contract.nextMove.detail}</p>
      </div>
    </section>
  );
}
