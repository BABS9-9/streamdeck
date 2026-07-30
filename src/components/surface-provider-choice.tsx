'use client';

type SurfaceProviderChoiceContract = {
  title: string;
  summary: string;
  choices: Array<{
    label: string;
    autoPickTrigger: string;
    equivalenceProof: string;
    userChoiceTrigger: string;
    tone: 'ready' | 'watch' | 'recover';
  }>;
};

const toneClasses = {
  ready: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
};

const toneLabels = {
  ready: 'Auto-pick allowed',
  watch: 'Choice may split',
  recover: 'Ask explicitly',
};

export function SurfaceProviderChoice({
  contract,
  badge,
}: {
  contract: SurfaceProviderChoiceContract | null;
  badge: string;
}) {
  if (!contract) return null;

  return (
    <section className="rounded-[2rem] border border-sky-400/20 bg-sky-500/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sky-200">{contract.title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-200">{contract.summary}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
          {badge}
        </span>
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {contract.choices.map((item) => (
          <div key={item.label} className={`rounded-[1.5rem] border p-4 ${toneClasses[item.tone]}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                {toneLabels[item.tone]}
              </span>
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/70">Auto-pick trigger</p>
            <p className="mt-1 text-sm leading-6 text-slate-100">{item.autoPickTrigger}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/70">Equivalence proof</p>
            <p className="mt-1 text-sm leading-6 text-slate-200">{item.equivalenceProof}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/70">Ask the user when</p>
            <p className="mt-1 text-sm leading-6 text-slate-200">{item.userChoiceTrigger}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
