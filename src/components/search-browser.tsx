'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { buildLiveStreamUrl, buildVodStreamUrl, getArtwork, getCachedSearchCatalog, getContentId, refreshSearchCatalog } from '@/lib/xtream-api';
import { ProviderCatalog, SavedConnection, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';

type SearchResult = {
  provider: SavedConnection;
  item: XtreamStream;
  kind: 'live' | 'movie' | 'series';
  score: number;
};

const scoreResult = (query: string, item: XtreamStream, kind: SearchResult['kind']) => {
  const lowerQuery = query.toLowerCase();
  const haystack = `${item.name} ${item.genre || ''} ${item.plot || ''}`.toLowerCase();
  if (!haystack.includes(lowerQuery)) return -1;

  let score = 20;
  if (item.name.toLowerCase() === lowerQuery) score += 90;
  else if (item.name.toLowerCase().startsWith(lowerQuery)) score += 55;
  else score += Math.max(10, 35 - item.name.toLowerCase().indexOf(lowerQuery));

  if (kind === 'live') score += 12;
  if (kind === 'movie') score += 6;
  if (item.rating) score += Number(item.rating);
  return score;
};

const rankResults = (providerCatalogs: Array<{ provider: SavedConnection; catalog: Pick<ProviderCatalog, 'live' | 'vod' | 'series'> }>, trimmed: string) => {
  return providerCatalogs
    .flatMap(({ provider, catalog }) => {
      const buckets: Array<[SearchResult['kind'], XtreamStream[]]> = [
        ['live', catalog.live],
        ['movie', catalog.vod],
        ['series', catalog.series],
      ];

      return buckets.flatMap(([kind, items]) =>
        items
          .map((item) => ({ provider, item, kind, score: scoreResult(trimmed, item, kind) }))
          .filter((result) => result.score >= 0)
      );
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 48);
};

export function SearchBrowser() {
  const connections = useAuthStore((state) => state.connections);
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const playStream = usePlayerStore((state) => state.playStream);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState('sports');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Searching all providers...');
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (connections.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      setUsingCache(false);
      return;
    }

    const timer = setTimeout(async () => {
      const cachedCatalogs = connections
        .map((provider) => ({ provider, catalog: getCachedSearchCatalog(provider.id) }))
        .filter((entry): entry is { provider: SavedConnection; catalog: ProviderCatalog } => Boolean(entry.catalog));

      if (cachedCatalogs.length > 0) {
        setResults(rankResults(cachedCatalogs, trimmed));
        setUsingCache(true);
        setLoading(true);
        setLoadingLabel('Refreshing cached provider catalogs...');
      } else {
        setLoading(true);
        setLoadingLabel('Searching all providers...');
        setUsingCache(false);
        setResults([]);
      }

      setError(null);

      try {
        const providerCatalogs = await Promise.all(
          connections.map(async (provider) => ({
            provider,
            catalog: await refreshSearchCatalog(provider),
          }))
        );

        if (cancelled) return;

        setResults(rankResults(providerCatalogs, trimmed));
        setUsingCache(cachedCatalogs.length > 0);
      } catch (searchError) {
        if (cancelled) return;
        setError(searchError instanceof Error ? searchError.message : 'Search failed');
        if (cachedCatalogs.length === 0) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [connections, query]);

  const groupedCounts = useMemo(() => {
    return results.reduce<Record<string, number>>((acc, result) => {
      acc[result.provider.id] = (acc[result.provider.id] || 0) + 1;
      return acc;
    }, {});
  }, [results]);

  if (connections.length === 0) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No saved providers yet. Connect on the login screen first.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Cross-provider search</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Search live TV, movies, and series across every saved connection.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              This is the differentiator the big IPTV players keep missing. One query, one ranked result set, every provider in the same surface.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
            {connections.length} provider{connections.length === 1 ? '' : 's'} indexed client-side
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search everything, for example sports, news, movie, atlas"
            className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-base text-white outline-none placeholder:text-slate-500 focus:border-violet-400"
          />
          <div className="flex flex-wrap gap-2">
            {['sports', 'news', 'movie', 'kids', 'atlas'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuery(suggestion)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.22em] text-slate-500">
          {connections.map((connection) => (
            <span key={connection.id} className={`rounded-full border px-3 py-2 ${activeConnection?.id === connection.id ? 'border-violet-400/40 bg-violet-500/10 text-violet-200' : 'border-white/10 bg-black/20'}`}>
              {connection.name} · {groupedCounts[connection.id] || 0} hits
            </span>
          ))}
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}
      {loading ? <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-slate-400">{loadingLabel}</div> : null}
      {usingCache && results.length > 0 ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">Loaded cached results instantly, now refreshing provider data in the background.</div> : null}
      {!loading && query.trim().length < 2 ? <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">Type at least 2 characters to search across saved providers.</div> : null}

      {results.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((result) => {
            const contentId = getContentId(result.item);
            const artwork = getArtwork(result.item);
            const isPlayable = result.kind !== 'series';
            return (
              <article key={`${result.provider.id}-${result.kind}-${contentId}`} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                <div className="aspect-video rounded-2xl bg-cover bg-center bg-no-repeat" style={{ backgroundImage: artwork ? `url(${artwork})` : undefined }} />
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-white">{result.item.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{result.kind} · {result.provider.name}</p>
                  </div>
                  <button
                    onClick={() => setActiveConnection(result.provider.id)}
                    className={`rounded-full px-3 py-1 text-xs ${activeConnection?.id === result.provider.id ? 'bg-violet-500/20 text-violet-200' : 'bg-black/20 text-slate-300 hover:bg-white/5'}`}
                  >
                    {activeConnection?.id === result.provider.id ? 'Active' : 'Switch'}
                  </button>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{result.item.plot || result.item.genre || 'Ready for playback and browsing in the active provider shell.'}</p>
                <div className="mt-4 flex gap-3">
                  {isPlayable ? (
                    <button
                      onClick={() => {
                        setActiveConnection(result.provider.id);
                        const url = result.kind === 'live' ? buildLiveStreamUrl(result.provider, result.item) : buildVodStreamUrl(result.provider, result.item);
                        playStream(result.item, url, result.provider.id);
                      }}
                      className="flex-1 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
                    >
                      Play
                    </button>
                  ) : (
                    <Link
                      href={`/series?seriesId=${contentId}`}
                      onClick={() => setActiveConnection(result.provider.id)}
                      className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-slate-200 hover:bg-white/5"
                    >
                      Browse series
                    </Link>
                  )}
                  <div className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-400">
                    Score {Math.round(result.score)}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {query.trim().length >= 2 && results.length === 0 && !error && !loading ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">No matches yet. Try provider names, genres, or broader terms like news, movie, or sports.</div>
      ) : null}
    </div>
  );
}
