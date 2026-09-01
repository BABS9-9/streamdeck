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

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Breakpoint ledger</p>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">Exact stop-carry-forward rules</span>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-white/65">
          These breakpoints tell Home, Live, and Player exactly when shared launch language must stop and what the runtime wants promoted instead.
        </p>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {contract.breakpointLedger.map((breakpoint) => (
            <article key={breakpoint.id} className={`rounded-[1.35rem] border p-4 ${toneStyles[breakpoint.tone]}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{breakpoint.label}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {breakpoint.id}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white">{breakpoint.summary}</p>
              <div className="mt-4 space-y-3 text-xs leading-5 text-white/80">
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Stop carry forward</p>
                  <p className="mt-1">{breakpoint.stopCarryForward}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Promote instead</p>
                  <p className="mt-1">{breakpoint.promoteInstead}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Affected surfaces</p>
                  <p className="mt-1">{breakpoint.affectedSurfaces.join(', ')}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Witness stack</p>
                  <div className="mt-2 space-y-2">
                    {breakpoint.witnessStack.map((witness) => (
                      <div key={`${breakpoint.id}-${witness.label}`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">{witness.label}</p>
                        <p className="mt-1 text-xs leading-5 text-white/85">{witness.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Surface transition matrix</p>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">Home to Live to Player to Recovery</span>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-white/65">
          This matrix shows how far each surface can carry the shared story before the next surface needs to take over with stronger proof.
        </p>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {contract.transitionMatrix.map((entry) => (
            <article key={entry.id} className={`rounded-[1.35rem] border p-4 ${toneStyles[entry.tone]}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{entry.label}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {entry.id}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white">{entry.summary}</p>
              <div className="mt-4 space-y-3 text-xs leading-5 text-white/80">
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Can still say</p>
                  <p className="mt-1">{entry.canStillSay}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Must stop saying</p>
                  <p className="mt-1">{entry.mustStopSaying}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Promote now</p>
                  <p className="mt-1">{entry.promoteNow}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Watcher</p>
                  <p className="mt-1">{entry.watcher}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Confidence carry-forward ledger</p>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">How far premium language may survive</span>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-white/65">
          This ledger turns the player confidence floor into surface-specific rules so Home, Live, and Player know exactly when premium tone is still earned.
        </p>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {contract.confidenceCarryForward.map((entry) => (
            <article key={entry.id} className={`rounded-[1.35rem] border p-4 ${toneStyles[entry.tone]}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{entry.label}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {entry.id}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white">{entry.summary}</p>
              <div className="mt-4 space-y-3 text-xs leading-5 text-white/80">
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Minimum proof</p>
                  <p className="mt-1">{entry.minimumProof}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Downgrade mode</p>
                  <p className="mt-1">{entry.downgradeMode}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Hard stop trigger</p>
                  <p className="mt-1">{entry.hardStopTrigger}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Affected surfaces</p>
                  <p className="mt-1">{entry.affectedSurfaces.join(', ')}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Witness stack</p>
                  <div className="mt-2 space-y-2">
                    {entry.witnessStack.map((witness) => (
                      <div key={`${entry.id}-${witness.label}`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">{witness.label}</p>
                        <p className="mt-1 text-xs leading-5 text-white/85">{witness.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Proof ownership ledger</p>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">Who owns the handoff story now</span>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-white/65">
          This ledger names which surface or provider actually owns the proof stack at each handoff stage so the dock stops borrowing stale confidence.
        </p>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {contract.proofOwnershipLedger.map((entry) => (
            <article key={entry.id} className={`rounded-[1.35rem] border p-4 ${toneStyles[entry.tone]}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{entry.label}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {entry.id}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white">{entry.summary}</p>
              <div className="mt-4 space-y-3 text-xs leading-5 text-white/80">
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Current owner</p>
                  <p className="mt-1">{entry.currentOwner}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Blocking proof</p>
                  <p className="mt-1">{entry.blockingProof}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Promote owner</p>
                  <p className="mt-1">{entry.promoteOwner}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Affected surfaces</p>
                  <p className="mt-1">{entry.affectedSurfaces.join(', ')}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Witness stack</p>
                  <div className="mt-2 space-y-2">
                    {entry.witnessStack.map((witness) => (
                      <div key={`${entry.id}-${witness.label}`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">{witness.label}</p>
                        <p className="mt-1 text-xs leading-5 text-white/85">{witness.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Switch carry-forward ledger</p>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">What survives a saved-provider move</span>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-white/65">
          This ledger tells Home, Live, and Player which pieces of saved-provider switch context may survive silently and which ones must collapse once ownership changes.
        </p>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {contract.switchCarryForwardLedger.map((entry) => (
            <article key={entry.id} className={`rounded-[1.35rem] border p-4 ${toneStyles[entry.tone]}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{entry.label}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {entry.id}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white">{entry.summary}</p>
              <div className="mt-4 space-y-3 text-xs leading-5 text-white/80">
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Preserved context</p>
                  <p className="mt-1">{entry.preservedContext}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Dock rule</p>
                  <p className="mt-1">{entry.dockRule}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Break trigger</p>
                  <p className="mt-1">{entry.breakTrigger}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Affected surfaces</p>
                  <p className="mt-1">{entry.affectedSurfaces.join(', ')}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Witness stack</p>
                  <div className="mt-2 space-y-2">
                    {entry.witnessStack.map((witness) => (
                      <div key={`${entry.id}-${witness.label}`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">{witness.label}</p>
                        <p className="mt-1 text-xs leading-5 text-white/85">{witness.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Transfer disclosure ledger</p>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">When the switch must become visible</span>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-white/65">
          This ledger sets the disclosure threshold for saved-provider moves so the dock does not hide a real ownership change behind stale continuity language.
        </p>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {contract.transferDisclosureLedger.map((entry) => (
            <article key={entry.id} className={`rounded-[1.35rem] border p-4 ${toneStyles[entry.tone]}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{entry.label}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {entry.id}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white">{entry.summary}</p>
              <div className="mt-4 space-y-3 text-xs leading-5 text-white/80">
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Current state</p>
                  <p className="mt-1">{entry.currentState}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Can stay implicit</p>
                  <p className="mt-1">{entry.canStayImplicit}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Must disclose</p>
                  <p className="mt-1">{entry.mustDisclose}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Promote now</p>
                  <p className="mt-1">{entry.promoteNow}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Affected surfaces</p>
                  <p className="mt-1">{entry.affectedSurfaces.join(', ')}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Witness stack</p>
                  <div className="mt-2 space-y-2">
                    {entry.witnessStack.map((witness) => (
                      <div key={`${entry.id}-${witness.label}`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">{witness.label}</p>
                        <p className="mt-1 text-xs leading-5 text-white/85">{witness.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Disclosure escalation ladder</p>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">Which story wins first</span>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-white/65">
          This ladder gives the dock one backend-owned order for when quiet continuity can hold, when watched wording takes over, and when transfer or recovery must lead the story.
        </p>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {contract.disclosureEscalationLedger.map((entry) => (
            <article key={entry.id} className={`rounded-[1.35rem] border p-4 ${toneStyles[entry.tone]}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{entry.label}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {entry.id}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white">{entry.summary}</p>
              <div className="mt-4 space-y-3 text-xs leading-5 text-white/80">
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Trigger</p>
                  <p className="mt-1">{entry.trigger}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">User-visible story</p>
                  <p className="mt-1">{entry.userVisibleStory}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Dock copy rule</p>
                  <p className="mt-1">{entry.dockCopyRule}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Affected surfaces</p>
                  <p className="mt-1">{entry.affectedSurfaces.join(', ')}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Witness stack</p>
                  <div className="mt-2 space-y-2">
                    {entry.witnessStack.map((witness) => (
                      <div key={`${entry.id}-${witness.label}`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">{witness.label}</p>
                        <p className="mt-1 text-xs leading-5 text-white/85">{witness.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Surface narration ledger</p>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">Exact copy packet by surface</span>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-white/65">
          This ledger gives Home, Live, Player, and Recovery one backend-owned narration packet so UI copy does not have to recompute the final story from raw witnesses.
        </p>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {contract.surfaceNarrationLedger.map((entry) => (
            <article key={entry.id} className={`rounded-[1.35rem] border p-4 ${toneStyles[entry.tone]}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{entry.label}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {entry.id}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white">{entry.summary}</p>
              <div className="mt-4 space-y-3 text-xs leading-5 text-white/80">
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Headline</p>
                  <p className="mt-1">{entry.headline}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Support line</p>
                  <p className="mt-1">{entry.supportLine}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Badge label</p>
                  <p className="mt-1">{entry.badgeLabel}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Fallback label</p>
                  <p className="mt-1">{entry.fallbackLabel}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Switch disclosure</p>
                  <p className="mt-1">{entry.switchDisclosure}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.18em] text-white/55">Trigger</p>
                  <p className="mt-1">{entry.trigger}</p>
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
