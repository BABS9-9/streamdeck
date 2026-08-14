'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { buildMergedFavoriteGroups, buildMergedHistoryGroups, buildProviderNameMap } from '@/lib/merged-library';
import { fetchMockProviderHealth, getSelectedMockProviderScenario, setSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { buildProviderVariantsIndex, buildSeriesRecoveryKey, getAlternateProviderVariants, getLiveCategoryRecovery, getProviderTrustDisplay, normalizeRecoveryKey, ProviderVariant } from '@/lib/provider-recovery';
import { buildSavedLibraryRouteContract } from '@/lib/saved-library-route-contracts';
import { buildSavedLibraryRuntimeContract } from '@/lib/saved-library-runtime';
import { buildLiveStreamUrl, buildVodStreamUrl, getArtwork, getContentId, resolveSeriesEpisodePlayback } from '@/lib/xtream-api';
import { FavoriteEntry, MockProviderHealth, MockProviderScenario, WatchHistoryItem, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';
import { ProviderFactGrid } from './provider-fact-grid';
import { ProviderRecoveryRail } from './provider-recovery-rail';
import { ProviderTrustBadge } from './provider-trust-badge';

const normalizeLibraryKey = normalizeRecoveryKey;

type CategoryFallback = {
  providerId: string;
  providerName: string;
  title: string;
  streamId: number;
  categoryId?: string;
  categoryName: string;
  artwork?: string;
  playbackUrl: string;
  warning?: string | null;
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
  const getFavoriteEntriesForProvider = useFavoritesStore((state) => state.getFavoriteEntriesForProvider);
  const getCatalogSnapshot = useLibraryStore((state) => state.getCatalogSnapshot);
  const markCatalogFromCache = useLibraryStore((state) => state.markCatalogFromCache);
  const refreshProviderCatalog = useLibraryStore((state) => state.refreshProviderCatalog);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const playStream = usePlayerStore((state) => state.playStream);

  const [catalog, setCatalog] = useState<Record<number, XtreamStream>>({});
  const [loading, setLoading] = useState(false);
  const [cacheState, setCacheState] = useState<'idle' | 'cached' | 'fresh'>('idle');
  const [providerVariants, setProviderVariants] = useState<Record<string, ProviderVariant[]>>({});
  const [seriesRecoveryKey, setSeriesRecoveryKey] = useState<string | null>(null);
  const [mockHealth, setMockHealth] = useState<MockProviderHealth | null>(null);
  const [scenario, setScenario] = useState<MockProviderScenario>(() => getSelectedMockProviderScenario());

  useEffect(() => subscribeToMockProviderScenario(setScenario), []);

  useEffect(() => {
    setProviderVariants(buildProviderVariantsIndex({
      connections,
      connectionStatus,
    }));
  }, [connectionStatus, connections]);

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
    let cancelled = false;
    if (!activeConnection || mode !== 'favorites') return;

    const cached = getCatalogSnapshot(activeConnection.id, Number.MAX_SAFE_INTEGER);
    if (cached) {
      markCatalogFromCache(activeConnection.id);
      const mergedCached = [...cached.live, ...cached.vod, ...cached.series];
      setCatalog(Object.fromEntries(mergedCached.map((item) => [getContentId(item), item])));
      setCacheState('cached');
    } else {
      setCatalog({});
      setCacheState('idle');
    }

    setLoading(true);
    refreshProviderCatalog(activeConnection)
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
  }, [activeConnection, getCatalogSnapshot, markCatalogFromCache, mode, refreshProviderCatalog]);

  const favoriteEntries = useMemo(
    () => (activeConnection ? getFavoriteEntriesForProvider(activeConnection.id) : []),
    [activeConnection, getFavoriteEntriesForProvider]
  );
  const favoriteEntriesByProvider = useMemo(
    () => Object.fromEntries(connections.map((connection) => [connection.id, getFavoriteEntriesForProvider(connection.id)])),
    [connections, getFavoriteEntriesForProvider]
  );
  const providerNameMap = useMemo(() => buildProviderNameMap(connections), [connections]);

  const favoriteItems = useMemo(
    () => favoriteEntries.map((entry) => {
      const cachedItem = catalog[entry.streamId];
      if (cachedItem) return { entry, item: cachedItem };

      const fallbackItem: XtreamStream = {
        name: entry.title || 'Saved favorite',
        stream_type: entry.kind,
        stream_id: entry.kind === 'series' ? undefined : entry.streamId,
        series_id: entry.kind === 'series' ? entry.seriesId ?? entry.streamId : undefined,
        category_id: entry.categoryId || 'saved',
        channel_group: entry.categoryName,
        stream_icon: entry.artwork,
        cover: entry.artwork,
        plot: entry.plot,
        genre: entry.genre,
        year: entry.year,
      };

      return { entry, item: fallbackItem };
    }),
    [catalog, favoriteEntries]
  );

  const continueItems = useMemo(
    () => (activeConnection ? watchHistory.filter((item) => item.providerId === activeConnection.id) : []),
    [activeConnection, watchHistory]
  );
  const mergedFavoriteGroups = useMemo(
    () => buildMergedFavoriteGroups({
      favoriteEntriesByProvider,
      activeConnectionId: activeConnection?.id,
    }),
    [activeConnection?.id, favoriteEntriesByProvider]
  );
  const mergedContinueGroups = useMemo(
    () => buildMergedHistoryGroups({
      watchHistory,
      activeConnectionId: activeConnection?.id,
    }),
    [activeConnection?.id, watchHistory]
  );
  const runtimeContract = useMemo(() => buildSavedLibraryRuntimeContract({
    mode,
    connections,
    activeConnectionId: activeConnection?.id,
    connectionStatus,
    favoriteEntriesByProvider,
    watchHistory,
    providerVariants,
  }), [activeConnection?.id, connectionStatus, connections, favoriteEntriesByProvider, mode, providerVariants, watchHistory]);
  const routeContract = useMemo(() => buildSavedLibraryRouteContract({
    mode,
    runtimeContract,
    groups: mode === 'favorites' ? mergedFavoriteGroups : mergedContinueGroups,
    providerNameMap,
    connectionStatus,
    activeConnectionId: activeConnection?.id,
    freshnessInput: {
      source: mode === 'favorites'
        ? cacheState === 'fresh'
          ? 'provider-network'
          : 'provider-cache'
        : 'resume-history',
      updatedAt: mode === 'favorites'
        ? activeConnection
          ? connectionStatus[activeConnection.id]?.checkedAt ?? mergedFavoriteGroups[0]?.updatedAt ?? null
          : mergedFavoriteGroups[0]?.updatedAt ?? null
        : mergedContinueGroups[0]?.updatedAt ?? null,
    },
  }), [
    activeConnection,
    cacheState,
    connectionStatus,
    mergedContinueGroups,
    mergedFavoriteGroups,
    mode,
    providerNameMap,
    runtimeContract,
  ]);

  const seriesResumeLookup = useMemo(() => {
    return Object.fromEntries(
      watchHistory
        .filter((item) => item.kind === 'series' && item.seriesTitle && item.seasonNumber && item.episodeNumber)
        .map((item) => [normalizeLibraryKey(item.seriesTitle || item.title), item])
    );
  }, [watchHistory]);

  const variantSummary = useMemo(() => {
    const summary: Record<string, ProviderVariant[]> = {};
    favoriteItems.forEach(({ item, entry }) => {
      summary[`favorite:${entry.streamId}`] = getAlternateProviderVariants({
        providerVariants,
        activeConnectionId: activeConnection?.id,
        title: item.name || entry.title,
        kind: entry.kind,
        year: item.year || entry.year,
      });
    });

    continueItems.forEach((item) => {
      summary[`continue:${item.id}`] = getAlternateProviderVariants({
        providerVariants,
        activeConnectionId: activeConnection?.id,
        title: item.title,
        kind: item.kind,
        year: item.year,
        seriesTitle: item.seriesTitle,
      });
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

  const surfaceRecoveryPlan = mode === 'favorites' ? mockHealth?.surfaceRecoveryPlans?.favorites : mockHealth?.surfaceRecoveryPlans?.continue;
  const healthiestSavedVariant = Object.values(variantSummary).flat()[0] ?? null;

  const applyScenario = (nextScenario: MockProviderScenario) => {
    if (nextScenario === scenario) return;
    setSelectedMockProviderScenario(nextScenario);
  };

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

  const getLiveCategoryFallback = (categorySeed?: string, variants: ProviderVariant[] = []) => {
    if (!activeConnection || !categorySeed) return null as CategoryFallback | null;
    return getLiveCategoryRecovery({
      activeConnectionId: activeConnection.id,
      connections,
      connectionStatus,
      exactVariants: variants,
      categoryName: categorySeed,
    });
  };

  const launchSeriesVariant = async (variant: ProviderVariant, item: { title: string; seasonNumber?: number; episodeNumber?: number }) => {
    const provider = connections.find((connection) => connection.id === variant.providerId);
    if (!provider) return;

    const recoveryKey = buildSeriesRecoveryKey(variant, item.seasonNumber, item.episodeNumber);
    setSeriesRecoveryKey(recoveryKey);

    try {
      const resolved = await resolveSeriesEpisodePlayback(provider, variant.seriesId ?? variant.streamId, item.seasonNumber, item.episodeNumber);
      setActiveConnection(variant.providerId);
      if (!resolved) return;

      playStream({
        stream_id: resolved.episode.id,
        name: resolved.episode.title,
        stream_type: 'series',
        category_id: variant.categoryId || 'alternate',
        stream_icon: resolved.episode.info?.movie_image || variant.artwork,
        cover: resolved.episode.info?.movie_image || variant.artwork,
        plot: resolved.episode.plot || resolved.episode.info?.plot,
        direct_source: resolved.episode.direct_source,
        container_extension: resolved.episode.info?.container_extension,
      }, resolved.playbackUrl, variant.providerId, {
        seriesId: Number(variant.seriesId ?? variant.streamId),
        seriesTitle: item.title,
        seasonNumber: resolved.resolvedSeasonNumber,
        episodeNumber: resolved.episode.episode_num,
      });
    } finally {
      setSeriesRecoveryKey((current) => (current === recoveryKey ? null : current));
    }
  };

  const renderProviderIdentity = (
    entries: Array<Pick<FavoriteEntry, 'providerId'> | Pick<WatchHistoryItem, 'providerId'>>,
    activeProviderId?: string | null
  ) => (
    <div className="mt-3 flex flex-wrap gap-2">
      {entries.map((entry) => {
        const isActiveProvider = entry.providerId === activeProviderId;
        return (
          <span
            key={`${entry.providerId}-${isActiveProvider ? 'active' : 'saved'}`}
            className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
              isActiveProvider
                ? 'border-violet-300/30 bg-violet-500/15 text-violet-100'
                : 'border-white/10 bg-black/20 text-slate-300'
            }`}
          >
            {providerNameMap[entry.providerId] || entry.providerId}
            {isActiveProvider ? ' · active' : ''}
          </span>
        );
      })}
    </div>
  );

  const playFavoriteCopy = (entry: FavoriteEntry) => {
    const provider = connections.find((connection) => connection.id === entry.providerId);
    if (!provider) return;

    const stream: XtreamStream = {
      name: entry.title || 'Saved favorite',
      stream_type: entry.kind,
      stream_id: entry.kind === 'series' ? undefined : entry.streamId,
      series_id: entry.kind === 'series' ? entry.seriesId ?? entry.streamId : undefined,
      category_id: entry.categoryId || 'saved',
      channel_group: entry.categoryName,
      stream_icon: entry.artwork,
      cover: entry.artwork,
      plot: entry.plot,
      genre: entry.genre,
      year: entry.year,
    };

    setActiveConnection(entry.providerId, {
      sourceSurface: 'favorites',
      reason: entry.providerId === activeConnection?.id ? 'manual' : 'variant',
      preservedTitle: entry.title,
    });

    if (entry.kind === 'series') return;
    const playbackUrl = entry.kind === 'live' ? buildLiveStreamUrl(provider, stream) : buildVodStreamUrl(provider, stream);
    playStream(stream, playbackUrl, entry.providerId);
  };

  const resumeHistoryCopy = (item: WatchHistoryItem) => {
    if (!item.playbackUrl) return;

    setActiveConnection(item.providerId, {
      sourceSurface: 'collections',
      reason: item.providerId === activeConnection?.id ? 'manual' : 'variant',
      preservedTitle: item.seriesTitle || item.title,
    });

    playStream({
      name: item.title,
      stream_type: item.kind === 'live' ? 'live' : item.kind,
      stream_id: item.streamId,
      category_id: item.categoryId || 'resume',
      stream_icon: item.artwork,
    }, item.playbackUrl, item.providerId, {
      seriesId: item.seriesId,
      seriesTitle: item.seriesTitle,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber,
    });
  };

  const renderProviderVariants = (
    variants: ProviderVariant[],
    options?: { seriesTitle?: string; seasonNumber?: number; episodeNumber?: number; categoryName?: string; fallbackArtwork?: string; fallbackCategoryId?: string }
  ) => {
    const categoryFallback = getLiveCategoryFallback(options?.categoryName, variants);
    if (variants.length === 0 && !categoryFallback) return null;
    return (
      <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="uppercase tracking-[0.2em] text-emerald-200">Also available elsewhere</p>
            <p className="mt-1 text-[11px] leading-5 text-emerald-100/80">Use a healthier provider copy instead of dead-ending on an expired or maxed account, and fall back to the same live category when an exact duplicate is missing.</p>
          </div>
          {activeProviderNeedsRecovery ? (
            <span className="rounded-full border border-amber-300/30 bg-amber-500/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-100">
              Recovery mode
            </span>
          ) : null}
        </div>
        <div className="mt-3 space-y-2">
          {variants.map((variant) => {
            const trust = getProviderTrustDisplay(variant.trustScore, variant.warning);
            return (
            <div key={`${variant.providerId}-${variant.streamId}-${variant.kind}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <div className="min-w-[15rem] flex-1">
                <ProviderTrustBadge
                  eyebrow={variant.providerName}
                  label={variant.kind === 'live' ? 'Live copy ready' : variant.kind === 'movie' ? 'Movie copy ready' : 'Series copy ready'}
                  detail={`${trust.label} · ${trust.detail}`}
                  tone={trust.tone}
                  compact
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {variant.kind === 'series' ? (() => {
                  const seriesTitle = options?.seriesTitle;
                  const seasonNumber = options?.seasonNumber;
                  const episodeNumber = options?.episodeNumber;
                  if (seriesTitle && seasonNumber && episodeNumber) {
                    return (
                      <>
                        <button
                          onClick={() => void launchSeriesVariant(variant, {
                            title: seriesTitle,
                            seasonNumber,
                            episodeNumber,
                          })}
                          disabled={seriesRecoveryKey === buildSeriesRecoveryKey(variant, seasonNumber, episodeNumber)}
                          className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {seriesRecoveryKey === buildSeriesRecoveryKey(variant, seasonNumber, episodeNumber) ? 'Starting…' : `Resume on ${variant.providerName}`}
                        </button>
                        <Link
                          href={`/series?seriesId=${variant.seriesId ?? variant.streamId}&season=${seasonNumber}&episode=${episodeNumber}`}
                          onClick={() => setActiveConnection(variant.providerId)}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:bg-white/10"
                        >
                          Open series
                        </Link>
                      </>
                    );
                  }
                  return (
                    <Link
                      href={`/series?seriesId=${variant.seriesId ?? variant.streamId}`}
                      onClick={() => setActiveConnection(variant.providerId)}
                      className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                    >
                      Open on {variant.providerName}
                    </Link>
                  );
                })() : (
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
          );})}
          {categoryFallback ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-300/20 bg-sky-500/10 px-3 py-3 text-sky-50">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-sky-200">Same-category live rescue</p>
                <p className="mt-1 text-sm text-white">{categoryFallback.providerName} · {categoryFallback.categoryName}</p>
                <p className="mt-1 text-[11px] text-sky-100/80">Open the same surf lane when the exact saved live item does not exist on the healthier provider.</p>
                {categoryFallback.warning ? <p className="mt-1 text-[11px] text-sky-100/70">{categoryFallback.warning}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setActiveConnection(categoryFallback.providerId);
                    playStream({
                      name: categoryFallback.title,
                      stream_type: 'live',
                      stream_id: categoryFallback.streamId,
                      category_id: categoryFallback.categoryId || options?.fallbackCategoryId || 'alternate',
                      stream_icon: categoryFallback.artwork || options?.fallbackArtwork,
                      preview_art: categoryFallback.artwork || options?.fallbackArtwork,
                    } as XtreamStream, categoryFallback.playbackUrl, categoryFallback.providerId);
                  }}
                  className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                >
                  Open same category
                </button>
                <button
                  onClick={() => setActiveConnection(categoryFallback.providerId)}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:bg-white/10"
                >
                  Switch only
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  if (!activeConnection) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No active provider. Connect first.</div>;
  }

  const title = mode === 'favorites' ? 'Favorites' : 'Continue watching';
  const subtitle = runtimeContract.subtitle;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-violet-300">{mode === 'favorites' ? 'Saved collection' : 'Unified resume rail'}</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">{runtimeContract.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{subtitle}</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{runtimeContract.summary}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 uppercase tracking-[0.18em]">{runtimeContract.mergedTitleCount} merged titles</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 uppercase tracking-[0.18em]">{runtimeContract.providerCopyCount} provider copies</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 uppercase tracking-[0.18em]">{runtimeContract.duplicateGroupCount} multi-provider matches</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {routeContract.overviewCards.map((card) => (
            <div
              key={card.id}
              className={`rounded-[1.3rem] border p-4 ${
                card.tone === 'recover'
                  ? 'border-amber-300/20 bg-amber-500/10'
                  : card.tone === 'watch'
                    ? 'border-sky-300/20 bg-sky-500/10'
                    : 'border-white/10 bg-black/20'
              }`}
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">{card.label}</p>
              <p className="mt-2 text-sm font-medium text-white">{card.value}</p>
              <p className="mt-2 text-xs leading-5 text-slate-300">{card.detail}</p>
            </div>
          ))}
        </div>
        {runtimeContract.activeProviderMessage ? (
          <div className="mt-4 rounded-[1.4rem] border border-amber-400/20 bg-amber-500/10 p-4">
            <ProviderRecoveryRail
              eyebrow="Saved-library recovery"
              title={runtimeContract.activeProviderMessage}
              detail={mode === 'favorites' ? 'Favorites should stay actionable even when the active provider expires, saturates, or fails validation.' : 'Continue Watching should preserve resume momentum before the user gets dumped out of the flow they were already in.'}
              tone="amber"
              actions={[
                {
                  label: 'Recheck provider',
                  onClick: () => void validateConnection(activeConnection.id),
                  tone: 'secondary',
                },
              ]}
            />
            <ProviderFactGrid summary={activeSummary} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" />
          </div>
        ) : activeSummary ? (
          <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Saved-library provider posture</p>
            <ProviderFactGrid summary={activeSummary} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" />
          </div>
        ) : null}
        {mockHealth && surfaceRecoveryPlan && healthiestSavedVariant ? (
          <div className="mt-4 space-y-3">
            <ProviderRecoveryRail
              eyebrow={surfaceRecoveryPlan.title}
              title={surfaceRecoveryPlan.detail}
              detail={mode === 'favorites' ? 'Saved-provider variants should stay one tap away from Favorites, not hide behind provider switching.' : 'Resume-safe fallback should stay explicit while rehearsal modes flip across the shell.'}
              tone="sky"
              actions={[
                {
                  label: surfaceRecoveryPlan.cta,
                  meta: healthiestSavedVariant.providerName,
                  onClick: () => {
                    setActiveConnection(healthiestSavedVariant.providerId);
                  },
                },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              {(Object.keys(mockHealth.healthScenarios) as MockProviderScenario[]).map((key) => (
                <button
                  key={key}
                  onClick={() => applyScenario(key)}
                  className={`rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${scenario === key ? 'bg-sky-400/30 text-white' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
                >
                  {mockHealth.healthScenarios[key].label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {mode === 'favorites' ? (
        <section>
          {loading ? <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-slate-400">Refreshing saved items from provider catalog…</div> : null}
          {cacheState === 'cached' ? <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">Loaded favorites from cached provider catalog first, then refreshed in the background.</div> : null}
          {!loading && mergedFavoriteGroups.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">Save channels or titles from Live, Movies, or Series and they will show up here as one merged rail across all saved providers.</div> : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mergedFavoriteGroups.map((group) => {
              const itemRuntime = runtimeContract.itemsByKey[group.key];
              const routeItem = routeContract.itemsByKey[group.key];
              const entry = group.activeEntry ?? group.primaryEntry;
              const activeCatalogItem = entry.providerId === activeConnection.id
                ? favoriteItems.find((item) => item.entry.providerId === entry.providerId && item.entry.streamId === entry.streamId)?.item
                : null;
              const item = activeCatalogItem || {
                name: entry.title || 'Saved favorite',
                stream_type: entry.kind,
                stream_id: entry.kind === 'series' ? undefined : entry.streamId,
                series_id: entry.kind === 'series' ? entry.seriesId ?? entry.streamId : undefined,
                category_id: entry.categoryId || 'saved',
                channel_group: entry.categoryName,
                stream_icon: entry.artwork,
                cover: entry.artwork,
                plot: entry.plot,
                genre: entry.genre,
                year: entry.year,
              } as XtreamStream;
              const contentId = entry.streamId;
              const seriesResume = item.stream_type === 'series' ? seriesResumeLookup[normalizeLibraryKey(item.name)] : null;
              return (
                <article key={group.key} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                  <div className="aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${getArtwork(item)})` }} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{item.name}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">{item.stream_type}</p>
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {itemRuntime?.duplicateProviderCount > 1 ? `${itemRuntime.duplicateProviderCount} copies` : contentId}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-slate-400">{item.plot || item.genre || 'Saved from your StreamDeck library.'}</p>
                  {renderProviderIdentity(group.providerEntries, activeConnection.id)}
                  <p className="mt-3 text-xs leading-5 text-slate-300">{itemRuntime?.continuitySummary}</p>
                  {routeItem ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{routeItem.routeLabel}</p>
                      <p className="mt-2 text-xs leading-5 text-sky-100">{routeItem.ownerRanking[0]?.summary}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-300">{routeItem.duplicateCollapse.summary}</p>
                      <p className="mt-2 text-xs leading-5 text-emerald-100/90">{routeItem.resumeProgress.summary}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-400">{routeItem.freshness.summary} {routeItem.freshness.detail}</p>
                      <p className="mt-2 text-xs leading-5 text-amber-100/90">{routeItem.recoveryPacket.summary}</p>
                    </div>
                  ) : null}
                  {itemRuntime?.launchOwner ? (
                    <p className="mt-3 text-xs leading-5 text-sky-200">
                      {itemRuntime.launchOwner.summary}
                    </p>
                  ) : null}
                  {itemRuntime?.resume.hasResume ? (
                    <p className="mt-3 text-xs leading-5 text-emerald-200">{itemRuntime.resume.summary}</p>
                  ) : null}
                  {itemRuntime?.switchPosture.reason !== 'none' ? <p className="mt-3 text-xs leading-5 text-amber-100/90">{itemRuntime.switchPosture.summary}</p> : null}
                  {itemRuntime?.recovery.alternateProviderCount || itemRuntime?.recovery.sameCategoryFallback ? <p className="mt-3 text-xs leading-5 text-emerald-100/90">{itemRuntime.recovery.summary}</p> : null}
                  {renderProviderVariants(variantSummary[`favorite:${entry.streamId}`] || [], item.stream_type === 'series' && seriesResume
                    ? {
                        seriesTitle: item.name,
                        seasonNumber: seriesResume.seasonNumber,
                        episodeNumber: seriesResume.episodeNumber,
                      }
                    : item.stream_type === 'live'
                      ? {
                          categoryName: item.channel_group,
                          fallbackArtwork: getArtwork(item),
                          fallbackCategoryId: item.category_id,
                        }
                      : undefined)}
                  {item.stream_type !== 'series' ? (
                    <button
                      onClick={() => playFavoriteCopy(entry)}
                      className="mt-4 w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
                    >
                      {itemRuntime?.primaryAction.label || (entry.providerId === activeConnection.id ? 'Play from favorites' : `Play on ${providerNameMap[entry.providerId] || entry.providerId}`)}
                    </button>
                  ) : seriesResume ? (
                    <button
                      onClick={() => void launchSeriesVariant({
                        providerId: entry.providerId,
                        providerName: providerNameMap[entry.providerId] || entry.providerId,
                        title: item.name,
                        streamId: contentId,
                        kind: 'series',
                        artwork: getArtwork(item),
                        categoryId: item.category_id || entry.categoryId,
                        seriesId: item.series_id ?? entry.seriesId ?? contentId,
                        trustScore: 0,
                      }, {
                        title: item.name,
                        seasonNumber: seriesResume.seasonNumber,
                        episodeNumber: seriesResume.episodeNumber,
                      })}
                      disabled={seriesRecoveryKey === `${entry.providerId}-${item.series_id ?? contentId}-${seriesResume.seasonNumber || 0}-${seriesResume.episodeNumber || 0}`}
                      className="mt-4 w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {seriesRecoveryKey === `${entry.providerId}-${item.series_id ?? contentId}-${seriesResume.seasonNumber || 0}-${seriesResume.episodeNumber || 0}` ? 'Starting episode…' : itemRuntime?.primaryAction.label || `Resume S${seriesResume.seasonNumber}E${seriesResume.episodeNumber}`}
                    </button>
                  ) : (
                    <Link
                      href={`/series?seriesId=${group.primaryEntry.seriesId ?? contentId}`}
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
          {mergedContinueGroups.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">Start any live stream, movie, or series item and it will land here with merged provider-aware resume context.</div> : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mergedContinueGroups.map((group) => {
              const itemRuntime = runtimeContract.itemsByKey[group.key];
              const routeItem = routeContract.itemsByKey[group.key];
              const item = group.activeEntry ?? group.primaryEntry;
              return (
              <article key={group.key} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                <div className="aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${item.artwork})` }} />
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">{formatEpisodeLabel(item)}</p>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                    {itemRuntime?.duplicateProviderCount > 1 ? `${itemRuntime.duplicateProviderCount} copies` : `${Math.round(item.progress * 100)}%`}
                  </span>
                </div>
                {item.kind === 'series' && item.seriesTitle ? (
                  <p className="mt-2 text-sm text-slate-400">{item.seriesTitle}</p>
                ) : null}
                {renderProviderIdentity(group.providerEntries, activeConnection.id)}
                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.max(8, group.bestProgress * 100)}%` }} />
                </div>
                <p className="mt-3 text-sm text-slate-400">{formatResume(item.positionSeconds)}{item.durationSeconds ? ` • ${Math.round(item.progress * 100)}% of ${Math.floor(item.durationSeconds / 60)} min` : ''}</p>
                <p className="mt-2 text-xs leading-5 text-slate-300">{itemRuntime?.continuitySummary}</p>
                {routeItem ? (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{routeItem.routeLabel}</p>
                    <p className="mt-2 text-xs leading-5 text-sky-100">{routeItem.ownerRanking[0]?.summary}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-300">{routeItem.duplicateCollapse.summary}</p>
                    <p className="mt-2 text-xs leading-5 text-emerald-100/90">
                      {routeItem.resumeProgress.summary}
                      {routeItem.resumeProgress.positionLabel ? ` Resume point ${routeItem.resumeProgress.positionLabel}.` : ''}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{routeItem.freshness.summary} {routeItem.freshness.detail}</p>
                    <p className="mt-2 text-xs leading-5 text-amber-100/90">{routeItem.recoveryPacket.summary}</p>
                  </div>
                ) : null}
                {itemRuntime?.launchOwner ? <p className="mt-2 text-xs leading-5 text-sky-200">{itemRuntime.launchOwner.summary}</p> : null}
                {itemRuntime?.recovery.alternateProviderCount || itemRuntime?.recovery.sameCategoryFallback ? <p className="mt-2 text-xs leading-5 text-amber-200">{itemRuntime.recovery.summary}</p> : null}
                {itemRuntime?.switchPosture.reason !== 'none' ? <p className="mt-2 text-xs leading-5 text-amber-100/90">{itemRuntime.switchPosture.summary}</p> : null}
                <p className="mt-1 text-sm text-slate-500">Last touched {new Date(item.updatedAt).toLocaleString()}</p>
                {(() => {
                  const variants = variantSummary[`continue:${item.id}`] || [];
                  const categoryFallback = item.kind === 'live' ? getLiveCategoryFallback(item.categoryName, variants) : null;
                  if (variants.length === 0 && !categoryFallback) return null;
                  return (
                    <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="uppercase tracking-[0.2em] text-emerald-200">Also available elsewhere</p>
                          <p className="mt-1 text-[11px] leading-5 text-emerald-100/80">Recover this resume item on a healthier provider copy without losing your spot, and keep the same live category available if no exact duplicate survives.</p>
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
                          const trust = getProviderTrustDisplay(variant.trustScore, variant.warning);

                          return (
                            <div key={`${variant.providerId}-${variant.streamId}-${variant.kind}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                              <div className="min-w-[15rem] flex-1">
                                <ProviderTrustBadge
                                  eyebrow={variant.providerName}
                                  label={variant.kind === 'series' && item.seasonNumber && item.episodeNumber
                                    ? `Resume from S${item.seasonNumber}E${item.episodeNumber}`
                                    : variant.kind === 'live'
                                      ? 'Live copy ready'
                                      : variant.kind === 'movie'
                                        ? 'Movie copy ready'
                                        : 'Series copy ready'}
                                  detail={`${trust.label} · ${trust.detail}`}
                                  tone={trust.tone}
                                  compact
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {variant.kind === 'series' && seriesHref ? (
                                  <>
                                    <button
                                      onClick={() => void launchSeriesVariant(variant, item)}
                                      disabled={seriesRecoveryKey === `${variant.providerId}-${variant.seriesId ?? variant.streamId}-${item.seasonNumber || 0}-${item.episodeNumber || 0}`}
                                      className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {seriesRecoveryKey === `${variant.providerId}-${variant.seriesId ?? variant.streamId}-${item.seasonNumber || 0}-${item.episodeNumber || 0}` ? 'Starting…' : `Resume on ${variant.providerName}`}
                                    </button>
                                    <Link
                                      href={seriesHref}
                                      onClick={() => setActiveConnection(variant.providerId)}
                                      className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:bg-white/10"
                                    >
                                      Open series
                                    </Link>
                                  </>
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
                        {categoryFallback ? (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-300/20 bg-sky-500/10 px-3 py-3 text-sky-50">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-sky-200">Same-category live rescue</p>
                              <p className="mt-1 text-sm text-white">{categoryFallback.providerName} · {categoryFallback.categoryName}</p>
                              <p className="mt-1 text-[11px] text-sky-100/80">Keep the same surf lane alive when the exact live resume item is unavailable on the healthier provider.</p>
                              {categoryFallback.warning ? <p className="mt-1 text-[11px] text-sky-100/70">{categoryFallback.warning}</p> : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  setActiveConnection(categoryFallback.providerId);
                                  playStream({
                                    name: categoryFallback.title,
                                    stream_type: 'live',
                                    stream_id: categoryFallback.streamId,
                                    category_id: categoryFallback.categoryId || item.categoryId || 'alternate',
                                    stream_icon: categoryFallback.artwork || item.artwork,
                                    preview_art: categoryFallback.artwork || item.artwork,
                                  } as XtreamStream, categoryFallback.playbackUrl, categoryFallback.providerId);
                                }}
                                className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                              >
                                Open same category
                              </button>
                              <button
                                onClick={() => setActiveConnection(categoryFallback.providerId)}
                                className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:bg-white/10"
                              >
                                Switch only
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })()}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => resumeHistoryCopy(item)}
                    disabled={!item.playbackUrl}
                    className="rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
                  >
                    {itemRuntime?.primaryAction.label || (item.providerId === activeConnection.id ? 'Resume playback' : `Resume on ${providerNameMap[item.providerId] || item.providerId}`)}
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
            );})}
          </div>
        </section>
      )}
    </div>
  );
}
