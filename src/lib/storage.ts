import { SavedConnection, WatchHistoryItem } from './types';

const KEYS = {
  connections: 'streamdeck.connections',
  activeConnection: 'streamdeck.active-connection',
  favorites: 'streamdeck.favorites',
  history: 'streamdeck.history',
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
  getFavorites(): number[] {
    if (!isBrowser()) return [];
    return safeJsonParse(localStorage.getItem(KEYS.favorites), []);
  },
  saveFavorites(favorites: number[]) {
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
};
