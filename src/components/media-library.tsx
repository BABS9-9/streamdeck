'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildMediaDetailRuntimeContract, MediaDetailContractTone, MediaDetailRuntimeContract } from '@/lib/media-detail-runtime';
import { buildProviderVariantsIndex, buildSeriesRecoveryKey, getAlternateProviderVariants, getProviderTrustDisplay, getProviderTrustLabel, ProviderVariant } from '@/lib/provider-recovery';
import { describeSeriesCompletenessBand } from '@/lib/search-continuity';
import { fetchMockProviderHealth, fetchMockProviderManifest, getSelectedMockProviderScenario, setSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { buildSeriesEpisodeUrl, buildVodStreamUrl, getArtwork, getContentId, getSeriesInfo, resolveSeriesEpisodePlayback } from '@/lib/xtream-api';
import { MockProviderHealth, MockProviderManifest, MockProviderScenario, XtreamEpisode, XtreamSeriesInfo, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';
import { ProviderFactGrid } from './provider-fact-grid';
import { ProviderRecoveryRail } from './provider-recovery-rail';
import { ProviderTrustStack } from './provider-trust-stack';

type CacheMode = 'live' | 'cached' | 'offline';

const formatPercent = (value: number) => `${Math.round(value * 100)}% watched`;
const scenarioLabels: Record<MockProviderScenario, string> = {
  healthy: 'Healthy',
  degradedSearch: 'Degraded search',
  degradedLive: 'Degraded live',
  degradedEpg: 'Degraded guide',
  lineSaturated: 'Lines maxed',
  expiredAccount: 'Expired account',
  authUnstable: 'Auth unstable',
};

const trustToneClasses: Record<MediaDetailContractTone, string> = {
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  watch: 'border-sky-400/20 bg-sky-500/10 text-sky-100',
  recover: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
};

export function MediaLibrary({
  kind,
  initialSeriesId,
  initialSeasonNumber,
  initialEpisodeNumber,
}: {
  kind: 'movies' | 'series';
  initialSeriesId?: number | null;
  initialSeasonNumber?: number | null;
  initialEpisodeNumber?: number | null;
}) {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const connections = useAuthStore((state) => state.connections);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const getCatalogSnapshot = useLibraryStore((state) => state.getCatalogSnapshot);
  const markCatalogFromCache = useLibraryStore((state) => state.markCatalogFromCache);
  const refreshProviderCatalog = useLibraryStore((state) => state.refreshProviderCatalog);
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
  const [mockManifest, setMockManifest] = useState<MockProviderManifest | null>(null);
  const [scenario, setScenario] = useState<MockProviderScenario>('healthy');
  const [scenarioRefreshing, setScenarioRefreshing] = useState(false);
  const [providerVariants, setProviderVariants] = useState<Record<string, ProviderVariant[]>>({});
  const [variantRecoveryKey, setVariantRecoveryKey] = useState<string | null>(null);

  useEffect(() => {
    setScenario(getSelectedMockProviderScenario());
    return subscribeToMockProviderScenario(setScenario);
  }, []);

  useEffect(() => {
    setProviderVariants(buildProviderVariantsIndex({
      connections,
      connectionStatus,
      includeKinds: ['movie', 'series'],
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

    fetchMockProviderManifest(activeConnection, scenario)
      .then((manifest) => {
        if (!cancelled) setMockManifest(manifest);
      })
      .catch(() => {
        if (!cancelled) setMockManifest(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, scenario]);

  useEffect(() => {
    if (!activeConnection) return;
    let cancelled = false;
    setLoading(true);

    const cachedCatalog = getCatalogSnapshot(activeConnection.id, Number.POSITIVE_INFINITY);
    const cachedItems = kind === 'movies' ? cachedCatalog?.vod : cachedCatalog?.series;

    if (cachedItems?.length) {
      markCatalogFromCache(activeConnection.id);
      setItems(cachedItems);
      setCacheMode('cached');
      setCacheMessage(
        scenarioRefreshing
          ? `Applying ${scenarioLabels[scenario].toLowerCase()} rehearsal while keeping the last saved library visible.`
          : 'Loaded instantly from cached provider catalog while refreshing the library.'
      );
      setLoading(false);
    } else {
      setItems([]);
      setCacheMode('live');
      setCacheMessage(null);
    }

    refreshProviderCatalog(activeConnection).then((freshCatalog) => {
      if (cancelled) return;
      const nextItems = kind === 'movies' ? freshCatalog.vod : freshCatalog.series;
      setItems(nextItems);
      setLoading(false);
      setCacheMode('live');
      setCacheMessage(
        cachedItems?.length
          ? scenarioRefreshing
            ? `${kind === 'movies' ? 'Movies' : 'Series'} reloaded immediately for ${scenarioLabels[scenario].toLowerCase()}.`
            : 'Library refreshed successfully. Premium browse surface is live again.'
          : null
      );
      setScenarioRefreshing(false);
    }).catch(() => {
      if (cancelled) return;
      if (cachedItems?.length) {
        setItems(cachedItems);
        setCacheMode('offline');
        setCacheMessage(
          scenarioRefreshing
            ? `${kind === 'movies' ? 'Movies' : 'Series'} could not fully reload for ${scenarioLabels[scenario].toLowerCase()}, so the saved library cache stayed live.`
            : 'Provider refresh failed. Showing the saved library cache so browsing stays usable.'
        );
      } else {
        setItems([]);
        setCacheMode('offline');
        setCacheMessage('Provider is unavailable and there is no saved library cache yet.');
      }
      setLoading(false);
      setScenarioRefreshing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, getCatalogSnapshot, kind, markCatalogFromCache, refreshProviderCatalog, scenario, scenarioRefreshing]);

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
        const requestedSeason = initialSeasonNumber && info.seasons.some((season) => season.season_number === initialSeasonNumber)
          ? initialSeasonNumber
          : info.seasons[0]?.season_number ?? 1;
        setSelectedSeason(requestedSeason);
      })
      .catch(() => {
        if (cancelled) return;
        setSeriesInfo(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, initialSeasonNumber, kind, selectedSeriesId]);

  const featuredMovie = useMemo(
    () => filteredItems.find((item) => getContentId(item) === selectedMovieId) ?? filteredItems[0] ?? null,
    [filteredItems, selectedMovieId]
  );

  const selectedEpisodes = useMemo(() => {
    if (!seriesInfo) return [] as XtreamEpisode[];
    return seriesInfo.episodes[String(selectedSeason)] ?? [];
  }, [selectedSeason, seriesInfo]);

  const highlightedEpisodeId = useMemo(() => {
    if (!initialEpisodeNumber || selectedEpisodes.length === 0) return null;
    return selectedEpisodes.find((episode) => episode.episode_num === initialEpisodeNumber)?.id ?? null;
  }, [initialEpisodeNumber, selectedEpisodes]);

  const recentItems = useMemo(() => providerHistory.slice(0, 4), [providerHistory]);

  const movieVariants = useMemo(() => {
    if (!featuredMovie || !activeConnection) return [] as ProviderVariant[];
    return getAlternateProviderVariants({
      providerVariants,
      activeConnectionId: activeConnection.id,
      title: featuredMovie.name,
      kind: 'movie',
      year: featuredMovie.year,
    });
  }, [activeConnection, featuredMovie, providerVariants]);

  const selectedSeries = seriesInfo?.info ?? filteredItems.find((item) => getContentId(item) === selectedSeriesId) ?? null;
  const selectedSeriesResume = selectedSeries ? resumeLookup[getContentId(selectedSeries)] : null;

  const selectedSeriesVariants = useMemo(() => {
    if (!selectedSeries || !activeConnection) return [] as ProviderVariant[];
    return getAlternateProviderVariants({
      providerVariants,
      activeConnectionId: activeConnection.id,
      title: selectedSeries.name,
      kind: 'series',
      year: selectedSeries.year,
    });
  }, [activeConnection, providerVariants, selectedSeries]);

  const movieRuntime = useMemo(() => buildMediaDetailRuntimeContract({
    item: featuredMovie,
    kind: 'movie',
    activeConnection,
    connections,
    connectionStatus,
    alternateVariants: movieVariants,
    watchHistory,
  }), [activeConnection, connectionStatus, connections, featuredMovie, movieVariants, watchHistory]);
  const movieContinuity = movieRuntime.continuity;

  const seriesRuntime = useMemo(() => buildMediaDetailRuntimeContract({
    item: selectedSeries,
    kind: 'series',
    activeConnection,
    connections,
    connectionStatus,
    alternateVariants: selectedSeriesVariants,
    watchHistory,
  }), [activeConnection, connectionStatus, connections, selectedSeries, selectedSeriesVariants, watchHistory]);
  const seriesContinuity = seriesRuntime.continuity;

  const bannerTone = cacheMode === 'offline'
    ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
    : cacheMode === 'cached'
      ? 'border-sky-400/30 bg-sky-500/10 text-sky-100'
      : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100';
  const activeScenario = mockHealth?.healthScenarios?.[mockHealth.activeScenario];
  const libraryFlowCopy = kind === 'movies' ? mockHealth?.demoFlows?.movies : mockHealth?.demoFlows?.series;
  const surfaceRecoveryPlan = kind === 'movies' ? mockHealth?.surfaceRecoveryPlans?.movies : mockHealth?.surfaceRecoveryPlans?.series;
  const browseLaunchScorecard = mockManifest?.browseLaunchScorecards?.find((item) => item.screenId === kind) ?? null;
  const activeConnectionStatus = activeConnection ? connectionStatus[activeConnection.id] : null;
  const activeSummary = activeConnection?.lastAuthSummary;
  const activeProviderNeedsRecovery = activeSummary?.status !== 'Active'
    || (!!activeSummary?.maxConnections && (activeSummary.activeConnections ?? 0) >= activeSummary.maxConnections)
    || activeConnectionStatus?.state === 'error';

  const activeRecoveryMessage = activeConnectionStatus?.state === 'error'
    ? activeConnectionStatus.message || 'This provider is failing validation right now.'
    : activeSummary?.status !== 'Active'
      ? `Provider status is ${activeSummary?.status || 'not active'}. Keep detail browsing alive, but steer playback toward a healthier saved provider copy.`
      : !!activeSummary?.maxConnections && (activeSummary.activeConnections ?? 0) >= activeSummary.maxConnections
        ? `All ${activeSummary.maxConnections} lines are in use on ${activeConnection?.name}. Use a healthier provider copy if one exists.`
        : null;
  const healthiestSelectedVariant = (kind === 'movies' ? movieVariants[0] : selectedSeriesVariants[0]) || null;

  const renderDetailTrustCards = (runtime: MediaDetailRuntimeContract | null) => {
    if (!runtime?.trust) return null;

    const cards = [
      {
        key: 'provider-choice',
        eyebrow: runtime.trust.providerChoice.title,
        title: runtime.trust.providerChoice.summary,
        detail: `${runtime.trust.providerChoice.autoChoice} ${runtime.trust.providerChoice.userChoice}`,
        footnote: runtime.trust.providerChoice.forcedHandoffTrigger,
        tone: runtime.trust.providerChoice.tone,
      },
      {
        key: 'claim-ceiling',
        eyebrow: runtime.trust.claimCeiling.title,
        title: runtime.trust.claimCeiling.strongestPromise,
        detail: runtime.trust.claimCeiling.reason,
        footnote: runtime.trust.claimCeiling.suppressedPromise,
        tone: runtime.trust.claimCeiling.tone,
      },
      {
        key: 'proof-debt',
        eyebrow: runtime.trust.proofDebt.title,
        title: runtime.trust.proofDebt.summary,
        detail: runtime.trust.proofDebt.debtSource,
        footnote: runtime.trust.proofDebt.repaymentMove,
        tone: runtime.trust.proofDebt.tone,
      },
      {
        key: 'continuity-boundary',
        eyebrow: runtime.trust.continuityBoundary.title,
        title: runtime.trust.continuityBoundary.summary,
        detail: `${runtime.trust.continuityBoundary.portableContext} ${runtime.trust.continuityBoundary.userOwns}`,
        footnote: runtime.trust.continuityBoundary.forcedHandoffTrigger,
        tone: runtime.trust.continuityBoundary.tone,
      },
      {
        key: 'headroom',
        eyebrow: runtime.trust.connectionHeadroom.title,
        title: runtime.trust.connectionHeadroom.summary,
        detail: runtime.trust.connectionHeadroom.warningTrigger,
        footnote: runtime.trust.connectionHeadroom.recommendedMove,
        tone: runtime.trust.connectionHeadroom.tone,
      },
      {
        key: 'provider-stability',
        eyebrow: runtime.trust.providerStability.title,
        title: runtime.trust.providerStability.summary,
        detail: `${runtime.trust.providerStability.stabilityThreshold} ${runtime.trust.providerStability.toleratedVolatility}`,
        footnote: runtime.trust.providerStability.keepRescuePrimaryTrigger,
        tone: runtime.trust.providerStability.tone,
      },
      {
        key: 'return-cooldown',
        eyebrow: runtime.trust.returnCooldown.title,
        title: runtime.trust.returnCooldown.summary,
        detail: `${runtime.trust.returnCooldown.cooldownWindow} ${runtime.trust.returnCooldown.shrinkingProof}`,
        footnote: runtime.trust.returnCooldown.resetTrigger,
        tone: runtime.trust.returnCooldown.tone,
      },
      {
        key: 'action-gate',
        eyebrow: runtime.trust.actionGate.title,
        title: runtime.trust.actionGate.summary,
        detail: `${runtime.trust.actionGate.primaryAction} ${runtime.trust.actionGate.downgradedAction}`,
        footnote: runtime.trust.actionGate.unlockCondition,
        tone: runtime.trust.actionGate.tone,
      },
      {
        key: 'recovery-witness',
        eyebrow: runtime.trust.recoveryWitness.title,
        title: runtime.trust.recoveryWitness.summary,
        detail: `${runtime.trust.recoveryWitness.evidence} ${runtime.trust.recoveryWitness.preservedContext}`,
        footnote: runtime.trust.recoveryWitness.contradictionTrigger,
        tone: runtime.trust.recoveryWitness.tone,
      },
      {
        key: 'interruption-budget',
        eyebrow: runtime.trust.interruptionBudget.title,
        title: runtime.trust.interruptionBudget.summary,
        detail: `${runtime.trust.interruptionBudget.acceptableDelay} ${runtime.trust.interruptionBudget.continuityLayer}`,
        footnote: runtime.trust.interruptionBudget.escalationTrigger,
        tone: runtime.trust.interruptionBudget.tone,
      },
    ];

    return (
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">Go / Watch / Recover</p>
              <p className="mt-2 text-sm font-medium text-white">{runtime.trust.launchScorecard.title}</p>
              <p className="mt-2 text-sm text-white/80">{runtime.trust.launchScorecard.summary}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/80">
              {runtime.trust.launchScorecard.metrics.map((metric) => metric.label).join(' / ')}
            </span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {runtime.trust.launchScorecard.metrics.map((metric) => (
              <div key={metric.label} className={`rounded-[1.2rem] border p-4 ${trustToneClasses[metric.tone]}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{metric.label}</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">{metric.value}</p>
                </div>
                <p className="mt-2 text-sm text-white/85">{metric.detail}</p>
              </div>
            ))}
          </div>
        </div>
        {runtime.trust.launchReadiness.map((item) => (
          <div key={item.label} className={`rounded-[1.2rem] border p-4 ${trustToneClasses[item.tone]}`}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{item.label}</p>
            <p className="mt-2 text-sm font-medium text-white">{item.safeWhen}</p>
            <p className="mt-2 text-sm text-white/85">{item.blockedWhen}</p>
            <p className="mt-3 text-xs text-white/70">{item.recoveryMove}</p>
          </div>
        ))}
        {cards.map((card) => (
          <div key={card.key} className={`rounded-[1.2rem] border p-4 ${trustToneClasses[card.tone]}`}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{card.eyebrow}</p>
            <p className="mt-2 text-sm font-medium text-white">{card.title}</p>
            <p className="mt-2 text-sm text-white/85">{card.detail}</p>
            <p className="mt-3 text-xs text-white/70">{card.footnote}</p>
          </div>
        ))}
      </div>
    );
  };

  const applyScenario = (nextScenario: MockProviderScenario) => {
    if (nextScenario === scenario) return;
    setScenarioRefreshing(true);
    setSelectedMockProviderScenario(nextScenario);
  };

  const launchMovieVariant = (variant: ProviderVariant) => {
    const provider = connections.find((connection) => connection.id === variant.providerId);
    if (!provider) return;

    setActiveConnection(variant.providerId);
    playStream({
      stream_id: variant.streamId,
      name: variant.title,
      stream_type: 'movie',
      category_id: variant.categoryId || 'alternate',
      stream_icon: variant.artwork,
      cover: variant.artwork,
      plot: variant.plot,
    }, buildVodStreamUrl(provider, {
      stream_id: variant.streamId,
      name: variant.title,
      stream_type: 'movie',
      category_id: variant.categoryId || 'alternate',
      stream_icon: variant.artwork,
      cover: variant.artwork,
    }), variant.providerId);
  };

  const launchSeriesVariant = async (variant: ProviderVariant) => {
    const provider = connections.find((connection) => connection.id === variant.providerId);
    if (!provider || !selectedSeries) return;

    const preferredSeason = selectedSeriesResume?.seasonNumber ?? initialSeasonNumber ?? selectedSeason;
    const preferredEpisode = selectedSeriesResume?.episodeNumber ?? initialEpisodeNumber ?? undefined;
    const recoveryKey = buildSeriesRecoveryKey(variant, preferredSeason, preferredEpisode);
    setVariantRecoveryKey(recoveryKey);

    try {
      const resolved = await resolveSeriesEpisodePlayback(provider, variant.seriesId ?? variant.streamId, preferredSeason, preferredEpisode);
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
        seriesTitle: selectedSeries.name,
        seasonNumber: resolved.resolvedSeasonNumber,
        episodeNumber: resolved.episode.episode_num,
      });
    } finally {
      setVariantRecoveryKey((current) => (current === recoveryKey ? null : current));
    }
  };

  const buildProviderVariantActions = (variant: ProviderVariant, options?: { type: 'movie' | 'series'; resumeLabel?: string | null }) => {
    const isSeries = options?.type === 'series';
    const recoveryKey = buildSeriesRecoveryKey(variant, selectedSeriesResume?.seasonNumber ?? initialSeasonNumber ?? selectedSeason, selectedSeriesResume?.episodeNumber ?? initialEpisodeNumber);
    const trustLabel = getProviderTrustLabel(variant.trustScore);

    return [
      {
        label: isSeries
          ? variantRecoveryKey === recoveryKey ? 'Switching…' : options?.resumeLabel || 'Resume on provider'
          : 'Play on provider',
        meta: variant.providerName,
        onClick: () => {
          if (isSeries) {
            void launchSeriesVariant(variant);
            return;
          }
          launchMovieVariant(variant);
        },
      },
      {
        label: 'Switch provider only',
        meta: trustLabel,
        tone: 'secondary' as const,
        onClick: () => setActiveConnection(variant.providerId),
      },
    ];
  };

  const renderProviderVariants = (
    variants: ProviderVariant[],
    options?: { type: 'movie' | 'series'; resumeLabel?: string | null; runtime?: MediaDetailRuntimeContract | null }
  ) => {
    if (variants.length === 0) return null;

    return (
      <div className="mt-6 space-y-3">
        <ProviderRecoveryRail
          tone={activeProviderNeedsRecovery ? 'amber' : 'emerald'}
          eyebrow="Provider variants"
          title={options?.runtime?.recoveryPlan?.title || (options?.type === 'series' ? 'Series continuity is portable across saved providers.' : 'This title also exists on healthier saved providers.')}
          detail={options?.runtime?.recoveryPlan?.summary || (options?.type === 'series'
            ? seriesContinuity?.summary || 'Canonical episode mapping still protects series rescue before playback switches providers.'
            : movieContinuity?.summary || 'Keep the premium detail rail useful even when the active provider is expired, saturated, or shaky. The healthiest alternate copy ranks first.')}
        />
        {options?.type === 'series' && seriesContinuity?.seriesCompletenessBand ? (
          <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm text-sky-100">
            {describeSeriesCompletenessBand(seriesContinuity.seriesCompletenessBand)}
          </div>
        ) : null}
        {variants.map((variant) => {
          const trust = getProviderTrustDisplay(variant.trustScore, variant.warning);
          const isSeries = options?.type === 'series';

          return (
            <ProviderRecoveryRail
              key={`${variant.providerId}-${variant.streamId}-${variant.kind}`}
              tone={trust.tone}
              eyebrow={variant.providerName}
              title={trust.label}
              detail={variant.warning || (isSeries
                ? options?.resumeLabel || trust.detail
                : trust.detail)}
              actions={buildProviderVariantActions(variant, options)}
            />
          );
        })}
      </div>
    );
  };

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
                  onClick={() => applyScenario(key)}
                  className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${scenario === key ? 'bg-violet-500 text-white' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
                >
                  {scenarioLabels[key]}
                </button>
              ))}
            </div>
            {surfaceRecoveryPlan && healthiestSelectedVariant ? (
              <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">{surfaceRecoveryPlan.title}</p>
                <p className="mt-2 text-sm text-slate-100">{surfaceRecoveryPlan.detail}</p>
                <button
                  onClick={() => launchMovieVariant(healthiestSelectedVariant)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-400/20 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-sky-50 hover:bg-sky-400/30"
                >
                  <span>{surfaceRecoveryPlan.cta}</span>
                  <span className="text-xs text-sky-50/80">{healthiestSelectedVariant.providerName}</span>
                </button>
              </div>
            ) : null}
            {mockHealth.scenarioUrls ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                {(Object.entries(mockHealth.scenarioUrls) as Array<[MockProviderScenario, string]>).map(([key, url]) => (
                  <a key={key} href={url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-black/20 px-3 py-2 hover:bg-white/5">
                    {scenarioLabels[key]} health
                  </a>
                ))}
              </div>
            ) : null}
            <ProviderTrustStack
              headline={mockHealth.operatorHeadline}
              signals={mockHealth.trustSignals}
              className="mt-4"
              columnsClassName="grid gap-3 lg:grid-cols-2"
            />
            {activeScenario?.verificationSteps?.length ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-violet-300">Active verification steps</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {activeScenario.verificationSteps.map((step) => <li key={step}>• {step}</li>)}
                </ul>
              </div>
            ) : null}
            {browseLaunchScorecard ? (
              <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">Browse launch scorecard</p>
                    <h4 className="mt-2 text-base font-semibold text-white">{browseLaunchScorecard.title}</h4>
                    <p className="mt-2 max-w-3xl text-sm text-slate-300">{browseLaunchScorecard.summary}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/80">
                    {browseLaunchScorecard.metrics.map((metric) => metric.label).join(' / ')}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {browseLaunchScorecard.metrics.map((metric) => (
                    <div key={metric.label} className={`rounded-2xl border p-3 text-xs ${trustToneClasses[metric.tone]}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="uppercase tracking-[0.2em] text-white/80">{metric.label}</p>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">{metric.value}</p>
                      </div>
                      <p className="mt-2 leading-5 text-white/85">{metric.detail}</p>
                    </div>
                  ))}
                </div>
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
                {movieContinuity ? (
                  <div className="mt-5 rounded-[1.2rem] border border-sky-400/20 bg-sky-500/10 p-4 text-sm text-sky-100">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">Provider continuity</p>
                    <p className="mt-2 leading-6">{movieContinuity.summary}</p>
                  </div>
                ) : null}
                {movieRuntime.recoveryPlan ? (
                  <div className={`mt-5 rounded-[1.2rem] border p-4 ${trustToneClasses[movieRuntime.recoveryPlan.tone]}`}>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{movieRuntime.recoveryPlan.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white">{movieRuntime.recoveryPlan.summary}</p>
                    <p className="mt-2 text-xs text-white/70">Recommended owner: {movieRuntime.recoveryPlan.recommendedProviderName} · {movieRuntime.recoveryPlan.recommendedReason}</p>
                  </div>
                ) : null}
                {activeProviderNeedsRecovery && activeRecoveryMessage ? (
                  <div className="mt-5 rounded-[1.2rem] border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200">Active provider warning</p>
                    <p className="mt-2 leading-6">{activeRecoveryMessage}</p>
                    <ProviderFactGrid summary={activeSummary} className="mt-4 grid gap-3 sm:grid-cols-2" />
                  </div>
                ) : activeSummary ? (
                  <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Active provider posture</p>
                    <ProviderFactGrid summary={activeSummary} className="mt-4 grid gap-3 sm:grid-cols-2" />
                  </div>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-3">
                  <button onClick={() => playStream(featuredMovie, buildVodStreamUrl(activeConnection, featuredMovie), activeConnection.id)} className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-medium text-white hover:bg-violet-400">{resumeLookup[getContentId(featuredMovie)] ? 'Resume movie' : 'Play movie'}</button>
                  <button onClick={() => setSelectedMovieId(filteredItems[0] ? getContentId(filteredItems[0]) : null)} className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-200 hover:bg-white/5">Reset selection</button>
                </div>

                {renderDetailTrustCards(featuredMovie ? movieRuntime : null)}

                {renderProviderVariants(movieVariants, { type: 'movie', runtime: movieRuntime })}

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
                onClick={() => applyScenario(key)}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${scenario === key ? 'bg-violet-500 text-white' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
              >
                {scenarioLabels[key]}
              </button>
            ))}
          </div>
          {surfaceRecoveryPlan && healthiestSelectedVariant ? (
            <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">{surfaceRecoveryPlan.title}</p>
              <p className="mt-2 text-sm text-slate-100">{surfaceRecoveryPlan.detail}</p>
              <button
                onClick={() => launchSeriesVariant(healthiestSelectedVariant)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-400/20 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-sky-50 hover:bg-sky-400/30"
              >
                <span>{surfaceRecoveryPlan.cta}</span>
                <span className="text-xs text-sky-50/80">{healthiestSelectedVariant.providerName}</span>
              </button>
            </div>
          ) : null}
          {mockHealth.scenarioUrls ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
              {(Object.entries(mockHealth.scenarioUrls) as Array<[MockProviderScenario, string]>).map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-black/20 px-3 py-2 hover:bg-white/5">
                  {scenarioLabels[key]} health
                </a>
              ))}
            </div>
          ) : null}
          {activeScenario?.verificationSteps?.length ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-violet-300">Active verification steps</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {activeScenario.verificationSteps.map((step) => <li key={step}>• {step}</li>)}
              </ul>
            </div>
          ) : null}
          {browseLaunchScorecard ? (
            <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">Browse launch scorecard</p>
                  <h4 className="mt-2 text-base font-semibold text-white">{browseLaunchScorecard.title}</h4>
                  <p className="mt-2 max-w-3xl text-sm text-slate-300">{browseLaunchScorecard.summary}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/80">
                  {browseLaunchScorecard.metrics.map((metric) => metric.label).join(' / ')}
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {browseLaunchScorecard.metrics.map((metric) => (
                  <div key={metric.label} className={`rounded-2xl border p-3 text-xs ${trustToneClasses[metric.tone]}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="uppercase tracking-[0.2em] text-white/80">{metric.label}</p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">{metric.value}</p>
                    </div>
                    <p className="mt-2 leading-5 text-white/85">{metric.detail}</p>
                  </div>
                ))}
              </div>
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
              {seriesContinuity ? (
                <div className="mt-4 rounded-[1.2rem] border border-sky-400/20 bg-sky-500/10 p-4 text-sm text-sky-100">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">Series continuity</p>
                  <p className="mt-2 leading-6">{seriesContinuity.summary}</p>
                  {seriesContinuity.seriesCompletenessBand ? (
                    <p className="mt-2 text-xs text-sky-50/80">{describeSeriesCompletenessBand(seriesContinuity.seriesCompletenessBand)}</p>
                  ) : null}
                  {seriesContinuity.canonicalEpisodeMapping?.preferredSeasonNumber && seriesContinuity.canonicalEpisodeMapping?.preferredEpisodeNumber ? (
                    <p className="mt-2 text-xs text-sky-50/80">
                      Resume hook is pinned to S{seriesContinuity.canonicalEpisodeMapping.preferredSeasonNumber}E{seriesContinuity.canonicalEpisodeMapping.preferredEpisodeNumber} before provider handoff.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-sky-50/80">Canonical episode mapping still runs through `get_series_info` before rescue playback is claimed as exact.</p>
                  )}
                </div>
              ) : null}
              {seriesRuntime.recoveryPlan ? (
                <div className={`mt-5 rounded-[1.2rem] border p-4 ${trustToneClasses[seriesRuntime.recoveryPlan.tone]}`}>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{seriesRuntime.recoveryPlan.title}</p>
                  <p className="mt-2 text-sm leading-6 text-white">{seriesRuntime.recoveryPlan.summary}</p>
                  <p className="mt-2 text-xs text-white/70">Recommended owner: {seriesRuntime.recoveryPlan.recommendedProviderName} · {seriesRuntime.recoveryPlan.recommendedReason}</p>
                </div>
              ) : null}
              {selectedSeriesResume ? (
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-violet-200">
                  Resume available · {formatPercent(selectedSeriesResume.progress)}
                  {selectedSeriesResume.seasonNumber && selectedSeriesResume.episodeNumber
                    ? ` · S${selectedSeriesResume.seasonNumber}E${selectedSeriesResume.episodeNumber}`
                    : ''}
                </p>
              ) : null}
              {activeProviderNeedsRecovery && activeRecoveryMessage ? (
                <div className="mt-5 rounded-[1.2rem] border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200">Active provider warning</p>
                  <p className="mt-2 leading-6">{activeRecoveryMessage}</p>
                  <ProviderFactGrid summary={activeSummary} className="mt-4 grid gap-3 sm:grid-cols-2" />
                </div>
              ) : activeSummary ? (
                <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Active provider posture</p>
                  <ProviderFactGrid summary={activeSummary} className="mt-4 grid gap-3 sm:grid-cols-2" />
                </div>
              ) : null}
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

              {renderProviderVariants(selectedSeriesVariants, {
                type: 'series',
                resumeLabel: selectedSeriesResume?.seasonNumber && selectedSeriesResume.episodeNumber
                  ? `Resume S${selectedSeriesResume.seasonNumber}E${selectedSeriesResume.episodeNumber}`
                  : highlightedEpisodeId
                    ? 'Resume highlighted episode'
                    : 'Open healthiest provider copy',
                runtime: seriesRuntime,
              })}

              <ProviderTrustStack
                headline={mockHealth?.operatorHeadline}
                signals={mockHealth?.trustSignals}
                className="mt-4"
                columnsClassName="grid gap-3 lg:grid-cols-2"
              />

              {renderDetailTrustCards(selectedSeries ? seriesRuntime : null)}

              <div className="mt-6 space-y-3">
                {selectedEpisodes.length > 0 ? selectedEpisodes.map((episode) => {
                  const episodeArtwork = episode.info?.movie_image || selectedSeries.cover || selectedSeries.stream_icon;
                  return (
                    <article key={episode.id} className={`rounded-[1.4rem] border p-4 ${highlightedEpisodeId === episode.id ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-white/5'}`}>
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
                            {highlightedEpisodeId === episode.id ? 'Resume this episode' : 'Play episode'}
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
