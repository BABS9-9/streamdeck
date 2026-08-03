'use client';

import { create } from 'zustand';
import { getArtwork, getCachedSearchCatalog, getContentId } from '@/lib/xtream-api';
import { storage } from '@/lib/storage';
import { StreamHealth, WatchHistoryItem, XtreamStream } from '@/lib/types';

type PlaybackMeta = {
  seriesId?: number;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
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

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentStream: null,
  playbackUrl: null,
  currentProviderId: null,
  resumeFromSeconds: 0,
  watchHistory: [],
  streamHealth: defaultStreamHealth,
  dockMode: 'compact',
  hydrate: () => {
    const history = storage.getHistory().map((item) => {
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
    const nextEntry: WatchHistoryItem = {
      id: `${providerId}-${contentId}`,
      kind: stream.stream_type === 'live' ? 'live' : stream.stream_type === 'series' ? 'series' : 'movie',
      title: stream.name,
      streamId: contentId,
      providerId,
      artwork: getArtwork(stream),
      categoryId: stream.category_id,
      categoryName: stream.channel_group,
      year: stream.year,
      playbackUrl,
      seriesId: meta?.seriesId ?? existing?.seriesId,
      seriesTitle: meta?.seriesTitle ?? existing?.seriesTitle ?? (stream.stream_type === 'series' ? stream.name : undefined),
      seasonNumber: meta?.seasonNumber ?? existing?.seasonNumber,
      episodeNumber: meta?.episodeNumber ?? existing?.episodeNumber,
      progress: existing?.progress ?? (stream.stream_type === 'live' ? 1 : 0.02),
      positionSeconds: existing?.positionSeconds ?? 0,
      durationSeconds: existing?.durationSeconds ?? undefined,
      updatedAt: Date.now(),
    };
    const nextHistory: WatchHistoryItem[] = [
      nextEntry,
      ...get().watchHistory.filter((item) => item.id != `${providerId}-${contentId}`),
    ].slice(0, 12);
    storage.saveHistory(nextHistory);
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
    const isLive = currentStream.stream_type === 'live';
    const existing = watchHistory.find((item) => item.id === historyId);
    const safeDuration = durationSeconds && Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : undefined;
    const progress = isLive
      ? 1
      : safeDuration
        ? Math.max(0.02, Math.min(0.99, positionSeconds / safeDuration))
        : Math.max(0.02, existing?.progress ?? 0.02);

    const updatedEntry: WatchHistoryItem = {
      id: historyId,
      kind: currentStream.stream_type === 'live' ? 'live' : currentStream.stream_type === 'series' ? 'series' : 'movie',
      title: currentStream.name,
      streamId: contentId,
      providerId: currentProviderId,
      artwork: getArtwork(currentStream),
      categoryId: currentStream.category_id,
      categoryName: existing?.categoryName ?? currentStream.channel_group,
      year: existing?.year ?? currentStream.year,
      playbackUrl: playbackUrl ?? existing?.playbackUrl,
      seriesId: existing?.seriesId,
      seriesTitle: existing?.seriesTitle ?? (currentStream.stream_type === 'series' ? currentStream.name : undefined),
      seasonNumber: existing?.seasonNumber,
      episodeNumber: existing?.episodeNumber,
      progress,
      positionSeconds: isLive ? undefined : Math.max(0, Math.floor(positionSeconds)),
      durationSeconds: isLive ? undefined : safeDuration ? Math.floor(safeDuration) : existing?.durationSeconds,
      updatedAt: Date.now(),
    };

    const nextHistory = [updatedEntry, ...watchHistory.filter((item) => item.id !== historyId)].slice(0, 12);
    storage.saveHistory(nextHistory);
    set({ watchHistory: nextHistory, resumeFromSeconds: isLive ? 0 : updatedEntry.positionSeconds ?? 0 });
  },
  updateStreamHealth: (health) => set((state) => ({
    streamHealth: {
      ...state.streamHealth,
      ...health,
      updatedAt: Date.now(),
    },
  })),
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
