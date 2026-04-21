'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { buildLiveStreamUrl, buildVodStreamUrl, getArtwork, getCachedSearchCatalog, getContentId, refreshSearchCatalog } from '@/lib/xtream-api';
import { XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { usePlayerStore } from '@/stores/player-store';

type CollectionsProps = {
  mode: 'favorites' | 'continue';
};

export function LibraryCollections({ mode }: CollectionsProps) {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const getFavoritesForProvider = useFavoritesStore((state) => state.getFavoritesForProvider);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const playStream = usePlayerStore((state) => state.playStream);

  const [catalog, setCatalog] = useState<Record<number, XtreamStream>>({});
  const [loading, setLoading] = useState(false);
  const [cacheState, setCacheState] = useState<'idle' | 'cached' | 'fresh'>('idle');

  useEffect(() => {
    let cancelled = false;
    if (!activeConnection || mode !== 'favorites') return;

    const cached = getCachedSearchCatalog(activeConnection.id, Number.MAX_SAFE_INTEGER);
    if (cached) {
      const mergedCached = [...cached.live, ...cached.vod, ...cached.series];
      setCatalog(Object.fromEntries(mergedCached.map((item) => [getContentId(item), item])));
      setCacheState('cached');
    } else {
      setCatalog({});
      setCacheState('idle');
    }

    setLoading(true);
    refreshSearchCatalog(activeConnection)
      .then((freshCatalog) => {
        if (cancelled) return;
        const merged = [...freshCatalog.live, ...freshCatalog.vod, ...freshCatalog.series];
        setCatalog(Object.fromEntries(merged.map((item) => [getContentId(item), item])));
        setCacheState('fresh');
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, mode]);

  const favoriteIds = useMemo(
    () => (activeConnection ? getFavoritesForProvider(activeConnection.id) : []),
    [activeConnection, getFavoritesForProvider]
  );

  const favoriteItems = useMemo(
    () => favoriteIds.map((id) => catalog[id]).filter(Boolean),
    [catalog, favoriteIds]
  );

  const continueItems = useMemo(
    () => (activeConnection ? watchHistory.filter((item) => item.providerId === activeConnection.id) : []),
    [activeConnection, watchHistory]
  );

  if (!activeConnection) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No active provider. Connect first.</div>;
  }

  const title = mode === 'favorites' ? 'Favorites' : 'Continue watching';
  const subtitle = mode === 'favorites'
    ? 'Provider-aware saves across live TV, movies, and series.'
    : 'One resume rail for everything you already started on this provider.';

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-violet-300">{mode === 'favorites' ? 'Saved collection' : 'Unified resume rail'}</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{subtitle}</p>
      </section>

      {mode === 'favorites' ? (
        <section>
          {loading ? <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-slate-400">Refreshing saved items from provider catalog…</div> : null}
          {cacheState === 'cached' ? <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">Loaded favorites from cached provider catalog first, then refreshed in the background.</div> : null}
          {!loading && favoriteItems.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">Save channels or titles from Live, Movies, or Series and they will show up here for {activeConnection.name}.</div> : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favoriteItems.map((item) => {
              const playbackUrl = item.stream_type === 'live'
                ? buildLiveStreamUrl(activeConnection, item)
                : item.stream_type === 'series'
                  ? null
                  : buildVodStreamUrl(activeConnection, item);
              const contentId = getContentId(item);
              return (
                <article key={`${item.stream_type}-${contentId}`} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                  <div className="aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${getArtwork(item)})` }} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{item.name}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">{item.stream_type}</p>
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{contentId}</span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-slate-400">{item.plot || item.genre || 'Saved from your StreamDeck library.'}</p>
                  {playbackUrl ? (
                    <button
                      onClick={() => {
                        playStream(item, playbackUrl, activeConnection.id);
                      }}
                      className="mt-4 w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
                    >
                      Play from favorites
                    </button>
                  ) : (
                    <Link
                      href={`/series?seriesId=${contentId}`}
                      className="mt-4 block w-full rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-slate-200 hover:bg-white/5"
                    >
                      Open episode picker
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <section>
          {continueItems.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">Start any live stream, movie, or series item and it will land here with provider-aware resume context.</div> : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {continueItems.map((item) => (
              <article key={item.id} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                <div className="aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${item.artwork})` }} />
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">{item.kind}</p>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{Math.round(item.progress * 100)}%</span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.max(8, item.progress * 100)}%` }} />
                </div>
                <p className="mt-3 text-sm text-slate-400">Last touched {new Date(item.updatedAt).toLocaleString()}</p>
                <button
                  onClick={() => {
                    if (!item.playbackUrl) return;
                    playStream({
                      name: item.title,
                      stream_type: item.kind === 'live' ? 'live' : item.kind,
                      stream_id: item.streamId,
                      category_id: item.categoryId || 'resume',
                      stream_icon: item.artwork,
                    }, item.playbackUrl, activeConnection.id);
                  }}
                  disabled={!item.playbackUrl}
                  className="mt-4 w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
                >
                  Resume playback
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
