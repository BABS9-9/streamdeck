'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { buildLiveStreamUrl, buildVodStreamUrl, getArtwork, getCachedSearchCatalog, getContentId } from '@/lib/xtream-api';
import { XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useCollectionsStore } from '@/stores/collections-store';
import { usePlayerStore } from '@/stores/player-store';

const tone: Record<string, string> = {
  violet: 'from-violet-500/25 to-fuchsia-500/10 border-violet-400/30',
  blue: 'from-sky-500/25 to-blue-500/10 border-sky-400/30',
  emerald: 'from-emerald-500/25 to-teal-500/10 border-emerald-400/30',
  amber: 'from-amber-500/25 to-orange-500/10 border-amber-400/30',
  rose: 'from-rose-500/25 to-pink-500/10 border-rose-400/30',
};

export function CollectionsManager() {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const collections = useCollectionsStore((state) => state.collections);
  const createCollection = useCollectionsStore((state) => state.createCollection);
  const removeCollection = useCollectionsStore((state) => state.removeCollection);
  const addItemToCollection = useCollectionsStore((state) => state.addItemToCollection);
  const removeItemFromCollection = useCollectionsStore((state) => state.removeItemFromCollection);
  const playStream = usePlayerStore((state) => state.playStream);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [search, setSearch] = useState('');

  const catalog = useMemo(() => {
    if (!activeConnection) return [] as XtreamStream[];
    const cached = getCachedSearchCatalog(activeConnection.id, Number.MAX_SAFE_INTEGER);
    if (!cached) return [];
    return [...cached.live, ...cached.vod, ...cached.series];
  }, [activeConnection]);

  const providerCollections = useMemo(() => collections.filter((collection) => collection.items.some((item) => item.providerId === activeConnection?.id) || collection.items.length === 0), [activeConnection?.id, collections]);

  const discovery = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalog
      .filter((item) => !query || item.name.toLowerCase().includes(query) || item.genre?.toLowerCase().includes(query))
      .slice(0, 12);
  }, [catalog, search]);

  if (!activeConnection) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No active provider. Connect first.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Custom folders</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Build your own channel and title collections.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">This turns favorites into real curation. Make folders like Game Day, News Morning, Kids Bedtime, or Weekend Movies, then launch directly from one place.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
          <h3 className="text-xl font-semibold text-white">Create a collection</h3>
          <div className="mt-4 space-y-3">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Game Day" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Your must-watch sports channels and recaps." className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
            <button onClick={() => { createCollection({ name, description }); setName(''); setDescription(''); }} className="w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400">Create collection</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">No collections yet. Create one, then start curating from your cached provider catalog.</div> : null}
          {collections.map((collection) => (
            <article key={collection.id} className={`rounded-[1.6rem] border bg-gradient-to-br ${tone[collection.color] ?? tone.violet} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{collection.name}</p>
                  <p className="mt-2 text-sm text-slate-200">{collection.description || 'Custom playlist for your StreamDeck library.'}</p>
                </div>
                <button onClick={() => removeCollection(collection.id)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:bg-white/10">Delete</button>
              </div>
              <div className="mt-5 flex items-center justify-between text-sm text-slate-200">
                <span>{collection.items.length} item{collection.items.length === 1 ? '' : 's'}</span>
                <span>Updated {new Date(collection.updatedAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Add titles to a collection</h3>
            <p className="mt-2 text-sm text-slate-400">Using the cached provider catalog keeps this fast even before a fresh refetch finishes.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select value={selectedCollectionId} onChange={(event) => setSelectedCollectionId(event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
              <option value="">Choose collection</option>
              {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
            </select>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cached catalog" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {discovery.map((item) => {
            const contentId = getContentId(item);
            return (
              <article key={`${item.stream_type}-${contentId}`} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                <div className="aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${getArtwork(item)})` }} />
                <p className="mt-4 text-lg font-semibold text-white">{item.name}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">{item.stream_type}</p>
                <button
                  onClick={() => {
                    if (!selectedCollectionId) return;
                    addItemToCollection(selectedCollectionId, {
                      providerId: activeConnection.id,
                      streamId: contentId,
                      streamType: item.stream_type === 'live' ? 'live' : item.stream_type === 'series' ? 'series' : 'movie',
                      title: item.name,
                      artwork: getArtwork(item),
                      addedAt: Date.now(),
                    });
                  }}
                  disabled={!selectedCollectionId}
                  className="mt-4 w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
                >
                  Add to collection
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white">Launch from collections</h3>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {providerCollections.map((collection) => (
            <article key={collection.id} className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{collection.name}</p>
                  <p className="mt-2 text-sm text-slate-400">{collection.description || 'Custom stream lineup.'}</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{collection.items.length} saved</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {collection.items.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-400">Empty collection. Add some channels or titles above.</div> : null}
                {collection.items.map((item) => {
                  const catalogItem = catalog.find((entry) => getContentId(entry) === item.streamId);
                  const playbackUrl = !catalogItem
                    ? undefined
                    : catalogItem.stream_type === 'live'
                      ? buildLiveStreamUrl(activeConnection, catalogItem)
                      : catalogItem.stream_type === 'series'
                        ? undefined
                        : buildVodStreamUrl(activeConnection, catalogItem);

                  return (
                    <div key={`${collection.id}-${item.streamId}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="aspect-video rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${item.artwork})` }} />
                      <p className="mt-3 font-medium text-white">{item.title}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">{item.streamType}</p>
                      <div className="mt-4 flex gap-2">
                        {item.streamType === 'series' ? (
                          <Link href={`/series?seriesId=${item.streamId}`} className="flex-1 rounded-xl bg-violet-500 px-3 py-2 text-center text-sm font-medium text-white hover:bg-violet-400">Open</Link>
                        ) : (
                          <button
                            onClick={() => {
                              if (!catalogItem || !playbackUrl) return;
                              playStream(catalogItem, playbackUrl, activeConnection.id);
                            }}
                            disabled={!catalogItem || !playbackUrl}
                            className="flex-1 rounded-xl bg-violet-500 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
                          >
                            Play
                          </button>
                        )}
                        <button onClick={() => removeItemFromCollection(collection.id, item.providerId, item.streamId)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5">Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
