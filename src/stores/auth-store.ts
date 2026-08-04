'use client';

import { create } from 'zustand';
import { isMockProviderServer } from '@/lib/mock-provider';
import { buildCanonicalProviderId, canonicalizeSavedConnection } from '@/lib/provider-identity';
import { authenticate } from '@/lib/xtream-api';
import { storage } from '@/lib/storage';
import { ConnectionStatus, ProviderAuthSummary, ProviderSwitchContext, SavedConnection, XtreamAuthResponse, XtreamCredentials } from '@/lib/types';

type SwitchConnectionOptions = Omit<ProviderSwitchContext, 'fromProviderId' | 'toProviderId' | 'switchedAt'>;

type AuthState = {
  connections: SavedConnection[];
  activeConnection: SavedConnection | null;
  session: XtreamAuthResponse | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  connectionStatus: Record<string, ConnectionStatus>;
  lastSwitchContext: ProviderSwitchContext | null;
  hydrate: () => void;
  connect: (credentials: XtreamCredentials) => Promise<boolean>;
  setActiveConnection: (id: string, options?: SwitchConnectionOptions) => void;
  renameConnection: (id: string, name: string) => void;
  removeConnection: (id: string) => void;
  validateConnection: (id: string) => Promise<boolean>;
  validateAllConnections: () => Promise<void>;
  revalidateMockConnections: () => Promise<void>;
};

const checkingStatus: ConnectionStatus = {
  state: 'checking',
  checkedAt: null,
  message: 'Checking provider health...',
  serverTime: null,
};

const buildHealthyStatus = (session: XtreamAuthResponse): ConnectionStatus => ({
  state: session.user_info.auth === 1 && Number(session.user_info.active_cons || 0) < Number(session.user_info.max_connections || 0) && session.user_info.status === 'Active' ? 'healthy' : 'degraded',
  checkedAt: Date.now(),
  message: session.user_info.auth !== 1
    ? 'Provider responded, but auth is not fully healthy'
    : Number(session.user_info.active_cons || 0) >= Number(session.user_info.max_connections || 0)
      ? `All ${session.user_info.max_connections} provider lines are currently in use`
      : session.user_info.status !== 'Active'
        ? `Provider status is ${session.user_info.status}`
        : `${session.user_info.active_cons}/${session.user_info.max_connections} active connections used`,
  serverTime: session.server_info.time_now,
});

const buildErrorStatus = (message: string): ConnectionStatus => ({
  state: 'error',
  checkedAt: Date.now(),
  message,
  serverTime: null,
});

const buildAuthSummary = (session: XtreamAuthResponse): ProviderAuthSummary => ({
  status: session.user_info.status,
  expiresAt: session.user_info.exp_date ? new Date(Number(session.user_info.exp_date) * 1000).toISOString() : null,
  activeConnections: Number(session.user_info.active_cons || 0),
  maxConnections: Number(session.user_info.max_connections || 0),
  timezone: session.server_info.timezone || null,
  serverTime: session.server_info.time_now || null,
});

