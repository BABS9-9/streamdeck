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
  getMockScenario(): 'healthy' | 'degradedSearch' | 'degradedLive' | 'degradedEpg' | 'lineSaturated' {
    if (!isBrowser()) return 'healthy';
    const scenario = localStorage.getItem(KEYS.mockScenario);
    return scenario === 'degradedSearch' || scenario === 'degradedLive' || scenario === 'degradedEpg' || scenario === 'lineSaturated' ? scenario : 'healthy';
  },
  saveMockScenario(mode: 'healthy' | 'degradedSearch' | 'degradedLive' | 'degradedEpg' | 'lineSaturated') {
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
};
