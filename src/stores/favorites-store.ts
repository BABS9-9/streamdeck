'use client';

import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { FavoriteEntry, XtreamStream } from '@/lib/types';
import { getArtwork, getContentId } from '@/lib/xtream-api';

const getFavoriteKind = (stream?: XtreamStream): FavoriteEntry['kind'] => {
  if (stream?.stream_type === 'series') return 'series';
  if (stream?.stream_type === 'live') return 'live';
  return 'movie';
};

type FavoritesState = {
  favoritesByProvider: Record<string, number[]>;
  favoriteEntriesByProvider: Record<string, FavoriteEntry[]>;
  hydrated: boolean;
  hydrate: () => void;
  toggleFavorite: (providerId: string, streamId: number, stream?: XtreamStream) => void;
  isFavorite: (providerId: string, streamId: number) => boolean;
  getFavoritesForProvider: (providerId: string) => number[];
  getFavoriteEntriesForProvider: (providerId: string) => FavoriteEntry[];
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoritesByProvider: {},
  favoriteEntriesByProvider: {},
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    const storedEntries = storage.getProviderFavoriteEntries();
    const legacy = storage.getFavorites();
    const favoriteEntriesByProvider = Object.keys(storedEntries).length > 0
      ? storedEntries
      : legacy.length > 0
        ? {
            legacy: legacy.map((streamId) => ({
              providerId: 'legacy',
              streamId,
              kind: 'movie' as const,
              title: '',
              addedAt: 0,
              updatedAt: 0,
            })),
          }
        : {};
    if (Object.keys(favoriteEntriesByProvider).length > 0) storage.saveProviderFavoriteEntries(favoriteEntriesByProvider);
    set({
      favoriteEntriesByProvider,
      favoritesByProvider: Object.fromEntries(
        Object.entries(favoriteEntriesByProvider).map(([providerId, entries]: [string, FavoriteEntry[]]) => [providerId, entries.map((entry: FavoriteEntry) => entry.streamId)])
      ),
      hydrated: true,
    });
  },
  toggleFavorite: (providerId, streamId, stream) => {
    const currentEntries = get().favoriteEntriesByProvider[providerId] ?? [];
    const exists = currentEntries.some((entry) => entry.streamId === streamId);
    const nextEntries = exists
      ? currentEntries.filter((entry) => entry.streamId !== streamId)
      : [{
          providerId,
          streamId,
          kind: getFavoriteKind(stream),
          title: stream?.name || '',
          artwork: stream ? getArtwork(stream) : undefined,
          plot: stream?.plot,
          genre: stream?.genre,
          categoryId: stream?.category_id,
          categoryName: stream?.channel_group,
          year: stream?.year,
          seriesId: stream?.series_id ?? (stream && stream.stream_type === 'series' ? getContentId(stream) : undefined),
          addedAt: Date.now(),
          updatedAt: Date.now(),
        }, ...currentEntries];
    const favoriteEntriesByProvider = {
      ...get().favoriteEntriesByProvider,
      [providerId]: nextEntries,
    };
    const favoritesByProvider = {
      ...get().favoritesByProvider,
      [providerId]: nextEntries.map((entry) => entry.streamId),
    };
    storage.saveProviderFavoriteEntries(favoriteEntriesByProvider);
    set({ favoriteEntriesByProvider, favoritesByProvider });
  },
  isFavorite: (providerId, streamId) => (get().favoritesByProvider[providerId] ?? []).includes(streamId),
  getFavoritesForProvider: (providerId) => get().favoritesByProvider[providerId] ?? [],
  getFavoriteEntriesForProvider: (providerId) => get().favoriteEntriesByProvider[providerId] ?? [],
}));
