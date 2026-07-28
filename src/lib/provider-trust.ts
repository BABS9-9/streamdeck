import { SavedConnection } from './types';

export const getProviderTrustScore = (
  provider: Pick<SavedConnection, 'lastAuthSummary'>,
  status?: { state?: string | null; checkedAt?: number | null } | null
) => {
  let score = 20;

  if (status?.state === 'healthy') score += 120;
  else if (status?.state === 'degraded') score += 20;
  else if (status?.state === 'checking') score += 4;
  else if (status?.state === 'error') score -= 80;

  if (provider.lastAuthSummary?.status === 'Active') score += 45;
  else if (provider.lastAuthSummary?.status) score -= 70;

  if (typeof provider.lastAuthSummary?.maxConnections === 'number' && typeof provider.lastAuthSummary?.activeConnections === 'number') {
    const remainingConnections = provider.lastAuthSummary.maxConnections - provider.lastAuthSummary.activeConnections;
    if (remainingConnections >= 2) score += 28;
    else if (remainingConnections === 1) score += 10;
    else score -= 60;
  }

  if (provider.lastAuthSummary?.expiresAt) {
    const expiresAt = new Date(provider.lastAuthSummary.expiresAt).getTime();
    if (!Number.isNaN(expiresAt)) {
      const remainingDays = Math.round((expiresAt - Date.now()) / 86400000);
      if (remainingDays < 0) score -= 120;
      else if (remainingDays <= 2) score -= 55;
      else if (remainingDays <= 7) score -= 24;
      else if (remainingDays >= 30) score += 12;
    }
  }

  if (status?.checkedAt) {
    const ageMinutes = Math.round((Date.now() - status.checkedAt) / 60000);
    if (ageMinutes <= 10) score += 10;
    else if (ageMinutes >= 60) score -= 12;
  }

  return score;
};
