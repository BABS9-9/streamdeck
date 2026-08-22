import {
  ConnectionStatus,
  ProviderCatalog,
  ProviderDropNotice,
  ProviderDropRuntimeContract,
  ProviderDropRuntimeEntry,
  ProviderSearchSnapshot,
  SavedConnection,
  WatchHistoryItem,
} from './types';

const formatMinutesAgo = (timestamp?: number | null) => {
  if (!timestamp || !Number.isFinite(timestamp)) return 'No cache yet';
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return 'Updated just now';
  if (diffMinutes === 1) return 'Updated 1 minute ago';
  if (diffMinutes < 60) return `Updated ${diffMinutes} minutes ago`;
  const hours = Math.round(diffMinutes / 60);
  return hours === 1 ? 'Updated 1 hour ago' : `Updated ${hours} hours ago`;
};

const formatPositionLabel = (seconds?: number | null) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const getReasonLabel = (reason: ProviderDropNotice['reason']) => {
  switch (reason) {
    case 'catalog-refresh-failed':
      return 'Catalog refresh failed';
    case 'search-refresh-failed':
      return 'Search refresh failed';
    case 'playback-error':
      return 'Playback failed';
    case 'provider-removed':
      return 'Provider removed';
    case 'manual-reset':
      return 'Provider reset';
    case 'health-check-failed':
    default:
      return 'Health check failed';
  }
};

const buildCacheSummary = ({
  catalog,
  search,
  notice,
}: {
  catalog?: ProviderCatalog | null;
  search?: ProviderSearchSnapshot | null;
  notice: ProviderDropNotice;
}) => {
  const catalogUpdatedAt = catalog?.updatedAt ?? notice.cachedCatalogUpdatedAt ?? null;
  const searchUpdatedAt = search?.updatedAt ?? notice.cachedSearchUpdatedAt ?? null;

  return {
    cachedCatalogSummary: catalog
      ? `Live, movie, and series cache survived. ${formatMinutesAgo(catalogUpdatedAt)}.`
      : notice.cachedCatalogUpdatedAt
        ? `Catalog cache is older but still remembered. ${formatMinutesAgo(catalogUpdatedAt)}.`
        : 'No catalog cache survived this provider drop.',
    cachedSearchSummary: search
      ? `Search snapshot still remembers "${search.query}" with ${search.resultCount} visible results.`
      : notice.cachedSearchUpdatedAt
        ? `Search cache exists, but the latest snapshot is no longer hydrated. ${formatMinutesAgo(searchUpdatedAt)}.`
        : 'No search snapshot survived this provider drop.',
  };
};

const buildHistorySummary = (historyItems: WatchHistoryItem[], notice: ProviderDropNotice) => {
  if (historyItems.length === 0 && !notice.lastPlaybackTitle) {
    return 'No saved playback witness is attached to this provider.';
  }

  const latest = historyItems[0] ?? null;
  const title = latest?.title ?? notice.lastPlaybackTitle ?? 'Last playback';
  const progress = latest?.resumeCheckpoint?.progressPercent
    ?? notice.lastPlaybackProgressPercent
    ?? (typeof latest?.progress === 'number' ? Math.round(latest.progress * 100) : null);
  const position = latest?.resumeCheckpoint?.positionSeconds
    ?? latest?.positionSeconds
    ?? notice.lastPlaybackPositionSeconds
    ?? null;
  const positionLabel = formatPositionLabel(position);

  if (latest?.kind === 'live') {
    return `${title} still pins the last live witness${positionLabel ? ` at ${positionLabel}` : ''}, even though the provider is currently down.`;
  }

  if (progress && positionLabel) {
    return `${title} still carries ${progress}% progress at ${positionLabel}.`;
  }

  if (progress) {
    return `${title} still carries ${progress}% progress.`;
  }

  return `${title} still owns the latest saved playback witness for this provider.`;
};

