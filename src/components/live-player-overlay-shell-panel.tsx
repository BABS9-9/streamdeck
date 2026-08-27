'use client';

import { LivePlayerOverlayRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const executionToneStyles = {
  completed: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100',
  blocked: 'border-amber-300/20 bg-amber-500/10 text-amber-100',
  unavailable: 'border-slate-300/20 bg-slate-500/10 text-slate-100',
} as const;

const availabilityToneStyles = {
  ready: 'border-sky-300/20 bg-sky-500/10 text-sky-100',
  watch: 'border-amber-300/20 bg-amber-500/10 text-amber-100',
  blocked: 'border-rose-300/20 bg-rose-500/10 text-rose-100',
} as const;

export function LivePlayerOverlayShellPanel({
  contract,
  onPrimaryAction,
  onSecondaryAction,
  onCommandDispatch,
  onPlaybackAction,
}: {
  contract: LivePlayerOverlayRuntimeContract;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onCommandDispatch?: (commandId: 'ok' | 'back' | 'left-right' | 'up-down' | 'audio-subtitle') => void;
  onPlaybackAction?: (actionId: LivePlayerOverlayRuntimeContract['playbackRuntime']['actions'][number]['id']) => void;
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
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.playbackRuntime.eyebrow}</p>
              <p className="mt-2 text-sm font-semibold text-white">{contract.playbackRuntime.summary}</p>
              <p className="mt-2 text-xs leading-5 text-white/75">{contract.playbackRuntime.detail}</p>
              <p className="mt-2 text-xs leading-5 text-white/65">{contract.playbackRuntime.guideFreshnessDetail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {contract.playbackRuntime.programState}
              </span>
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {contract.playbackRuntime.guideFreshnessLabel}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Current program</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.playbackRuntime.currentProgramLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Next / fallback</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.playbackRuntime.nextProgramLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Metadata owner</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.playbackRuntime.metadataSummary}</p>
              <p className="mt-2 text-xs leading-5 text-white/75">{contract.playbackRuntime.metadataOwnerLabel}</p>
              <p className="mt-2 text-xs leading-5 text-white/65">{contract.playbackRuntime.fallbackMetadataLabel}</p>
              <p className="mt-2 text-xs leading-5 text-white/60">{contract.playbackRuntime.metadataFallbackDetail}</p>
            </article>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {contract.playbackRuntime.metadataWitnesses.map((witness) => (
              <article
                key={witness.id}
                className={`rounded-2xl border p-4 ${
                  witness.tone === 'ready'
                    ? 'border-sky-300/20 bg-sky-500/10 text-sky-100'
                    : witness.tone === 'watch'
                      ? 'border-amber-300/20 bg-amber-500/10 text-amber-100'
                      : 'border-rose-300/20 bg-rose-500/10 text-rose-100'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/80">{witness.label}</p>
                  <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">
                    {witness.state} / {witness.source}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{witness.providerLabel}</p>
                <p className="mt-2 text-sm text-white/85">{witness.summary}</p>
                <p className="mt-2 text-xs leading-5 text-white/70">{witness.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {contract.playbackRuntime.freshnessWitnesses.map((witness) => (
              <article
                key={witness.id}
                className={`rounded-2xl border p-4 ${
                  witness.tone === 'ready'
                    ? 'border-sky-300/20 bg-sky-500/10 text-sky-100'
                    : witness.tone === 'watch'
                      ? 'border-amber-300/20 bg-amber-500/10 text-amber-100'
                      : 'border-rose-300/20 bg-rose-500/10 text-rose-100'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/80">{witness.label}</p>
                  <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">
                    {witness.state} / {witness.source}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{witness.ageLabel}</p>
                <p className="mt-2 text-sm text-white/85">{witness.summary}</p>
                <p className="mt-2 text-xs leading-5 text-white/70">{witness.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Live edge</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.playbackRuntime.liveEdgeLabel}</p>
              <p className="mt-2 text-xs leading-5 text-white/70">{contract.playbackRuntime.liveEdgeDetail}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Seek eligibility</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.playbackRuntime.seekEligibilityLabel}</p>
              <p className="mt-2 text-xs leading-5 text-white/70">{contract.playbackRuntime.seekEligibilityDetail}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Program window</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.playbackRuntime.programWindowLabel}</p>
              <p className="mt-2 text-xs leading-5 text-white/70">{contract.playbackRuntime.programWindowDetail}</p>
            </article>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {contract.playbackRuntime.windowWitnesses.map((witness) => (
              <article
                key={witness.id}
                className={`rounded-2xl border p-4 ${
                  witness.tone === 'ready'
                    ? 'border-sky-300/20 bg-sky-500/10 text-sky-100'
                    : witness.tone === 'watch'
                      ? 'border-amber-300/20 bg-amber-500/10 text-amber-100'
                      : 'border-rose-300/20 bg-rose-500/10 text-rose-100'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/80">{witness.label}</p>
                  <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">
                    {witness.state}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{witness.summary}</p>
                <p className="mt-2 text-xs leading-5 text-white/70">{witness.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Selected audio</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.playbackRuntime.audioTrackLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Selected subtitles</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.playbackRuntime.subtitleTrackLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Track posture</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.playbackRuntime.trackSummary}</p>
            </article>
          </div>

          <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Action routing</p>
            <p className="mt-3 text-sm font-semibold text-white">{contract.playbackRuntime.actionSummary}</p>
            <p className="mt-2 text-xs leading-5 text-white/70">{contract.playbackRuntime.actionOwnerSummary}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {contract.playbackRuntime.actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => onPlaybackAction?.(action.id)}
                  disabled={!onPlaybackAction || !action.available}
                  className={`rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.22em] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    action.tone === 'ready'
                      ? 'border-sky-300/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15'
                      : action.tone === 'watch'
                        ? 'border-amber-300/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15'
                        : 'border-rose-300/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {contract.playbackRuntime.actions.map((action) => (
              <article
                key={`${action.id}-witness`}
                className={`rounded-2xl border p-4 ${availabilityToneStyles[action.availabilityState]}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/80">{action.label}</p>
                  <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">
                    {action.available ? 'routable' : 'not routed'}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{action.availabilityLabel}</p>
                <p className="mt-2 text-xs leading-5 text-white/75">{action.ownerLabel}</p>
                <p className="mt-2 text-xs leading-5 text-white/70">{action.ownerDetail}</p>
                <p className="mt-2 text-xs leading-5 text-white/70">{action.availabilityDetail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.timelineRuntime.eyebrow}</p>
              <p className="mt-2 text-sm font-semibold text-white">{contract.timelineRuntime.summary}</p>
              <p className="mt-2 text-xs leading-5 text-white/75">{contract.timelineRuntime.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {contract.timelineRuntime.timelineState}
              </span>
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {contract.timelineRuntime.positionLabel}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Timeline coverage</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/65">
                {contract.timelineRuntime.coveragePercent === null
                  ? 'explicit posture only'
                  : `${Math.round(contract.timelineRuntime.coveragePercent)}%`}
              </p>
            </div>
            <div className="mt-4 h-3 rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${
                  contract.timelineRuntime.tone === 'ready'
                    ? 'bg-sky-300'
                    : contract.timelineRuntime.tone === 'watch'
                      ? 'bg-amber-300'
                      : 'bg-rose-300'
                }`}
                style={{ width: `${Math.max(0, contract.timelineRuntime.coveragePercent ?? 0)}%` }}
              />
            </div>
            <div className="relative mt-3 h-8">
              {contract.timelineRuntime.markers.map((marker) => (
                <div
                  key={marker.id}
                  className="absolute top-0 -translate-x-1/2"
                  style={{ left: `${Math.max(0, Math.min(100, marker.positionPercent ?? 50))}%` }}
                >
                  <div className="mx-auto h-3 w-3 rounded-full border border-white/20 bg-white/80" />
                  <p className="mt-2 whitespace-nowrap text-[10px] uppercase tracking-[0.16em] text-white/65">
                    {marker.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Elapsed</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.timelineRuntime.elapsedLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Remaining / window</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.timelineRuntime.remainingLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Window label</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.timelineRuntime.windowLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Live edge</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.timelineRuntime.liveEdgeLabel}</p>
            </article>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {contract.timelineRuntime.markers.map((marker) => (
              <article
                key={`detail-${marker.id}`}
                className={`rounded-2xl border p-4 ${
                  marker.tone === 'ready'
                    ? 'border-sky-300/20 bg-sky-500/10'
                    : marker.tone === 'watch'
                      ? 'border-amber-300/20 bg-amber-500/10'
                      : 'border-rose-300/20 bg-rose-500/10'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{marker.label}</p>
                  <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">
                    {marker.state}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{marker.summary}</p>
                <p className="mt-2 text-xs leading-5 text-white/80">{marker.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Timeline focus</p>
            <p className="mt-3 text-sm font-semibold text-white">{contract.timelineRuntime.focusLabel}</p>
            <p className="mt-2 text-xs leading-5 text-white/75">{contract.timelineRuntime.nextMove.detail}</p>
          </div>
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

        <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.interactionRuntime.eyebrow}</p>
              <p className="mt-2 text-sm font-semibold text-white">{contract.interactionRuntime.summary}</p>
              <p className="mt-2 text-xs leading-5 text-white/75">{contract.interactionRuntime.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {contract.interactionRuntime.visibilityState}
              </span>
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {contract.interactionRuntime.nextMove.label}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Open posture</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.interactionRuntime.openLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Close posture</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.interactionRuntime.closeLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Focus handoff</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.interactionRuntime.focusHandoffLabel}</p>
              <p className="mt-2 text-xs leading-5 text-white/75">{contract.interactionRuntime.focusHandoffDetail}</p>
            </article>
          </div>

          <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Reason path glue</p>
            <p className="mt-3 text-sm leading-6 text-white/90">{contract.interactionRuntime.reasonPath}</p>
          </div>

          <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-3xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Execution witness</p>
                <p className="mt-2 text-sm font-semibold text-white">{contract.interactionRuntime.executionSummary}</p>
                <p className="mt-2 text-xs leading-5 text-white/75">{contract.interactionRuntime.executionDetail}</p>
              </div>
              {contract.interactionRuntime.lastExecution ? (
                <span
                  className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.18em] ${
                    executionToneStyles[contract.interactionRuntime.lastExecution.outcome]
                  }`}
                >
                  {contract.interactionRuntime.lastExecution.outcome}
                </span>
              ) : null}
            </div>

            {contract.interactionRuntime.recentExecutions.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {contract.interactionRuntime.recentExecutions.map((execution) => (
                  <article
                    key={`${execution.commandId}-${execution.happenedAt}`}
                    className={`rounded-2xl border p-4 ${executionToneStyles[execution.outcome]}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-[0.22em]">{execution.label}</p>
                      <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/80">
                        {execution.visibilityState}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">{execution.dispatchKind}</p>
                    <p className="mt-2 text-xs leading-5 text-white/80">{execution.detail}</p>
                    {execution.targetProviderId ? (
                      <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/70">
                        Target {execution.targetProviderId}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.sessionRuntime.eyebrow}</p>
              <p className="mt-2 text-sm font-semibold text-white">{contract.sessionRuntime.summary}</p>
              <p className="mt-2 text-xs leading-5 text-white/75">{contract.sessionRuntime.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {contract.sessionRuntime.freshnessState}
              </span>
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {contract.sessionRuntime.commandCoverageLabel}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {contract.sessionRuntime.cards.map((card) => (
              <article
                key={card.id}
                className={`rounded-2xl border p-4 ${
                  card.tone === 'ready'
                    ? 'border-sky-300/20 bg-sky-500/10 text-sky-100'
                    : card.tone === 'watch'
                      ? 'border-amber-300/20 bg-amber-500/10 text-amber-100'
                      : 'border-rose-300/20 bg-rose-500/10 text-rose-100'
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/75">{card.label}</p>
                <p className="mt-3 text-sm font-semibold text-white">{card.value}</p>
                <p className="mt-2 text-xs leading-5 text-white/80">{card.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Session window</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.sessionRuntime.sessionAgeLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Last execution</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.sessionRuntime.lastExecutionAgeLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Dispatch readiness</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.sessionRuntime.dispatchReadinessLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Drift guard</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.sessionRuntime.driftLabel}</p>
            </article>
          </div>

          <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.sessionRuntime.nextMove.label}</p>
            <p className="mt-3 text-sm leading-6 text-white/90">{contract.sessionRuntime.nextMove.detail}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.commandRuntime.eyebrow}</p>
              <p className="mt-2 text-sm font-semibold text-white">{contract.commandRuntime.summary}</p>
              <p className="mt-2 text-xs leading-5 text-white/75">{contract.commandRuntime.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {contract.commandRuntime.activeZone}
              </span>
              <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {contract.commandRuntime.escalationState}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Primary command</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.commandRuntime.primaryCommandLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Recovery command</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.commandRuntime.recoveryCommandLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Exit command</p>
              <p className="mt-3 text-sm font-semibold text-white">{contract.commandRuntime.exitCommandLabel}</p>
            </article>
          </div>

          <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.commandRuntime.nextMove.label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {contract.commandRuntime.nextMove.buttons.map((button) => (
                <span
                  key={`${contract.commandRuntime.nextMove.label}-${button}`}
                  className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/80"
                >
                  {button}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-white/90">{contract.commandRuntime.nextMove.detail}</p>
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

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {contract.commandRuntime.commands.map((command) => (
          <article
            key={command.id}
            className={`rounded-2xl border p-4 ${
              command.tone === 'ready'
                ? 'border-sky-300/20 bg-sky-500/10'
                : command.tone === 'watch'
                  ? 'border-amber-300/20 bg-amber-500/10'
                  : 'border-rose-300/20 bg-rose-500/10'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{command.label}</p>
              <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">
                {command.activeZone}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {command.buttons.map((button) => (
                <span
                  key={`${command.id}-${button}`}
                  className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75"
                >
                  {button}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{command.summary}</p>
            <p className="mt-2 text-xs leading-5 text-white/80">{command.detail}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/60">{command.escalationLabel}</p>
            {(() => {
              const dispatch = contract.interactionRuntime.commandDispatches.find((entry) => entry.commandId === command.id);
              if (!dispatch) return null;

              return (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">{dispatch.label}</p>
                  <p className="mt-2 text-xs leading-5 text-white/75">{dispatch.summary}</p>
                  <p className="mt-2 text-xs leading-5 text-white/65">{dispatch.detail}</p>
                  <button
                    onClick={() => onCommandDispatch?.(command.id)}
                    disabled={!dispatch.available || !onCommandDispatch}
                    className="mt-3 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {dispatch.label}
                  </button>
                </div>
              );
            })()}
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
