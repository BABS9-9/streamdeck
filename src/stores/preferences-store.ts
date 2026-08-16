'use client';

import { create } from 'zustand';
import { storage } from '@/lib/storage';
import { StreamDeckDisplayPreferences, StreamDeckPlaybackPreferences, StreamDeckSettingsPreferences } from '@/lib/types';

type PreferencesState = {
  hydrated: boolean;
  preferences: StreamDeckSettingsPreferences;
  hydrate: () => void;
  updatePlayback: (patch: Partial<StreamDeckPlaybackPreferences>) => void;
  updateDisplay: (patch: Partial<StreamDeckDisplayPreferences>) => void;
};

const persistPreferences = (preferences: StreamDeckSettingsPreferences) => {
  const next = {
    ...preferences,
    updatedAt: Date.now(),
  };
  storage.saveSettingsPreferences(next);
  return next;
};

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  hydrated: false,
  preferences: storage.getSettingsPreferences(),
  hydrate: () => {
    if (get().hydrated) return;
    set({
      hydrated: true,
      preferences: storage.getSettingsPreferences(),
    });
  },
  updatePlayback: (patch) => {
    const next = persistPreferences({
      ...get().preferences,
      playback: {
        ...get().preferences.playback,
        ...patch,
      },
    });
    set({ preferences: next });
  },
  updateDisplay: (patch) => {
    const next = persistPreferences({
      ...get().preferences,
      display: {
        ...get().preferences.display,
        ...patch,
      },
    });
    set({ preferences: next });
  },
}));
