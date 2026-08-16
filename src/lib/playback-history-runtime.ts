import { normalizeRecoveryKey, normalizeVariantYear } from './provider-recovery';
import { ConnectionStatus, ProviderSwitchContext, SavedConnection, WatchHistoryItem, XtreamStream } from './types';

type PlaybackMeta = {
  seriesId?: number;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  sourceSurface?: WatchHistoryItem['sourceSurface'];
};

export type PlaybackHistoryTone = 'ready' | 'watch' | 'recover';

export type PlaybackHistoryOwnerContract = {
  providerId: string;
  providerName: string;
  summary: string;
  tone: PlaybackHistoryTone;
};

export type PlaybackHistoryCheckpointContract = {
  progressPercent: number | null;
  positionSeconds: number | null;
  durationSeconds: number | null;
  positionLabel: string | null;
  summary: string;
  capturedAt: number;
};

export type PlaybackHistoryRecoveryContract = {
  status: 'fresh' | 'watch' | 'recover';
  reason: 'active-owner' | 'provider-mismatch' | 'provider-error' | 'aging-proof' | 'missing-playback-url';
  summary: string;
  detail: string;
  tone: PlaybackHistoryTone;
  targetProviderId: string | null;
};

export type PlaybackHistoryHydrationContract = {
  key: string;
  id: string;
  title: string;
  kind: WatchHistoryItem['kind'];
  providerId: string;
  providerName: string;
  progressPercent: number | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  lastOwner: PlaybackHistoryOwnerContract;
  checkpoint: PlaybackHistoryCheckpointContract | null;
  staleSession: PlaybackHistoryRecoveryContract;
  updatedAt: number;
};

export type PlaybackHistoryRuntimeContract = {
  items: PlaybackHistoryHydrationContract[];
  itemsByKey: Record<string, PlaybackHistoryHydrationContract>;
  freshestUpdatedAt: number | null;
  staleCount: number;
  recoveryCount: number;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const buildContinuityKey = ({
  title,
  kind,
  year,
  seriesTitle,
}: {
  title?: string | null;
  kind: WatchHistoryItem['kind'];
  year?: string | null;
  seriesTitle?: string | null;
}) => `${kind}:${normalizeRecoveryKey(seriesTitle || title)}:${normalizeVariantYear(year)}`;

const clampProgressPercent = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.max(1, Math.min(99, Math.round(value * 100)));
};

const formatPositionLabel = (seconds?: number | null) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const getProviderNameMap = (connections: SavedConnection[]) => (
  Object.fromEntries(connections.map((connection) => [connection.id, connection.name]))
);

const buildOwnerSummary = ({
  item,
  providerName,
  activeConnectionId,
}: {
  item: WatchHistoryItem;
  providerName: string;
  activeConnectionId?: string | null;
}): PlaybackHistoryOwnerContract => {
  const carriedOwner = item.lastOwner?.providerId || item.providerId;
  const ownerName = item.lastOwner?.providerName || providerName;
  if (carriedOwner !== item.providerId) {
    return {
      providerId: carriedOwner,
      providerName: ownerName,
      summary: `${ownerName} still owns the last trusted resume witness, even though this row is currently stored on ${providerName}.`,
      tone: 'watch',
    };
  }

  if (activeConnectionId && activeConnectionId !== item.providerId) {
    return {
      providerId: carriedOwner,
      providerName: ownerName,
      summary: `${ownerName} owns the last resume witness, but the active provider has already moved elsewhere.`,
      tone: 'watch',
    };
  }

  return {
    providerId: carriedOwner,
    providerName: ownerName,
    summary: `${ownerName} still owns the safest next resume for this saved row.`,
    tone: 'ready',
  };
};

