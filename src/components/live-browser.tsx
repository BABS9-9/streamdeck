'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildLiveStreamUrl, getLiveCategories, getLiveStreams, getShortEpg } from '@/lib/xtream-api';
import { NormalizedEpg, XtreamCategory, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { usePlayerStore } from '@/stores/player-store';
import { VideoPlayer } from './video-player';

export function LiveBrowser() {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const playStream = usePlayerStore((state) => state.playStream);
  const currentStream = usePlayerStore((state) => state.currentStream);
  const playbackUrl = usePlayerStore((state) => state.playbackUrl);

  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [streams, setStreams] = useState<XtreamStream[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStream, setSelectedStream] = useState<XtreamStream | null>(null);
  const [epg, setEpg] = useState<Record<number, NormalizedEpg>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!activeConnection) return;
    Promise.all([getLiveCategories(activeConnection), getLiveStreams(activeConnection)]).then(([cats, live]) => {
      setCategories(cats);
      setStreams(live);
      setSelectedStream(live[0] ?? null);
      Promise.all(live.slice(0, 12).map(async (stream) => [stream.stream_id, await getShortEpg(activeConnection, stream.stream_id)] as const)).then((entries) => {
        setEpg(Object.fromEntries(entries));
      });
    });
  }, [activeConnection]);

  const filtered = useMemo(() => streams.filter((stream) => {
    const categoryMatch = selectedCategory === 'all' || stream.category_id === selectedCategory;
    const searchMatch = stream.name.toLowerCase().includes(search.toLowerCase());
    return categoryMatch && searchMatch;
  }), [streams, search, selectedCategory]);

  if (!activeConnection) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No active provider. Return to login first.</div>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Live TV browser</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Inline guide, instant playback, fast filtering.</h2>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search channels"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => setSelectedCategory('all')} className={`rounded-full px-4 py-2 text-sm ${selectedCategory === 'all' ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-300'}`}>All</button>
            {categories.map((category) => (
              <button key={category.category_id} onClick={() => setSelectedCategory(category.category_id)} className={`rounded-full px-4 py-2 text-sm ${selectedCategory === category.category_id ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-300'}`}>
                {category.category_name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((stream) => {
            const guide = epg[stream.stream_id];
            const selected = selectedStream?.stream_id === stream.stream_id;
            const favourite = favorites.includes(stream.stream_id);
            return (
              <article
                key={stream.stream_id}
                className={`group rounded-[1.6rem] border p-4 transition ${selected ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-white/5 hover:-translate-y-1 hover:border-white/20'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{stream.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{categories.find((item) => item.category_id === stream.category_id)?.category_name ?? 'Live'}</p>
                  </div>
                  <button onClick={() => toggleFavorite(stream.stream_id)} className={`rounded-full px-3 py-1 text-xs ${favourite ? 'bg-amber-400/20 text-amber-300' : 'bg-white/5 text-slate-400'}`}>
                    {favourite ? '★ Saved' : '☆ Save'}
                  </button>
                </div>
                <div className="mt-4 aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${stream.stream_icon})` }} />
                <div className="mt-4 space-y-2 text-sm">
                  <p className="text-slate-400">NOW</p>
                  <p className="font-medium text-white">{guide?.now?.title ?? 'Loading EPG...'}</p>
                  <p className="text-slate-400">NEXT</p>
                  <p className="text-slate-200">{guide?.next?.title ?? 'Fetching next slot'}</p>
                </div>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => {
                      const url = buildLiveStreamUrl(activeConnection, stream);
                      setSelectedStream(stream);
                      playStream(stream, url, activeConnection.id);
                    }}
                    className="flex-1 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
                  >
                    Play
                  </button>
                  <button onClick={() => setSelectedStream(stream)} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:bg-white/5">Preview</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-black/30 p-4">
          <div className="aspect-video overflow-hidden rounded-[1.4rem] bg-black">
            <VideoPlayer src={playbackUrl} poster={selectedStream?.stream_icon} />
          </div>
          <div className="mt-4 px-2 pb-2">
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Live preview</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{currentStream?.name ?? selectedStream?.name ?? 'Select a channel'}</h3>
            <p className="mt-2 text-sm text-slate-400">{selectedStream ? epg[selectedStream.stream_id]?.now?.title ?? 'Guide loading' : 'Choose a channel card to preview or play it here.'}</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Why this browser matters</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>• NOW and NEXT program data is shown inline, not hidden in a separate guide screen.</li>
            <li>• Favorites are one click from the main grid.</li>
            <li>• Playback launches directly from the browser without leaving context.</li>
            <li>• The layout is already provider-aware, ready for multi-connection switching next.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
