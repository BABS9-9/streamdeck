'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchMockProviderHealth, getSelectedMockProviderScenario, setSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { buildProviderVariantsIndex, buildSeriesRecoveryKey, getAlternateProviderVariants, getLiveCategoryRecovery, getProviderTrustDisplay, getProviderRecoveryWarning, normalizeRecoveryKey, ProviderVariant } from '@/lib/provider-recovery';
import { buildLiveStreamUrl, buildVodStreamUrl, getArtwork, getCachedSearchCatalog, getContentId, resolveSeriesEpisodePlayback } from '@/lib/xtream-api';
import { MockProviderHealth, MockProviderScenario, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useCollectionsStore } from '@/stores/collections-store';
import { usePlayerStore } from '@/stores/player-store';
import { ProviderRecoveryRail } from './provider-recovery-rail';

const tone: Record<string, string> = {
  violet: 'from-violet-500/25 to-fuchsia-500/10 border-violet-400/30',
  blue: 'from-sky-500/25 to-blue-500/10 border-sky-400/30',
  emerald: 'from-emerald-500/25 to-teal-500/10 border-emerald-400/30',
  amber: 'from-amber-500/25 to-orange-500/10 border-amber-400/30',
  rose: 'from-rose-500/25 to-pink-500/10 border-rose-400/30',
};

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
  weight: number;
  warning?: string | null;
};

