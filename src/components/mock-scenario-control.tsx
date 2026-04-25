'use client';

import { useEffect, useState } from 'react';
import { getSelectedMockProviderScenario, setSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { MockProviderScenario } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';

const labels: Record<MockProviderScenario, string> = {
  healthy: 'Healthy',
  degradedSearch: 'Degraded search',
  degradedLive: 'Degraded live',
  degradedEpg: 'Degraded guide',
};

export function MockScenarioControl() {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const validateConnection = useAuthStore((state) => state.validateConnection);
  const [scenario, setScenario] = useState<MockProviderScenario>('healthy');
  const [applyingScenario, setApplyingScenario] = useState<MockProviderScenario | null>(null);

  useEffect(() => {
    setScenario(getSelectedMockProviderScenario());
    return subscribeToMockProviderScenario((nextScenario) => {
      setScenario(nextScenario);
      setApplyingScenario(null);
    });
  }, []);

  if (!activeConnection || !activeConnection.server.includes('localhost:3579')) return null;

  const applyScenario = async (nextScenario: MockProviderScenario) => {
    if (nextScenario === scenario) return;
    setApplyingScenario(nextScenario);
    setSelectedMockProviderScenario(nextScenario);
    setScenario(nextScenario);
    await validateConnection(activeConnection.id);
  };

  return (
    <div className="mb-5 rounded-[1.4rem] border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm text-slate-200">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-violet-300">Mock provider scenario</p>
          <p className="mt-1 text-slate-300">Switch rehearsal mode in-app and hot-refresh login, home, live, search, movies, and series against the same mock Xtream adapter.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(labels) as MockProviderScenario[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => applyScenario(key)}
              className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${scenario === key ? 'bg-violet-500 text-white' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
            >
              {applyingScenario === key ? `Applying ${labels[key]}` : labels[key]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