const buildEntry = ({
  screenId,
  provider,
  notice,
  isActive,
  connectionStatus,
  catalog,
  searchSnapshot,
  historyItems,
}: {
  screenId: ProviderDropRuntimeContract['screenId'];
  provider: SavedConnection | null;
  notice: ProviderDropNotice;
  isActive: boolean;
  connectionStatus?: ConnectionStatus | null;
  catalog?: ProviderCatalog | null;
  searchSnapshot?: ProviderSearchSnapshot | null;
  historyItems: WatchHistoryItem[];
}): ProviderDropRuntimeEntry => {
  const state = connectionStatus?.state ?? notice.lastKnownConnectionState ?? 'error';
  const tone = isActive || state === 'error' ? 'recover' : 'watch';
  const reasonLabel = getReasonLabel(notice.reason);
  const { cachedCatalogSummary, cachedSearchSummary } = buildCacheSummary({
    catalog,
    search: searchSnapshot,
    notice,
  });
  const historySummary = buildHistorySummary(historyItems, notice);
  const searchSummary = screenId === 'search'
    ? cachedSearchSummary
    : searchSnapshot
      ? `Search continuity is still parked on "${searchSnapshot.query}" while Live recovers.`
      : cachedSearchSummary;
  const detail = screenId === 'player'
    ? isActive
      ? 'Playback failed on the active provider. Keep the current title, checkpoint, and cached witness visible until retry or provider recovery proves a fresh picture again.'
      : 'The player can still use this saved witness for recovery context, but the dropped provider must not silently reclaim playback ownership until validation clears.'
    : isActive
      ? 'Keep cached continuity visible, but stop implying the active provider can still deliver fresh playback until validation recovers.'
      : 'Saved continuity is still useful here, but this provider should not silently retake launch ownership until validation clears.';
  const nextActionLabel = screenId === 'player'
    ? isActive
      ? 'Retry playback or switch'
      : 'Keep recovery witness warm'
    : isActive
      ? 'Retry or switch provider'
      : 'Keep cached context warm';

  return {
    providerId: notice.providerId,
    providerName: provider?.name ?? notice.providerName,
    isActive,
    tone,
    title: isActive
      ? `${reasonLabel} on the active provider`
      : `${reasonLabel} on a saved provider`,
    summary: notice.message,
    detail,
    happenedAt: notice.happenedAt,
    cachedCatalogSummary,
    cachedSearchSummary: searchSummary,
    historySummary,
    nextActionLabel,
  };
};

export const buildProviderDropRuntime = ({
  screenId,
  connections,
  activeConnectionId,
  connectionStatus,
  providerDrops,
  catalogsByProvider,
  searchSnapshotsByProvider,
  watchHistory,
}: {
  screenId: ProviderDropRuntimeContract['screenId'];
  connections: SavedConnection[];
  activeConnectionId?: string | null;
  connectionStatus: Record<string, ConnectionStatus>;
  providerDrops: Record<string, ProviderDropNotice>;
  catalogsByProvider?: Record<string, ProviderCatalog>;
  searchSnapshotsByProvider?: Record<string, ProviderSearchSnapshot>;
  watchHistory: WatchHistoryItem[];
}): ProviderDropRuntimeContract | null => {
  const notices = Object.values(providerDrops)
    .filter((notice) => !notice.recoveredAt)
    .sort((left, right) => right.happenedAt - left.happenedAt);

  if (notices.length === 0) return null;

  const entries = notices.map((notice) => buildEntry({
    screenId,
    provider: connections.find((connection) => connection.id === notice.providerId) ?? null,
    notice,
    isActive: activeConnectionId === notice.providerId,
    connectionStatus: connectionStatus[notice.providerId] ?? null,
    catalog: catalogsByProvider?.[notice.providerId] ?? null,
    searchSnapshot: searchSnapshotsByProvider?.[notice.providerId] ?? null,
    historyItems: watchHistory.filter((item) => item.providerId === notice.providerId),
  }));

  const activeDropCount = entries.filter((entry) => entry.isActive).length;
  const tone = activeDropCount > 0 ? 'recover' : 'watch';

  return {
    screenId,
    tone,
    title: screenId === 'player'
      ? 'Provider-drop playback continuity'
      : screenId === 'live'
        ? 'Provider-drop continuity'
        : 'Provider-drop search continuity',
    summary: screenId === 'player'
      ? activeDropCount > 0
        ? 'The active playback provider has dropped, but the current title, checkpoint, and recovery witness still survive on disk.'
        : 'A saved playback provider dropped recently, but its witness is still warm enough to keep recovery truth visible in the dock.'
      : activeDropCount > 0
        ? 'The active provider has dropped, but cached continuity and playback witness still survive on disk.'
        : 'A saved provider dropped recently, but its cached continuity is still warm enough to keep route truth visible.',
    detail: screenId === 'player'
      ? 'Player Dock should keep the current stream, resume checkpoint, and recovery-owner truth visible while retry or saved-provider handoff happens explicitly.'
      : screenId === 'live'
        ? 'Live should keep the selected channel, cached guide posture, and last playback witness visible while retry or saved-provider recovery happens explicitly.'
        : 'Search should keep ranked results, duplicate-collapse truth, and saved playback witness visible while provider retry or switch ownership is decided explicitly.',
    activeDropCount,
    entries,
  };
};
