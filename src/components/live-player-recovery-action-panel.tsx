'use client';

import { LivePlayerRecoveryActionRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const actionLabels: Record<LivePlayerRecoveryActionRuntimeContract['actionKind'], string> = {
  retry: 'Retry current owner',
  'quick-switch': 'Quick-switch ready',
  'wait-for-line': 'Wait for line',
  'reclaim-owner': 'Reclaim owner',
  'fail-closed': 'Fail-closed',
};

export function LivePlayerRecoveryActionPanel({
  contract,
  onPrimaryAction,
  onSecondaryAction,
}: {
  contract: LivePlayerRecoveryActionRuntimeContract | null;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}) {
  if (!contract) return null;

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
            {actionLabels[contract.actionKind]}
          </span>
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-2">
            {contract.targetMode ? contract.targetMode.replace(/-/g, ' ') : 'no target'}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{contract.nextMove.label}</p>
        <p className="mt-3 text-sm leading-6 text-white/90">{contract.nextMove.detail}</p>
        <p className="mt-3 text-xs leading-5 text-white/75">{contract.overlayCopy}</p>
        {contract.nextMove.primaryActionLabel ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={onPrimaryAction}
              disabled={!onPrimaryAction}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {contract.nextMove.primaryActionLabel}
            </button>
            {contract.nextMove.secondaryActionLabel ? (
              <button
                onClick={onSecondaryAction}
                disabled={!onSecondaryAction}
                className="rounded-full border border-white/15 bg-black/20 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {contract.nextMove.secondaryActionLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Final reason path</p>
          <p className="mt-3 text-sm font-semibold text-white">{contract.reasonPath}</p>
        </article>
        <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Proof quorum</p>
          <p className="mt-3 text-sm font-semibold text-white">{contract.quorumStatus}</p>
        </article>
        <article className="rounded-2xl border border-white/15 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Dissent / line status</p>
          <p className="mt-3 text-sm font-semibold text-white">{contract.vetoStatus}</p>
          <p className="mt-2 text-xs leading-5 text-white/75">{contract.lineStatus}</p>
        </article>
      </div>

      {contract.supportEntries.length ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {contract.supportEntries.map((entry) => (
            <article
              key={entry.id}
              className={`rounded-2xl border p-4 ${
                entry.tone === 'ready'
                  ? 'border-emerald-400/20 bg-emerald-500/10'
                  : entry.tone === 'watch'
                    ? 'border-amber-400/20 bg-amber-500/10'
                    : 'border-rose-400/20 bg-rose-500/10'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{entry.label}</p>
                <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">
                  {entry.tone}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-white">{entry.summary}</p>
              <p className="mt-2 text-xs leading-5 text-white/80">{entry.detail}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
