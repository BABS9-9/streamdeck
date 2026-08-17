'use client';

import { create } from 'zustand';
import { buildProviderSearchIndexSnapshot, queryProviderSearchIndex } from '@/lib/provider-search-index';
import { buildGlobalSearchRuntimeContract, GlobalSearchRuntimeContract } from '@/lib/search-runtime-contracts';
import { buildSearchRouteActionContract, GlobalSearchRouteContract } from '@/lib/search-action-contracts';
import { buildGroupedSearchResultsFromHits } from '@/lib/search-continuity';
import { buildSearchSnapshotFromResults } from '@/lib/search-snapshot-contracts';
import { storage } from '@/lib/storage';
import { ConnectionStatus, FavoriteEntry, ProviderCatalog, ProviderSearchIndexSnapshot, ProviderSearchSnapshot, RecentSearchQueryEntry, SavedConnection, WatchHistoryItem } from '@/lib/types';

type SearchState = {
  hydrated: boolean;
  indexesByProvider: Record<string, ProviderSearchIndexSnapshot>;
  snapshotsByProvider: Record<string, ProviderSearchSnapshot>;
  recentQueries: RecentSearchQueryEntry[];
  hydrate: () => void;
  getSnapshot: (providerId: string) => ProviderSearchSnapshot | null;
  getIndexSnapshot: (providerId: string, maxAgeMs?: number) => ProviderSearchIndexSnapshot | null;
  getRecentQueries: () => RecentSearchQueryEntry[];
  syncProviderIndex: (providerId: string, catalog: ProviderCatalog, updatedAt?: number) => ProviderSearchIndexSnapshot;
  syncProviderIndexes: (entries: Array<{ providerId: string; catalog: ProviderCatalog; updatedAt?: number }>) => Record<string, ProviderSearchIndexSnapshot>;
  removeProviderIndex: (providerId: string) => void;
  invalidateProvider: (providerId: string) => void;
  queryGlobalIndex: (payload: {
    connections: SavedConnection[];
    query: string;
    connectionStatus: Record<string, ConnectionStatus>;
    activeConnectionId?: string | null;
    watchHistory?: WatchHistoryItem[];
    favoriteEntriesByProvider?: Record<string, FavoriteEntry[]>;
    maxIndexAgeMs?: number;
  }) => GlobalSearchRouteContract;
  saveSnapshot: (
    providerId: string,
    payload: Omit<ProviderSearchSnapshot, 'providerId' | 'updatedAt'> & { updatedAt?: number }
  ) => void;
  saveResultsSnapshot: (payload: {
    providerId: string;
    query: string;
    results: ReturnType<typeof buildGroupedSearchResultsFromHits>;
    duplicateGroups: number;
    updatedAt?: number;
  }) => void;
  saveRecentQuery: (entry: RecentSearchQueryEntry) => void;
  removeSnapshot: (providerId: string) => void;
};

export const useSearchStore = create<SearchState>((set, get) => ({
  hydrated: false,
  indexesByProvider: {},
  snapshotsByProvider: {},
  recentQueries: [],
  hydrate: () => {
    if (get().hydrated) return;
    set({
      hydrated: true,
      indexesByProvider: storage.getSearchIndexes(),
      snapshotsByProvider: storage.getSearchSnapshots(),
      recentQueries: storage.getRecentSearchQueries(),
    });
  },
  getSnapshot: (providerId) => get().snapshotsByProvider[providerId] ?? null,
  getIndexSnapshot: (providerId, maxAgeMs = Number.MAX_SAFE_INTEGER) => {
    const snapshot = get().indexesByProvider[providerId] ?? storage.getProviderSearchIndex(providerId);
    if (!snapshot) return null;
    if (Date.now() - snapshot.updatedAt > maxAgeMs) return null;
    return snapshot;
  },
  getRecentQueries: () => get().recentQueries,
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
  invalidateProvider: (providerId) => {
    storage.removeProviderSearchIndex(providerId);
    storage.removeProviderSearchSnapshot(providerId);
    const nextRecentQueries = storage.getRecentSearchQueries().filter((entry) => entry.providerId !== providerId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('streamdeck.recent-search-queries', JSON.stringify(nextRecentQueries));
    }
    set((state) => {
      const indexesByProvider = { ...state.indexesByProvider };
      const snapshotsByProvider = { ...state.snapshotsByProvider };
      delete indexesByProvider[providerId];
      delete snapshotsByProvider[providerId];
      return {
        indexesByProvider,
        snapshotsByProvider,
        recentQueries: nextRecentQueries,
      };
    });
  },
  queryGlobalIndex: ({
    connections,
    query,
    connectionStatus,
    activeConnectionId,
    watchHistory = [],
    favoriteEntriesByProvider = {},
    maxIndexAgeMs = Number.MAX_SAFE_INTEGER,
  }) => {
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

    const runtimeContract: GlobalSearchRuntimeContract = buildGlobalSearchRuntimeContract({
      query,
      connections,
      activeConnectionId,
      connectionStatus,
      indexSnapshotsByProvider,
      results,
      maxIndexAgeMs,
    });

    return buildSearchRouteActionContract({
      runtime: runtimeContract,
      activeConnectionId,
      connections,
      favoriteEntriesByProvider,
      watchHistory,
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
  saveResultsSnapshot: ({ providerId, query, results, duplicateGroups, updatedAt }) => {
    const snapshot = buildSearchSnapshotFromResults({
      providerId,
      query,
      results,
      duplicateGroups,
      updatedAt,
    });
    storage.saveProviderSearchSnapshot(providerId, snapshot);
    set((state) => ({
      snapshotsByProvider: {
        ...state.snapshotsByProvider,
        [providerId]: snapshot,
      },
    }));
  },
  saveRecentQuery: (entry) => {
    storage.saveRecentSearchQuery(entry);
    set({
      recentQueries: storage.getRecentSearchQueries(),
    });
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
