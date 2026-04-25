'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderHealth, getSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { buildLiveStreamUrl, getCachedHomeSnapshot, getContentId, getHomeData, getShortEpg, saveHomeSnapshot } from '@/lib/xtream-api';
import { MockProviderHealth, NormalizedEpg, ProviderHomeSnapshot, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';

type HomeState = {
  featured: XtreamStream | null;
  spotlight: XtreamStream[];
  quickLive: XtreamStream[];
  summary: { live: number; vod: number; series: number };
};

type CacheState = {
  mode: 'live' | 'cached' | 'offline';
  message: string | null;
  updatedAt: number | null;
};

const emptyState: HomeState = {
  featured: null,
  spotlight: [],
  quickLive: [],
  summary: { live: 0, vod: 0, series: 0 },
};

const emptyCacheState: CacheState = {
  mode: 'live',
  message: null,
  updatedAt: null,
};

export function HomeDashboard() {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const connections = useAuthStore((state) => state.connections);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const playStream = usePlayerStore((state) => state.playStream);

  const [home, setHome] = useState<HomeState>(emptyState);
  const [heroEpg, setHeroEpg] = useState<NormalizedEpg | null>(null);
  const [liveNow, setLiveNow] = useState<Record<number, NormalizedEpg>>({});
  const [cacheState, setCacheState] = useState<CacheState>(emptyCacheState);
  const [mockHealth, setMockHealth] = useState<MockProviderHealth | null>(null);
  const [guideMessage, setGuideMessage] = useState<string | null>(null);
  const [scenario, setScenario] = useState(getSelectedMockProviderScenario());
  const [scenarioRefreshing, setScenarioRefreshing] = useState(false);

  useEffect(() => {
    setScenario(getSelectedMockProviderScenario());
    return subscribeToMockProviderScenario((nextScenario) => {
      setScenario(nextScenario);
      setScenarioRefreshing(true);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!activeConnection) return;

    const scenarioLabel = scenario.replace(/([A-Z])/g, ' $1').toLowerCase();

    fetchMockProviderHealth(activeConnection, scenario)
      .then((health) => {
        if (!cancelled) setMockHealth(health);
      })
      .catch(() => {
        if (!cancelled) setMockHealth(null);
      });

    const applySnapshot = (snapshot: ProviderHomeSnapshot, mode: CacheState['mode'], message: string | null) => {
      if (cancelled) return;
      setHome({
        featured: snapshot.featured,
        summary: snapshot.summary,
        spotlight: snapshot.spotlight,
        quickLive: snapshot.quickLive,
      });
      setHeroEpg(snapshot.heroEpg);
      setLiveNow(snapshot.liveNow);
      setCacheState({ mode, message, updatedAt: snapshot.updatedAt });
      setGuideMessage(null);
    };

    const cached = getCachedHomeSnapshot(activeConnection.id, Number.POSITIVE_INFINITY);
    if (cached) {
      const cacheAgeMinutes = Math.round((Date.now() - cached.updatedAt) / 60000);
      applySnapshot(
        cached,
        'cached',
        scenarioRefreshing
          ? `Applying ${scenarioLabel} rehearsal while keeping saved Home data live.`
          : cacheAgeMinutes <= 15
            ? 'Loaded instantly from saved provider cache while refreshing live data.'
            : `Loaded from saved cache (${cacheAgeMinutes} min old) while refreshing live data.`
      );
    } else {
      setHome(emptyState);
      setHeroEpg(null);
      setLiveNow({});
      setCacheState(emptyCacheState);
      setGuideMessage(null);
    }

    getHomeData(activeConnection)
      .then(async (data) => {
        if (cancelled) return;
        const featured = data.liveStreams[0] ?? null;
        const quickLive = data.liveStreams.slice(0, 4);
        const nextHome = {
          featured,
          summary: { live: data.liveStreams.length, vod: data.vodStreams.length, series: data.series.length },
          spotlight: [...data.liveStreams.slice(1, 4), ...data.vodStreams.slice(0, 3)],
          quickLive,
        };

        const epgPairs = await Promise.all(
          quickLive.map(async (stream) => {
            const streamId = getContentId(stream);
            try {
              return [streamId, await getShortEpg(activeConnection, streamId)] as const;
            } catch {
              return [streamId, null] as const;
            }
          })
        );
        if (cancelled) return;
        const nextLiveNow = epgPairs.reduce<Record<number, NormalizedEpg>>((acc, [streamId, guide]) => {
          if (guide) acc[streamId] = guide;
          return acc;
        }, {});
        const featuredId = featured ? getContentId(featured) : null;
        let nextHeroEpg = featuredId ? nextLiveNow[featuredId] ?? null : null;
        if (!nextHeroEpg && featuredId) {
          try {
            nextHeroEpg = await getShortEpg(activeConnection, featuredId);
          } catch {
            nextHeroEpg = null;
          }
        }
        if (cancelled) return;

        setHome(nextHome);
        setLiveNow(nextLiveNow);
        setHeroEpg(nextHeroEpg);
        setGuideMessage(Object.keys(nextLiveNow).length === 0 ? 'Guide data is temporarily unavailable. Home is staying useful with cached artwork, counts, and launch actions.' : null);
        const snapshot: ProviderHomeSnapshot = {
          ...nextHome,
          heroEpg: nextHeroEpg,
          liveNow: nextLiveNow,
          updatedAt: Date.now(),
        };
        saveHomeSnapshot(activeConnection.id, snapshot);
        setCacheState({ mode: 'live', message: cached ? (scenarioRefreshing ? `Home refreshed in place for ${scenarioLabel}.` : 'Provider refreshed successfully. Home is live again.') : null, updatedAt: snapshot.updatedAt });
        setScenarioRefreshing(false);
      })
      .catch(() => {
        if (cancelled) return;
        if (cached) {
          const cacheAgeMinutes = Math.round((Date.now() - cached.updatedAt) / 60000);
          applySnapshot(cached, 'offline', scenarioRefreshing ? `Home could not fully reload for ${scenarioLabel}, so saved provider data stayed on screen.` : `Provider refresh failed. Showing saved home data from ${cacheAgeMinutes} min ago.`);
          setScenarioRefreshing(false);
          return;
        }
        setHome(emptyState);
        setHeroEpg(null);
        setLiveNow({});
        setCacheState({ mode: 'offline', message: scenarioRefreshing ? `Home could not reload for ${scenarioLabel} and there is no saved home cache yet.` : 'Provider is unavailable and no saved home cache exists yet.', updatedAt: null });
        setScenarioRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, scenario, scenarioRefreshing]);

  const providerHistory = useMemo(
    () => (activeConnection ? watchHistory.filter((item) => item.providerId === activeConnection.id) : []),
    [activeConnection, watchHistory]
  );

  const quickActions = useMemo(
    () => [
      { label: 'Browse live channels', href: '/live', meta: `${home.summary.live} channels ready` },
      { label: 'Open favorites', href: '/favorites', meta: 'Saved live channels and on-demand picks' },
      { label: 'Curate collections', href: '/collections', meta: 'Build custom folders like Game Day or Kids Bedtime' },
      { label: 'Resume watching', href: '/continue', meta: 'Unified history for this provider' },
      { label: 'Search all providers', href: '/search', meta: 'Ranked results across live, movies, and series' },
      { label: 'Review settings', href: '/settings', meta: 'Connections and playback preferences' },
    ],
    [home.summary]
  );

  const providerLabel = useMemo(() => {
    if (!activeConnection) return 'No provider';
    return `${activeConnection.name} · ${activeConnection.username}`;
  }, [activeConnection]);

  const liveCategoryBreakdown = useMemo(() => {
    const counts = home.quickLive.reduce<Record<string, number>>((acc, stream) => {
      const key = stream.channel_group || stream.genre || 'Live';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [home.quickLive]);

  const cacheTone = cacheState.mode === 'offline'
    ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
    : cacheState.mode === 'cached'
      ? 'border-sky-400/30 bg-sky-500/10 text-sky-100'
      : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100';
  const activeScenario = mockHealth?.healthScenarios?.[mockHealth.activeScenario];

  if (!activeConnection) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No active provider. Go back to login and connect first.</div>;
  }

  return (
    <div className="space-y-8">
      {cacheState.message ? (
        <section className={`rounded-[1.5rem] border px-5 py-4 text-sm ${cacheTone}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{cacheState.message}</p>
            <span className="text-xs uppercase tracking-[0.22em] text-white/70">
              {cacheState.updatedAt ? `Updated ${new Date(cacheState.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'No cached timestamp'}
            </span>
          </div>
        </section>
      ) : null}

      {guideMessage ? (
        <section className="rounded-[1.5rem] border border-amber-400/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{guideMessage}</p>
            <span className="text-xs uppercase tracking-[0.22em] text-amber-50/80">
              {activeScenario?.label ?? 'Guide fallback active'}
            </span>
          </div>
        </section>
      ) : null}

      {mockHealth ? (
        <section className="rounded-[1.6rem] border border-violet-400/20 bg-violet-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-violet-300">Provider demo readiness</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{mockHealth.service} is feeding the shell cleanly.</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
              {mockHealth.liveStreams} live · {mockHealth.vodStreams} VOD · {mockHealth.series} series
            </span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Home flow</p>
              <p className="mt-2 text-sm text-slate-300">{mockHealth.demoFlows?.home}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Preview friendly</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  mockHealth.playerCapabilities.livePreview ? 'Live preview' : null,
                  mockHealth.playerCapabilities.previewFallbackFriendly ? 'Fallback art' : null,
                  mockHealth.playerCapabilities.cachedCatalogFriendly ? 'Cached catalogs' : null,
                ].filter((item): item is string => Boolean(item)).map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">{item}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Featured mock channels</p>
              <div className="mt-2 space-y-2">
                {mockHealth.featuredChannels?.slice(0, 3).map((channel) => (
                  <div key={channel.name} className="rounded-xl bg-white/5 px-3 py-2">
                    <p className="text-sm font-medium text-white">{channel.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{channel.category} · {channel.guide}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Mock rehearsal modes</p>
                <p className="mt-2 text-sm text-slate-300">The adapter can now simulate healthy, degraded-search, degraded-live, and degraded-guide behavior so Home can rehearse fallback messaging before real providers misbehave, and this surface now refreshes in place as soon as the rehearsal mode changes.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-violet-200">
                Active: {mockHealth.healthScenarios?.[mockHealth.activeScenario]?.label ?? mockHealth.activeScenario}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(mockHealth.endpointHealth || {}).map(([key, value]) => (
                <span key={key} className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.22em] ${value === 'healthy' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-amber-400/20 bg-amber-500/10 text-amber-100'}`}>
                  {key} · {value}
                </span>
              ))}
            </div>
            {scenarioRefreshing ? (
              <div className="mt-4 rounded-2xl border border-violet-400/20 bg-black/20 p-4 text-sm text-violet-100">
                Applying {scenario.replace(/([A-Z])/g, ' $1').toLowerCase()} rehearsal and refreshing Home in place.
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {Object.entries(mockHealth.healthScenarios || {}).map(([key, scenario]) => (
                <div key={key} className={`rounded-2xl border p-4 ${mockHealth.activeScenario === key ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-white/5'}`}>
                  <p className="text-sm font-semibold text-white">{scenario.label}</p>
                  <p className="mt-2 text-sm text-slate-400">{scenario.summary}</p>
                  <p className="mt-3 text-xs text-slate-500">{scenario.appImpact}</p>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Expected UX</p>
                      <ul className="space-y-1 text-xs text-slate-400">
                        {scenario.expectedUx.map((item) => <li key={item}>• {item}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Verify now</p>
                      <ul className="space-y-1 text-xs text-slate-400">
                        {scenario.verificationSteps.map((item) => <li key={item}>• {item}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
        <div className="grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Featured live preview</p>
            <h2 className="mt-4 text-4xl font-semibold text-white">{home.featured?.name ?? 'Loading featured channel...'}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              StreamDeck leads with saved provider hot-swap, inline NOW and NEXT guide context, and launch-to-play flow directly from the browse surface.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (home.featured) playStream(home.featured, buildLiveStreamUrl(activeConnection, home.featured), activeConnection.id);
                }}
                className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-medium text-white hover:bg-violet-400"
              >
                Play featured channel
              </button>
              <Link href="/live" className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-200 hover:bg-white/5">
                Open live browser
              </Link>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Provider</p>
                <p className="mt-2 text-xl font-semibold text-white">{activeConnection.name}</p>
                <p className="mt-2 text-sm text-slate-500">{providerLabel}</p>
              </div>
              {connections.length > 1 ? (
                <select
                  value={activeConnection.id}
                  onChange={(event) => setActiveConnection(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                >
                  {connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name}</option>)}
                </select>
              ) : null}
            </div>
            <p className="mt-5 text-sm text-slate-400">Now playing</p>
            <p className="mt-3 text-xl font-semibold text-white">{heroEpg?.now?.title ?? (guideMessage ? 'Guide temporarily unavailable' : 'Fetching guide...')}</p>
            <p className="mt-2 text-sm text-slate-400">Next: {heroEpg?.next?.title ?? (guideMessage ? 'Browse live to keep surfing while guide recovers' : 'Loading next slot')}</p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                ['Live', home.summary.live],
                ['Movies', home.summary.vod],
                ['Series', home.summary.series],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            {liveCategoryBreakdown.length > 0 ? (
              <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Quick live mix</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {liveCategoryBreakdown.map((category) => (
                    <span key={category.name} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
                      {category.name} · {category.count}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Quick launch</h3>
          <span className="text-sm text-slate-500">{activeConnection.name}</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-violet-400/40 hover:bg-white/8">
              <p className="text-lg font-semibold text-white">{action.label}</p>
              <p className="mt-2 text-sm text-slate-400">{action.meta}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Live now</h3>
          <span className="text-sm text-slate-500">Inline NOW and NEXT, straight from the home screen</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {home.quickLive.map((stream) => (
            <article key={stream.stream_id} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
              <div className="aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${stream.preview_art || stream.stream_icon})` }} />
              <p className="mt-4 text-lg font-semibold text-white">{stream.name}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">{stream.channel_group || 'Live channel'}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-slate-500">Now</p>
              <p className="mt-1 text-sm text-slate-200">{liveNow[getContentId(stream)]?.now?.title ?? (guideMessage ? 'Guide unavailable right now' : 'Loading guide...')}</p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-slate-500">Next</p>
              <p className="mt-1 text-sm text-slate-400">{liveNow[getContentId(stream)]?.next?.title ?? (guideMessage ? 'Preview and playback still work' : 'Fetching next slot')}</p>
              {liveNow[getContentId(stream)]?.listings?.length ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Guide strip</p>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {liveNow[getContentId(stream)].listings.slice(0, 3).map((listing) => (
                      <div key={listing.id} className="min-w-[140px] rounded-xl bg-white/5 p-2">
                        <p className="text-[11px] text-slate-500">{new Date(listing.start_timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                        <p className="mt-1 text-xs text-slate-200">{listing.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <button
                onClick={() => playStream(stream, buildLiveStreamUrl(activeConnection, stream), activeConnection.id)}
                className="mt-4 w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
              >
                Play now
              </button>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Spotlight picks</h3>
          <Link href="/live" className="text-sm text-violet-300 hover:text-violet-200">Open browser</Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {home.spotlight.map((item) => (
            <article key={`${item.stream_type}-${item.stream_id}`} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
              <div className="aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${item.stream_icon})` }} />
              <p className="mt-4 text-lg font-semibold text-white">{item.name}</p>
              <p className="mt-2 text-sm text-slate-400">{item.stream_type === 'live' ? 'Live channel' : item.genre || 'On-demand title'}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-white">Continue watching</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {providerHistory.length > 0 ? providerHistory.map((item) => (
            <div key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${item.artwork})` }} />
              <p className="mt-4 font-medium text-white">{item.title}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-slate-500">{item.kind}</p>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.max(8, item.progress * 100)}%` }} />
              </div>
            </div>
          )) : <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">Start a stream from this provider and it will appear here.</div>}
        </div>
      </section>
    </div>
  );
}
