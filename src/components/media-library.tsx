'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderHealth, getSelectedMockProviderScenario, setSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { buildSeriesEpisodeUrl, buildVodStreamUrl, getArtwork, getCachedSearchCatalog, getContentId, getSeries, getSeriesInfo, getVodStreams, refreshSearchCatalog } from '@/lib/xtream-api';
import { MockProviderHealth, MockProviderScenario, XtreamEpisode, XtreamSeriesInfo, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';

type CacheMode = 'live' | 'cached' | 'offline';

const formatPercent = (value: number) => `${Math.round(value * 100)}% watched`;

const scenarioLabels: Record<MockProviderScenario, string> = {
  healthy: 'Healthy',
  degradedSearch: 'Degraded search',
  degradedLive: 'Degraded live',
  degradedEpg: 'Degraded guide',
};

export function MediaLibrary({ kind, initialSeriesId }: { kind: 'movies' | 'series'; initialSeriesId?: number | null }) {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const playStream = usePlayerStore((state) => state.playStream);
  const watchHistory = usePlayerStore((state) => state.watchHistory);

  const [items, setItems] = useState<XtreamStream[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<XtreamSeriesInfo | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [cacheMode, setCacheMode] = useState<CacheMode>('live');
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [mockHealth, setMockHealth] = useState<MockProviderHealth | null>(null);
  const [scenario, setScenario] = useState<MockProviderScenario>('healthy');

  useEffect(() => {
    setScenario(getSelectedMockProviderScenario());
    return subscribeToMockProviderScenario(setScenario);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchMockProviderHealth(activeConnection, scenario)
      .then((health) => {
        if (!cancelled) setMockHealth(health);
      })
      .catch(() => {
        if (!cancelled) setMockHealth(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, scenario]);

  useEffect(() => {
    if (!activeConnection) return;
    let cancelled = false;
    setLoading(true);

    const cachedCatalog = getCachedSearchCatalog(activeConnection.id, Number.POSITIVE_INFINITY);
    const cachedItems = kind === 'movies' ? cachedCatalog?.vod : cachedCatalog?.series;

    if (cachedItems?.length) {
      setItems(cachedItems);
      setCacheMode('cached');
      setCacheMessage('Loaded instantly from cached provider catalog while refreshing the library.');
      setLoading(false);
    } else {
      setItems([]);
      setCacheMode('live');
      setCacheMessage(null);
    }

    const loader = kind === 'movies' ? getVodStreams(activeConnection) : getSeries(activeConnection);
    loader.then((nextItems) => {
      if (cancelled) return;
      setItems(nextItems);
      setLoading(false);
      setCacheMode('live');
      setCacheMessage(cachedItems?.length ? 'Library refreshed successfully. Premium browse surface is live again.' : null);
      refreshSearchCatalog(activeConnection).catch(() => null);
    }).catch(() => {
      if (cancelled) return;
      if (cachedItems?.length) {
        setItems(cachedItems);
        setCacheMode('offline');
        setCacheMessage('Provider refresh failed. Showing the saved library cache so browsing stays usable.');
      } else {
        setItems([]);
        setCacheMode('offline');
        setCacheMessage('Provider is unavailable and there is no saved library cache yet.');
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, kind]);

  const providerHistory = useMemo(
    () => (activeConnection ? watchHistory.filter((item) => item.providerId === activeConnection.id && item.kind !== 'live') : []),
    [activeConnection, watchHistory]
  );

  const resumeLookup = useMemo(
    () => Object.fromEntries(providerHistory.map((item) => [item.streamId, item])),
    [providerHistory]
  );

  const categoryOptions = useMemo(() => {
    const counts = items.reduce<Record<string, number>>((acc, item) => {
      const key = item.genre || item.channel_group || item.category_id || 'Library';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return [{ label: 'All', value: 'all', count: items.length }, ...Object.entries(counts).map(([label, count]) => ({ label, value: label, count }))];
  }, [items]);

  const filteredItems = useMemo(
    () => (activeFilter === 'all' ? items : items.filter((item) => (item.genre || item.channel_group || item.category_id) === activeFilter)),
    [activeFilter, items]
  );

  useEffect(() => {
    setActiveFilter('all');
  }, [kind, activeConnection?.id]);

  useEffect(() => {
    if (kind !== 'series') return;
    setSelectedSeriesId(initialSeriesId ?? null);
  }, [initialSeriesId, kind]);

  useEffect(() => {
    if (kind !== 'movies') return;
    setSelectedMovieId((current) => current ?? (items[0] ? getContentId(items[0]) : null));
  }, [items, kind]);

  useEffect(() => {
    if (kind !== 'series' || filteredItems.length === 0) return;
    setSelectedSeriesId((current) => current ?? getContentId(filteredItems[0]));
  }, [kind, filteredItems]);

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

  const featuredMovie = useMemo(
    () => filteredItems.find((item) => getContentId(item) === selectedMovieId) ?? filteredItems[0] ?? null,
    [filteredItems, selectedMovieId]
  );

  const selectedEpisodes = useMemo(() => {
    if (!seriesInfo) return [] as XtreamEpisode[];
    return seriesInfo.episodes[String(selectedSeason)] ?? [];
  }, [selectedSeason, seriesInfo]);

  const recentItems = useMemo(() => providerHistory.slice(0, 4), [providerHistory]);

  const bannerTone = cacheMode === 'offline'
    ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
    : cacheMode === 'cached'
      ? 'border-sky-400/30 bg-sky-500/10 text-sky-100'
      : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100';
  const activeScenario = mockHealth?.healthScenarios?.[mockHealth.activeScenario];
  const libraryFlowCopy = kind === 'movies' ? mockHealth?.demoFlows?.movies : mockHealth?.demoFlows?.series;

  if (!activeConnection) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No active provider. Return to login first.</div>;
  }

  if (kind === 'movies') {
    return (
      <div className="space-y-6">
        {cacheMessage ? <div className={`rounded-[1.4rem] border px-5 py-4 text-sm ${bannerTone}`}>{cacheMessage}</div> : null}
        {mockHealth ? (
          <section className="rounded-[1.6rem] border border-violet-400/20 bg-violet-500/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-violet-300">Movies rehearsal visibility</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Movies now advertises degraded-provider expectations inside the browse surface.</h3>
                <p className="mt-2 max-w-3xl text-sm text-slate-300">{libraryFlowCopy || 'Use the mock adapter to rehearse degraded catalog states without turning Movies into a dead shell.'}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                {activeScenario?.label ?? mockHealth.activeScenario}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(mockHealth.endpointHealth || {}).map(([key, value]) => (
                <span key={key} className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.22em] ${value === 'healthy' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-amber-400/20 bg-amber-500/10 text-amber-100'}`}>
                  {key} · {value}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(scenarioLabels) as MockProviderScenario[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedMockProviderScenario(key)}
                  className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${scenario === key ? 'bg-violet-500 text-white' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
                >
                  {scenarioLabels[key]}
                </button>
              ))}
            </div>
            {activeScenario?.verificationSteps?.length ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-violet-300">Active verification steps</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {activeScenario.verificationSteps.map((step) => <li key={step}>• {step}</li>)}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-violet-300">VOD library</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Premium movie browsing, not just a poster dump.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">StreamDeck now keeps Movies fast and contextual with local catalog filtering, a cinematic detail rail, and resume-aware cards tied to the same playback graph as Continue Watching.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {categoryOptions.map((category) => (
              <button
                key={category.value}
                onClick={() => setActiveFilter(category.value)}
                className={`rounded-full px-4 py-2 text-sm ${activeFilter === category.value ? 'bg-violet-500 text-white' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
              >
                {category.label} · {category.count}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-slate-400">Loading movies…</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
                const itemId = getContentId(item);
                const resume = resumeLookup[itemId];
                const selected = itemId === (featuredMovie ? getContentId(featuredMovie) : null);
                return (
                  <article key={item.stream_id} className={`rounded-[1.6rem] border p-4 transition ${selected ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <button className="block w-full text-left" onClick={() => setSelectedMovieId(itemId)}>
                      <div className="aspect-[2/3] rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${getArtwork(item)})` }} />
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">{item.genre || 'Movie'}{item.year ? ` · ${item.year}` : ''}</p>
                        </div>
                        {resume ? <span className="rounded-full bg-violet-500/20 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-violet-100">Resume</span> : null}
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-400">{item.tagline || item.plot || 'Mock provider metadata flowing through the real app shell.'}</p>
                    </button>
                    <button
                      onClick={() => playStream(item, buildVodStreamUrl(activeConnection, item), activeConnection.id)}
                      className="mt-4 w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
                    >
                      {resume ? 'Resume movie' : 'Play movie'}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-black/30 p-6">
            {featuredMovie ? (
              <>
                <div className="aspect-[16/9] rounded-[1.4rem] bg-cover bg-center" style={{ backgroundImage: `url(${featuredMovie.backdrop_path?.[0] || getArtwork(featuredMovie)})` }} />
                <p className="mt-5 text-xs uppercase tracking-[0.3em] text-violet-300">Movie detail</p>
                <h3 className="mt-2 text-3xl font-semibold text-white">{featuredMovie.name}</h3>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                  {[featuredMovie.genre, featuredMovie.year, featuredMovie.duration, featuredMovie.language, featuredMovie.rating ? `${featuredMovie.rating}/10` : null].filter(Boolean).map((chip) => (
                    <span key={chip} className="rounded-full border border-white/10 bg-white/5 px-3 py-2">{chip}</span>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">{featuredMovie.plot || featuredMovie.tagline || 'Select a movie card to inspect its richer provider metadata.'}</p>
                <p className="mt-3 text-sm text-slate-400">{featuredMovie.director ? `Directed by ${featuredMovie.director}` : ''}{featuredMovie.cast ? `${featuredMovie.director ? ' · ' : ''}${featuredMovie.cast}` : ''}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={() => playStream(featuredMovie, buildVodStreamUrl(activeConnection, featuredMovie), activeConnection.id)} className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-medium text-white hover:bg-violet-400">{resumeLookup[getContentId(featuredMovie)] ? 'Resume movie' : 'Play movie'}</button>
                  <button onClick={() => setSelectedMovieId(filteredItems[0] ? getContentId(filteredItems[0]) : null)} className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-200 hover:bg-white/5">Reset selection</button>
                </div>

                {recentItems.length > 0 ? (
                  <div className="mt-8 rounded-[1.3rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Resume rail</p>
                    <div className="mt-3 space-y-3">
                      {recentItems.map((item) => (
                        <button key={item.id} onClick={() => setSelectedMovieId(item.streamId)} className="flex w-full items-center gap-3 rounded-2xl bg-black/20 px-3 py-3 text-left hover:bg-black/30">
                          <div className="h-14 w-10 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${item.artwork || ''})` }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{item.title}</p>
                            <p className="mt-1 text-xs text-slate-400">{formatPercent(item.progress)}{item.kind === 'series' && item.seasonNumber && item.episodeNumber ? ` · S${item.seasonNumber}E${item.episodeNumber}` : ''}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">No movies available for the current filter yet.</div>
            )}
          </aside>
        </div>
      </div>
    );
  }

  const selectedSeries = seriesInfo?.info ?? filteredItems.find((item) => getContentId(item) === selectedSeriesId) ?? null;
  const selectedSeriesResume = selectedSeries ? resumeLookup[getContentId(selectedSeries)] : null;

  return (
    <div className="space-y-6">
      {cacheMessage ? <div className={`rounded-[1.4rem] border px-5 py-4 text-sm ${bannerTone}`}>{cacheMessage}</div> : null}
      {mockHealth ? (
        <section className="rounded-[1.6rem] border border-violet-400/20 bg-violet-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-violet-300">Series rehearsal visibility</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Series now advertises degraded-provider expectations inside the drill-down surface.</h3>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">{libraryFlowCopy || 'Use the mock adapter to rehearse degraded catalog states without turning Series into a dead shell.'}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
              {activeScenario?.label ?? mockHealth.activeScenario}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(mockHealth.endpointHealth || {}).map(([key, value]) => (
              <span key={key} className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.22em] ${value === 'healthy' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-amber-400/20 bg-amber-500/10 text-amber-100'}`}>
                {key} · {value}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(scenarioLabels) as MockProviderScenario[]).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedMockProviderScenario(key)}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${scenario === key ? 'bg-violet-500 text-white' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
              >
                {scenarioLabels[key]}
              </button>
            ))}
          </div>
          {activeScenario?.verificationSteps?.length ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-violet-300">Active verification steps</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {activeScenario.verificationSteps.map((step) => <li key={step}>• {step}</li>)}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Series browser</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Real season and episode drill-down, not a placeholder shell.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">Pick a series to load seasons and episodes from the mock Xtream adapter, then launch playback directly from the episode rail.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {categoryOptions.map((category) => (
            <button
              key={category.value}
              onClick={() => setActiveFilter(category.value)}
              className={`rounded-full px-4 py-2 text-sm ${activeFilter === category.value ? 'bg-violet-500 text-white' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
            >
              {category.label} · {category.count}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="space-y-4">
          {loading ? <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-slate-400">Loading series…</div> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredItems.map((item) => {
              const selected = getContentId(item) === selectedSeriesId;
              const resume = resumeLookup[getContentId(item)];
              return (
                <article key={item.series_id} className={`rounded-[1.6rem] border p-4 transition ${selected ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                  <div className="aspect-[2/3] rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${getArtwork(item)})` }} />
                  <p className="mt-4 text-lg font-semibold text-white">{item.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">{item.genre || 'Series'}{item.year ? ` · ${item.year}` : ''}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-400">{item.plot || item.genre || 'Series metadata loaded from the mock provider.'}</p>
                  <button
                    onClick={() => setSelectedSeriesId(getContentId(item))}
                    className="mt-4 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:bg-white/5"
                  >
                    {selected ? 'Loaded' : resume ? 'Resume series' : 'Open seasons'}
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
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                {[selectedSeries.genre, selectedSeries.year, selectedSeries.language, selectedSeries.rating ? `${selectedSeries.rating}/10` : null].filter(Boolean).map((chip) => (
                  <span key={chip} className="rounded-full border border-white/10 bg-white/5 px-3 py-2">{chip}</span>
                ))}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">{selectedSeries.plot || 'Select a mock series to load the real season and episode payload.'}</p>
              <p className="mt-3 text-sm text-slate-400">{selectedSeries.tagline || ''}{selectedSeries.cast ? `${selectedSeries.tagline ? ' · ' : ''}${selectedSeries.cast}` : ''}</p>
              {selectedSeriesResume ? <p className="mt-3 text-xs uppercase tracking-[0.22em] text-violet-200">Resume available · {formatPercent(selectedSeriesResume.progress)}</p> : null}
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