const buildCheckpoint = (item: WatchHistoryItem): PlaybackHistoryCheckpointContract | null => {
  const fallbackPosition = typeof item.positionSeconds === 'number' && Number.isFinite(item.positionSeconds)
    ? Math.max(0, Math.floor(item.positionSeconds))
    : null;
  const progressPercent = item.resumeCheckpoint?.progressPercent ?? clampProgressPercent(item.progress);
  const positionSeconds = item.resumeCheckpoint?.positionSeconds ?? fallbackPosition;
  const durationSeconds = item.resumeCheckpoint?.durationSeconds ?? item.durationSeconds ?? null;
  const capturedAt = item.resumeCheckpoint?.capturedAt ?? item.updatedAt;

  if (item.kind === 'live') {
    return {
      progressPercent: 100,
      positionSeconds: null,
      durationSeconds: null,
      positionLabel: null,
      summary: 'Live playback keeps the row pinned to the latest active channel, not a resumable timestamp.',
      capturedAt,
    };
  }

  if (positionSeconds === null && progressPercent === null) return null;

  const episodeLabel = item.kind === 'series' && item.seasonNumber && item.episodeNumber
    ? `S${item.seasonNumber}E${item.episodeNumber}`
    : null;
  const positionLabel = formatPositionLabel(positionSeconds);

  return {
    progressPercent,
    positionSeconds,
    durationSeconds,
    positionLabel,
    summary: item.kind === 'series'
      ? `${episodeLabel || 'Series episode'} is pinned${positionLabel ? ` at ${positionLabel}` : ''}${progressPercent ? ` with ${progressPercent}% progress saved.` : '.'}`
      : `Resume checkpoint is pinned${positionLabel ? ` at ${positionLabel}` : ''}${progressPercent ? ` with ${progressPercent}% progress saved.` : '.'}`,
    capturedAt,
  };
};

const buildStaleSession = ({
  item,
  providerName,
  activeConnectionId,
  connectionStatus,
}: {
  item: WatchHistoryItem;
  providerName: string;
  activeConnectionId?: string | null;
  connectionStatus: Record<string, ConnectionStatus>;
}): PlaybackHistoryRecoveryContract => {
  const now = Date.now();
  const age = now - (item.lastPlayedAt ?? item.updatedAt);
  const providerState = connectionStatus[item.providerId]?.state || 'idle';
  const existing = item.staleSession;

  if (!item.playbackUrl && item.kind !== 'series') {
    return {
      status: 'recover',
      reason: 'missing-playback-url',
      summary: existing?.summary || `${providerName} no longer has a direct playback URL cached for this row.`,
      detail: existing?.detail || 'Rebuild the playback path from the catalog before pretending this resume can reopen directly.',
      tone: 'recover',
      targetProviderId: item.providerId,
    };
  }

  if (providerState === 'error') {
    return {
      status: 'recover',
      reason: 'provider-error',
      summary: existing?.summary || `${providerName} is failing validation, so this saved session needs a healthier owner before resume claims stay premium.`,
      detail: existing?.detail || 'Keep stale-session recovery visible until provider validation recovers or the user switches ownership.',
      tone: 'recover',
      targetProviderId: item.providerId,
    };
  }

  if (activeConnectionId && activeConnectionId !== item.providerId) {
    return {
      status: 'watch',
      reason: 'provider-mismatch',
      summary: existing?.summary || `${providerName} owns the saved session, but another provider is currently active.`,
      detail: existing?.detail || 'Resume can stay hydrated, but the surface still owes an explicit owner switch before promising same-provider continuity.',
      tone: 'watch',
      targetProviderId: item.providerId,
    };
  }

  if (age > 2 * DAY_MS) {
    return {
      status: 'watch',
      reason: 'aging-proof',
      summary: existing?.summary || `${providerName}'s resume proof is now more than 48 hours old.`,
      detail: existing?.detail || 'Keep the checkpoint visible, but treat the session as aging proof until playback refreshes it again.',
      tone: 'watch',
      targetProviderId: item.providerId,
    };
  }

  return {
    status: 'fresh',
    reason: 'active-owner',
    summary: existing?.summary || `${providerName} still holds the freshest saved resume witness for this row.`,
    detail: existing?.detail || 'Playback continuity remains current enough to hydrate Continue Watching without a recovery downgrade.',
    tone: 'ready',
    targetProviderId: item.providerId,
  };
};