export const useAuthStore = create<AuthState>((set, get) => ({
  connections: [],
  activeConnection: null,
  session: null,
  loading: false,
  error: null,
  initialized: false,
  connectionStatus: {},
  lastSwitchContext: null,
  hydrate: () => {
    if (get().initialized) return;
    const { connections, activeConnectionId: activeId } = storage.hydrateCanonicalProviderState();
    const activeConnection = connections.find((item) => item.id === activeId) ?? connections[0] ?? null;
    set({
      connections,
      activeConnection,
      initialized: true,
      lastSwitchContext: storage.getProviderSwitchContext(),
    });
  },
  connect: async (credentials) => {
    set({ loading: true, error: null });
    const trimmedCredentials = {
      ...credentials,
      server: credentials.server.trim(),
      username: credentials.username.trim(),
      password: credentials.password.trim(),
    };
    const connectionId = buildCanonicalProviderId(trimmedCredentials);
    set((state) => ({
      connectionStatus: { ...state.connectionStatus, [connectionId]: checkingStatus },
    }));
    try {
      const session = await authenticate(trimmedCredentials);
      const connection = canonicalizeSavedConnection({
        id: connectionId,
        name: new URL(trimmedCredentials.server).host,
        connectedAt: Date.now(),
        lastAuthSummary: buildAuthSummary(session),
        ...trimmedCredentials,
      } satisfies SavedConnection);
      const existing = get().connections.filter((item) => item.id !== connection.id);
      const connections = [connection, ...existing];
      storage.saveConnections(connections);
      storage.setActiveConnectionId(connection.id);
      const switchContext: ProviderSwitchContext = {
        fromProviderId: get().activeConnection?.id ?? null,
        toProviderId: connection.id,
        switchedAt: Date.now(),
        reason: 'launch',
        sourceSurface: 'login',
      };
      storage.saveProviderSwitchContext(switchContext);
      set((state) => ({
        connections,
        activeConnection: connection,
        session,
        loading: false,
        error: null,
        lastSwitchContext: switchContext,
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
  setActiveConnection: (id, options) => {
    const currentActiveConnection = get().activeConnection;
    const activeConnection = get().connections.find((item) => item.id === id) ?? null;
    if (!activeConnection) return;
    if (currentActiveConnection?.id === id && !options) return;
    storage.setActiveConnectionId(id);
    const switchContext: ProviderSwitchContext = {
      fromProviderId: currentActiveConnection?.id ?? null,
      toProviderId: id,
      switchedAt: Date.now(),
      preservedQuery: options?.preservedQuery ?? null,
      preservedResultCount: options?.preservedResultCount ?? null,
      preservedDuplicateGroups: options?.preservedDuplicateGroups ?? null,
      preservedTitle: options?.preservedTitle ?? null,
      sourceSurface: options?.sourceSurface ?? 'settings',
      reason: options?.reason ?? 'manual',
    };
    storage.saveProviderSwitchContext(switchContext);
    set({ activeConnection, lastSwitchContext: switchContext });
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
    storage.removeProviderFavoriteEntries(id);
    storage.removeProviderHistory(id);
    storage.removeProviderCatalog(id);
    storage.removeProviderHomeSnapshot(id);
    storage.removeProviderSearchSnapshot(id);
    storage.removeProviderCollections(id);
    if (nextActive) {
      storage.setActiveConnectionId(nextActive.id);
      storage.saveProviderSwitchContext({
        fromProviderId: id,
        toProviderId: nextActive.id,
        switchedAt: Date.now(),
        sourceSurface: 'settings',
        reason: 'remove-connection',
      });
    } else {
      storage.clearActiveConnectionId();
    }
    set((state) => {
      const nextStatus = { ...state.connectionStatus };
      delete nextStatus[id];
      return {
        connections,
        activeConnection: nextActive,
        session: nextActive ? get().session : null,
        connectionStatus: nextStatus,
        lastSwitchContext: nextActive
          ? {
              fromProviderId: id,
              toProviderId: nextActive.id,
              switchedAt: Date.now(),
              sourceSurface: 'settings',
              reason: 'remove-connection',
            }
          : null,
      };
    });
  },
  validateConnection: async (id) => {
    const connection = get().connections.find((item) => item.id === id);
    if (!connection) return false;
    set((state) => ({ connectionStatus: { ...state.connectionStatus, [id]: checkingStatus } }));
    try {
      const session = await authenticate(connection);
      const nextConnections = get().connections.map((item) => item.id === id
        ? canonicalizeSavedConnection({ ...item, lastAuthSummary: buildAuthSummary(session) })
        : item);
      storage.saveConnections(nextConnections);
      set((state) => ({
        connections: nextConnections,
        activeConnection: get().activeConnection?.id === id ? nextConnections.find((item) => item.id === id) ?? state.activeConnection : state.activeConnection,
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
  revalidateMockConnections: async () => {
    const mockConnections = get().connections.filter((connection) => isMockProviderServer(connection.server));
    if (mockConnections.length === 0) return;
    await Promise.all(mockConnections.map((connection) => get().validateConnection(connection.id)));
  },
}));
