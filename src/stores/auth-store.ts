'use client';

import { create } from 'zustand';
import { authenticate } from '@/lib/xtream-api';
import { storage } from '@/lib/storage';
import { ConnectionStatus, SavedConnection, XtreamAuthResponse, XtreamCredentials } from '@/lib/types';

type AuthState = {
  connections: SavedConnection[];
  activeConnection: SavedConnection | null;
  session: XtreamAuthResponse | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  connectionStatus: Record<string, ConnectionStatus>;
  hydrate: () => void;
  connect: (credentials: XtreamCredentials) => Promise<boolean>;
  setActiveConnection: (id: string) => void;
  renameConnection: (id: string, name: string) => void;
  removeConnection: (id: string) => void;
  validateConnection: (id: string) => Promise<boolean>;
  validateAllConnections: () => Promise<void>;
};

const checkingStatus: ConnectionStatus = {
  state: 'checking',
  checkedAt: null,
  message: 'Checking provider health...',
  serverTime: null,
};

const buildHealthyStatus = (session: XtreamAuthResponse): ConnectionStatus => ({
  state: session.user_info.auth === 1 ? 'healthy' : 'degraded',
  checkedAt: Date.now(),
  message: session.user_info.auth === 1
    ? `${session.user_info.active_cons}/${session.user_info.max_connections} active connections used`
    : 'Provider responded, but auth is not fully healthy',
  serverTime: session.server_info.time_now,
});

const buildErrorStatus = (message: string): ConnectionStatus => ({
  state: 'error',
  checkedAt: Date.now(),
  message,
  serverTime: null,
});

export const useAuthStore = create<AuthState>((set, get) => ({
  connections: [],
  activeConnection: null,
  session: null,
  loading: false,
  error: null,
  initialized: false,
  connectionStatus: {},
  hydrate: () => {
    if (get().initialized) return;
    const connections = storage.getConnections();
    const activeId = storage.getActiveConnectionId();
    const activeConnection = connections.find((item) => item.id === activeId) ?? connections[0] ?? null;
    set({ connections, activeConnection, initialized: true });
  },
  connect: async (credentials) => {
    set({ loading: true, error: null });
    const connectionId = `${credentials.server}-${credentials.username}`;
    set((state) => ({
      connectionStatus: { ...state.connectionStatus, [connectionId]: checkingStatus },
    }));
    try {
      const session = await authenticate(credentials);
      const connection: SavedConnection = {
        id: connectionId,
        name: new URL(credentials.server).host,
        connectedAt: Date.now(),
        ...credentials,
      };
      const existing = get().connections.filter((item) => item.id !== connection.id);
      const connections = [connection, ...existing];
      storage.saveConnections(connections);
      storage.setActiveConnectionId(connection.id);
      set((state) => ({
        connections,
        activeConnection: connection,
        session,
        loading: false,
        error: null,
        connectionStatus: {
          ...state.connectionStatus,
          [connection.id]: buildHealthyStatus(session),
        },
      }));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to connect';
      set((state) => ({
        loading: false,
        error: message,
        connectionStatus: {
          ...state.connectionStatus,
          [connectionId]: buildErrorStatus(message),
        },
      }));
      return false;
    }
  },
  setActiveConnection: (id) => {
    const activeConnection = get().connections.find((item) => item.id === id) ?? null;
    if (!activeConnection) return;
    storage.setActiveConnectionId(id);
    set({ activeConnection });
  },
  renameConnection: (id, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const connections = get().connections.map((item) => (item.id === id ? { ...item, name: trimmedName } : item));
    const activeConnection = connections.find((item) => item.id === get().activeConnection?.id) ?? null;
    storage.saveConnections(connections);
    set({ connections, activeConnection });
  },
  removeConnection: (id) => {
    const connections = get().connections.filter((item) => item.id !== id);
    const nextActive = get().activeConnection?.id === id ? connections[0] ?? null : connections.find((item) => item.id === get().activeConnection?.id) ?? null;
    storage.saveConnections(connections);
    if (nextActive) {
      storage.setActiveConnectionId(nextActive.id);
    } else {
      storage.clearActiveConnectionId();
    }
    set((state) => {
      const nextStatus = { ...state.connectionStatus };
      delete nextStatus[id];
      return { connections, activeConnection: nextActive, session: nextActive ? get().session : null, connectionStatus: nextStatus };
    });
  },
  validateConnection: async (id) => {
    const connection = get().connections.find((item) => item.id === id);
    if (!connection) return false;
    set((state) => ({ connectionStatus: { ...state.connectionStatus, [id]: checkingStatus } }));
    try {
      const session = await authenticate(connection);
      set((state) => ({
        session: get().activeConnection?.id === id ? session : state.session,
        connectionStatus: {
          ...state.connectionStatus,
          [id]: buildHealthyStatus(session),
        },
      }));
      return true;
    } catch (error) {
      set((state) => ({
        connectionStatus: {
          ...state.connectionStatus,
          [id]: buildErrorStatus(error instanceof Error ? error.message : 'Health check failed'),
        },
      }));
      return false;
    }
  },
  validateAllConnections: async () => {
    await Promise.all(get().connections.map((connection) => get().validateConnection(connection.id)));
  },
}));
