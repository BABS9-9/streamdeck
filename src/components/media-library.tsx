'use client';

import { useEffect, useState } from 'react';
import { getSeries, getVodStreams } from '@/lib/xtream-api';
import { XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';

export function MediaLibrary({ kind }: { kind: 'movies' | 'series' }) {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const [items, setItems] = useState<XtreamStream[]>([]);

  useEffect(() => {
    if (!activeConnection) return;
    (kind === 'movies' ? getVodStreams(activeConnection) : getSeries(activeConnection)).then(setItems);
  }, [activeConnection, kind]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-violet-300">{kind === 'movies' ? 'VOD library' : 'Series browser'}</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">{kind === 'movies' ? 'Movie posters from the Xtream adapter.' : 'Series shells ready for season drill-down.'}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.stream_id} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
            <div className="aspect-[2/3] rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${item.stream_icon})` }} />
            <p className="mt-4 font-medium text-white">{item.name}</p>
            <p className="mt-2 text-sm text-slate-400 line-clamp-3">{item.plot || item.genre || 'Mock provider metadata flowing through the real app shell.'}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
