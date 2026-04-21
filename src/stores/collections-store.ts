'use client';

import { create } from 'zustand';
import { LibraryCollection, LibraryCollectionItem } from '@/lib/types';
import { storage } from '@/lib/storage';

type CreateCollectionInput = {
  name: string;
  description?: string;
  color?: string;
};

type CollectionsState = {
  collections: LibraryCollection[];
  hydrated: boolean;
  hydrate: () => void;
  createCollection: (input: CreateCollectionInput) => void;
  removeCollection: (collectionId: string) => void;
  addItemToCollection: (collectionId: string, item: LibraryCollectionItem) => void;
  removeItemFromCollection: (collectionId: string, providerId: string, streamId: number) => void;
  isItemInCollection: (collectionId: string, providerId: string, streamId: number) => boolean;
  getCollectionsForProvider: (providerId: string) => LibraryCollection[];
};

const palette = ['violet', 'blue', 'emerald', 'amber', 'rose'];

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ collections: storage.getCollections(), hydrated: true });
  },
  createCollection: ({ name, description, color }) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const timestamp = Date.now();
    const collections = [
      {
        id: `collection-${timestamp}`,
        name: trimmed,
        description: description?.trim() || '',
        color: color && palette.includes(color) ? color : palette[get().collections.length % palette.length],
        createdAt: timestamp,
        updatedAt: timestamp,
        items: [],
      },
      ...get().collections,
    ];
    storage.saveCollections(collections);
    set({ collections });
  },
  removeCollection: (collectionId) => {
    const collections = get().collections.filter((collection) => collection.id !== collectionId);
    storage.saveCollections(collections);
    set({ collections });
  },
  addItemToCollection: (collectionId, item) => {
    const collections = get().collections.map((collection) => {
      if (collection.id !== collectionId) return collection;
      const existing = collection.items.some((entry) => entry.providerId === item.providerId && entry.streamId === item.streamId);
      if (existing) return collection;
      return {
        ...collection,
        updatedAt: Date.now(),
        items: [{ ...item, addedAt: Date.now() }, ...collection.items],
      };
    });
    storage.saveCollections(collections);
    set({ collections });
  },
  removeItemFromCollection: (collectionId, providerId, streamId) => {
    const collections = get().collections.map((collection) => {
      if (collection.id !== collectionId) return collection;
      return {
        ...collection,
        updatedAt: Date.now(),
        items: collection.items.filter((item) => !(item.providerId === providerId && item.streamId === streamId)),
      };
    });
    storage.saveCollections(collections);
    set({ collections });
  },
  isItemInCollection: (collectionId, providerId, streamId) => {
    const collection = get().collections.find((entry) => entry.id === collectionId);
    return collection?.items.some((item) => item.providerId === providerId && item.streamId === streamId) ?? false;
  },
  getCollectionsForProvider: (providerId) => get().collections.filter((collection) => collection.items.some((item) => item.providerId === providerId)),
}));
