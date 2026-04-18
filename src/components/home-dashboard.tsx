'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { buildLiveStreamUrl, getHomeData, getShortEpg } from '@/lib/xtream-api';
import { NormalizedEpg, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';

export function HomeDashboard() {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const connections = useAuthStore((state) => state.connections);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const playStream = usePlayerStore((state) => state.playStream);

  const [featured, setFeatured] = useState<XtreamStream | null>(null);
  const [heroEpg, setHeroEpg] = useState<NormalizedEpg | null>(null);
  const [summary, setSummary] = useState({ live: 0, vod: 0, series: 0 });
  const [spotlight, setSpotlight] = useState<XtreamStream[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!activeConnection) return;

    getHomeData(activeConnection).then(async (data) => {
      if (cancelled) return;
      const hero = data.liveStreams[0] ?? null;
      setFeatured(hero);
      setSummary({ live: data.liveStreams.length, vod: data.vodStreams.length, series: data.series.length });
      setSpotlight([...data.liveStreams.slice(1, 4), ...data.vodStreams.slice(0, 3)]);
      if (hero) setHeroEpg(await getShortEpg(activeConnection, hero.stream_id));
    }).catch(() => {
      if (cancelled) return;
      setFeatured(null);
      setHeroEpg(null);
      setSummary({ live: 0, vod: 0, series: 0 });
      setSpotlight([]);
    });

    return () => { cancelled = true; };
  }, [activeConnection]);

  const providerHistory = useMemo(
    () => (activeConnection ? watchHistory.filter((item) => item.providerId === activeConnection.id) : []),
    [activeConnection, watchHistory]
  );

  const quickActions = useMemo(
    () => [
      { label: 'Browse live channels', href: '/live', meta: `${summary.live} channels` },
      { label: 'Open movie library', href: '/movies', meta: `${summary.vod} titles` },
      { label: 'Review settings', href: '/settings', meta: 'Connections and preferences' },
    ],
    [summary]
  );

  if (!activeConnection) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No active provider. Go back to login and connect first.</div>;
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
        <div className="grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Featured live preview</p>
            <h2 className="mt-4 text-4xl font-semibold text-white">{featured?.name ?? 'Loading featured channel...'}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              StreamDeck leads with saved provider hot-swap, inline NOW and NEXT guide context, and launch-to-play flow directly from the browse surface.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (featured) playStream(featured, buildLiveStreamUrl(activeConnection, featured), activeConnection.id);
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
            <p className="mt-3 text-xl font-semibold text-white">{heroEpg?.now?.title ?? 'Fetching guide...'}</p>
            <p className="mt-2 text-sm text-slate-400">Next: {heroEpg?.next?.title ?? 'Loading next slot'}</p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                ['Live', summary.live],
                ['Movies', summary.vod],
                ['Series', summary.series],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Quick launch</h3>
          <span className="text-sm text-slate-500">{activeConnection.name}</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
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
          <h3 className="text-xl font-semibold text-white">Spotlight picks</h3>
          <Link href="/live" className="text-sm text-violet-300 hover:text-violet-200">Open browser</Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {spotlight.map((item) => (
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
