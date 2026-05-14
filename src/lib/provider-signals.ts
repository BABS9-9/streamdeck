import { ConnectionStatus, ProviderAuthSummary } from './types';

export const connectionStatusTone: Record<ConnectionStatus['state'], string> = {
  idle: 'border-slate-400/30 bg-slate-400/10 text-slate-200',
  checking: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  healthy: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  degraded: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  error: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
};

export const formatProviderExpiry = (value?: string | null) => {
  if (!value) return 'Unknown expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown expiry';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getProviderCapacityLabel = (summary?: Pick<ProviderAuthSummary, 'activeConnections' | 'maxConnections'> | null) => {
  return `${summary?.activeConnections ?? 0}/${summary?.maxConnections ?? '?'} in use`;
};

export const getProviderLinePressure = (
  summary?: Pick<ProviderAuthSummary, 'activeConnections' | 'maxConnections'> | null,
  context = 'Keep this visible before users blame playback.'
) => {
  if (!summary?.maxConnections || summary.activeConnections === null || summary.activeConnections === undefined) return null;
  return summary.activeConnections >= summary.maxConnections
    ? `All ${summary.maxConnections} provider lines are currently in use. ${context}`
    : null;
};

export const getProviderAccountPressure = (
  summary?: Pick<ProviderAuthSummary, 'status' | 'activeConnections' | 'maxConnections'> | null,
  options?: {
    statusContext?: string;
    lineContext?: string;
  }
) => {
  if (!summary) return null;
  if (summary.status && summary.status !== 'Active') {
    return `Provider account is ${String(summary.status).toLowerCase()}. ${options?.statusContext || 'Show the recovery path before the user mistakes account status for stream failure.'}`;
  }
  return getProviderLinePressure(summary, options?.lineContext || 'Show this before the user mistakes line pressure for stream failure.');
};

export const buildProviderFactRows = (summary?: ProviderAuthSummary | null) => {
  if (!summary) return [];
  return [
    ['Status', summary.status],
    ['Expiry', formatProviderExpiry(summary.expiresAt)],
    ['Capacity', getProviderCapacityLabel(summary)],
    ['Timezone', summary.timezone || 'Unknown timezone'],
  ] as const;
};