export const createPlaybackHistoryEntry = ({
  stream,
  playbackUrl,
  providerId,
  providerName,
  meta,
  existing,
  lastSwitchContext,
}: {
  stream: XtreamStream;
  playbackUrl: string;
  providerId: string;
  providerName?: string | null;
  meta?: PlaybackMeta;
  existing?: WatchHistoryItem;
  lastSwitchContext?: ProviderSwitchContext | null;
}): WatchHistoryItem => {
  const contentId = Number(stream.stream_id ?? stream.series_id ?? 0);
  const kind = stream.stream_type === 'live' ? 'live' : stream.stream_type === 'series' ? 'series' : 'movie';
  const now = Date.now();
  const continuityKey = existing?.continuityKey || buildContinuityKey({
    title: stream.name,
    kind,
    year: stream.year,
    seriesTitle: meta?.seriesTitle,
  });

  return {
    id: `${providerId}-${contentId}`,
    kind,
    title: stream.name,
    streamId: contentId,
    providerId,
    artwork: stream.stream_icon || stream.cover || existing?.artwork,
    categoryId: stream.category_id || existing?.categoryId,
    categoryName: stream.channel_group || existing?.categoryName,
    year: stream.year || existing?.year,
    playbackUrl,
    seriesId: meta?.seriesId ?? existing?.seriesId,
    seriesTitle: meta?.seriesTitle ?? existing?.seriesTitle ?? (kind === 'series' ? stream.name : undefined),
    seasonNumber: meta?.seasonNumber ?? existing?.seasonNumber,
    episodeNumber: meta?.episodeNumber ?? existing?.episodeNumber,
    progress: existing?.progress ?? (kind === 'live' ? 1 : 0.02),
    positionSeconds: existing?.positionSeconds ?? 0,
    durationSeconds: existing?.durationSeconds ?? undefined,
    continuityKey,
    playbackStartedAt: existing?.playbackStartedAt ?? now,
    lastPlayedAt: now,
    sourceSurface: meta?.sourceSurface ?? existing?.sourceSurface ?? 'player',
    lastOwner: {
      providerId,
      providerName: providerName || existing?.lastOwner?.providerName || providerId,
      switchedAt: lastSwitchContext?.switchedAt ?? null,
      reason: lastSwitchContext?.reason ?? null,
      sourceSurface: lastSwitchContext?.sourceSurface ?? meta?.sourceSurface ?? 'player',
    },
    resumeCheckpoint: kind === 'live'
      ? undefined
      : existing?.resumeCheckpoint
        ? {
            ...existing.resumeCheckpoint,
            capturedAt: now,
          }
        : {
            positionSeconds: existing?.positionSeconds ?? 0,
            durationSeconds: existing?.durationSeconds ?? undefined,
            progressPercent: clampProgressPercent(existing?.progress ?? 0.02) ?? 2,
            capturedAt: now,
          },
    staleSession: kind === 'live'
      ? {
          status: 'fresh',
          reason: 'active-owner',
          summary: `${providerName || providerId} now owns the active live session.`,
          detail: 'Keep the channel row hydrated from the latest playback owner instead of a resumable timestamp.',
          targetProviderId: providerId,
          updatedAt: now,
        }
      : undefined,
    updatedAt: now,
  };
};

export const updatePlaybackHistoryProgress = ({
  item,
  positionSeconds,
  durationSeconds,
  providerName,
  connectionStatus,
  activeConnectionId,
}: {
  item: WatchHistoryItem;
  positionSeconds: number;
  durationSeconds?: number | null;
  providerName?: string | null;
  connectionStatus: Record<string, ConnectionStatus>;
  activeConnectionId?: string | null;
}): WatchHistoryItem => {
  const now = Date.now();
  const safeDuration = durationSeconds && Number.isFinite(durationSeconds) && durationSeconds > 0
    ? Math.floor(durationSeconds)
    : item.durationSeconds;
  const normalizedPosition = item.kind === 'live' ? undefined : Math.max(0, Math.floor(positionSeconds));
  const progress = item.kind === 'live'
    ? 1
    : safeDuration
      ? Math.max(0.02, Math.min(0.99, positionSeconds / safeDuration))
      : Math.max(0.02, item.progress || 0.02);
  const nextItem: WatchHistoryItem = {
    ...item,
    progress,
    positionSeconds: normalizedPosition,
    durationSeconds: item.kind === 'live' ? undefined : safeDuration,
    lastPlayedAt: now,
    updatedAt: now,
    resumeCheckpoint: item.kind === 'live'
      ? undefined
      : {
          positionSeconds: normalizedPosition ?? 0,
          durationSeconds: safeDuration,
          progressPercent: clampProgressPercent(progress) ?? 2,
          capturedAt: now,
        },
  };

  const staleSession = buildStaleSession({
    item: nextItem,
    providerName: providerName || nextItem.lastOwner?.providerName || nextItem.providerId,
    activeConnectionId,
    connectionStatus,
  });

  return {
    ...nextItem,
    staleSession: {
      status: staleSession.status,
      reason: staleSession.reason,
      summary: staleSession.summary,
      detail: staleSession.detail,
      targetProviderId: staleSession.targetProviderId,
      updatedAt: now,
    },
  };
};

