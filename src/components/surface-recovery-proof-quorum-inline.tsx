'use client';

import { SurfaceRecoveryProofQuorumRuntimeContract } from '@/lib/types';

const toneStyles = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
} as const;

const toneLabels = {
  ready: 'Recovery proof is unanimous',
  watch: 'Recovery proof is partial',
  recover: 'Recovery proof is split',
} as const;

export function SurfaceRecoveryProofQuorumInline({
  runtime,
  title,
  badge,
}: {
  runtime: SurfaceRecoveryProofQuorumRuntimeContract | null;
  title: string;
  badge: string;
}) {
  const quorum = runtime?.quorums?.[0];

  if (!runtime || !quorum) return null;

  return (
    <section className={`rounded-[1.75rem] border p-5 ${toneStyles[quorum.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.26em] text-white/75">{badge}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-white/90">{runtime.summary}</p>
        </div>
        <span className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${toneStyles[quorum.tone]}`}>
          {toneLabels[quorum.tone]}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Provider vote</p>
          <p className="mt-2 text-sm font-medium text-white">{quorum.providerVote}</p>
        </article>
        <article className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Line vote</p>
          <p className="mt-2 text-sm font-medium text-white">{quorum.lineVote}</p>
        </article>
        <article className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Continuity vote</p>
          <p className="mt-2 text-sm font-medium text-white">{quorum.continuityVote}</p>
        </article>
        <article className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Missing vote</p>
          <p className="mt-2 text-sm font-medium text-white">{quorum.missingVote}</p>
        </article>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Quorum status</p>
        <p className="mt-2 text-sm leading-6 text-white">{quorum.quorumStatus}</p>
        <p className="mt-3 text-sm leading-6 text-white/75">Owner posture: {quorum.ownerStatusLabel}</p>
      </div>
    </section>
  );
}
