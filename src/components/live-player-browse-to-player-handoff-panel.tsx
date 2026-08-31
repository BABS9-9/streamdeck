'use client';

import { LivePlayerBrowseToPlayerHandoffContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const stateLabels = {
  local: 'Local carry-forward',
  watch: 'Watch handoff',
  'transfer-ready': 'Transfer ready',
  'recovery-led': 'Recovery led',
} as const;

type LivePlayerBrowseToPlayerHandoffPanelProps = {
  contract: LivePlayerBrowseToPlayerHandoffContract | null;
};

export function LivePlayerBrowseToPlayerHandoffPanel({
  contract,
}: LivePlayerBrowseToPlayerHandoffPanelProps) {
  if (!contract) return null;

  return (
    <section className={`rounded-[1.75rem] border p-6 ${toneStyles[contract.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-white/80">{contract.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{contract.title}</h2>
          <p className="mt-3 text-sm leading-7 text-white/90">{contract.summary}</p>
          <p className="mt-3 text-sm leading-7 text-white/75">{contract.detail}</p>
        </div>
        <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${toneStyles[contract.tone]}`}>
          {stateLabels[contract.handoffState]}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Inherited surface</p>
          <p className="mt-3 text-sm font-medium text-white">{contract.inheritedSurfaceLabel}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Launch provider</p>
          <p className="mt-3 text-sm font-medium text-white">{contract.inheritedProviderLabel}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Current owner</p>
          <p className="mt-3 text-sm font-medium text-white">{contract.currentOwnerLabel}</p>
        </article>
        <article className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Recovery owner</p>
          <p className="mt-3 text-sm font-medium text-white">{contract.recoveryOwnerLabel}</p>
        </article>
      </div>

      <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Next honest move</p>
        <p className="mt-3 text-sm font-medium text-white">{contract.nextMoveLabel}</p>
        <p className="mt-3 text-sm leading-6 text-white/80">{contract.nextMoveDetail}</p>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Shared language ledger</p>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">Home + Live + Player parity</span>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {contract.sharedLanguage.map((lane) => (
            <article key={lane.id} className={`rounded-[1.35rem] border p-4 ${toneStyles[lane.tone]}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{lane.label}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {lane.tone}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white">{lane.summary}</p>
              <div className="mt-4 space-y-3 text-xs leading-5 text-white/80">
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Proof source</p>
                  <p className="mt-1">{lane.proofSource}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Carry forward</p>
                  <p className="mt-1">{lane.carryForward}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Dock rule</p>
                  <p className="mt-1">{lane.dockRule}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Watch trigger</p>
                  <p className="mt-1">{lane.watchTrigger}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Recovery move</p>
                  <p className="mt-1">{lane.recoveryMove}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Surface parity receipts</p>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">Same truth, different surfaces</span>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-white/65">
          These receipts keep Home, Live, and Player on one backend-owned wording path so the dock does not restate provider or takeover truth differently at the last mile.
        </p>
        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          {contract.surfaceParity.map((receipt) => (
            <article key={receipt.id} className={`rounded-[1.35rem] border p-4 ${toneStyles[receipt.tone]}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{receipt.label}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {receipt.id}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white">{receipt.summary}</p>
              <div className="mt-4 space-y-3 text-xs leading-5 text-white/80">
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Provider line</p>
                  <p className="mt-1">{receipt.providerLine}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Headroom line</p>
                  <p className="mt-1">{receipt.headroomLine}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Continuity line</p>
                  <p className="mt-1">{receipt.continuityLine}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Takeover line</p>
                  <p className="mt-1">{receipt.takeoverLine}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Next move</p>
                  <p className="mt-1">{receipt.nextMoveLine}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {contract.entries.map((entry) => (
          <article key={entry.id} className={`rounded-[1.35rem] border p-4 ${toneStyles[entry.tone]}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{entry.label}</p>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                {entry.tone}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white">{entry.summary}</p>
            <p className="mt-3 text-xs leading-5 text-white/80">{entry.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
