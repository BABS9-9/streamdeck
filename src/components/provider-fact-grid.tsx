'use client';

import { buildProviderFactRows, getProviderAccountPressure, getProviderCapacityLabel } from '@/lib/provider-signals';
import { ProviderAuthSummary } from '@/lib/types';
import { ProviderTrustBadge } from './provider-trust-badge';

const getFactTone = (summary: ProviderAuthSummary, label: string): 'emerald' | 'sky' | 'amber' | 'rose' => {
  if (label === 'Status') {
    return summary.status === 'Active' ? 'emerald' : 'rose';
  }

  if (label === 'Capacity') {
    return getProviderCapacityLabel(summary) === `${summary.maxConnections}/${summary.maxConnections} in use` ? 'amber' : 'sky';
  }

  if (label === 'Expiry' && getProviderAccountPressure(summary)) {
    return summary.status === 'Active' ? 'amber' : 'rose';
  }

  return 'sky';
};

export function ProviderFactGrid({ summary, className = 'mt-4 grid gap-3 md:grid-cols-4' }: { summary?: ProviderAuthSummary | null; className?: string }) {
  if (!summary) return null;

  return (
    <div className={className}>
      {buildProviderFactRows(summary).map(([label, value]) => (
        <ProviderTrustBadge key={label} eyebrow={label} label={value} tone={getFactTone(summary, label)} compact />
      ))}
    </div>
  );
}
