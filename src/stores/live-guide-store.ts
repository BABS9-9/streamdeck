'use client';

import { create } from 'zustand';
import { getContentId, getShortEpg, getCachedEpgEntry, getCachedEpgSnapshot, mergeProviderEpgEntry } from '@/lib/xtream-api';
import { storage } from '@/lib/storage';
import {
  NormalizedEpg,
  ProviderEpgSnapshot,
  ProviderEpgSnapshotEntry,
  ProviderEpgSyncState,
  ProviderGuideCoverageItem,
  ProviderGuideCoverageReport,
  SavedConnection,
  XtreamStream,
} from '@/lib/types';

const inflightGuideRefreshes = new Map<string, Promise<ProviderEpgSnapshotEntry>>();
const LIVE_GUIDE_CACHE_MAX_AGE_MS = 1000 * 60 * 10;

const buildGuideKey = (providerId: string, streamId: number) => `${providerId}:${streamId}`;
const getGuideAgeMinutes = (updatedAt: number | null) => {
  if (!updatedAt) return null;
  return Math.max(1, Math.round((Date.now() - updatedAt) / 60000));
};

const defaultSyncState = (): ProviderEpgSyncState => ({
  status: 'idle',
  source: 'none',
  updatedAt: null,
  error: null,
  streamId: null,
});

const sortUniqueStreamIds = (streamIds: number[]) => [...new Set(streamIds.filter((streamId) => Number.isFinite(streamId) && streamId > 0))];

type RefreshGuideResult = {
  providerId: string;
  streamId: number;
  entry?: ProviderEpgSnapshotEntry;
  error?: string;
};

type LiveGuideState = {
  hydrated: boolean;
  snapshotsByProvider: Record<string, ProviderEpgSnapshot>;
  syncByGuideKey: Record<string, ProviderEpgSyncState>;
  hydrate: () => void;
  getGuideEntry: (providerId: string, streamId: number, maxAgeMs?: number) => ProviderEpgSnapshotEntry | null;
  getCoverageReport: (providerId: string, streamIds: number[], maxAgeMs?: number) => ProviderGuideCoverageReport | null;
  markGuideFromCache: (providerId: string, streamIds: number[]) => void;
  refreshGuideEntry: (provider: SavedConnection, streamId: number) => Promise<ProviderEpgSnapshotEntry>;
  refreshGuideEntries: (provider: SavedConnection, streamIds: number[]) => Promise<RefreshGuideResult[]>;
  prefetchStreams: (provider: SavedConnection | null, streams: XtreamStream[], limit?: number) => Promise<RefreshGuideResult[]>;
  lookupStreamGuide: (providerId: string, stream: XtreamStream | null | undefined, maxAgeMs?: number) => ProviderEpgSnapshotEntry | null;
  clearProvider: (providerId: string) => void;
};

