'use client';

import Link from 'next/link';
import { MockProviderManifest } from '@/lib/types';

type MockProofPanelProps = {
  manifest: MockProviderManifest;
  screenId: 'login' | 'home' | 'live';
  heading: string;
  className?: string;
};

export function MockProofPanel({ manifest, screenId, heading, className }: MockProofPanelProps) {
  const screen = manifest.supportedScreens.find((item) => item.id === screenId);
  const launch = manifest.launchMatrix.find((item) => item.screenId === screenId);
  const scenarioSurfaceActive = manifest.scenarioSpotlight.surfaces.includes(screenId);

  if (!screen || !launch) return null;

  return (
    <div className={className ?? 'rounded-2xl border border-sky-400/20 bg-black/20 p-4'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">{heading}</p>
          <p className="mt-2 text-sm text-white">{manifest.projectStatus}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-300">
          {screen.status.replace('-', ' ')}
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {manifest.proofJourney.map((step) => (
          <Link
            key={step.label}
            href={step.href}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-sky-300/30 hover:bg-white/10"
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">{step.label}</p>
            <p className="mt-2 text-sm text-slate-200">{step.detail}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">{screen.title}</p>
          <p className="mt-2 text-sm text-slate-300">{screen.detail}</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            {screen.proof.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Verification target</p>
              <p className="mt-2 text-sm text-slate-200">{screen.verificationTarget}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Success signal</p>
              <p className="mt-2 text-sm text-slate-200">{screen.successSignal}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{launch.title}</p>
          <p className="mt-2 text-sm text-slate-300">{launch.operatorPrompt}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={launch.primaryActionHref}
              className="rounded-xl bg-violet-500 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white hover:bg-violet-400"
            >
              {launch.primaryActionLabel}
            </Link>
            <Link
              href={launch.recoveryActionHref}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-200 hover:bg-white/5"
            >
              {launch.recoveryActionLabel}
            </Link>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            {launch.verificationSteps.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {manifest.capabilityMatrix.slice(0, 3).map((item) => (
              <span key={item.label} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-slate-300">
                {item.label} · {item.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className={`rounded-2xl border p-4 ${scenarioSurfaceActive ? 'border-amber-400/20 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200">Scenario spotlight</p>
              <p className="mt-2 text-sm font-semibold text-white">{manifest.scenarioSpotlight.title}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-300">
              {scenarioSurfaceActive ? 'This surface is in play' : 'Cross-surface check'}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-300">{manifest.scenarioSpotlight.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {manifest.scenarioSpotlight.surfaces.map((surface) => (
              <span key={surface} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-300">
                {surface}
              </span>
            ))}
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            {manifest.scenarioSpotlight.checks.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Demo checklist</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {manifest.demoChecklist.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
