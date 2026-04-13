'use client';

import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { WatchHistoryItem, XtreamStream } from '@/lib/types';

type PlayerState = {
  currentStream: XtreamStream | null;
  playbackUrl: string | null;
  watchHistory: WatchHistoryItem[];
  hydrate: () => void;
  playStream: (stream: XtreamStream, playbackUrl: string, providerId: string) => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentStream: null,
  playbackUrl: null,
  watchHistory: [],
  hydrate: () => set({ watchHistory: storage.getHistory() }),
  playStream: (stream, playbackUrl, providerId) => {
    const nextEntry: WatchHistoryItem = {
      id: `${providerId}-${stream.stream_id}`,
      kind: stream.stream_type === 'live' ? 'live' : 'movie',
      title: stream.name,
      streamId: stream.stream_id,
      providerId,
      artwork: stream.stream_icon,
      progress: stream.stream_type === 'live' ? 1 : 0.35,
      updatedAt: Date.now(),
    };
    const nextHistory: WatchHistoryItem[] = [
      nextEntry,
      ...get().watchHistory.filter((item) => item.id !== `${providerId}-${stream.stream_id}`),
    ].slice(0, 12);
    storage.saveHistory(nextHistory);
    set({ currentStream: stream, playbackUrl, watchHistory: nextHistory });
  },
}));
