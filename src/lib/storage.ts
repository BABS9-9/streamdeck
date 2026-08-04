import { canonicalizeSavedConnection, getProviderIdentityCandidates } from './provider-identity';
import {
  CachedProviderSession,
  FavoriteEntry,
  LibraryCollection,
  ProviderCatalog,
  ProviderHomeSnapshot,
  ProviderSearchSnapshot,
  ProviderSwitchContext,
  SavedConnection,
  WatchHistoryItem,
  XtreamAuthResponse,
} from './types';

const KEYS = {
  connections: 'streamdeck.connections',
  activeConnection: 'streamdeck.active-connection',
  favorites: 'streamdeck.favorites',
  history: 'streamdeck.history',
  catalogs: 'streamdeck.catalogs',
  homeSnapshots: 'streamdeck.home-snapshots',
  searchSnapshots: 'streamdeck.search-snapshots',
  providerSwitchContext: 'streamdeck.provider-switch-context',
  collections: 'streamdeck.collections',
  playerDockMode: 'streamdeck.player-dock-mode',
  mockScenario: 'streamdeck.mock-scenario',
  providerSessions: 'streamdeck.provider-sessions',
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

const isFavoriteEntry = (value: unknown): value is FavoriteEntry => (
  typeof value === 'object'
  && value !== null
  && Number.isFinite((value as FavoriteEntry).streamId)
  && typeof (value as FavoriteEntry).providerId === 'string'
);

const mergeFavoriteEntries = (current: FavoriteEntry[], incoming: FavoriteEntry[]) => {
  const merged = [...current, ...incoming].reduce<Record<number, FavoriteEntry>>((acc, entry) => {
    const existing = acc[entry.streamId];
    if (!existing || (entry.updatedAt || 0) >= (existing.updatedAt || 0)) {
      acc[entry.streamId] = entry;
    }
    return acc;
  }, {});
  return Object.values(merged).sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));
};

const normalizeProviderFavoriteEntries = (value: unknown) => {
  if (!value || Array.isArray(value) || typeof value !== 'object') return {} as Record<string, FavoriteEntry[]>;

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, FavoriteEntry[]>>((acc, [providerId, entries]) => {
    if (!Array.isArray(entries)) return acc;

    const normalized = entries.reduce<FavoriteEntry[]>((items, entry) => {
      if (typeof entry === 'number' && Number.isFinite(entry)) {
        items.push({
          providerId,
          streamId: entry,
          kind: 'movie',
          title: '',
          addedAt: 0,
          updatedAt: 0,
        });
        return items;
      }

      if (!isFavoriteEntry(entry)) return items;

      items.push({
        ...entry,
        providerId,
        streamId: Number(entry.streamId),
        title: entry.title || '',
        kind: entry.kind || 'movie',
        addedAt: entry.addedAt || entry.updatedAt || 0,
        updatedAt: entry.updatedAt || entry.addedAt || 0,
      });
      return items;
    }, []);

    if (normalized.length > 0) acc[providerId] = mergeFavoriteEntries([], normalized);
    return acc;
  }, {});
};

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

const remapFavoriteEntries = (favorites: Record<string, FavoriteEntry[]>, aliasMap: Record<string, string>) =>
  Object.entries(favorites).reduce<Record<string, FavoriteEntry[]>>((acc, [providerId, entries]) => {
    const canonicalProviderId = aliasMap[providerId] || providerId;
    const remapped = entries.map((entry) => ({
      ...entry,
      providerId: canonicalProviderId,
    }));
    acc[canonicalProviderId] = acc[canonicalProviderId]
      ? mergeFavoriteEntries(acc[canonicalProviderId], remapped)
      : mergeFavoriteEntries([], remapped);
    return acc;
  }, {});

const normalizeWatchHistoryBuckets = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.reduce<Record<string, WatchHistoryItem[]>>((acc, item) => {
      if (!item || typeof item !== 'object' || !('providerId' in item)) return acc;
      const providerId = String((item as WatchHistoryItem).providerId || '');
      if (!providerId) return acc;
      acc[providerId] = [...(acc[providerId] || []), item as WatchHistoryItem];
      return acc;
    }, {});
  }

  if (!value || typeof value !== 'object') return {} as Record<string, WatchHistoryItem[]>;

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, WatchHistoryItem[]>>((acc, [providerId, entries]) => {
    if (!Array.isArray(entries)) return acc;
    acc[providerId] = entries
      .filter((entry): entry is WatchHistoryItem => Boolean(entry && typeof entry === 'object' && 'streamId' in (entry as WatchHistoryItem)))
      .map((entry) => ({
        ...(entry as WatchHistoryItem),
        providerId,
      }))
      .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
      .slice(0, 12);
    return acc;
  }, {});
};

