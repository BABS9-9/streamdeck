'use client';

import { ReactNode, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { PlayerDock } from './player-dock';
import { useAuthStore } from '@/stores/auth-store';
import { useCollectionsStore } from '@/stores/collections-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';

export function AppShell({ children }: { children: ReactNode }) {
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const validateAllConnections = useAuthStore((state) => state.validateAllConnections);
  const initialized = useAuthStore((state) => state.initialized);
  const hydrateCollections = useCollectionsStore((state) => state.hydrate);
  const hydrateFavorites = useFavoritesStore((state) => state.hydrate);
  const hydrateLibrary = useLibraryStore((state) => state.hydrate);
  const hydratePlayer = usePlayerStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAuth();
    hydrateCollections();
    hydrateFavorites();
    hydrateLibrary();
    hydratePlayer();
  }, [hydrateAuth, hydrateCollections, hydrateFavorites, hydrateLibrary, hydratePlayer]);

  useEffect(() => {
    if (!initialized) return;
    validateAllConnections();
  }, [initialized, validateAllConnections]);

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.25),_transparent_30%),linear-gradient(180deg,#09090f_0%,#05050a_100%)] text-white">
      <Sidebar />
      <main className="flex-1 px-4 py-6 pb-36 sm:px-6 sm:pb-40 lg:px-10">
        {children}
      </main>
      <PlayerDock />
    </div>
  );
}
