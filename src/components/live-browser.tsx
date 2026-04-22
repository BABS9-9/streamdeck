'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildLiveStreamUrl, getContentId, getLiveCategories, getLiveStreams, getShortEpg } from '@/lib/xtream-api';
import { NormalizedEpg, XtreamCategory, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useCollectionsStore } from '@/stores/collections-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { usePlayerStore } from '@/stores/player-store';
import { VideoPlayer } from './video-player';

export function LiveBrowser() {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const connections = useAuthStore((state) => state.connections);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const validateConnection = useAuthStore((state) => state.validateConnection);
  const getFavoritesForProvider = useFavoritesStore((state) => state.getFavoritesForProvider);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const collections = useCollectionsStore((state) => state.collections);
  const addItemToCollection = useCollectionsStore((state) => state.addItemToCollection);
  const playStream = usePlayerStore((state) => state.playStream);
  const currentStream = usePlayerStore((state) => state.currentStream);
  const playbackUrl = usePlayerStore((state) => state.playbackUrl);
  const streamHealth = usePlayerStore((state) => state.streamHealth);

  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [streams, setStreams] = useState<XtreamStream[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStream, setSelectedStream] = useState<XtreamStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [epg, setEpg] = useState<Record<number, NormalizedEpg>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!activeConnection) return;

    setLoading(true);
    setLoadError(null);

    Promise.all([getLiveCategories(activeConnection), getLiveStreams(activeConnection)])
      .then(([cats, live]) => {
        if (cancelled) return;
        setCategories(cats);
        setStreams(live);
        setSelectedStream(live[0] ?? null);
        setPreviewUrl(live[0] ? buildLiveStreamUrl(activeConnection, live[0]) : null);
        return Promise.all(
          live.slice(0, 18).map(async (stream) => {
            const streamId = getContentId(stream);
            return [streamId, await getShortEpg(activeConnection, streamId)] as const;
          })
        );
      })
      .then((entries) => {
        if (!entries || cancelled) return;
        setEpg(Object.fromEntries(entries));
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Unable to load live TV');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection]);

  const favorites = useMemo(
    () => (activeConnection ? getFavoritesForProvider(activeConnection.id) : []),
    [activeConnection, getFavoritesForProvider]
  );

  const filtered = useMemo(() => streams.filter((stream) => {
    const categoryMatch = selectedCategory === 'all' || stream.category_id === selectedCategory;
    const searchMatch = stream.name.toLowerCase().includes(search.toLowerCase());
    return categoryMatch && searchMatch;
  }), [streams, search, selectedCategory]);

  const activeStatus = activeConnection ? connectionStatus[activeConnection.id] : null;
  const statusTone = activeStatus?.state === 'healthy'
    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
    : activeStatus?.state === 'checking'
      ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
      : activeStatus?.state === 'error'
        ? 'border-rose-400/20 bg-rose-500/10 text-rose-100'
        : 'border-sky-400/20 bg-sky-500/10 text-sky-100';

  if (!activeConnection) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No active provider. Return to login first.</div>;
  }

  const previewSource = playbackUrl ?? previewUrl;
  const displayStream = currentStream ?? selectedStream;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="space-y-6">
        {activeStatus ? (
          <div className={`rounded-[1.5rem] border px-5 py-4 text-sm ${statusTone}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white">{activeConnection.name} provider status: {activeStatus.state}</p>
                <p className="mt-1 text-white/80">{activeStatus.message ?? 'Provider status available.'}</p>
              </div>
              <button
                onClick={() => validateConnection(activeConnection.id)}
                className="rounded-full border border-white/20 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white hover:bg-white/10"
              >
                Retry check
              </button>
            </div>
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            Live TV refresh failed. {loadError}
          </div>
        ) : null}

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Live TV browser</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Inline guide, instant preview, fast filtering.</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {connections.length > 1 ? (
                <select
                  value={activeConnection.id}
                  onChange={(event) => setActiveConnection(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                >
                  {connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name}</option>)}
                </select>
              ) : null}
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search channels"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
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

        {loading ? <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-sm text-slate-400">Refreshing live categories, channels, and inline guide data...</div> : null}

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((stream) => {
            const contentId = getContentId(stream);
            const guide = epg[contentId];
            const selected = displayStream ? getContentId(displayStream) === contentId : false;
            const favourite = favorites.includes(contentId);
            const previewing = selectedStream ? getContentId(selectedStream) === contentId : false;
            return (
              <article
                key={contentId}
                onMouseEnter={() => {
                  setSelectedStream(stream);
                  setPreviewUrl(buildLiveStreamUrl(activeConnection, stream));
                }}
                onFocus={() => {
                  setSelectedStream(stream);
                  setPreviewUrl(buildLiveStreamUrl(activeConnection, stream));
                }}
                className={`group rounded-[1.6rem] border p-4 transition ${selected ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-white/5 hover:-translate-y-1 hover:border-white/20'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{stream.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{categories.find((item) => item.category_id === stream.category_id)?.category_name ?? 'Live'}</p>
                  </div>
                  <button onClick={() => toggleFavorite(activeConnection.id, contentId)} className={`rounded-full px-3 py-1 text-xs ${favourite ? 'bg-amber-400/20 text-amber-300' : 'bg-white/5 text-slate-400'}`}>
                    {favourite ? '★ Saved' : '☆ Save'}
                  </button>
                </div>
                <div className="mt-4 aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${stream.stream_icon})` }} />
                <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-500">
                  <span>{previewing ? 'Preview armed' : 'Hover to preview'}</span>
                  <span>{contentId}</span>
                </div>
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
                      setPreviewUrl(url);
                      playStream(stream, url, activeConnection.id);
                    }}
                    className="flex-1 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
                  >
                    Play
                  </button>
                  <button onClick={() => { setSelectedStream(stream); setPreviewUrl(buildLiveStreamUrl(activeConnection, stream)); }} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:bg-white/5">Preview</button>
                </div>
                              {collections.length > 0 ? (
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      if (!event.target.value) return;
                      addItemToCollection(event.target.value, {
                        providerId: activeConnection.id,
                        streamId: contentId,
                        streamType: 'live',
                        title: stream.name,
                        artwork: stream.stream_icon,
                        addedAt: Date.now(),
                      });
                      event.target.value = '';
                    }}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="">Add to collection…</option>
                    {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
                  </select>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-black/30 p-4">
          <div className="aspect-video overflow-hidden rounded-[1.4rem] bg-black">
            <VideoPlayer src={previewSource} poster={displayStream?.stream_icon} />
          </div>
          <div className="mt-4 px-2 pb-2">
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Instant channel preview</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{displayStream?.name ?? 'Select a channel'}</h3>
            <p className="mt-2 text-sm text-slate-400">{displayStream ? epg[getContentId(displayStream)]?.now?.title ?? 'Guide loading' : 'Choose a channel card to preview or play it here.'}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Health</p>
                <p className={`mt-1 font-medium ${streamHealth.status === 'healthy' ? 'text-emerald-300' : streamHealth.status === 'buffering' ? 'text-amber-300' : streamHealth.status === 'error' ? 'text-rose-300' : 'text-slate-200'}`}>{streamHealth.status}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Bitrate</p>
                <p className="mt-1 font-medium text-white">{streamHealth.bitrateKbps ? `${streamHealth.bitrateKbps} kbps` : 'Pending'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Buffer</p>
                <p className="mt-1 font-medium text-white">{streamHealth.bufferSeconds !== null ? `${streamHealth.bufferSeconds}s` : 'Pending'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Video</p>
                <p className="mt-1 font-medium text-white">{streamHealth.resolution ?? streamHealth.codec ?? 'Detecting'}</p>
              </div>
            </div>
            {streamHealth.message ? <p className="mt-3 text-xs text-slate-500">{streamHealth.message}</p> : null}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Why this browser matters</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>• NOW and NEXT program data is shown inline, not hidden in a separate guide screen.</li>
            <li>• Hover or focus arms the preview player without navigating away from the grid.</li>
            <li>• Favorites stay one click from the main channel surface.</li>
            <li>• Provider switching is already wired into the browser header.</li>
            <li>• When a provider degrades, Live now says so clearly and keeps the retry path in the same surface.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
