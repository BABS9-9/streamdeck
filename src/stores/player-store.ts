'use client';

import { create } from 'zustand';
import { createPlaybackHistoryEntry, hydratePlaybackHistory, updatePlaybackHistoryProgress } from '@/lib/playback-history-runtime';
import { getArtwork, getCachedSearchCatalog, getContentId } from '@/lib/xtream-api';
import { storage } from '@/lib/storage';
import { StreamHealth, WatchHistoryItem, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';

type PlaybackMeta = {
  seriesId?: number;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  sourceSurface?: WatchHistoryItem['sourceSurface'];
};

type PlayerState = {
  currentStream: XtreamStream | null;
  playbackUrl: string | null;
  currentProviderId: string | null;
  resumeFromSeconds: number;
  watchHistory: WatchHistoryItem[];
  streamHealth: StreamHealth;
  dockMode: 'expanded' | 'compact';
  hydrate: () => void;
  playStream: (stream: XtreamStream, playbackUrl: string, providerId: string, meta?: PlaybackMeta) => void;
  updatePlaybackProgress: (positionSeconds: number, durationSeconds?: number | null) => void;
  updateStreamHealth: (health: Partial<StreamHealth>) => void;
  markProviderDrop: (providerId: string, message: string) => void;
  invalidateProvider: (providerId: string, reason?: string) => void;
  resetStreamHealth: () => void;
  setDockMode: (mode: 'expanded' | 'compact') => void;
  closePlayback: () => void;
};

const defaultStreamHealth: StreamHealth = {
  status: 'idle',
  bitrateKbps: null,
  bufferSeconds: null,
  droppedFrames: null,
  resolution: null,
  codec: null,
  updatedAt: null,
  message: null,
};

const mergeProviderHistory = (
  providerId: string,
  providerHistory: WatchHistoryItem[],
  allHistory: WatchHistoryItem[]
) => [
  ...providerHistory,
  ...allHistory.filter((item) => item.providerId !== providerId),
].sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0)).slice(0, 36);

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentStream: null,
  playbackUrl: null,
  currentProviderId: null,
  resumeFromSeconds: 0,
  watchHistory: [],
  streamHealth: defaultStreamHealth,
  dockMode: 'compact',
  hydrate: () => {
    const authState = useAuthStore.getState();
    const hydratedHistory = hydratePlaybackHistory({
      history: storage.getHistory(),
      connections: authState.connections,
      connectionStatus: authState.connectionStatus,
      activeConnectionId: authState.activeConnection?.id,
    });
    const history = hydratedHistory.map((item) => {
      if (!item.providerId) return item;
      const catalog = getCachedSearchCatalog(item.providerId, Number.MAX_SAFE_INTEGER);
      const match = item.kind === 'live'
        ? catalog?.live.find((entry) => getContentId(entry) === item.streamId)
        : item.kind === 'series'
          ? catalog?.series.find((entry) => getContentId(entry) === item.seriesId || getContentId(entry) === item.streamId)
          : catalog?.vod.find((entry) => getContentId(entry) === item.streamId);
      if (!match) return item;
      return {
        ...item,
        categoryName: item.categoryName || match.channel_group,
        categoryId: match.category_id || item.categoryId,
        artwork: item.artwork || getArtwork(match),
        year: item.year || match.year,
        title: item.title || match.name,
        seriesTitle: item.seriesTitle || (item.kind === 'series' ? match.name : item.seriesTitle),
      };
    });

    storage.saveHistory(history);
    set({ watchHistory: history, dockMode: storage.getPlayerDockMode() });
  },
  playStream: (stream, playbackUrl, providerId, meta) => {
    const contentId = getContentId(stream);
    const existing = get().watchHistory.find((item) => item.id === `${providerId}-${contentId}`);
    const authState = useAuthStore.getState();
    const providerName = authState.connections.find((connection) => connection.id === providerId)?.name || providerId;
    const nextEntry: WatchHistoryItem = {
      ...createPlaybackHistoryEntry({
        stream,
        playbackUrl,
        providerId,
        providerName,
        meta,
        existing,
        lastSwitchContext: authState.lastSwitchContext,
      }),
      artwork: getArtwork(stream),
      categoryId: stream.category_id,
      categoryName: stream.channel_group,
      year: stream.year,
    };
    const nextProviderHistory: WatchHistoryItem[] = [
      nextEntry,
      ...storage.getProviderHistory(providerId).filter((item) => item.id !== `${providerId}-${contentId}`),
    ].slice(0, 12);
    storage.saveProviderHistory(providerId, nextProviderHistory);
    const nextHistory = mergeProviderHistory(providerId, nextProviderHistory, get().watchHistory);
    set({
      currentStream: stream,
      playbackUrl,
      currentProviderId: providerId,
      resumeFromSeconds: stream.stream_type === 'live' ? 0 : existing?.positionSeconds ?? 0,
      watchHistory: nextHistory,
      streamHealth: {
        ...defaultStreamHealth,
        status: 'loading',
        updatedAt: Date.now(),
        message: `Loading ${stream.name}`,
      },
    });
  },
  updatePlaybackProgress: (positionSeconds, durationSeconds) => {
    const { currentStream, currentProviderId, playbackUrl, watchHistory } = get();
    if (!currentStream || !currentProviderId) return;

    const contentId = getContentId(currentStream);
    const historyId = `${currentProviderId}-${contentId}`;
    const existing = watchHistory.find((item) => item.id === historyId);
    if (!existing) return;
    const authState = useAuthStore.getState();
    const providerName = authState.connections.find((connection) => connection.id === currentProviderId)?.name || currentProviderId;
    const updatedEntry: WatchHistoryItem = {
      ...updatePlaybackHistoryProgress({
        item: {
          ...existing,
          title: currentStream.name,
          playbackUrl: playbackUrl ?? existing.playbackUrl,
          artwork: getArtwork(currentStream),
          categoryId: currentStream.category_id,
          categoryName: existing.categoryName ?? currentStream.channel_group,
          year: existing.year ?? currentStream.year,
          seriesTitle: existing.seriesTitle ?? (currentStream.stream_type === 'series' ? currentStream.name : undefined),
        },
        positionSeconds,
        durationSeconds,
        providerName,
        connectionStatus: authState.connectionStatus,
        activeConnectionId: authState.activeConnection?.id,
      }),
      playbackUrl: playbackUrl ?? existing.playbackUrl,
      artwork: getArtwork(currentStream),
    };

    const nextProviderHistory = [updatedEntry, ...storage.getProviderHistory(currentProviderId).filter((item) => item.id !== historyId)].slice(0, 12);
    storage.saveProviderHistory(currentProviderId, nextProviderHistory);
    const nextHistory = mergeProviderHistory(currentProviderId, nextProviderHistory, watchHistory);
    set({
      watchHistory: nextHistory,
      resumeFromSeconds: currentStream.stream_type === 'live' ? 0 : updatedEntry.positionSeconds ?? 0,
    });
  },
  updateStreamHealth: (health) => set((state) => ({
    streamHealth: {
      ...state.streamHealth,
      ...health,
      updatedAt: Date.now(),
    },
  })),
  markProviderDrop: (providerId, message) => set((state) => (
    state.currentProviderId !== providerId
      ? state
      : {
          streamHealth: {
            ...state.streamHealth,
            status: 'error',
            updatedAt: Date.now(),
            message,
          },
        }
  )),
  invalidateProvider: (providerId, reason) => {
    storage.removeProviderHistory(providerId);
    set((state) => {
      const watchHistory = state.watchHistory.filter((item) => item.providerId !== providerId);
      if (state.currentProviderId !== providerId) {
        return { watchHistory };
      }

      return {
        currentStream: null,
        playbackUrl: null,
        currentProviderId: null,
        resumeFromSeconds: 0,
        watchHistory,
        streamHealth: {
          ...defaultStreamHealth,
          status: 'error',
          updatedAt: Date.now(),
          message: reason || 'The active provider was removed from playback state.',
        },
      };
    });
  },
  resetStreamHealth: () => set({ streamHealth: defaultStreamHealth }),
  setDockMode: (mode) => {
    storage.savePlayerDockMode(mode);
    set({ dockMode: mode });
  },
  closePlayback: () => set({
    currentStream: null,
    playbackUrl: null,
    currentProviderId: null,
    resumeFromSeconds: 0,
    streamHealth: defaultStreamHealth,
  }),
}));
