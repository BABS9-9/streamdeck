import { SavedConnection } from './types';

export const getProviderTrustScore = (
  provider: Pick<SavedConnection, 'lastAuthSummary'>,
  status?: { state?: string | null } | null
) => {
  let score = 0;

  if (status?.state === 'healthy') score += 120;
  else if (status?.state === 'degraded') score += 35;
  else if (status?.state === 'checking') score += 10;
  else if (status?.state === 'error') score -= 35;

  if (provider.lastAuthSummary?.status === 'Active') score += 45;
  else if (provider.lastAuthSummary?.status) score -= 55;

  if (typeof provider.lastAuthSummary?.maxConnections === 'number' && typeof provider.lastAuthSummary?.activeConnections === 'number') {
    score += Math.max(-40, 30 - Math.max(0, provider.lastAuthSummary.activeConnections - provider.lastAuthSummary.maxConnections + 1) * 22);
  }

  return score;
};