export const useLiveGuideStore = create<LiveGuideState>((set, get) => ({
  hydrated: false,
  snapshotsByProvider: {},
  syncByGuideKey: {},
  hydrate: () => {
    if (get().hydrated) return;
    const snapshotsByProvider = storage.getEpgSnapshots();
    const syncByGuideKey = Object.values(snapshotsByProvider).reduce<Record<string, ProviderEpgSyncState>>((acc, snapshot) => {
      Object.values(snapshot.entries || {}).forEach((entry) => {
        acc[buildGuideKey(snapshot.providerId, entry.streamId)] = {
          status: entry.error ? 'error' : 'ready',
          source: 'cache',
          updatedAt: entry.updatedAt,
          error: entry.error,
          streamId: entry.streamId,
        };
      });
      return acc;
    }, {});
    set({ hydrated: true, snapshotsByProvider, syncByGuideKey });
  },
  getGuideEntry: (providerId, streamId, maxAgeMs = LIVE_GUIDE_CACHE_MAX_AGE_MS) => {
    const snapshot = get().snapshotsByProvider[providerId] ?? getCachedEpgSnapshot(providerId, maxAgeMs);
    if (!snapshot) return null;
    const entry = snapshot.entries?.[streamId] ?? null;
    if (!entry) return null;
    if (Date.now() - entry.updatedAt > maxAgeMs) return null;
    return entry;
  },
  getCoverageReport: (providerId, streamIds, maxAgeMs = LIVE_GUIDE_CACHE_MAX_AGE_MS) => {
    const uniqueStreamIds = sortUniqueStreamIds(streamIds);
    if (uniqueStreamIds.length === 0) return null;

    const snapshot = get().snapshotsByProvider[providerId] ?? storage.getProviderEpgSnapshot(providerId);
    const items = uniqueStreamIds.map<ProviderGuideCoverageItem>((streamId) => {
      const entry = snapshot?.entries?.[streamId] ?? null;
      const sync = get().syncByGuideKey[buildGuideKey(providerId, streamId)] ?? defaultSyncState();
      const ageMs = entry?.updatedAt ? Date.now() - entry.updatedAt : null;
      const isFresh = Boolean(entry?.updatedAt && ageMs !== null && ageMs <= maxAgeMs && entry?.epg);
      const isStale = Boolean(entry?.updatedAt && ageMs !== null && ageMs > maxAgeMs);
      const status: ProviderGuideCoverageItem['status'] = sync.status === 'refreshing'
        ? 'refreshing'
        : sync.error
          ? 'error'
          : isFresh
            ? 'fresh'
            : isStale
              ? 'stale'
              : 'missing';

      return {
        streamId,
        status,
        source: sync.source || (entry ? 'cache' : 'none'),
        updatedAt: entry?.updatedAt ?? sync.updatedAt ?? null,
        error: sync.error ?? entry?.error ?? null,
        nowTitle: entry?.epg?.now?.title ?? null,
        nextTitle: entry?.epg?.next?.title ?? null,
        ageMinutes: getGuideAgeMinutes(entry?.updatedAt ?? sync.updatedAt ?? null),
      };
    });

    const freshCount = items.filter((item) => item.status === 'fresh').length;
    const refreshingCount = items.filter((item) => item.status === 'refreshing').length;
    const staleCount = items.filter((item) => item.status === 'stale').length;
    const errorCount = items.filter((item) => item.status === 'error').length;
    const missingCount = items.filter((item) => item.status === 'missing').length;
    const cacheCount = items.filter((item) => item.source === 'cache').length;
    const networkCount = items.filter((item) => item.source === 'network').length;
    const updatedValues = items.map((item) => item.updatedAt).filter((value): value is number => Boolean(value));
    const freshestUpdatedAt = updatedValues.length ? Math.max(...updatedValues) : null;
    const stalestUpdatedAt = updatedValues.length ? Math.min(...updatedValues) : null;

    let status: ProviderGuideCoverageReport['status'] = 'empty';
    let summary = `No guide coverage for ${uniqueStreamIds.length} tracked channel${uniqueStreamIds.length === 1 ? '' : 's'} yet.`;
    if (freshCount === uniqueStreamIds.length) {
      status = 'fresh';
      summary = `Guide is fresh for all ${uniqueStreamIds.length} tracked channel${uniqueStreamIds.length === 1 ? '' : 's'}.`;
    } else if (freshCount > 0 || refreshingCount > 0) {
      status = 'partial';
      summary = `${freshCount}/${uniqueStreamIds.length} channel${uniqueStreamIds.length === 1 ? '' : 's'} have fresh now/next data${refreshingCount ? `, ${refreshingCount} still refreshing` : ''}.`;
    } else if (staleCount > 0) {
      status = errorCount > 0 ? 'error' : 'stale';
      summary = `${staleCount}/${uniqueStreamIds.length} tracked channel${uniqueStreamIds.length === 1 ? ' is' : 's are'} relying on stale guide data.`;
    } else if (errorCount > 0) {
      status = 'error';
      summary = `Guide refresh failed on ${errorCount}/${uniqueStreamIds.length} tracked channel${uniqueStreamIds.length === 1 ? '' : 's'}.`;
    } else if (missingCount > 0) {
      status = 'empty';
      summary = `Guide is still missing for ${missingCount}/${uniqueStreamIds.length} tracked channel${uniqueStreamIds.length === 1 ? '' : 's'}.`;
    }

    return {
      providerId,
      requestedCount: uniqueStreamIds.length,
      freshCount,
      staleCount,
      refreshingCount,
      errorCount,
      missingCount,
      cacheCount,
      networkCount,
      freshestUpdatedAt,
      stalestUpdatedAt,
      status,
      summary,
      items,
    };
  },
  markGuideFromCache: (providerId, streamIds) => {
    const cachedSnapshot = storage.getProviderEpgSnapshot(providerId);
    if (!cachedSnapshot) return;

    const nextSync = { ...get().syncByGuideKey };
    let touched = false;
    sortUniqueStreamIds(streamIds).forEach((streamId) => {
      const entry = cachedSnapshot.entries?.[streamId];
      if (!entry) return;
      nextSync[buildGuideKey(providerId, streamId)] = {
        status: entry.error ? 'error' : 'ready',
        source: 'cache',
        updatedAt: entry.updatedAt,
        error: entry.error,
        streamId,
      };
      touched = true;
    });

    if (!touched) return;

    set((state) => ({
      snapshotsByProvider: {
        ...state.snapshotsByProvider,
        [providerId]: cachedSnapshot,
      },
      syncByGuideKey: nextSync,
    }));
  },
  refreshGuideEntry: async (provider, streamId) => {
    const guideKey = buildGuideKey(provider.id, streamId);
    const existing = inflightGuideRefreshes.get(guideKey);
    if (existing) return existing;

    set((state) => ({
      syncByGuideKey: {
        ...state.syncByGuideKey,
        [guideKey]: {
          ...(state.syncByGuideKey[guideKey] || defaultSyncState()),
          status: 'refreshing',
          source: state.syncByGuideKey[guideKey]?.source || 'none',
          error: null,
          streamId,
        },
      },
    }));

    const request = getShortEpg(provider, streamId)
      .then((epg) => {
        const entry = mergeProviderEpgEntry(provider.id, streamId, epg, { error: null });
        const snapshot = storage.getProviderEpgSnapshot(provider.id);
        set((state) => ({
          snapshotsByProvider: snapshot
            ? {
                ...state.snapshotsByProvider,
                [provider.id]: snapshot,
              }
            : state.snapshotsByProvider,
          syncByGuideKey: {
            ...state.syncByGuideKey,
            [guideKey]: {
              status: 'ready',
              source: 'network',
              updatedAt: entry.updatedAt,
              error: null,
              streamId,
            },
          },
        }));
        return entry;
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Guide refresh failed';
        const cachedEntry = getCachedEpgEntry(provider.id, streamId, Number.MAX_SAFE_INTEGER);
        const entry = mergeProviderEpgEntry(provider.id, streamId, cachedEntry?.epg ?? null, { error: message });
        const snapshot = storage.getProviderEpgSnapshot(provider.id);
        set((state) => ({
          snapshotsByProvider: snapshot
            ? {
                ...state.snapshotsByProvider,
                [provider.id]: snapshot,
              }
            : state.snapshotsByProvider,
          syncByGuideKey: {
            ...state.syncByGuideKey,
            [guideKey]: {
              status: 'error',
              source: cachedEntry ? 'cache' : 'none',
              updatedAt: entry.updatedAt,
              error: message,
              streamId,
            },
          },
        }));
        throw error;
      })
      .finally(() => {
        inflightGuideRefreshes.delete(guideKey);
      });

    inflightGuideRefreshes.set(guideKey, request);
    return request;
  },
  refreshGuideEntries: async (provider, streamIds) => {
    const uniqueStreamIds = sortUniqueStreamIds(streamIds);
    const settled = await Promise.allSettled(
      uniqueStreamIds.map(async (streamId) => ({
        providerId: provider.id,
        streamId,
        entry: await get().refreshGuideEntry(provider, streamId),
      }))
    );

    return settled.map((result, index) => {
      const streamId = uniqueStreamIds[index];
      if (result.status === 'fulfilled') return result.value;
      return {
        providerId: provider.id,
        streamId,
        error: result.reason instanceof Error ? result.reason.message : 'Guide refresh failed',
      };
    });
  },
  prefetchStreams: async (provider, streams, limit = 8) => {
    if (!provider) return [];
    const streamIds = streams.slice(0, limit).map((stream) => getContentId(stream));
    return get().refreshGuideEntries(provider, streamIds);
  },
  lookupStreamGuide: (providerId, stream, maxAgeMs = LIVE_GUIDE_CACHE_MAX_AGE_MS) => {
    if (!stream) return null;
    const streamId = getContentId(stream);
    if (!streamId) return null;
    return get().getGuideEntry(providerId, streamId, maxAgeMs);
  },
  clearProvider: (providerId) => {
    set((state) => ({
      snapshotsByProvider: Object.fromEntries(
        Object.entries(state.snapshotsByProvider).filter(([key]) => key !== providerId)
      ),
      syncByGuideKey: Object.fromEntries(
        Object.entries(state.syncByGuideKey).filter(([key]) => !key.startsWith(`${providerId}:`))
      ),
    }));
  },
}));

export const getGuideNowTitle = (entry?: ProviderEpgSnapshotEntry | null) => entry?.epg?.now?.title ?? null;

export const getGuideNextTitle = (entry?: ProviderEpgSnapshotEntry | null) => entry?.epg?.next?.title ?? null;

export const getGuidePayload = (entry?: ProviderEpgSnapshotEntry | null): NormalizedEpg | null => entry?.epg ?? null;

export const formatGuideUpdatedAge = (updatedAt?: number | null) => {
  if (!updatedAt) return 'No guide sync yet';
  const ageMinutes = Math.max(1, Math.round((Date.now() - updatedAt) / 60000));
  return `${ageMinutes} minute${ageMinutes === 1 ? '' : 's'} ago`;
};
