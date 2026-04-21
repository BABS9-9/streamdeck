'use client';

import { create } from 'zustand';
import { getArtwork, getContentId } from '@/lib/xtream-api';
import { storage } from '@/lib/storage';
import { StreamHealth, WatchHistoryItem, XtreamStream } from '@/lib/types';

type PlayerState = {
  currentStream: XtreamStream | null;
  playbackUrl: string | null;
  currentProviderId: string | null;
  resumeFromSeconds: number;
  watchHistory: WatchHistoryItem[];
  streamHealth: StreamHealth;
  hydrate: () => void;
  playStream: (stream: XtreamStream, playbackUrl: string, providerId: string) => void;
  updatePlaybackProgress: (positionSeconds: number, durationSeconds?: number | null) => void;
  updateStreamHealth: (health: Partial<StreamHealth>) => void;
  resetStreamHealth: () => void;
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
  hydrate: () => set({ watchHistory: storage.getHistory() }),
  playStream: (stream, playbackUrl, providerId) => {
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
      playbackUrl,
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
      playbackUrl: playbackUrl ?? existing?.playbackUrl,
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
}));
