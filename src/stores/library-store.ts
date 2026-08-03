'use client';

import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { ProviderCatalog, ProviderCatalogSyncState, SavedConnection } from '@/lib/types';
import { refreshSearchCatalog } from '@/lib/xtream-api';

const inflightCatalogRefreshes = new Map<string, Promise<ProviderCatalog>>();

const defaultSyncState = (): ProviderCatalogSyncState => ({
  status: 'idle',
  source: 'none',
  updatedAt: null,
  error: null,
});

type RefreshCatalogResult = {
  providerId: string;
  catalog?: ProviderCatalog;
  error?: string;
};

type LibraryState = {
  hydrated: boolean;
  catalogsByProvider: Record<string, ProviderCatalog>;
  catalogSyncByProvider: Record<string, ProviderCatalogSyncState>;
  hydrate: () => void;
  getCatalogSnapshot: (providerId: string, maxAgeMs?: number) => ProviderCatalog | null;
  markCatalogFromCache: (providerId: string) => void;
  refreshProviderCatalog: (provider: SavedConnection) => Promise<ProviderCatalog>;
  refreshProviderCatalogs: (providers: SavedConnection[]) => Promise<RefreshCatalogResult[]>;
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  hydrated: false,
  catalogsByProvider: {},
  catalogSyncByProvider: {},
  hydrate: () => {
    if (get().hydrated) return;
    const catalogsByProvider = storage.getCatalogs();
    const catalogSyncByProvider = Object.fromEntries(
      Object.entries(catalogsByProvider).map(([providerId, catalog]) => [providerId, {
        status: 'ready',
        source: 'cache',
        updatedAt: catalog.updatedAt,
        error: null,
      } satisfies ProviderCatalogSyncState])
    );
    set({ hydrated: true, catalogsByProvider, catalogSyncByProvider });
  },
  getCatalogSnapshot: (providerId, maxAgeMs = Number.MAX_SAFE_INTEGER) => {
    const catalog = get().catalogsByProvider[providerId] ?? storage.getProviderCatalog(providerId);
    if (!catalog) return null;
    if (Date.now() - catalog.updatedAt > maxAgeMs) return null;
    return catalog;
  },
  markCatalogFromCache: (providerId) => {
    const catalog = get().getCatalogSnapshot(providerId);
    if (!catalog) return;
    set((state) => ({
      catalogsByProvider: {
        ...state.catalogsByProvider,
        [providerId]: catalog,
      },
      catalogSyncByProvider: {
        ...state.catalogSyncByProvider,
        [providerId]: {
          status: 'ready',
          source: 'cache',
          updatedAt: catalog.updatedAt,
          error: null,
        },
      },
    }));
  },
  refreshProviderCatalog: async (provider) => {
    const existingRequest = inflightCatalogRefreshes.get(provider.id);
    if (existingRequest) return existingRequest;

    set((state) => ({
      catalogSyncByProvider: {
        ...state.catalogSyncByProvider,
        [provider.id]: {
          ...(state.catalogSyncByProvider[provider.id] || defaultSyncState()),
          status: 'refreshing',
          error: null,
        },
      },
    }));

    const request = refreshSearchCatalog(provider)
      .then((catalog) => {
        set((state) => ({
          catalogsByProvider: {
            ...state.catalogsByProvider,
            [provider.id]: catalog,
          },
          catalogSyncByProvider: {
            ...state.catalogSyncByProvider,
            [provider.id]: {
              status: 'ready',
              source: 'network',
              updatedAt: catalog.updatedAt,
              error: null,
            },
          },
        }));
        return catalog;
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Catalog refresh failed';
        set((state) => ({
          catalogSyncByProvider: {
            ...state.catalogSyncByProvider,
            [provider.id]: {
              ...(state.catalogSyncByProvider[provider.id] || defaultSyncState()),
              status: 'error',
              error: message,
            },
          },
        }));
        throw error;
      })
      .finally(() => {
        inflightCatalogRefreshes.delete(provider.id);
      });

    inflightCatalogRefreshes.set(provider.id, request);
    return request;
  },
  refreshProviderCatalogs: async (providers) => {
    const uniqueProviders = providers.reduce<Record<string, SavedConnection>>((acc, provider) => {
      acc[provider.id] = provider;
      return acc;
    }, {});

    const settled = await Promise.allSettled(
      Object.values(uniqueProviders).map(async (provider) => ({
        providerId: provider.id,
        catalog: await get().refreshProviderCatalog(provider),
      }))
    );

    return settled.map((result, index) => {
      const providerId = Object.values(uniqueProviders)[index]?.id;
      if (result.status === 'fulfilled') return result.value;
      return {
        providerId,
        error: result.reason instanceof Error ? result.reason.message : 'Catalog refresh failed',
      };
    });
  },
}));
