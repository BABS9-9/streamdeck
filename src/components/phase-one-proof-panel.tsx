import { MockProviderPhaseOneCheckpoint } from '@/lib/types';

const toneClasses = {
  shipped: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  wired: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  'rehearsal-ready': 'border-sky-400/30 bg-sky-500/10 text-sky-200',
};

type PhaseOneProofPanelProps = {
  checkpoint: MockProviderPhaseOneCheckpoint | null;
  screenId: 'login' | 'home' | 'live';
  className?: string;
};

export function PhaseOneProofPanel({ checkpoint, screenId, className = '' }: PhaseOneProofPanelProps) {
  if (!checkpoint) return null;

  const routeProof = checkpoint.routeProof.find((entry) => entry.screenId === screenId);
  const refreshedAt = new Date(checkpoint.refreshedAt);
  const refreshedLabel = Number.isNaN(refreshedAt.getTime())
    ? checkpoint.refreshedAt
    : refreshedAt.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

  return (
    <section className={`rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.45)] ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-cyan-200/70">Phase 1 proof</p>
          <h3 className="font-[family-name:var(--font-display)] text-2xl text-white">Three-assignment checkpoint</h3>
          <p className="max-w-3xl text-sm text-slate-300">
            The mock provider is publishing the current assignment proof so Login, Home, and Live can show the shipped story from inside the product.
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-right">
          <p className="text-[0.65rem] uppercase tracking-[0.25em] text-cyan-100/70">Scenario</p>
          <p className="text-sm font-semibold text-cyan-50">{checkpoint.activeScenario}</p>
          <p className="mt-2 text-xs text-cyan-100/70">Checkpoint refreshed {refreshedLabel}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {checkpoint.assignments.map((assignment) => (
          <article
            key={assignment.id}
            className={`rounded-3xl border p-4 ${toneClasses[assignment.status]}`}
          >
            <p className="text-[0.65rem] uppercase tracking-[0.25em] opacity-75">{assignment.status}</p>
            <h4 className="mt-2 text-base font-semibold text-white">{assignment.title}</h4>
            <p className="mt-1 text-xs text-slate-300">{assignment.artifact}</p>
            <p className="mt-3 text-sm text-slate-100/90">{assignment.proof}</p>
          </article>
        ))}
      </div>

      {routeProof ? (
        <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.25em] text-slate-400">Active route</p>
              <h4 className="mt-2 text-lg font-semibold text-white">
                {routeProof.route} <span className="text-slate-400">· {routeProof.screenId}</span>
              </h4>
            </div>
            <p className="max-w-xl text-sm text-slate-300">{routeProof.goal}</p>
          </div>
          <p className="mt-4 text-sm text-cyan-100">Verification: {routeProof.verification}</p>
        </div>
      ) : null}
    </section>
  );
}
