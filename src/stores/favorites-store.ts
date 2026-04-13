'use client';

import { create } from 'zustand';
import { storage } from '@/lib/storage';

type FavoritesState = {
  favorites: number[];
  hydrated: boolean;
  hydrate: () => void;
  toggleFavorite: (streamId: number) => void;
  isFavorite: (streamId: number) => boolean;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ favorites: storage.getFavorites(), hydrated: true });
  },
  toggleFavorite: (streamId) => {
    const favorites = get().favorites.includes(streamId)
      ? get().favorites.filter((id) => id !== streamId)
      : [...get().favorites, streamId];
    storage.saveFavorites(favorites);
    set({ favorites });
  },
  isFavorite: (streamId) => get().favorites.includes(streamId),
}));