const flattenHistoryBuckets = (buckets: Record<string, WatchHistoryItem[]>) =>
  Object.values(buckets)
    .flat()
    .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
    .slice(0, 36);

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
    return Object.fromEntries(
      Object.entries(storage.getProviderFavoriteEntries()).map(([providerId, entries]) => [providerId, dedupeNumbers(entries.map((entry) => entry.streamId))])
    );
  },
  saveProviderFavorites(favorites: Record<string, number[]>) {
    if (!isBrowser()) return;
    const entries = Object.entries(favorites).reduce<Record<string, FavoriteEntry[]>>((acc, [providerId, streamIds]) => {
      acc[providerId] = dedupeNumbers(streamIds).map((streamId) => ({
        providerId,
        streamId,
        kind: 'movie',
        title: '',
        addedAt: 0,
        updatedAt: 0,
      }));
      return acc;
    }, {});
    storage.saveProviderFavoriteEntries(entries);
  },
  getProviderFavoriteEntries(): Record<string, FavoriteEntry[]> {
    if (!isBrowser()) return {};
    return normalizeProviderFavoriteEntries(safeJsonParse<unknown>(localStorage.getItem(KEYS.favorites), {}));
  },
  saveProviderFavoriteEntries(favorites: Record<string, FavoriteEntry[]>) {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.favorites, JSON.stringify(favorites));
  },
  removeProviderFavoriteEntries(providerId: string) {
    if (!isBrowser()) return;
    const favorites = storage.getProviderFavoriteEntries();
    delete favorites[providerId];
    storage.saveProviderFavoriteEntries(favorites);
  },
  getHistory(): WatchHistoryItem[] {
    if (!isBrowser()) return [];
    return flattenHistoryBuckets(storage.getProviderHistoryBuckets());
  },
  saveHistory(history: WatchHistoryItem[]) {
    if (!isBrowser()) return;
    const buckets = history.reduce<Record<string, WatchHistoryItem[]>>((acc, item) => {
      acc[item.providerId] = [...(acc[item.providerId] || []), item];
      return acc;
    }, {});
    storage.saveProviderHistoryBuckets(buckets);
  },
  getProviderHistoryBuckets(): Record<string, WatchHistoryItem[]> {
    if (!isBrowser()) return {};
    return normalizeWatchHistoryBuckets(safeJsonParse<unknown>(localStorage.getItem(KEYS.history), {}));
  },
  saveProviderHistoryBuckets(historyByProvider: Record<string, WatchHistoryItem[]>) {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.history, JSON.stringify(historyByProvider));
  },
  getProviderHistory(providerId: string) {
    return storage.getProviderHistoryBuckets()[providerId] ?? [];
  },
  saveProviderHistory(providerId: string, history: WatchHistoryItem[]) {
    if (!isBrowser()) return;
    const buckets = storage.getProviderHistoryBuckets();
    buckets[providerId] = history
      .map((item) => ({ ...item, providerId }))
      .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
      .slice(0, 12);
    storage.saveProviderHistoryBuckets(buckets);
  },
  removeProviderHistory(providerId: string) {
    if (!isBrowser()) return;
    const buckets = storage.getProviderHistoryBuckets();
    delete buckets[providerId];
    storage.saveProviderHistoryBuckets(buckets);
  },
  getCollections(): LibraryCollection[] {
    if (!isBrowser()) return [];
    return safeJsonParse(localStorage.getItem(KEYS.collections), []);
  },
  saveCollections(collections: LibraryCollection[]) {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.collections, JSON.stringify(collections));
  },
  removeProviderCollections(providerId: string) {
    if (!isBrowser()) return;
    const collections = storage.getCollections().map((collection) => ({
      ...collection,
      items: collection.items.filter((item) => item.providerId !== providerId),
    }));
    storage.saveCollections(collections);
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
  getSearchSnapshots(): Record<string, ProviderSearchSnapshot> {
    if (!isBrowser()) return {};
    return safeJsonParse(localStorage.getItem(KEYS.searchSnapshots), {});
  },
  getProviderSearchSnapshot(providerId: string): ProviderSearchSnapshot | null {
    return storage.getSearchSnapshots()[providerId] ?? null;
  },
  saveProviderSearchSnapshot(providerId: string, snapshot: ProviderSearchSnapshot) {
    if (!isBrowser()) return;
    const snapshots = storage.getSearchSnapshots();
    snapshots[providerId] = { ...snapshot, providerId };
    localStorage.setItem(KEYS.searchSnapshots, JSON.stringify(snapshots));
  },
  removeProviderSearchSnapshot(providerId: string) {
    if (!isBrowser()) return;
    const snapshots = storage.getSearchSnapshots();
    delete snapshots[providerId];
    localStorage.setItem(KEYS.searchSnapshots, JSON.stringify(snapshots));
  },
  getProviderSessions(): Record<string, CachedProviderSession> {
    if (!isBrowser()) return {};
    return safeJsonParse(localStorage.getItem(KEYS.providerSessions), {});
  },
  getProviderSession(providerId: string): XtreamAuthResponse | null {
    return storage.getProviderSessions()[providerId]?.session ?? null;
  },
  saveProviderSession(providerId: string, session: XtreamAuthResponse, updatedAt = Date.now()) {
    if (!isBrowser()) return;
    const sessions = storage.getProviderSessions();
    sessions[providerId] = { providerId, session, updatedAt };
    localStorage.setItem(KEYS.providerSessions, JSON.stringify(sessions));
  },
  removeProviderSession(providerId: string) {
    if (!isBrowser()) return;
    const sessions = storage.getProviderSessions();
    delete sessions[providerId];
    localStorage.setItem(KEYS.providerSessions, JSON.stringify(sessions));
  },
  getProviderSwitchContext(): ProviderSwitchContext | null {
    if (!isBrowser()) return null;
    return safeJsonParse(localStorage.getItem(KEYS.providerSwitchContext), null);
  },
  saveProviderSwitchContext(context: ProviderSwitchContext) {
    if (!isBrowser()) return;
    localStorage.setItem(KEYS.providerSwitchContext, JSON.stringify(context));
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

    const providerFavoriteEntries = remapFavoriteEntries(storage.getProviderFavoriteEntries(), aliasMap);
    const catalogs = remapProviderMap(storage.getCatalogs(), aliasMap, (current, incoming) =>
      (incoming.updatedAt || 0) >= (current.updatedAt || 0) ? incoming : current
    );
    const homeSnapshots = remapProviderMap(storage.getHomeSnapshots(), aliasMap, (current, incoming) =>
      (incoming.updatedAt || 0) >= (current.updatedAt || 0) ? incoming : current
    );
    const historyBuckets = Object.entries(storage.getProviderHistoryBuckets()).reduce<Record<string, WatchHistoryItem[]>>((acc, [providerId, items]) => {
      const canonicalProviderId = aliasMap[providerId] || providerId;
      const remapped = remapHistory(items, aliasMap).filter((item) => item.providerId === canonicalProviderId);
      acc[canonicalProviderId] = [...(acc[canonicalProviderId] || []), ...remapped]
        .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
        .slice(0, 12);
      return acc;
    }, {});
    const collections = remapCollections(storage.getCollections(), aliasMap);
    const searchSnapshots = Object.entries(storage.getSearchSnapshots()).reduce<Record<string, ProviderSearchSnapshot>>((acc, [providerId, snapshot]) => {
      const canonicalProviderId = aliasMap[providerId] || providerId;
      const existing = acc[canonicalProviderId];
      if (!existing || (snapshot.updatedAt || 0) >= (existing.updatedAt || 0)) {
        acc[canonicalProviderId] = { ...snapshot, providerId: canonicalProviderId };
      }
      return acc;
    }, {});
    const providerSessions = Object.entries(storage.getProviderSessions()).reduce<Record<string, CachedProviderSession>>((acc, [providerId, cachedSession]) => {
      if (!cachedSession?.session) return acc;
      const canonicalProviderId = aliasMap[providerId] || providerId;
      const existing = acc[canonicalProviderId];
      if (!existing || (cachedSession.updatedAt || 0) >= (existing.updatedAt || 0)) {
        acc[canonicalProviderId] = {
          providerId: canonicalProviderId,
          session: cachedSession.session,
          updatedAt: cachedSession.updatedAt || 0,
        };
      }
      return acc;
    }, {});

    localStorage.setItem(KEYS.connections, JSON.stringify(connections));
    if (nextActiveConnectionId) localStorage.setItem(KEYS.activeConnection, nextActiveConnectionId);
    else localStorage.removeItem(KEYS.activeConnection);
    localStorage.setItem(KEYS.favorites, JSON.stringify(providerFavoriteEntries));
    localStorage.setItem(KEYS.catalogs, JSON.stringify(catalogs));
    localStorage.setItem(KEYS.homeSnapshots, JSON.stringify(homeSnapshots));
    localStorage.setItem(KEYS.history, JSON.stringify(historyBuckets));
    localStorage.setItem(KEYS.searchSnapshots, JSON.stringify(searchSnapshots));
    localStorage.setItem(KEYS.collections, JSON.stringify(collections));
    localStorage.setItem(KEYS.providerSessions, JSON.stringify(providerSessions));

    return { connections, activeConnectionId: nextActiveConnectionId };
  },
};
