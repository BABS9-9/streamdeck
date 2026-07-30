'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderManifest } from '@/lib/mock-provider';
import { SurfaceContinuityWindow } from '@/components/surface-continuity-window';
import { SurfaceLaunchReadiness } from '@/components/surface-launch-readiness';
import { buildLiveStreamUrl, getArtwork, getCachedHomeSnapshot, getContentId, getHomeData, getShortEpg, saveHomeSnapshot } from '@/lib/xtream-api';
import { MockProviderManifest, NormalizedEpg, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { usePlayerStore } from '@/stores/player-store';

const MOCK_SERVER = 'http://localhost:3579';

type HomeState = {
  featured: XtreamStream | null;
  quickLive: XtreamStream[];
  spotlight: XtreamStream[];
  summary: { live: number; vod: number; series: number };
};

const emptyHome: HomeState = {
  featured: null,
  quickLive: [],
  spotlight: [],
  summary: { live: 0, vod: 0, series: 0 },
};

const formatTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export function HomeDashboard() {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const favorites = useFavoritesStore((state) => activeConnection ? state.getFavoritesForProvider(activeConnection.id) : []);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const playStream = usePlayerStore((state) => state.playStream);

  const [home, setHome] = useState<HomeState>(emptyHome);
  const [heroGuide, setHeroGuide] = useState<NormalizedEpg | null>(null);
  const [guideMessage, setGuideMessage] = useState<string | null>(null);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [manifest, setManifest] = useState<MockProviderManifest | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchMockProviderManifest(MOCK_SERVER)
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch(() => {
        if (!cancelled) setManifest(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!activeConnection) {
      setLoading(false);
      setHome(emptyHome);
      return;
    }

    const cached = getCachedHomeSnapshot(activeConnection.id, Number.POSITIVE_INFINITY);
    if (cached) {
      setHome({
        featured: cached.featured,
        quickLive: cached.quickLive,
        spotlight: cached.spotlight,
        summary: cached.summary,
      });
      setHeroGuide(cached.heroEpg);
      const ageMinutes = Math.max(1, Math.round((Date.now() - cached.updatedAt) / 60000));
      setCacheMessage(`Loaded saved provider data from ${ageMinutes} minute${ageMinutes === 1 ? '' : 's'} ago while refreshing.`);
    } else {
      setCacheMessage(null);
      setHome(emptyHome);
      setHeroGuide(null);
    }

    setLoading(true);
    getHomeData(activeConnection)
      .then(async (data) => {
        if (cancelled) return;

        const featured = data.liveStreams[0] || data.vodStreams[0] || data.series[0] || null;
        const quickLive = data.liveStreams.slice(0, 6);
        const spotlight = [...data.vodStreams.slice(0, 4), ...data.series.slice(0, 2)];
        const summary = {
          live: data.liveStreams.length,
          vod: data.vodStreams.length,
          series: data.series.length,
        };

        let nextHeroGuide = null;
        if (featured?.stream_type === 'live') {
          try {
            nextHeroGuide = await getShortEpg(activeConnection, getContentId(featured));
          } catch {
            nextHeroGuide = null;
          }
        }

        const snapshot = {
          featured,
          quickLive,
          spotlight,
          summary,
          heroEpg: nextHeroGuide,
          liveNow: {},
          updatedAt: Date.now(),
        };

        saveHomeSnapshot(activeConnection.id, snapshot);
        setHome({ featured, quickLive, spotlight, summary });
        setHeroGuide(nextHeroGuide);
        setGuideMessage(nextHeroGuide ? null : 'Guide data is unavailable right now, but browse and playback are still live.');
        setCacheMessage(cached ? 'Provider refreshed successfully.' : null);
      })
      .catch((error) => {
        if (cancelled) return;
        if (!cached) {
          setGuideMessage(error instanceof Error ? error.message : 'Unable to load provider catalog.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection]);

  const providerStatus = activeConnection ? connectionStatus[activeConnection.id] : null;
  const featuredArtwork = home.featured ? getArtwork(home.featured) || '' : '';
  const featuredLive = home.featured?.stream_type === 'live' ? home.featured : null;
  const continueWatching = useMemo(() => {
    if (!activeConnection) return [];
    return watchHistory.filter((item) => item.providerId === activeConnection.id).slice(0, 4);
  }, [activeConnection, watchHistory]);
  const fallbackEquivalence = useMemo(
    () => manifest?.surfaceFallbackEquivalenceContracts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const launchReadiness = useMemo(
    () => manifest?.surfaceLaunchReadinessContracts.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );
  const continuityWindow = useMemo(
    () => manifest?.surfaceContinuityWindows.find((item) => item.screenId === 'home') ?? null,
    [manifest]
  );

  if (!activeConnection) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-slate-300">
        No active provider yet. Return to login and connect a mock or real Xtream source first.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
        <div
          className="relative min-h-[360px] bg-cover bg-center p-8 sm:p-10"
          style={{ backgroundImage: `linear-gradient(125deg, rgba(2,6,23,0.92), rgba(2,6,23,0.5)), url(${featuredArtwork})` }}
        >
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300">Featured now</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {home.featured?.name || 'Provider connected and ready to browse'}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200">
              {home.featured?.plot || 'Jump into live TV, open favorites, or resume your most recent sessions from the same provider.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {featuredLive ? (
                <button
                  onClick={() => playStream(featuredLive, buildLiveStreamUrl(activeConnection, featuredLive), activeConnection.id)}
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
                >
                  Play featured channel
                </button>
              ) : (
                <Link href="/live" className="rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200">
                  Open live TV
                </Link>
              )}
              <Link href="/favorites" className="rounded-full border border-white/15 px-6 py-3 text-sm text-white transition hover:bg-white/5">
                Favorites
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-300">
              <span>{home.summary.live} live channels</span>
              <span>{home.summary.vod} movies</span>
              <span>{home.summary.series} series</span>
              <span>{favorites.length} favorites</span>
            </div>
            {heroGuide?.now ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Now / Next</p>
                <p className="mt-2 text-base font-medium text-white">{heroGuide.now.title}</p>
                {heroGuide.next?.title ? <p className="mt-1 text-sm text-slate-300">Next: {heroGuide.next.title}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Provider" value={activeConnection.name} detail={activeConnection.username} />
        <StatCard label="Status" value={providerStatus?.state || 'idle'} detail={providerStatus?.message || 'Validation pending'} />
        <StatCard label="Expires" value={formatTime(activeConnection.lastAuthSummary?.expiresAt) || 'Unknown'} detail={activeConnection.lastAuthSummary?.status || 'No account summary'} />
        <StatCard label="Continue watching" value={String(continueWatching.length)} detail="Recent plays on this provider" />
      </section>

      {cacheMessage ? (
        <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">{cacheMessage}</div>
      ) : null}
      {guideMessage ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{guideMessage}</div>
      ) : null}

      {fallbackEquivalence ? (
        <section className="rounded-[2rem] border border-violet-400/20 bg-violet-500/10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-violet-200">{fallbackEquivalence.title}</p>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-200">{fallbackEquivalence.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/80">
              Home rescue honesty
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {fallbackEquivalence.equivalence.map((item) => (
              <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-violet-200">Equivalent</p>
                <p className="mt-1 text-sm leading-6 text-slate-200">{item.equivalentExperience}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-amber-200">Approximate</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">{item.approximateExperience}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-rose-200">Restart trigger</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">{item.restartTrigger}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <SurfaceLaunchReadiness contract={launchReadiness} badge="Hero launch safety" />
      <SurfaceContinuityWindow contract={continuityWindow} badge="Browse continuity" />

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Live highlights</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Fast-launch channels</h2>
          </div>
          <Link href="/live" className="text-sm text-sky-300 hover:text-sky-200">Browse all live TV</Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {home.quickLive.map((stream) => (
            <button
              key={getContentId(stream)}
              onClick={() => playStream(stream, buildLiveStreamUrl(activeConnection, stream), activeConnection.id)}
              className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20 text-left transition hover:-translate-y-0.5 hover:border-sky-400/30 hover:bg-black/30"
            >
              <div
                className="h-36 bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.2), rgba(15,23,42,0.85)), url(${getArtwork(stream) || ''})` }}
              />
              <div className="p-4">
                <p className="text-base font-medium text-white">{stream.name}</p>
                <p className="mt-1 text-sm text-slate-400">{stream.channel_group || 'Live'} channel</p>
              </div>
            </button>
          ))}
          {!loading && home.quickLive.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 p-6 text-sm text-slate-400">
              No live highlights were returned by this provider yet.
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Spotlight library</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Recent movies and series</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {home.spotlight.map((item) => (
              <div key={`${item.stream_type}-${getContentId(item)}`} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20">
                <div
                  className="h-44 bg-cover bg-center"
                  style={{ backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.15), rgba(15,23,42,0.82)), url(${getArtwork(item) || ''})` }}
                />
                <div className="p-4">
                  <p className="text-base font-medium text-white">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.stream_type === 'series' ? 'Series' : 'Movie'} · {item.genre || item.year || 'Library item'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Continue watching</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Recent activity</h2>
          <div className="mt-5 space-y-3">
            {continueWatching.length > 0 ? continueWatching.map((item) => (
              <div key={item.id} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                <p className="text-base font-medium text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {item.kind === 'live' ? 'Live channel' : item.kind === 'series' ? 'Series episode' : 'Movie'} · {Math.round(item.progress * 100)}% saved
                </p>
              </div>
            )) : (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 p-6 text-sm text-slate-400">
                Playback history will appear here after the first live or on-demand session.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}
