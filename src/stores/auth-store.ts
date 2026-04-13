'use client';

import { create } from 'zustand';
import { authenticate } from '@/lib/xtream-api';
import { storage } from '@/lib/storage';
import { SavedConnection, XtreamAuthResponse, XtreamCredentials } from '@/lib/types';

type AuthState = {
  connections: SavedConnection[];
  activeConnection: SavedConnection | null;
  session: XtreamAuthResponse | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  hydrate: () => void;
  connect: (credentials: XtreamCredentials) => Promise<boolean>;
  setActiveConnection: (id: string) => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  connections: [],
  activeConnection: null,
  session: null,
  loading: false,
  error: null,
  initialized: false,
  hydrate: () => {
    if (get().initialized) return;
    const connections = storage.getConnections();
    const activeId = storage.getActiveConnectionId();
    const activeConnection = connections.find((item) => item.id === activeId) ?? connections[0] ?? null;
    set({ connections, activeConnection, initialized: true });
  },
  connect: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const session = await authenticate(credentials);
      const connection: SavedConnection = {
        id: `${credentials.server}-${credentials.username}`,
        name: new URL(credentials.server).host,
        connectedAt: Date.now(),
        ...credentials,
      };
      const existing = get().connections.filter((item) => item.id !== connection.id);
      const connections = [connection, ...existing];
      storage.saveConnections(connections);
      storage.setActiveConnectionId(connection.id);
      set({ connections, activeConnection: connection, session, loading: false, error: null });
      return true;
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Unable to connect' });
      return false;
    }
  },
  setActiveConnection: (id) => {
    const activeConnection = get().connections.find((item) => item.id === id) ?? null;
    if (!activeConnection) return;
    storage.setActiveConnectionId(id);
    set({ activeConnection });
  },
}));
