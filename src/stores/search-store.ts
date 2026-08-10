'use client';

import { create } from 'zustand';
import { buildProviderSearchIndexSnapshot, queryProviderSearchIndex } from '@/lib/provider-search-index';
import { buildGlobalSearchRuntimeContract, GlobalSearchRuntimeContract } from '@/lib/search-runtime-contracts';
import { buildGroupedSearchResultsFromHits } from '@/lib/search-continuity';
import { storage } from '@/lib/storage';
import { ConnectionStatus, ProviderCatalog, ProviderSearchIndexSnapshot, ProviderSearchSnapshot, SavedConnection, WatchHistoryItem } from '@/lib/types';

type SearchState = {
  hydrated: boolean;
  indexesByProvider: Record<string, ProviderSearchIndexSnapshot>;
  snapshotsByProvider: Record<string, ProviderSearchSnapshot>;
  hydrate: () => void;
  getSnapshot: (providerId: string) => ProviderSearchSnapshot | null;
  getIndexSnapshot: (providerId: string, maxAgeMs?: number) => ProviderSearchIndexSnapshot | null;
  syncProviderIndex: (providerId: string, catalog: ProviderCatalog, updatedAt?: number) => ProviderSearchIndexSnapshot;
  syncProviderIndexes: (entries: Array<{ providerId: string; catalog: ProviderCatalog; updatedAt?: number }>) => Record<string, ProviderSearchIndexSnapshot>;
  removeProviderIndex: (providerId: string) => void;
  queryGlobalIndex: (payload: {
    connections: SavedConnection[];
    query: string;
    connectionStatus: Record<string, ConnectionStatus>;
    activeConnectionId?: string | null;
    watchHistory?: WatchHistoryItem[];
    maxIndexAgeMs?: number;
  }) => GlobalSearchRuntimeContract;
  saveSnapshot: (
    providerId: string,
    payload: Omit<ProviderSearchSnapshot, 'providerId' | 'updatedAt'> & { updatedAt?: number }
  ) => void;
  removeSnapshot: (providerId: string) => void;
};

export const useSearchStore = create<SearchState>((set, get) => ({
  hydrated: false,
  indexesByProvider: {},
  snapshotsByProvider: {},
  hydrate: () => {
    if (get().hydrated) return;
    set({
      hydrated: true,
      indexesByProvider: storage.getSearchIndexes(),
      snapshotsByProvider: storage.getSearchSnapshots(),
    });
  },
  getSnapshot: (providerId) => get().snapshotsByProvider[providerId] ?? null,
  getIndexSnapshot: (providerId, maxAgeMs = Number.MAX_SAFE_INTEGER) => {
    const snapshot = get().indexesByProvider[providerId] ?? storage.getProviderSearchIndex(providerId);
    if (!snapshot) return null;
    if (Date.now() - snapshot.updatedAt > maxAgeMs) return null;
    return snapshot;
  },
  syncProviderIndex: (providerId, catalog, updatedAt = Date.now()) => {
    const snapshot = buildProviderSearchIndexSnapshot({ providerId, catalog, updatedAt });
    storage.saveProviderSearchIndex(providerId, snapshot);
    set((state) => ({
      indexesByProvider: {
        ...state.indexesByProvider,
        [providerId]: snapshot,
      },
    }));
    return snapshot;
  },
  syncProviderIndexes: (entries) => {
    const nextSnapshots = entries.reduce<Record<string, ProviderSearchIndexSnapshot>>((acc, entry) => {
      acc[entry.providerId] = buildProviderSearchIndexSnapshot({
        providerId: entry.providerId,
        catalog: entry.catalog,
        updatedAt: entry.updatedAt ?? Date.now(),
      });
      return acc;
    }, {});

    Object.entries(nextSnapshots).forEach(([providerId, snapshot]) => {
      storage.saveProviderSearchIndex(providerId, snapshot);
    });

    set((state) => ({
      indexesByProvider: {
        ...state.indexesByProvider,
        ...nextSnapshots,
      },
    }));

    return nextSnapshots;
  },
  removeProviderIndex: (providerId) => {
    storage.removeProviderSearchIndex(providerId);
    set((state) => {
      const indexesByProvider = { ...state.indexesByProvider };
      delete indexesByProvider[providerId];
      return { indexesByProvider };
    });
  },
  queryGlobalIndex: ({ connections, query, connectionStatus, activeConnectionId, watchHistory = [], maxIndexAgeMs = Number.MAX_SAFE_INTEGER }) => {
    const providerLookup = Object.fromEntries(connections.map((connection) => [connection.id, connection]));
    const indexSnapshotsByProvider = Object.fromEntries(
      connections.map((provider) => [provider.id, get().indexesByProvider[provider.id] ?? storage.getProviderSearchIndex(provider.id)])
    ) as Record<string, ProviderSearchIndexSnapshot | null>;
    const hits = connections.flatMap((provider) => {
      const snapshot = indexSnapshotsByProvider[provider.id];
      if (!snapshot) return [];
      if (Date.now() - snapshot.updatedAt > maxIndexAgeMs) return [];

      return queryProviderSearchIndex({ snapshot, query }).map((hit) => ({
        ...hit,
        provider,
      }));
    });

    const results = buildGroupedSearchResultsFromHits({
      hits: hits.filter((hit) => providerLookup[hit.provider.id]),
      connectionStatus,
      activeConnectionId,
      watchHistory,
    });

    return buildGlobalSearchRuntimeContract({
      query,
      connections,
      activeConnectionId,
      connectionStatus,
      indexSnapshotsByProvider,
      results,
      maxIndexAgeMs,
    });
  },
  saveSnapshot: (providerId, payload) => {
    const snapshot: ProviderSearchSnapshot = {
      providerId,
      query: payload.query,
      resultCount: payload.resultCount,
      duplicateGroups: payload.duplicateGroups,
      selectedTitle: payload.selectedTitle ?? null,
      selectedKind: payload.selectedKind ?? null,
      updatedAt: payload.updatedAt ?? Date.now(),
    };
    storage.saveProviderSearchSnapshot(providerId, snapshot);
    set((state) => ({
      snapshotsByProvider: {
        ...state.snapshotsByProvider,
        [providerId]: snapshot,
      },
    }));
  },
  removeSnapshot: (providerId) => {
    storage.removeProviderSearchSnapshot(providerId);
    set((state) => {
      const snapshotsByProvider = { ...state.snapshotsByProvider };
      delete snapshotsByProvider[providerId];
      return { snapshotsByProvider };
    });
  },
}));
