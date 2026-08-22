import { ConnectionStatus, SavedConnection, SavedProviderHealthEntry, SavedProviderSwitchState } from './types';

type ProviderSwitchSafety = Pick<
  SavedProviderHealthEntry,
  'remainingConnections' | 'reconnectTrust' | 'reconnectTrustLabel' | 'switchState' | 'switchBlockReason' | 'authoritySummary'
>;

const formatCheckedAge = (checkedAt?: number | null) => {
  if (!checkedAt) return null;
  const ageMinutes = Math.max(1, Math.round((Date.now() - checkedAt) / 60000));
  return `${ageMinutes} minute${ageMinutes === 1 ? '' : 's'} ago`;
};

export const getRemainingConnections = (connection: Pick<SavedConnection, 'lastAuthSummary'>) => {
  const maxConnections = connection.lastAuthSummary?.maxConnections;
  const activeConnections = connection.lastAuthSummary?.activeConnections;
  if (typeof maxConnections !== 'number' || typeof activeConnections !== 'number') return null;
  return maxConnections - activeConnections;
};

const buildAuthoritySummary = ({
  connection,
  status,
  isActive,
  remainingConnections,
}: {
  connection: SavedConnection;
  status?: ConnectionStatus | null;
  isActive: boolean;
  remainingConnections: number | null;
}) => {
  const role = isActive ? 'Active provider authority' : 'Standby provider authority';
  const checkedAge = formatCheckedAge(status?.checkedAt);

  if (status?.state === 'error') {
    return `${role} is suspended because the latest validation failed${checkedAge ? ` (${checkedAge})` : ''}.`;
  }

  if (connection.lastAuthSummary?.status && connection.lastAuthSummary.status !== 'Active') {
    return `${role} is suspended because account status is ${connection.lastAuthSummary.status}.`;
  }

  if (remainingConnections !== null && remainingConnections <= 0) {
    return `${role} is blocked because every allowed Xtream line is already in use.`;
  }

  if (connection.lastAuthSummary?.expiresAt) {
    const expiresAt = new Date(connection.lastAuthSummary.expiresAt).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
      return `${role} is suspended because the saved provider already expired.`;
    }
  }

  if (status?.state === 'degraded') {
    return `${role} is still visible, but degraded posture means switch copy must stay explicit instead of automatic.`;
  }

  if (status?.checkedAt && Date.now() - status.checkedAt > 60 * 60 * 1000) {
    return `${role} is too stale for background switching because the last proof landed ${checkedAge}.`;
  }

  if (status?.state === 'checking') {
    return `${role} is revalidating now, so StreamDeck should pause fast switching until fresh proof lands.`;
  }

  if (remainingConnections === 1) {
    return `${role} still stands, but only one line remains free so reconnect trust should stay cautious.`;
  }

  return `${role} is healthy enough to keep quick-switch and reconnect posture boring.`;
};

const buildReconnectTrustLabel = ({
  trustState,
  connection,
  status,
  remainingConnections,
}: {
  trustState: SavedProviderSwitchState;
  connection: SavedConnection;
  status?: ConnectionStatus | null;
  remainingConnections: number | null;
}) => {
  if (trustState === 'blocked') {
    return status?.message
      || (connection.lastAuthSummary?.status && connection.lastAuthSummary.status !== 'Active'
        ? `Status is ${connection.lastAuthSummary.status}`
        : remainingConnections !== null && remainingConnections <= 0
          ? 'All lines are already in use'
          : 'Fresh reconnect proof is not trustworthy enough yet');
  }

  if (trustState === 'watch') {
    if (remainingConnections === 1) return 'Reconnect is possible, but only one provider line remains free';
    if (status?.state === 'checking') return 'Reconnect is waiting on a live validation pass';
    return 'Reconnect can proceed, but runtime honesty should stay visible';
  }

  if (remainingConnections !== null) {
    return `${remainingConnections} provider line${remainingConnections === 1 ? '' : 's'} still free for reconnect`;
  }

  return 'Reconnect trust is healthy enough for the next move';
};

export const getProviderSwitchSafety = ({
  connection,
  status,
  isActive,
}: {
  connection: SavedConnection;
  status?: ConnectionStatus | null;
  isActive: boolean;
}): ProviderSwitchSafety => {
  const remainingConnections = getRemainingConnections(connection);
  const expiresAt = connection.lastAuthSummary?.expiresAt ? new Date(connection.lastAuthSummary.expiresAt).getTime() : null;
  const hasExpired = typeof expiresAt === 'number' && !Number.isNaN(expiresAt) && expiresAt <= Date.now();
  const hasInactiveStatus = Boolean(connection.lastAuthSummary?.status && connection.lastAuthSummary.status !== 'Active');
  const isSaturated = remainingConnections !== null && remainingConnections <= 0;
  const staleMinutes = status?.checkedAt ? Math.round((Date.now() - status.checkedAt) / 60000) : null;
  const isStale = status?.checkedAt ? staleMinutes !== null && staleMinutes > 60 : false;

  let switchState: SavedProviderSwitchState = 'ready';
  let switchBlockReason: string | null = null;

  if (status?.state === 'error') {
    switchState = 'blocked';
    switchBlockReason = status.message || 'Latest provider validation failed.';
  } else if (hasExpired) {
    switchState = 'blocked';
    switchBlockReason = 'Saved provider expired and cannot take a quick switch.';
  } else if (hasInactiveStatus) {
    switchState = 'blocked';
    switchBlockReason = `Saved provider status is ${connection.lastAuthSummary?.status}, so switch authority fails closed.`;
  } else if (isSaturated) {
    switchState = 'blocked';
    switchBlockReason = 'All allowed Xtream lines are already in use, so quick switch must fail closed.';
  } else if (isStale) {
    switchState = 'blocked';
    switchBlockReason = `Provider proof is stale (${staleMinutes} minutes old), so quick switch must wait for fresh validation.`;
  } else if (status?.state === 'checking') {
    switchState = 'watch';
  } else if (status?.state === 'degraded' || remainingConnections === 1) {
    switchState = 'watch';
  }

  const reconnectTrust = switchState === 'blocked'
    ? 'blocked'
    : switchState === 'watch'
      ? 'watch'
      : 'ready';

  return {
    remainingConnections,
    reconnectTrust,
    reconnectTrustLabel: buildReconnectTrustLabel({
      trustState: reconnectTrust,
      connection,
      status,
      remainingConnections,
    }),
    switchState,
    switchBlockReason,
    authoritySummary: buildAuthoritySummary({
      connection,
      status,
      isActive,
      remainingConnections,
    }),
  };
};
