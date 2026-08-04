'use client';

import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { ProviderSearchSnapshot } from '@/lib/types';

type SearchState = {
  hydrated: boolean;
  snapshotsByProvider: Record<string, ProviderSearchSnapshot>;
  hydrate: () => void;
  getSnapshot: (providerId: string) => ProviderSearchSnapshot | null;
  saveSnapshot: (
    providerId: string,
    payload: Omit<ProviderSearchSnapshot, 'providerId' | 'updatedAt'> & { updatedAt?: number }
  ) => void;
  removeSnapshot: (providerId: string) => void;
};

export const useSearchStore = create<SearchState>((set, get) => ({
  hydrated: false,
  snapshotsByProvider: {},
  hydrate: () => {
    if (get().hydrated) return;
    set({
      hydrated: true,
      snapshotsByProvider: storage.getSearchSnapshots(),
    });
  },
  getSnapshot: (providerId) => get().snapshotsByProvider[providerId] ?? null,
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
