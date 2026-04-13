'use client';

import { ReactNode, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { usePlayerStore } from '@/stores/player-store';

export function AppShell({ children }: { children: ReactNode }) {
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateFavorites = useFavoritesStore((state) => state.hydrate);
  const hydratePlayer = usePlayerStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAuth();
    hydrateFavorites();
    hydratePlayer();
  }, [hydrateAuth, hydrateFavorites, hydratePlayer]);

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.25),_transparent_30%),linear-gradient(180deg,#09090f_0%,#05050a_100%)] text-white">
      <Sidebar />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
