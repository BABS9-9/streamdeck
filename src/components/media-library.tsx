'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildSeriesEpisodeUrl, buildVodStreamUrl, getArtwork, getContentId, getSeries, getSeriesInfo, getVodStreams } from '@/lib/xtream-api';
import { XtreamEpisode, XtreamSeriesInfo, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';

export function MediaLibrary({ kind, initialSeriesId }: { kind: 'movies' | 'series'; initialSeriesId?: number | null }) {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const playStream = usePlayerStore((state) => state.playStream);

  const [items, setItems] = useState<XtreamStream[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<XtreamSeriesInfo | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeConnection) return;
    setLoading(true);
    const loader = kind === 'movies' ? getVodStreams(activeConnection) : getSeries(activeConnection);
    loader.then((nextItems) => {
      setItems(nextItems);
      setLoading(false);
    }).catch(() => {
      setItems([]);
      setLoading(false);
    });
  }, [activeConnection, kind]);

  useEffect(() => {
    if (kind !== 'series') return;
    setSelectedSeriesId(initialSeriesId ?? null);
  }, [initialSeriesId, kind]);

  useEffect(() => {
    if (!activeConnection || kind !== 'series' || !selectedSeriesId) {
      setSeriesInfo(null);
      return;
    }

    let cancelled = false;
    getSeriesInfo(activeConnection, selectedSeriesId)
      .then((info) => {
        if (cancelled) return;
        setSeriesInfo(info);
        setSelectedSeason(info.seasons[0]?.season_number ?? 1);
      })
      .catch(() => {
        if (cancelled) return;
        setSeriesInfo(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, kind, selectedSeriesId]);

  const selectedEpisodes = useMemo(() => {
    if (!seriesInfo) return [] as XtreamEpisode[];
    return seriesInfo.episodes[String(selectedSeason)] ?? [];
  }, [selectedSeason, seriesInfo]);

  if (!activeConnection) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No active provider. Return to login first.</div>;
  }

  if (kind === 'movies') {
    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-violet-300">VOD library</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Movie posters from the Xtream adapter.</h2>
        </div>
        {loading ? <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-slate-400">Loading movies…</div> : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <article key={item.stream_id} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
              <div className="aspect-[2/3] rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${getArtwork(item)})` }} />
              <p className="mt-4 font-medium text-white">{item.name}</p>
              <p className="mt-2 line-clamp-3 text-sm text-slate-400">{item.plot || item.genre || 'Mock provider metadata flowing through the real app shell.'}</p>
              <button
                onClick={() => playStream(item, buildVodStreamUrl(activeConnection, item), activeConnection.id)}
                className="mt-4 w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
              >
                Play movie
              </button>
            </article>
          ))}
        </div>
      </div>
    );
  }

  const selectedSeries = seriesInfo?.info ?? items.find((item) => getContentId(item) === selectedSeriesId) ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Series browser</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Real season and episode drill-down, not a placeholder shell.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          Pick a series to load seasons and episodes from the mock Xtream adapter, then launch playback directly from the episode rail.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="space-y-4">
          {loading ? <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-slate-400">Loading series…</div> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const selected = getContentId(item) === selectedSeriesId;
              return (
                <article
                  key={item.series_id}
                  className={`rounded-[1.6rem] border p-4 transition ${selected ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                >
                  <div className="aspect-[2/3] rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${getArtwork(item)})` }} />
                  <p className="mt-4 text-lg font-semibold text-white">{item.name}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-400">{item.plot || item.genre || 'Series metadata loaded from the mock provider.'}</p>
                  <button
                    onClick={() => setSelectedSeriesId(getContentId(item))}
                    className="mt-4 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:bg-white/5"
                  >
                    {selected ? 'Loaded' : 'Open seasons'}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="rounded-[2rem] border border-white/10 bg-black/30 p-6">
          {selectedSeries ? (
            <>
              <div className="aspect-[16/9] rounded-[1.4rem] bg-cover bg-center" style={{ backgroundImage: `url(${getArtwork(selectedSeries)})` }} />
              <p className="mt-5 text-xs uppercase tracking-[0.3em] text-violet-300">Series detail</p>
              <h3 className="mt-2 text-3xl font-semibold text-white">{selectedSeries.name}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{selectedSeries.plot || 'Select a mock series to load the real season and episode payload.'}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(seriesInfo?.seasons || []).map((season) => (
                  <button
                    key={season.season_number}
                    onClick={() => setSelectedSeason(season.season_number)}
                    className={`rounded-full px-4 py-2 text-sm ${selectedSeason === season.season_number ? 'bg-violet-500 text-white' : 'border border-white/10 bg-white/5 text-slate-300'}`}
                  >
                    {season.name}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                {selectedEpisodes.length > 0 ? selectedEpisodes.map((episode) => {
                  const episodeArtwork = episode.info?.movie_image || selectedSeries.cover || selectedSeries.stream_icon;
                  return (
                    <article key={episode.id} className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start">
                        <div className="h-24 w-full rounded-2xl bg-cover bg-center md:w-40" style={{ backgroundImage: `url(${episodeArtwork})` }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Episode {episode.episode_num}</p>
                              <h4 className="mt-1 text-lg font-semibold text-white">{episode.title}</h4>
                            </div>
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{episode.info?.duration_secs ? `${Math.round(episode.info.duration_secs / 60)} min` : 'Episode'}</span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-400">{episode.plot || episode.info?.plot || 'Episode metadata loaded from get_series_info.'}</p>
                          <button
                            onClick={() => playStream({
                              stream_id: episode.id,
                              name: episode.title,
                              stream_type: 'series',
                              category_id: selectedSeries.category_id,
                              stream_icon: episodeArtwork,
                              cover: episodeArtwork,
                              plot: episode.plot || episode.info?.plot,
                              direct_source: episode.direct_source,
                              container_extension: episode.info?.container_extension,
                            }, buildSeriesEpisodeUrl(activeConnection, episode), activeConnection.id, {
                              seriesId: Number(selectedSeries.series_id ?? selectedSeriesId ?? episode.id),
                              seriesTitle: selectedSeries.name,
                              seasonNumber: selectedSeason,
                              episodeNumber: episode.episode_num,
                            })}
                            className="mt-4 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
                          >
                            Play episode
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }) : <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">Choose a series to load its episode list.</div>}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">Select a series card to inspect seasons and episodes.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
