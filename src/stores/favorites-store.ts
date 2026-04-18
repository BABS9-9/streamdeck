'use client';

import { create } from 'zustand';
import { storage } from '@/lib/storage';

type FavoritesState = {
  favoritesByProvider: Record<string, number[]>;
  hydrated: boolean;
  hydrate: () => void;
  toggleFavorite: (providerId: string, streamId: number) => void;
  isFavorite: (providerId: string, streamId: number) => boolean;
  getFavoritesForProvider: (providerId: string) => number[];
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoritesByProvider: {},
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    const stored = storage.getProviderFavorites();
    const legacy = storage.getFavorites();
    const favoritesByProvider = Object.keys(stored).length > 0 ? stored : legacy.length > 0 ? { legacy: legacy } : {};
    if (Object.keys(favoritesByProvider).length > 0) storage.saveProviderFavorites(favoritesByProvider);
    set({ favoritesByProvider, hydrated: true });
  },
  toggleFavorite: (providerId, streamId) => {
    const current = get().favoritesByProvider[providerId] ?? [];
    const next = current.includes(streamId)
      ? current.filter((id) => id !== streamId)
      : [...current, streamId];
    const favoritesByProvider = { ...get().favoritesByProvider, [providerId]: next };
    storage.saveProviderFavorites(favoritesByProvider);
    set({ favoritesByProvider });
  },
  isFavorite: (providerId, streamId) => (get().favoritesByProvider[providerId] ?? []).includes(streamId),
  getFavoritesForProvider: (providerId) => get().favoritesByProvider[providerId] ?? [],
}));
