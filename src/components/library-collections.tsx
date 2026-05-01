'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { buildLiveStreamUrl, buildVodStreamUrl, getArtwork, getCachedSearchCatalog, getContentId, refreshSearchCatalog } from '@/lib/xtream-api';
import { XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { usePlayerStore } from '@/stores/player-store';

const normalizeLibraryKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const buildVariantKey = (title: string, kind: 'live' | 'movie' | 'series', year?: string, seriesTitle?: string) => {
  const name = normalizeLibraryKey(seriesTitle || title);
  return `${kind}:${name}:${year || ''}`;
};

type ProviderVariant = {
  providerId: string;
  providerName: string;
  title: string;
  streamId: number;
  kind: 'live' | 'movie' | 'series';
  artwork?: string;
  categoryId?: string;
  playbackUrl?: string | null;
  seriesId?: number;
};

type CollectionsProps = {
  mode: 'favorites' | 'continue';
};

export function LibraryCollections({ mode }: CollectionsProps) {
  const connections = useAuthStore((state) => state.connections);
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const validateConnection = useAuthStore((state) => state.validateConnection);
  const getFavoritesForProvider = useFavoritesStore((state) => state.getFavoritesForProvider);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const playStream = usePlayerStore((state) => state.playStream);

  const [catalog, setCatalog] = useState<Record<number, XtreamStream>>({});
  const [loading, setLoading] = useState(false);
  const [cacheState, setCacheState] = useState<'idle' | 'cached' | 'fresh'>('idle');
  const [providerVariants, setProviderVariants] = useState<Record<string, ProviderVariant[]>>({});

  useEffect(() => {
    const cachedVariants = connections.reduce<Record<string, ProviderVariant[]>>((acc, connection) => {
      const connectionCatalog = getCachedSearchCatalog(connection.id, Number.MAX_SAFE_INTEGER);
      if (!connectionCatalog) return acc;
      [...connectionCatalog.live, ...connectionCatalog.vod, ...connectionCatalog.series].forEach((item) => {
        const kind = item.stream_type as 'live' | 'movie' | 'series';
        const key = buildVariantKey(item.name, kind, item.year);
        const variants = acc[key] || [];
        if (!variants.some((variant) => variant.providerId === connection.id && variant.streamId === getContentId(item))) {
          variants.push({
            providerId: connection.id,
            providerName: connection.name,
            title: item.name,
            streamId: getContentId(item),
            kind,
            artwork: getArtwork(item),
            categoryId: item.category_id,
            playbackUrl: kind === 'series' ? null : kind === 'live' ? buildLiveStreamUrl(connection, item) : buildVodStreamUrl(connection, item),
            seriesId: item.series_id,
          });
        }
        acc[key] = variants;
      });
      return acc;
    }, {});
    setProviderVariants(cachedVariants);
  }, [connections]);

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
  }, [activeConnection, connections, mode]);

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

  const variantSummary = useMemo(() => {
    const summary: Record<string, ProviderVariant[]> = {};

    favoriteItems.forEach((item) => {
      const key = buildVariantKey(item.name, item.stream_type as 'live' | 'movie' | 'series', item.year);
      summary[`favorite:${getContentId(item)}`] = (providerVariants[key] || []).filter((variant) => variant.providerId !== activeConnection?.id);
    });

    continueItems.forEach((item) => {
      const key = buildVariantKey(item.title, item.kind, undefined, item.seriesTitle);
      summary[`continue:${item.id}`] = (providerVariants[key] || []).filter((variant) => variant.providerId !== activeConnection?.id);
    });

    return summary;
  }, [activeConnection?.id, continueItems, favoriteItems, providerVariants]);

  const formatEpisodeLabel = (item: { kind: 'live' | 'movie' | 'series'; seasonNumber?: number; episodeNumber?: number; seriesTitle?: string }) => {
    if (item.kind !== 'series') return item.kind;
    const season = item.seasonNumber;
    const episode = item.episodeNumber;
    if (season && episode) return `Series · S${season}E${episode}`;
    if (item.seriesTitle) return 'Series episode';
    return 'Series';
  };

  const formatResume = (seconds?: number) => {
    if (!seconds || seconds <= 0) return 'Ready to resume';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `Resume at ${mins}:${String(secs).padStart(2, '0')}`;
  };

  const activeConnectionStatus = activeConnection ? connectionStatus[activeConnection.id] : null;
  const activeSummary = activeConnection?.lastAuthSummary;
  const activeProviderNeedsRecovery = activeSummary?.status !== 'Active'
    || (!!activeSummary?.maxConnections && (activeSummary.activeConnections ?? 0) >= activeSummary.maxConnections)
    || activeConnectionStatus?.state === 'error';

  const activeRecoveryMessage = activeConnectionStatus?.state === 'error'
    ? activeConnectionStatus.message || 'This provider is failing validation right now.'
    : activeSummary?.status !== 'Active'
      ? `Provider status is ${activeSummary?.status || 'not active'}. Renew or switch before relying on saved playback.`
      : !!activeSummary?.maxConnections && (activeSummary.activeConnections ?? 0) >= activeSummary.maxConnections
        ? `All ${activeSummary.maxConnections} lines are in use on ${activeConnection?.name}. Use an alternate provider copy if one exists.`
        : null;

  const launchVariant = (variant: ProviderVariant) => {
    setActiveConnection(variant.providerId);

    const stream = {
      name: variant.title,
      stream_type: variant.kind,
      stream_id: variant.kind === 'series' ? undefined : variant.streamId,
      series_id: variant.kind === 'series' ? variant.seriesId ?? variant.streamId : undefined,
      category_id: variant.categoryId || 'alternate',
      stream_icon: variant.artwork,
      cover: variant.artwork,
    } as XtreamStream;

    if (variant.kind === 'series') return;
    if (!variant.playbackUrl) return;
    playStream(stream, variant.playbackUrl, variant.providerId);
  };

  const renderProviderVariants = (variants: ProviderVariant[]) => {
    if (variants.length === 0) return null;
    return (
      <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="uppercase tracking-[0.2em] text-emerald-200">Also available elsewhere</p>
            <p className="mt-1 text-[11px] leading-5 text-emerald-100/80">Use a healthier provider copy instead of dead-ending on an expired or maxed account.</p>
          </div>
          {activeProviderNeedsRecovery ? (
            <span className="rounded-full border border-amber-300/30 bg-amber-500/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-100">
              Recovery mode
            </span>
          ) : null}
        </div>
        <div className="mt-3 space-y-2">
          {variants.map((variant) => (
            <div key={`${variant.providerId}-${variant.streamId}-${variant.kind}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200">{variant.providerName}</p>
                <p className="mt-1 text-sm text-white">{variant.kind === 'live' ? 'Live copy ready' : variant.kind === 'movie' ? 'Movie copy ready' : 'Series copy ready'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {variant.kind === 'series' ? (
                  <Link
                    href={`/series?seriesId=${variant.seriesId ?? variant.streamId}`}
                    onClick={() => setActiveConnection(variant.providerId)}
                    className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                  >
                    Open on {variant.providerName}
                  </Link>
                ) : (
                  <button
                    onClick={() => launchVariant(variant)}
                    className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                  >
                    Play on {variant.providerName}
                  </button>
                )}
                <button
                  onClick={() => setActiveConnection(variant.providerId)}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:bg-white/10"
                >
                  Switch only
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
        {activeRecoveryMessage ? (
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Saved-library recovery</p>
                <p className="mt-2 leading-6">{activeRecoveryMessage}</p>
              </div>
              <button
                onClick={() => void validateConnection(activeConnection.id)}
                className="rounded-full border border-amber-300/30 bg-black/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-amber-50 hover:bg-black/30"
              >
                Recheck provider
              </button>
            </div>
          </div>
        ) : null}
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
                  {renderProviderVariants(variantSummary[`favorite:${contentId}`] || [])}
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
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">{formatEpisodeLabel(item)}</p>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{Math.round(item.progress * 100)}%</span>
                </div>
                {item.kind === 'series' && item.seriesTitle ? (
                  <p className="mt-2 text-sm text-slate-400">{item.seriesTitle}</p>
                ) : null}
                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.max(8, item.progress * 100)}%` }} />
                </div>
                <p className="mt-3 text-sm text-slate-400">{formatResume(item.positionSeconds)}{item.durationSeconds ? ` • ${Math.round(item.progress * 100)}% of ${Math.floor(item.durationSeconds / 60)} min` : ''}</p>
                {activeProviderNeedsRecovery ? (
                  <p className="mt-2 text-xs leading-5 text-amber-200">If this resume item stalls on the active provider, use an alternate provider copy below instead of losing the spot.</p>
                ) : null}
                <p className="mt-1 text-sm text-slate-500">Last touched {new Date(item.updatedAt).toLocaleString()}</p>
                {(() => {
                  const variants = variantSummary[`continue:${item.id}`] || [];
                  if (variants.length === 0) return null;
                  return (
                    <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="uppercase tracking-[0.2em] text-emerald-200">Also available elsewhere</p>
                          <p className="mt-1 text-[11px] leading-5 text-emerald-100/80">Recover this resume item on a healthier provider copy without losing your spot.</p>
                        </div>
                        {activeProviderNeedsRecovery ? (
                          <span className="rounded-full border border-amber-300/30 bg-amber-500/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-100">
                            Recovery mode
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 space-y-2">
                        {variants.map((variant) => {
                          const seriesHref = item.kind === 'series'
                            ? `/series?seriesId=${variant.seriesId ?? variant.streamId}${item.seasonNumber ? `&season=${item.seasonNumber}` : ''}${item.episodeNumber ? `&episode=${item.episodeNumber}` : ''}`
                            : null;

                          return (
                            <div key={`${variant.providerId}-${variant.streamId}-${variant.kind}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200">{variant.providerName}</p>
                                <p className="mt-1 text-sm text-white">
                                  {variant.kind === 'series' && item.seasonNumber && item.episodeNumber
                                    ? `Resume from S${item.seasonNumber}E${item.episodeNumber}`
                                    : variant.kind === 'live'
                                      ? 'Live copy ready'
                                      : variant.kind === 'movie'
                                        ? 'Movie copy ready'
                                        : 'Series copy ready'}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {variant.kind === 'series' && seriesHref ? (
                                  <Link
                                    href={seriesHref}
                                    onClick={() => setActiveConnection(variant.providerId)}
                                    className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                                  >
                                    Resume on {variant.providerName}
                                  </Link>
                                ) : variant.kind === 'series' ? (
                                  <Link
                                    href={`/series?seriesId=${variant.seriesId ?? variant.streamId}`}
                                    onClick={() => setActiveConnection(variant.providerId)}
                                    className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                                  >
                                    Open on {variant.providerName}
                                  </Link>
                                ) : (
                                  <button
                                    onClick={() => launchVariant(variant)}
                                    className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                                  >
                                    Play on {variant.providerName}
                                  </button>
                                )}
                                <button
                                  onClick={() => setActiveConnection(variant.providerId)}
                                  className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:bg-white/10"
                                >
                                  Switch only
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => {
                      if (!item.playbackUrl) return;
                      playStream({
                        name: item.title,
                        stream_type: item.kind === 'live' ? 'live' : item.kind,
                        stream_id: item.streamId,
                        category_id: item.categoryId || 'resume',
                        stream_icon: item.artwork,
                      }, item.playbackUrl, activeConnection.id, {
                        seriesId: item.seriesId,
                        seriesTitle: item.seriesTitle,
                        seasonNumber: item.seasonNumber,
                        episodeNumber: item.episodeNumber,
                      });
                    }}
                    disabled={!item.playbackUrl}
                    className="rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
                  >
                    Resume playback
                  </button>
                  {item.kind === 'series' && item.seriesId ? (
                    <Link
                      href={`/series?seriesId=${item.seriesId}${item.seasonNumber ? `&season=${item.seasonNumber}` : ''}${item.episodeNumber ? `&episode=${item.episodeNumber}` : ''}`}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-slate-200 hover:bg-white/5"
                    >
                      Open series
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