export function CollectionsManager() {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const connections = useAuthStore((state) => state.connections);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const validateConnection = useAuthStore((state) => state.validateConnection);
  const collections = useCollectionsStore((state) => state.collections);
  const createCollection = useCollectionsStore((state) => state.createCollection);
  const removeCollection = useCollectionsStore((state) => state.removeCollection);
  const addItemToCollection = useCollectionsStore((state) => state.addItemToCollection);
  const removeItemFromCollection = useCollectionsStore((state) => state.removeItemFromCollection);
  const playStream = usePlayerStore((state) => state.playStream);
  const watchHistory = usePlayerStore((state) => state.watchHistory);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [seriesRecoveryKey, setSeriesRecoveryKey] = useState<string | null>(null);
  const [mockHealth, setMockHealth] = useState<MockProviderHealth | null>(null);
  const [scenario, setScenario] = useState<MockProviderScenario>(() => getSelectedMockProviderScenario());

  useEffect(() => subscribeToMockProviderScenario(setScenario), []);

  const catalog = useMemo(() => {
    if (!activeConnection) return [] as XtreamStream[];
    const cached = getCachedSearchCatalog(activeConnection.id, Number.MAX_SAFE_INTEGER);
    if (!cached) return [];
    return [...cached.live, ...cached.vod, ...cached.series];
  }, [activeConnection]);

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

  const activeTrust = activeConnection ? { warning: getProviderRecoveryWarning(activeConnection, connectionStatus[activeConnection.id]), needsRecovery: Boolean(getProviderRecoveryWarning(activeConnection, connectionStatus[activeConnection.id])) } : null;

  const providerCollections = useMemo(() => collections.filter((collection) => collection.items.some((item) => item.providerId === activeConnection?.id) || collection.items.length === 0), [activeConnection?.id, collections]);
  const collectionRecoveryPlan = mockHealth?.surfaceRecoveryPlans?.collections;

  const applyScenario = (nextScenario: MockProviderScenario) => {
    if (nextScenario === scenario) return;
    setSelectedMockProviderScenario(nextScenario);
  };

  const providerVariants = useMemo(() => buildProviderVariantsIndex({
    connections,
    connectionStatus,
  }), [connections, connectionStatus]);

  const seriesResumeLookup = useMemo(() => {
    return Object.fromEntries(
      watchHistory
        .filter((item) => item.kind === 'series' && item.seriesTitle && item.seasonNumber && item.episodeNumber)
        .map((item) => [normalizeLibraryKey(item.seriesTitle || item.title), item])
    );
  }, [watchHistory]);

  const discovery = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalog
      .filter((item) => !query || item.name.toLowerCase().includes(query) || item.genre?.toLowerCase().includes(query))
      .slice(0, 12);
  }, [catalog, search]);

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
    const fallback = getLiveCategoryRecovery({
      activeConnectionId: activeConnection.id,
      connections,
      connectionStatus,
      exactVariants: variants,
      categoryName: categorySeed,
    });
    return fallback ? { ...fallback, weight: fallback.trustScore } : null;
  };

  const launchSeriesVariant = async (variant: ProviderVariant, seriesTitle: string, seasonNumber?: number, episodeNumber?: number) => {
    const provider = connections.find((connection) => connection.id === variant.providerId);
    if (!provider) return;

    const recoveryKey = buildSeriesRecoveryKey(variant, seasonNumber, episodeNumber);
    setSeriesRecoveryKey(recoveryKey);

    try {
      const resolved = await resolveSeriesEpisodePlayback(provider, variant.seriesId ?? variant.streamId, seasonNumber, episodeNumber);
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
        seriesTitle,
        seasonNumber: resolved.resolvedSeasonNumber,
        episodeNumber: resolved.episode.episode_num,
      });
    } finally {
      setSeriesRecoveryKey((current) => (current === recoveryKey ? null : current));
    }
  };

  if (!activeConnection) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No active provider. Connect first.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Custom folders</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Build your own channel and title collections.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">This turns favorites into real curation. Make folders like Game Day, News Morning, Kids Bedtime, or Weekend Movies, then launch directly from one place.</p>
        {activeTrust?.needsRecovery ? (
          <div className="mt-4">
            <ProviderRecoveryRail
              eyebrow="Collection recovery mode"
              title={activeTrust.warning || 'The active provider needs attention.'}
              detail="Launching a healthier provider copy from a collection is now the fastest recovery path."
              tone="amber"
              actions={[
                {
                  label: 'Recheck provider',
                  onClick: () => void validateConnection(activeConnection.id),
                  tone: 'secondary',
                },
              ]}
            />
          </div>
        ) : null}
        {mockHealth && collectionRecoveryPlan ? (
          <div className="mt-4 space-y-3">
            <ProviderRecoveryRail
              eyebrow={collectionRecoveryPlan.title}
              title={collectionRecoveryPlan.detail}
              detail="Collections should keep curated launch intent alive through healthier provider copies and same-category live rescue, not drift into a separate fallback language."
              tone="sky"
              actions={[
                {
                  label: collectionRecoveryPlan.cta,
                  onClick: () => {},
                  tone: 'secondary' as const,
                  meta: 'Use scenario toggles below',
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

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
          <h3 className="text-xl font-semibold text-white">Create a collection</h3>
          <div className="mt-4 space-y-3">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Game Day" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Your must-watch sports channels and recaps." className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
            <button onClick={() => { createCollection({ name, description }); setName(''); setDescription(''); }} className="w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400">Create collection</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-400">No collections yet. Create one, then start curating from your cached provider catalog.</div> : null}
          {collections.map((collection) => (
            <article key={collection.id} className={`rounded-[1.6rem] border bg-gradient-to-br ${tone[collection.color] ?? tone.violet} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{collection.name}</p>
                  <p className="mt-2 text-sm text-slate-200">{collection.description || 'Custom playlist for your StreamDeck library.'}</p>
                </div>
                <button onClick={() => removeCollection(collection.id)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:bg-white/10">Delete</button>
              </div>
              <div className="mt-5 flex items-center justify-between text-sm text-slate-200">
                <span>{collection.items.length} item{collection.items.length === 1 ? '' : 's'}</span>
                <span>Updated {new Date(collection.updatedAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Add titles to a collection</h3>
            <p className="mt-2 text-sm text-slate-400">Using the cached provider catalog keeps this fast even before a fresh refetch finishes.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select value={selectedCollectionId} onChange={(event) => setSelectedCollectionId(event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
              <option value="">Choose collection</option>
              {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
            </select>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cached catalog" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {discovery.map((item) => {
            const contentId = getContentId(item);
            return (
              <article key={`${item.stream_type}-${contentId}`} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                <div className="aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${getArtwork(item)})` }} />
                <p className="mt-4 text-lg font-semibold text-white">{item.name}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">{item.stream_type}</p>
                <button
                  onClick={() => {
                    if (!selectedCollectionId) return;
                    addItemToCollection(selectedCollectionId, {
                      providerId: activeConnection.id,
                      streamId: contentId,
                      streamType: item.stream_type === 'live' ? 'live' : item.stream_type === 'series' ? 'series' : 'movie',
                      title: item.name,
                      artwork: getArtwork(item),
                      addedAt: Date.now(),
                    });
                  }}
                  disabled={!selectedCollectionId}
                  className="mt-4 w-full rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
                >
                  Add to collection
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-white">Launch from collections</h3>
            <p className="mt-2 text-sm text-slate-400">Collections now understand alternate provider copies, so a saved lineup still works when the active source expires or saturates.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
            {providerCollections.length} collection{providerCollections.length === 1 ? '' : 's'} in scope
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {providerCollections.map((collection) => (
            <article key={collection.id} className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{collection.name}</p>
                  <p className="mt-2 text-sm text-slate-400">{collection.description || 'Custom stream lineup.'}</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">{collection.items.length} saved</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {collection.items.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-400">Empty collection. Add some channels or titles above.</div> : null}
                {collection.items.map((item) => {
                  const catalogItem = catalog.find((entry) => getContentId(entry) === item.streamId);
                  const playbackUrl = !catalogItem
                    ? undefined
                    : catalogItem.stream_type === 'live'
                      ? buildLiveStreamUrl(activeConnection, catalogItem)
                      : catalogItem.stream_type === 'series'
                        ? undefined
                        : buildVodStreamUrl(activeConnection, catalogItem);
                  const alternateVariants = getAlternateProviderVariants({
                    providerVariants,
                    activeConnectionId: activeConnection.id,
                    title: item.title,
                    kind: item.streamType,
                    year: catalogItem?.year,
                  });
                  const categorySeed = catalogItem?.channel_group || alternateVariants.find((variant) => variant.kind === 'live')?.categoryName;
                  const categoryFallback = item.streamType === 'live' ? getLiveCategoryFallback(categorySeed, alternateVariants) : null;
                  const recommendedVariant = alternateVariants[0];
                  const canUseCurrentProvider = item.providerId === activeConnection.id && ((item.streamType === 'series') || (!!catalogItem && !!playbackUrl));
                  const seriesResume = item.streamType === 'series' ? seriesResumeLookup[normalizeLibraryKey(item.title)] : null;

                  return (
                    <div key={`${collection.id}-${item.providerId}-${item.streamId}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="aspect-video rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${item.artwork})` }} />
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{item.title}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">{item.streamType}</p>
                        </div>
                        {recommendedVariant || categoryFallback ? (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100">
                            {recommendedVariant ? 'Alt ready' : 'Category rescue'}
                          </span>
                        ) : null}
                      </div>
                      {item.providerId !== activeConnection.id ? (
                        <p className="mt-3 text-xs leading-5 text-slate-400">Saved from another provider. Switch or launch the healthier copy below.</p>
                      ) : null}
                      {activeTrust?.needsRecovery && (recommendedVariant || categoryFallback) ? (
                        <p className="mt-3 text-xs leading-5 text-amber-200">Active provider is under pressure. Recommended recovery path: {recommendedVariant ? `${recommendedVariant.providerName}${recommendedVariant.warning ? ` • ${recommendedVariant.warning}` : ''}` : `${categoryFallback?.providerName} same-category fallback${categoryFallback?.warning ? ` • ${categoryFallback.warning}` : ''}` }.</p>
                      ) : null}
                      <div className="mt-4 flex gap-2">
                        {item.streamType === 'series' ? (
                          seriesResume ? (
                            <button
                              onClick={() => void launchSeriesVariant({
                                providerId: activeConnection.id,
                                providerName: activeConnection.name,
                                title: item.title,
                                streamId: item.streamId,
                                kind: 'series',
                                artwork: item.artwork,
                                seriesId: item.streamId,
                                trustScore: 0,
                              }, item.title, seriesResume.seasonNumber, seriesResume.episodeNumber)}
                              disabled={seriesRecoveryKey === buildSeriesRecoveryKey({ providerId: activeConnection.id, streamId: item.streamId, seriesId: item.streamId }, seriesResume.seasonNumber, seriesResume.episodeNumber)}
                              className="flex-1 rounded-xl bg-violet-500 px-3 py-2 text-center text-sm font-medium text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {seriesRecoveryKey === buildSeriesRecoveryKey({ providerId: activeConnection.id, streamId: item.streamId, seriesId: item.streamId }, seriesResume.seasonNumber, seriesResume.episodeNumber) ? 'Starting…' : 'Resume'}
                            </button>
                          ) : (
                            <Link href={`/series?seriesId=${item.streamId}`} className="flex-1 rounded-xl bg-violet-500 px-3 py-2 text-center text-sm font-medium text-white hover:bg-violet-400">Open</Link>
                          )
                        ) : (
                          <button
                            onClick={() => {
                              if (!catalogItem || !playbackUrl) return;
                              playStream(catalogItem, playbackUrl, activeConnection.id);
                            }}
                            disabled={!canUseCurrentProvider || !!(activeTrust?.needsRecovery && recommendedVariant)}
                            className="flex-1 rounded-xl bg-violet-500 px-3 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
                          >
                            Play current
                          </button>
                        )}
                        <button onClick={() => removeItemFromCollection(collection.id, item.providerId, item.streamId)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5">Remove</button>
                      </div>
                      {recommendedVariant || categoryFallback ? (
                        <div className="mt-3">
                          <ProviderRecoveryRail
                            eyebrow={recommendedVariant ? 'Recommended alternate' : 'Same-category fallback'}
                            title={recommendedVariant ? `${recommendedVariant.providerName} · ${getProviderTrustDisplay(recommendedVariant.trustScore, recommendedVariant.warning).label}` : categoryFallback?.providerName || 'Healthier saved provider'}
                            detail={recommendedVariant
                              ? getProviderTrustDisplay(recommendedVariant.trustScore, recommendedVariant.warning).detail
                              : (!recommendedVariant && categoryFallback ? `Open ${categoryFallback.categoryName} on a healthier saved provider when this exact live item is unavailable.` : 'Use the healthiest saved provider copy before this collection item dead-ends.')}
                            tone={recommendedVariant ? getProviderTrustDisplay(recommendedVariant.trustScore, recommendedVariant.warning).tone : "emerald"}
                            actions={recommendedVariant ? [
                              ...(recommendedVariant.kind === 'series'
                                ? [
                                    {
                                      label: seriesRecoveryKey === `${recommendedVariant.providerId}-${recommendedVariant.seriesId ?? recommendedVariant.streamId}-${seriesResume?.seasonNumber || 0}-${seriesResume?.episodeNumber || 0}` ? 'Starting…' : 'Resume alternate',
                                      onClick: () => void launchSeriesVariant(recommendedVariant, item.title, seriesResume?.seasonNumber, seriesResume?.episodeNumber),
                                    },
                                    {
                                      label: 'Open series',
                                      href: `/series?seriesId=${recommendedVariant.seriesId ?? recommendedVariant.streamId}${seriesResume?.seasonNumber ? `&season=${seriesResume.seasonNumber}` : ''}${seriesResume?.episodeNumber ? `&episode=${seriesResume.episodeNumber}` : ''}`,
                                      onClick: () => setActiveConnection(recommendedVariant.providerId),
                                      meta: `S${seriesResume?.seasonNumber || '?'}E${seriesResume?.episodeNumber || '?'}`,
                                      tone: 'secondary' as const,
                                    },
                                  ]
                                : [
                                    {
                                      label: 'Play alternate',
                                      onClick: () => launchVariant(recommendedVariant),
                                    },
                                  ]),
                              {
                                label: 'Switch only',
                                onClick: () => setActiveConnection(recommendedVariant.providerId),
                                tone: 'secondary' as const,
                              },
                            ] : categoryFallback ? [
                              {
                                label: 'Open same category',
                                onClick: () => {
                                  setActiveConnection(categoryFallback.providerId);
                                  playStream({
                                    name: categoryFallback.title,
                                    stream_type: 'live',
                                    stream_id: categoryFallback.streamId,
                                    category_id: categoryFallback.categoryId || catalogItem?.category_id || 'alternate',
                                    stream_icon: categoryFallback.artwork || item.artwork,
                                    preview_art: categoryFallback.artwork || item.artwork,
                                  } as XtreamStream, categoryFallback.playbackUrl, categoryFallback.providerId);
                                },
                              },
                              {
                                label: 'Switch only',
                                onClick: () => setActiveConnection(categoryFallback.providerId),
                                tone: 'secondary' as const,
                              },
                            ] : []}
                          />
                        </div>
                      ) : null}
                      {alternateVariants.length > 1 ? (
                        <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-black/10 p-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Other provider copies</p>
                          {alternateVariants.slice(1, 3).map((variant) => (
                            <div key={`${variant.providerId}-${variant.streamId}-${variant.kind}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                              <div>
                                <p className="text-sm text-white">{variant.providerName}</p>
                                {variant.warning ? <p className="text-[11px] text-slate-400">{variant.warning}</p> : null}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {variant.kind === 'series' ? (
                                  <button
                                    onClick={() => void launchSeriesVariant(variant, item.title, seriesResume?.seasonNumber, seriesResume?.episodeNumber)}
                                    disabled={seriesRecoveryKey === `${variant.providerId}-${variant.seriesId ?? variant.streamId}-${seriesResume?.seasonNumber || 0}-${seriesResume?.episodeNumber || 0}`}
                                    className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {seriesRecoveryKey === `${variant.providerId}-${variant.seriesId ?? variant.streamId}-${seriesResume?.seasonNumber || 0}-${seriesResume?.episodeNumber || 0}` ? 'Starting…' : 'Resume'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => launchVariant(variant)}
                                    className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white hover:bg-white/10"
                                  >
                                    Play
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
