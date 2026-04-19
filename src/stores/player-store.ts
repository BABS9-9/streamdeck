'use client';

import { create } from 'zustand';
import { getArtwork, getContentId } from '@/lib/xtream-api';
import { storage } from '@/lib/storage';
import { StreamHealth, WatchHistoryItem, XtreamStream } from '@/lib/types';

type PlayerState = {
  currentStream: XtreamStream | null;
  playbackUrl: string | null;
  watchHistory: WatchHistoryItem[];
  streamHealth: StreamHealth;
  hydrate: () => void;
  playStream: (stream: XtreamStream, playbackUrl: string, providerId: string) => void;
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
  watchHistory: [],
  streamHealth: defaultStreamHealth,
  hydrate: () => set({ watchHistory: storage.getHistory() }),
  playStream: (stream, playbackUrl, providerId) => {
    const contentId = getContentId(stream);
    const nextEntry: WatchHistoryItem = {
      id: `${providerId}-${contentId}`,
      kind: stream.stream_type === 'live' ? 'live' : stream.stream_type === 'series' ? 'series' : 'movie',
      title: stream.name,
      streamId: contentId,
      providerId,
      artwork: getArtwork(stream),
      categoryId: stream.category_id,
      playbackUrl,
      progress: stream.stream_type === 'live' ? 1 : 0.35,
      updatedAt: Date.now(),
    };
    const nextHistory: WatchHistoryItem[] = [
      nextEntry,
      ...get().watchHistory.filter((item) => item.id !== `${providerId}-${contentId}`),
    ].slice(0, 12);
    storage.saveHistory(nextHistory);
    set({
      currentStream: stream,
      playbackUrl,
      watchHistory: nextHistory,
      streamHealth: {
        ...defaultStreamHealth,
        status: 'loading',
        updatedAt: Date.now(),
        message: `Loading ${stream.name}`,
      },
    });
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
