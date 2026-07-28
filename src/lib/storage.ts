import { canonicalizeSavedConnection, getProviderIdentityCandidates } from './provider-identity';
import { LibraryCollection, ProviderCatalog, ProviderHomeSnapshot, SavedConnection, WatchHistoryItem } from './types';

const KEYS = {
  connections: 'streamdeck.connections',
  activeConnection: 'streamdeck.active-connection',
  favorites: 'streamdeck.favorites',
  history: 'streamdeck.history',
  catalogs: 'streamdeck.catalogs',
  homeSnapshots: 'streamdeck.home-snapshots',
  collections: 'streamdeck.collections',
  playerDockMode: 'streamdeck.player-dock-mode',
  mockScenario: 'streamdeck.mock-scenario',
};

const safeJsonParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const isBrowser = () => typeof window !== 'undefined';

const dedupeNumbers = (values: number[]) => [...new Set(values.filter((value) => Number.isFinite(value)))];

const pickNewerConnection = (current: SavedConnection, incoming: SavedConnection) => {
  if ((incoming.connectedAt || 0) >= (current.connectedAt || 0)) {
    return {
      ...current,
      ...incoming,
      lastAuthSummary: incoming.lastAuthSummary || current.lastAuthSummary,
      connectedAt: Math.max(current.connectedAt || 0, incoming.connectedAt || 0),
    };
  }

  return {
    ...incoming,
    ...current,
    lastAuthSummary: current.lastAuthSummary || incoming.lastAuthSummary,
    connectedAt: Math.max(current.connectedAt || 0, incoming.connectedAt || 0),
  };
};

const remapProviderMap = <T,>(source: Record<string, T>, aliasMap: Record<string, string>, merge?: (current: T, incoming: T) => T) => {
  return Object.entries(source).reduce<Record<string, T>>((acc, [providerId, value]) => {
    const canonicalProviderId = aliasMap[providerId] || providerId;
    if (canonicalProviderId in acc && merge) {
      acc[canonicalProviderId] = merge(acc[canonicalProviderId], value);
    } else if (!(canonicalProviderId in acc)) {
      acc[canonicalProviderId] = value;
    }
    return acc;
  }, {});
};

const remapHistory = (history: WatchHistoryItem[], aliasMap: Record<string, string>) =>
  history.reduce<WatchHistoryItem[]>((acc, item) => {
    const providerId = aliasMap[item.providerId] || item.providerId;
    const remapped = {
      ...item,
      providerId,
      id: `${providerId}-${item.streamId}`,
    };
    const existingIndex = acc.findIndex((entry) => entry.id === remapped.id);
    if (existingIndex >= 0) {
      if ((acc[existingIndex].updatedAt || 0) < (remapped.updatedAt || 0)) acc[existingIndex] = remapped;
      return acc;
    }
    acc.push(remapped);
    return acc;
  }, []);

const remapCollections = (collections: LibraryCollection[], aliasMap: Record<string, string>) =>
  collections.map((collection) => ({
    ...collection,
    items: collection.items.reduce<LibraryCollection['items']>((items, item) => {
      const providerId = aliasMap[item.providerId] || item.providerId;
      if (items.some((entry) => entry.providerId === providerId && entry.streamId === item.streamId)) return items;
      items.push({ ...item, providerId });
      return items;
    }, []),
  }));

