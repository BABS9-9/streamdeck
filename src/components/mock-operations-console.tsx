'use client';

import { MockProviderHealth, MockProviderManifest, MockProviderScenario } from '@/lib/types';
import { MockProofPanel } from './mock-proof-panel';
import Link from 'next/link';

const scenarioLabels: Record<MockProviderScenario, string> = {
  healthy: 'Healthy',
  degradedSearch: 'Degraded search',
  degradedLive: 'Degraded live',
  degradedEpg: 'Degraded guide',
  lineSaturated: 'Lines maxed',
  expiredAccount: 'Expired account',
  authUnstable: 'Auth unstable',
};

const readinessToneClasses = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
  recover: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
} as const;

type MockOperationsConsoleProps = {
  health: MockProviderHealth;
  manifest: MockProviderManifest | null;
  screenId: 'login' | 'home' | 'live';
  title: string;
  intro: string;
  scenario: MockProviderScenario;
  scenarioRefreshing: boolean;
  onApplyScenario: (scenario: MockProviderScenario) => void;
  className?: string;
};

export function MockOperationsConsole({
  health,
  manifest,
  screenId,
  title,
  intro,
  scenario,
  scenarioRefreshing,
  onApplyScenario,
  className,
}: MockOperationsConsoleProps) {
  const playbook = manifest?.surfacePlaybooks.find((item) => item.screenId === screenId);
  const scorecard = manifest?.surfaceScorecards.find((item) => item.screenId === screenId);
  const exitCriteria = manifest?.surfaceExitCriteria.find((item) => item.screenId === screenId);
  const handoff = manifest?.surfaceHandoffs.find((item) => item.screenId === screenId);
  const escalationLadder = manifest?.surfaceEscalationLadders.find((item) => item.screenId === screenId);
  const scenarioMatrix = manifest?.surfaceScenarioMatrix.find((item) => item.screenId === screenId);
  const activeScenario = health.healthScenarios?.[health.activeScenario];

  return (
    <div className={className ?? 'mt-4 rounded-2xl border border-white/10 bg-black/20 p-4'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{title}</p>
          <p className="mt-2 text-sm text-slate-300">{intro}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-violet-200">
          Active: {health.healthScenarios?.[health.activeScenario]?.label ?? health.activeScenario}
        </span>
      </div>

      {manifest?.commandCenter ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">{manifest.commandCenter.title}</p>
            <p className="mt-2 text-sm text-slate-200">{manifest.commandCenter.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-slate-300">
                Next move · {manifest.commandCenter.nextMoveLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-slate-300">
                Failure mode · {manifest.commandCenter.failureModeLabel}
              </span>
            </div>
          </div>
          {playbook ? (
            <div className={`rounded-2xl border p-4 ${readinessToneClasses[playbook.readinessTone]}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.22em]">{playbook.readinessLabel}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
                  {screenId}
                </span>
              </div>
              <p className="mt-3 text-sm text-white">{playbook.operatorGoal}</p>
              <p className="mt-2 text-sm text-white/80">{playbook.userPromise}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {playbook.commandChips.map((chip) => (
                  <span key={chip} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/80">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {scorecard ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{scorecard.title}</p>
              <p className="mt-2 text-sm text-slate-300">{scorecard.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              Adapter-driven
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {scorecard.metrics.map((metric) => (
              <div key={metric.label} className={`rounded-2xl border p-4 ${readinessToneClasses[metric.tone]}`}>
                <p className="text-[11px] uppercase tracking-[0.22em]">{metric.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{metric.value}</p>
                <p className="mt-2 text-sm text-white/80">{metric.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {exitCriteria ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{exitCriteria.title}</p>
              <p className="mt-2 text-sm text-slate-300">{exitCriteria.summary}</p>
            </div>
            <Link
              href={exitCriteria.nextHopHref}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-200 hover:bg-white/5"
            >
              {exitCriteria.nextHopLabel}
            </Link>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-100">
              <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200">Advance when</p>
              <p className="mt-2 text-sm text-white">{exitCriteria.goSignal}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-amber-100">
              <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200">Hold when</p>
              <p className="mt-2 text-sm text-white">{exitCriteria.holdSignal}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Recovery owner</p>
              <p className="mt-2 text-sm font-semibold text-white">{exitCriteria.recoveryOwner}</p>
            </div>
            <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 text-sky-100">
              <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">Recovery move</p>
              <p className="mt-2 text-sm text-white">{exitCriteria.recoveryMove}</p>
            </div>
          </div>
        </div>
      ) : null}

      {handoff ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{handoff.title}</p>
              <p className="mt-2 text-sm text-slate-300">{handoff.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              {handoff.confidenceLabel}
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-100">
              <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200">Carry forward</p>
              <ul className="mt-3 space-y-2 text-sm text-white">
                {handoff.carriesForward.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 text-sky-100">
              <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">{handoff.fallbackLabel}</p>
              <p className="mt-2 text-sm text-white">{handoff.fallbackDetail}</p>
            </div>
          </div>
        </div>
      ) : null}

      {escalationLadder ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{escalationLadder.title}</p>
              <p className="mt-2 text-sm text-slate-300">{escalationLadder.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              {escalationLadder.owner}
            </span>
          </div>
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-amber-100">
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200">Trigger state</p>
            <p className="mt-2 text-sm text-white">{escalationLadder.triggerLabel}</p>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-100">
              <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200">First move</p>
              <p className="mt-2 text-sm text-white">{escalationLadder.firstMove}</p>
            </div>
            <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 text-sky-100">
              <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">Second move</p>
              <p className="mt-2 text-sm text-white">{escalationLadder.secondMove}</p>
            </div>
            <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4 text-fuchsia-100">
              <p className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-200">Last safe fallback</p>
              <p className="mt-2 text-sm text-white">{escalationLadder.finalFallback}</p>
            </div>
          </div>
        </div>
      ) : null}

      {scenarioMatrix ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{scenarioMatrix.title}</p>
              <p className="mt-2 text-sm text-slate-300">{scenarioMatrix.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
              All rehearsals mapped
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {scenarioMatrix.scenarios.map((item) => {
              const active = item.scenario === scenario;
              return (
                <div key={item.scenario} className={`rounded-2xl border p-4 ${readinessToneClasses[item.tone]} ${active ? 'ring-1 ring-white/30' : ''}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.22em]">{item.label}</p>
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
                      {active ? 'Active now' : 'Available'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-white">{item.impact}</p>
                  <p className="mt-3 text-sm text-white/80">{item.recommendedMove}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(health.endpointHealth || {}).map(([key, value]) => (
          <span key={key} className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.22em] ${value === 'healthy' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-amber-400/20 bg-amber-500/10 text-amber-100'}`}>
            {key} · {value}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(scenarioLabels) as MockProviderScenario[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onApplyScenario(key)}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${scenario === key ? 'bg-violet-500 text-white' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
          >
            {scenarioRefreshing && scenario === key ? `Applying ${scenarioLabels[key]}` : scenarioLabels[key]}
          </button>
        ))}
      </div>

      {health.scenarioUrls ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
          {(Object.entries(health.scenarioUrls) as Array<[MockProviderScenario, string]>).map(([key, url]) => (
            <a key={key} href={url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-black/20 px-3 py-2 hover:bg-white/5">
              {scenarioLabels[key]} health
            </a>
          ))}
        </div>
      ) : null}

      {scenarioRefreshing ? (
        <div className="mt-4 rounded-2xl border border-violet-400/20 bg-black/20 p-4 text-sm text-violet-100">
          Applying {scenario.replace(/([A-Z])/g, ' $1').toLowerCase()} rehearsal and refreshing {screenId} in place.
        </div>
      ) : null}

      {activeScenario ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
            <p className="text-sm font-semibold text-white">{activeScenario.label}</p>
            <p className="mt-2 text-sm text-slate-300">{activeScenario.summary}</p>
            <p className="mt-3 text-xs text-slate-400">{activeScenario.appImpact}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeScenario.affectedEndpoints.map((endpoint) => (
                <span key={endpoint} className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                  {endpoint}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Expected UX</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {activeScenario.expectedUx.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Verify now</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {activeScenario.verificationSteps.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {health.recoveryActions?.length ? (
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200">Recovery actions</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {health.recoveryActions.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
      ) : null}

      {health.recommendedDemoSequence?.length ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Recommended rehearsal path</p>
          <ol className="mt-3 space-y-2 text-sm text-slate-300">
            {health.recommendedDemoSequence.map((item, index) => <li key={item}>{index + 1}. {item}</li>)}
          </ol>
        </div>
      ) : null}

      {manifest ? <MockProofPanel manifest={manifest} screenId={screenId} heading={`${screenId[0].toUpperCase()}${screenId.slice(1)} proof surface`} className="mt-4" /> : null}
    </div>
  );
}