export const hydratePlaybackHistory = ({
  history,
  connections,
  connectionStatus,
  activeConnectionId,
}: {
  history: WatchHistoryItem[];
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  activeConnectionId?: string | null;
}): WatchHistoryItem[] => {
  const providerNameMap = getProviderNameMap(connections);

  return history.map((item) => {
    const providerName = providerNameMap[item.providerId] || item.lastOwner?.providerName || item.providerId;
    const continuityKey = item.continuityKey || buildContinuityKey({
      title: item.title,
      kind: item.kind,
      year: item.year,
      seriesTitle: item.seriesTitle,
    });
    const progressPercent = item.resumeCheckpoint?.progressPercent ?? clampProgressPercent(item.progress);
    const checkpoint = item.kind === 'live'
      ? undefined
      : {
          positionSeconds: Math.max(0, Math.floor(item.positionSeconds ?? 0)),
          durationSeconds: item.durationSeconds ?? undefined,
          progressPercent: progressPercent ?? 2,
          capturedAt: item.resumeCheckpoint?.capturedAt ?? item.updatedAt,
        };
    const staleSession = buildStaleSession({
      item: {
        ...item,
        continuityKey,
        lastOwner: item.lastOwner || {
          providerId: item.providerId,
          providerName,
        },
        resumeCheckpoint: checkpoint,
      },
      providerName,
      activeConnectionId,
      connectionStatus,
    });

    return {
      ...item,
      continuityKey,
      playbackStartedAt: item.playbackStartedAt ?? item.updatedAt,
      lastPlayedAt: item.lastPlayedAt ?? item.updatedAt,
      lastOwner: item.lastOwner || {
        providerId: item.providerId,
        providerName,
      },
      resumeCheckpoint: checkpoint,
      staleSession: {
        status: staleSession.status,
        reason: staleSession.reason,
        summary: staleSession.summary,
        detail: staleSession.detail,
        targetProviderId: staleSession.targetProviderId,
        updatedAt: item.staleSession?.updatedAt ?? item.updatedAt,
      },
    };
  }).sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));
};

export const buildPlaybackHistoryRuntime = ({
  history,
  connections,
  connectionStatus,
  activeConnectionId,
}: {
  history: WatchHistoryItem[];
  connections: SavedConnection[];
  connectionStatus: Record<string, ConnectionStatus>;
  activeConnectionId?: string | null;
}): PlaybackHistoryRuntimeContract => {
  const hydrated = hydratePlaybackHistory({
    history,
    connections,
    connectionStatus,
    activeConnectionId,
  });
  const providerNameMap = getProviderNameMap(connections);

  const items = hydrated.map((item) => {
    const providerName = providerNameMap[item.providerId] || item.lastOwner?.providerName || item.providerId;
    const checkpoint = buildCheckpoint(item);
    const lastOwner = buildOwnerSummary({
      item,
      providerName,
      activeConnectionId,
    });
    const staleSession = buildStaleSession({
      item,
      providerName,
      activeConnectionId,
      connectionStatus,
    });

    return {
      key: item.continuityKey || buildContinuityKey({
        title: item.title,
        kind: item.kind,
        year: item.year,
        seriesTitle: item.seriesTitle,
      }),
      id: item.id,
      title: item.title,
      kind: item.kind,
      providerId: item.providerId,
      providerName,
      progressPercent: checkpoint?.progressPercent ?? clampProgressPercent(item.progress),
      seasonNumber: item.seasonNumber ?? null,
      episodeNumber: item.episodeNumber ?? null,
      lastOwner,
      checkpoint,
      staleSession,
      updatedAt: item.updatedAt,
    } satisfies PlaybackHistoryHydrationContract;
  });

  return {
    items,
    itemsByKey: Object.fromEntries(items.map((item) => [item.key, item])),
    freshestUpdatedAt: items[0]?.updatedAt ?? null,
    staleCount: items.filter((item) => item.staleSession.status === 'watch').length,
    recoveryCount: items.filter((item) => item.staleSession.status === 'recover').length,
  };
};