export const storage = {
  getConnections(): SavedConnection[] {
    if (!isBrowser()) return [];
    return safeJsonParse(localStorage.getItem(KEYS.connections), []);
  },
  saveConnections(connections: SavedConnection[]) {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.connections, JSON.stringify(connections));
  },
  getActiveConnectionId(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(KEYS.activeConnection);
  },
  setActiveConnectionId(id: string) {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.activeConnection, id);
  },
  clearActiveConnectionId() {
    if (!isBrowser()) return;
    localStorage.removeItem(KEYS.activeConnection);
  },
  getFavorites(): number[] {
    if (!isBrowser()) return [];
    return safeJsonParse(localStorage.getItem(KEYS.favorites), []);
  },
  saveFavorites(favorites: number[]) {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.favorites, JSON.stringify(favorites));
  },
  getProviderFavorites(): Record<string, number[]> {
    if (!isBrowser()) return {};
    return safeJsonParse(localStorage.getItem(KEYS.favorites), {});
  },
  saveProviderFavorites(favorites: Record<string, number[]>) {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.favorites, JSON.stringify(favorites));
  },
  getHistory(): WatchHistoryItem[] {
    if (!isBrowser()) return [];
    return safeJsonParse(localStorage.getItem(KEYS.history), []);
  },
  saveHistory(history: WatchHistoryItem[]) {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.history, JSON.stringify(history));
  },
  getCollections(): LibraryCollection[] {
    if (!isBrowser()) return [];
    return safeJsonParse(localStorage.getItem(KEYS.collections), []);
  },
  saveCollections(collections: LibraryCollection[]) {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.collections, JSON.stringify(collections));
  },
  getPlayerDockMode(): 'expanded' | 'compact' {
    if (!isBrowser()) return 'compact';
    const mode = localStorage.getItem(KEYS.playerDockMode);
    return mode === 'expanded' ? 'expanded' : 'compact';
  },
  savePlayerDockMode(mode: 'expanded' | 'compact') {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.playerDockMode, mode);
  },
  getMockScenario(): 'healthy' | 'degradedSearch' | 'degradedLive' | 'degradedEpg' | 'lineSaturated' | 'expiredAccount' | 'authUnstable' {
    if (!isBrowser()) return 'healthy';
    const scenario = localStorage.getItem(KEYS.mockScenario);
    return scenario === 'degradedSearch' || scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' || scenario === 'expiredAccount' || scenario === 'authUnstable' ? scenario : 'healthy';
  },
  saveMockScenario(mode: 'healthy' | 'degradedSearch' | 'degradedLive' | 'degradedEpg' | 'lineSaturated' | 'expiredAccount' | 'authUnstable') {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.mockScenario, mode);
  },
  getCatalogs(): Record<string, ProviderCatalog> {
    if (!isBrowser()) return {};
    return safeJsonParse(localStorage.getItem(KEYS.catalogs), {});
  },
  getProviderCatalog(providerId: string): ProviderCatalog | null {
    return storage.getCatalogs()[providerId] ?? null;
  },
  saveProviderCatalog(providerId: string, catalog: ProviderCatalog) {
    if (!isBrowser()) return;
    const catalogs = storage.getCatalogs();
    catalogs[providerId] = catalog;
    localStorage.setItem(KEYS.catalogs, JSON.stringify(catalogs));
  },
  removeProviderCatalog(providerId: string) {
    if (!isBrowser()) return;
    const catalogs = storage.getCatalogs();
    delete catalogs[providerId];
    localStorage.setItem(KEYS.catalogs, JSON.stringify(catalogs));
  },
  getHomeSnapshots(): Record<string, ProviderHomeSnapshot> {
    if (!isBrowser()) return {};
    return safeJsonParse(localStorage.getItem(KEYS.homeSnapshots), {});
  },
  getProviderHomeSnapshot(providerId: string): ProviderHomeSnapshot | null {
    return storage.getHomeSnapshots()[providerId] ?? null;
  },
  saveProviderHomeSnapshot(providerId: string, snapshot: ProviderHomeSnapshot) {
    if (!isBrowser()) return;
    const snapshots = storage.getHomeSnapshots();
    snapshots[providerId] = snapshot;
    localStorage.setItem(KEYS.homeSnapshots, JSON.stringify(snapshots));
  },
  removeProviderHomeSnapshot(providerId: string) {
    if (!isBrowser()) return;
    const snapshots = storage.getHomeSnapshots();
    delete snapshots[providerId];
    localStorage.setItem(KEYS.homeSnapshots, JSON.stringify(snapshots));
  },
  hydrateCanonicalProviderState(): { connections: SavedConnection[]; activeConnectionId: string | null } {
    if (!isBrowser()) return { connections: [], activeConnectionId: null };

    const rawConnections = safeJsonParse<SavedConnection[]>(localStorage.getItem(KEYS.connections), []);
    const activeConnectionId = localStorage.getItem(KEYS.activeConnection);
    const aliasMap: Record<string, string> = {};

    const mergedConnections = rawConnections.reduce<Record<string, SavedConnection>>((acc, connection) => {
      const normalized = canonicalizeSavedConnection(connection);
      const { canonicalId, aliases } = getProviderIdentityCandidates({
        ...connection,
        id: normalized.id,
      });
      aliases.forEach((alias) => {
        aliasMap[alias] = canonicalId;
      });
      acc[canonicalId] = acc[canonicalId] ? pickNewerConnection(acc[canonicalId], normalized) : normalized;
      return acc;
    }, {});

    const connections = Object.values(mergedConnections).sort((left, right) => (right.connectedAt || 0) - (left.connectedAt || 0));
    const nextActiveConnectionId = activeConnectionId ? aliasMap[activeConnectionId] || activeConnectionId : connections[0]?.id || null;

    const providerFavorites = remapProviderMap(storage.getProviderFavorites(), aliasMap, (current, incoming) =>
      dedupeNumbers([...current, ...incoming])
    );
    const catalogs = remapProviderMap(storage.getCatalogs(), aliasMap, (current, incoming) =>
      (incoming.updatedAt || 0) >= (current.updatedAt || 0) ? incoming : current
    );
    const homeSnapshots = remapProviderMap(storage.getHomeSnapshots(), aliasMap, (current, incoming) =>
      (incoming.updatedAt || 0) >= (current.updatedAt || 0) ? incoming : current
    );
    const history = remapHistory(storage.getHistory(), aliasMap).sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0)).slice(0, 12);
    const collections = remapCollections(storage.getCollections(), aliasMap);

    localStorage.setItem(KEYS.connections, JSON.stringify(connections));
    if (nextActiveConnectionId) localStorage.setItem(KEYS.activeConnection, nextActiveConnectionId);
    else localStorage.removeItem(KEYS.activeConnection);
    localStorage.setItem(KEYS.favorites, JSON.stringify(providerFavorites));
    localStorage.setItem(KEYS.catalogs, JSON.stringify(catalogs));
    localStorage.setItem(KEYS.homeSnapshots, JSON.stringify(homeSnapshots));
    localStorage.setItem(KEYS.history, JSON.stringify(history));
    localStorage.setItem(KEYS.collections, JSON.stringify(collections));

    return { connections, activeConnectionId: nextActiveConnectionId };
  },
};
