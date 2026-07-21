'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchMockProviderHealth, fetchMockProviderManifest, getSelectedMockProviderScenario, setSelectedMockProviderScenario, subscribeToMockProviderScenario } from '@/lib/mock-provider';
import { getProviderAccountPressure } from '@/lib/provider-signals';
import { buildLiveVariantKey, buildProviderVariantsIndex, getHealthiestSavedProvider, getLiveCategoryRecovery, getRecoveryActionLabel, getRecoverySupportLabel, ProviderVariant } from '@/lib/provider-recovery';
import { buildLiveStreamUrl, getContentId, getLiveCategories, getLiveStreams, getShortEpg } from '@/lib/xtream-api';
import { MockProviderHealth, MockProviderManifest, MockProviderScenario, NormalizedEpg, XtreamCategory, XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useCollectionsStore } from '@/stores/collections-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { usePlayerStore } from '@/stores/player-store';
import { ProviderFactGrid } from './provider-fact-grid';
import { ProviderRecoveryRail } from './provider-recovery-rail';
import { ProviderTrustBadge } from './provider-trust-badge';
import { ProviderTrustStack } from './provider-trust-stack';
import { VideoPlayer } from './video-player';

const scenarioLabels: Record<MockProviderScenario, string> = {
  healthy: 'Healthy',
  degradedSearch: 'Degraded search',
  degradedLive: 'Degraded live',
  degradedEpg: 'Degraded guide',
  lineSaturated: 'Lines maxed',
  expiredAccount: 'Expired account',
  authUnstable: 'Auth unstable',
};

type CategoryFallback = ReturnType<typeof getLiveCategoryRecovery>;

export function LiveBrowser() {
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const connections = useAuthStore((state) => state.connections);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const validateConnection = useAuthStore((state) => state.validateConnection);
  const revalidateMockConnections = useAuthStore((state) => state.revalidateMockConnections);
  const getFavoritesForProvider = useFavoritesStore((state) => state.getFavoritesForProvider);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const collections = useCollectionsStore((state) => state.collections);
  const addItemToCollection = useCollectionsStore((state) => state.addItemToCollection);
  const playStream = usePlayerStore((state) => state.playStream);
  const currentStream = usePlayerStore((state) => state.currentStream);
  const playbackUrl = usePlayerStore((state) => state.playbackUrl);
  const streamHealth = usePlayerStore((state) => state.streamHealth);

  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [streams, setStreams] = useState<XtreamStream[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStream, setSelectedStream] = useState<XtreamStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [epg, setEpg] = useState<Record<number, NormalizedEpg>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [guideMessage, setGuideMessage] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'playing' | 'buffering' | 'error'>('idle');
  const [showPreviewFallback, setShowPreviewFallback] = useState(false);
  const [mockHealth, setMockHealth] = useState<MockProviderHealth | null>(null);
  const [mockManifest, setMockManifest] = useState<MockProviderManifest | null>(null);
  const [scenario, setScenario] = useState(getSelectedMockProviderScenario());
  const [scenarioRefreshing, setScenarioRefreshing] = useState(false);
  const [providerVariants, setProviderVariants] = useState<Record<string, ProviderVariant[]>>({});
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setScenario(getSelectedMockProviderScenario());
    return subscribeToMockProviderScenario((nextScenario) => {
      setScenario(nextScenario);
      setScenarioRefreshing(true);
      revalidateMockConnections().catch(() => {});
    });
  }, [revalidateMockConnections]);

  useEffect(() => {
    setProviderVariants(buildProviderVariantsIndex({ connections, connectionStatus, includeKinds: ['live'] }));
  }, [connectionStatus, connections]);

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

    fetchMockProviderManifest(activeConnection, scenario)
      .then((manifest) => {
        if (!cancelled) setMockManifest(manifest);
      })
      .catch(() => {
        if (!cancelled) setMockManifest(null);
      });

    setLoading(true);
    setLoadError(null);
    setGuideMessage(null);

    Promise.all([getLiveCategories(activeConnection), getLiveStreams(activeConnection)])
      .then(([cats, live]) => {
        if (cancelled) return;
        setCategories(cats);
        setStreams(live);
        setSelectedStream(live[0] ?? null);
        setPreviewUrl(live[0] ? buildLiveStreamUrl(activeConnection, live[0]) : null);
        return Promise.all(
          live.slice(0, 18).map(async (stream) => {
            const streamId = getContentId(stream);
            try {
              return [streamId, await getShortEpg(activeConnection, streamId)] as const;
            } catch {
              return [streamId, null] as const;
            }
          })
        );
      })
      .then((entries) => {
        if (!entries || cancelled) return;
        const nextEpg = entries.reduce<Record<number, NormalizedEpg>>((acc, [streamId, guide]) => {
          if (guide) acc[streamId] = guide;
          return acc;
        }, {});
        setEpg(nextEpg);
        setGuideMessage(Object.keys(nextEpg).length === 0 ? 'Guide data is temporarily unavailable. Channel browse and preview are still live.' : null);
        setScenarioRefreshing(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(scenarioRefreshing ? `Unable to reload Live for ${scenarioLabel}. ${error instanceof Error ? error.message : 'Unable to load live TV'}` : error instanceof Error ? error.message : 'Unable to load live TV');
        setScenarioRefreshing(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConnection, scenario, scenarioRefreshing]);

  const previewSource = playbackUrl ?? previewUrl;
  const displayStream = currentStream ?? selectedStream;

  useEffect(() => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

    if (!previewSource || !displayStream) {
      setPreviewState('idle');
      setShowPreviewFallback(false);
      return;
    }

    setPreviewState('loading');
    setShowPreviewFallback(false);
    fallbackTimerRef.current = setTimeout(() => {
      setShowPreviewFallback(true);
    }, 2200);

    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [displayStream, previewSource]);

  const favorites = useMemo(
    () => (activeConnection ? getFavoritesForProvider(activeConnection.id) : []),
    [activeConnection, getFavoritesForProvider]
  );

  const filtered = useMemo(() => streams.filter((stream) => {
    const categoryMatch = selectedCategory === 'all' || stream.category_id === selectedCategory;
    const searchMatch = stream.name.toLowerCase().includes(search.toLowerCase());
    return categoryMatch && searchMatch;
  }), [streams, search, selectedCategory]);

  const categorySummaries = useMemo(() => {
    return categories.map((category) => {
      const categoryStreams = streams.filter((stream) => stream.category_id === category.category_id);
      const activeGuide = categoryStreams
        .map((stream) => epg[getContentId(stream)]?.now?.title)
        .find(Boolean) ?? (guideMessage ? 'Guide unavailable right now' : 'Guide loading');
      return {
        ...category,
        count: categoryStreams.length,
        lead: categoryStreams[0] ?? null,
        activeGuide,
      };
    });
  }, [categories, epg, guideMessage, streams]);

  const activeStatus = activeConnection ? connectionStatus[activeConnection.id] : null;
  const statusTone = activeStatus?.state === 'healthy'
    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
    : activeStatus?.state === 'checking'
      ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
      : activeStatus?.state === 'error'
        ? 'border-rose-400/20 bg-rose-500/10 text-rose-100'
        : 'border-sky-400/20 bg-sky-500/10 text-sky-100';

  const applyScenario = (nextScenario: MockProviderScenario) => {
    if (nextScenario === scenario) return;
    setScenarioRefreshing(true);
    setSelectedMockProviderScenario(nextScenario);
    setScenario(nextScenario);
  };

  if (!activeConnection) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">No active provider. Return to login first.</div>;
  }

  const selectedGuide = selectedStream ? epg[getContentId(selectedStream)] : null;
  const selectedCategoryName = selectedCategory === 'all'
    ? 'All categories'
    : categories.find((item) => item.category_id === selectedCategory)?.category_name ?? 'Filtered category';
  const selectedFavoritesCount = favorites.filter((contentId) => {
    const stream = streams.find((item) => getContentId(item) === contentId);
    if (!stream) return false;
    return selectedCategory === 'all' || stream.category_id === selectedCategory;
  }).length;
  const activeScenario = mockHealth?.healthScenarios?.[mockHealth.activeScenario];
  const providerAccountPressure = getProviderAccountPressure(activeConnection?.lastAuthSummary, {
    statusContext: 'Surface the recovery path before the user mistakes account expiry for stream failure.',
    lineContext: 'Surface this before the user mistakes account pressure for stream failure.',
  });
  const healthiestConnection = useMemo(() => {
    if (!activeConnection || connections.length < 2) return null;
    return getHealthiestSavedProvider({
      connections,
      connectionStatus,
      activeConnectionId: activeConnection.id,
    });
  }, [activeConnection, connectionStatus, connections]);

  const getLiveVariants = (stream: XtreamStream) => {
    if (!activeConnection) return [] as ProviderVariant[];
    const key = buildLiveVariantKey(stream.name);
    return (providerVariants[key] || [])
      .filter((variant) => variant.providerId !== activeConnection.id)
      .sort((a, b) => b.trustScore - a.trustScore);
  };

  const getCategoryFallback = (stream: XtreamStream, variants: ProviderVariant[]) => {
    if (!activeConnection) return null as CategoryFallback | null;
    return getLiveCategoryRecovery({
      activeConnectionId: activeConnection.id,
      connections,
      connectionStatus,
      exactVariants: variants,
      categoryId: stream.category_id,
      categoryName: categories.find((item) => item.category_id === stream.category_id)?.category_name || stream.channel_group || 'Live',
    });
  };

  const launchVariant = (variant: ProviderVariant) => {
    const provider = connections.find((connection) => connection.id === variant.providerId);
    if (!provider) return;

    setActiveConnection(variant.providerId);
    const variantStream: XtreamStream = {
      stream_id: variant.streamId,
      name: variant.title,
      stream_type: 'live',
      category_id: variant.categoryId || 'alternate',
      stream_icon: variant.artwork,
      preview_art: variant.artwork,
    };
    if (!variant.playbackUrl) return;
    setSelectedStream(variantStream);
    setPreviewUrl(variant.playbackUrl);
    playStream(variantStream, variant.playbackUrl, variant.providerId);
  };

  const launchCategoryFallback = (fallback: CategoryFallback) => {
    if (!fallback) return;
    setActiveConnection(fallback.providerId);
    setSelectedCategory(fallback.categoryId || 'all');
    setSelectedStream(fallback.stream);
    setPreviewUrl(fallback.playbackUrl);
    playStream(fallback.stream, fallback.playbackUrl, fallback.providerId);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="space-y-6">
        {activeStatus ? (
          <div className={`rounded-[1.5rem] border px-5 py-4 text-sm ${statusTone}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white">{activeConnection.name} provider status: {activeStatus.state}</p>
                <p className="mt-1 text-white/80">{activeStatus.message ?? 'Provider status available.'}</p>
              </div>
              <button
                onClick={() => validateConnection(activeConnection.id)}
                className="rounded-full border border-white/20 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white hover:bg-white/10"
              >
                Retry check
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 px-5 py-4 text-sm text-slate-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Live rehearsal note</p>
              <p className="mt-2">The mock provider now supports degraded-live, degraded-search, degraded-guide, and auth-unstable rehearsal states, so Live can be demoed against failure paths without touching a real IPTV source, and this browser now hot-refreshes in place plus revalidates saved mock-provider account truth as soon as the rehearsal mode changes.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-violet-200">
              {mockHealth ? `Mode: ${mockHealth.healthScenarios?.[mockHealth.activeScenario]?.label ?? mockHealth.activeScenario}` : 'Mock-friendly retries ready'}
            </span>
          </div>
          {mockHealth ? (
            <>
              {scenarioRefreshing ? (
                <div className="mt-4 rounded-2xl border border-violet-400/20 bg-black/20 p-4 text-sm text-violet-100">
                  Applying {scenario.replace(/([A-Z])/g, ' $1').toLowerCase()} rehearsal and refreshing Live in place.
                </div>
              ) : null}
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
                    type="button"
                    onClick={() => applyScenario(key)}
                    className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.22em] transition ${scenario === key ? 'bg-violet-500 text-white' : 'border border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'}`}
                  >
                    {scenarioRefreshing && scenario === key ? `Applying ${scenarioLabels[key]}` : scenarioLabels[key]}
                  </button>
                ))}
              </div>
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
                signals={mockHealth.trustSignals}
                className="mt-4"
                columnsClassName="grid gap-3 lg:grid-cols-2"
              />
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {Object.entries(mockHealth.healthScenarios || {}).map(([key, scenario]) => (
                  <div key={key} className={`rounded-2xl border p-4 ${mockHealth.activeScenario === key ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-white/5'}`}>
                    <p className="text-sm font-semibold text-white">{scenario.label}</p>
                    <p className="mt-2 text-sm text-slate-400">{scenario.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {scenario.affectedEndpoints.map((endpoint) => (
                        <span key={endpoint} className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">{endpoint}</span>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <ul className="space-y-1 text-xs text-slate-500">
                        {scenario.expectedUx.map((item) => <li key={item}>• {item}</li>)}
                      </ul>
                      <ul className="space-y-1 text-xs text-slate-400">
                        {scenario.verificationSteps.map((item) => <li key={item}>• {item}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
              {mockHealth.recoveryActions?.length ? (
                <div className="mt-4 rounded-2xl border border-amber-400/20 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200">Live recovery actions</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {mockHealth.recoveryActions.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                </div>
              ) : null}
              {mockHealth.recommendedDemoSequence?.length ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Live rehearsal sequence</p>
                  <ol className="mt-3 space-y-2 text-sm text-slate-300">
                    {mockHealth.recommendedDemoSequence.map((item, index) => <li key={item}>{index + 1}. {item}</li>)}
                  </ol>
                </div>
              ) : null}
              {mockManifest ? (
                <div className="mt-4 rounded-2xl border border-sky-400/20 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">Live proof surface</p>
                  <p className="mt-2 text-sm text-white">{mockManifest.projectStatus}</p>
                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    {mockManifest.supportedScreens.map((screen) => (
                      <div key={screen.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-sm font-medium text-white">{screen.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{screen.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {providerAccountPressure ? (
          <ProviderRecoveryRail
            eyebrow="Provider capacity risk"
            title={providerAccountPressure}
            detail={healthiestConnection ? 'Live can jump straight to the healthiest saved provider before the user burns time retrying a bad source.' : 'Keep the line-pressure warning visible before the user mistakes provider saturation for playback failure.'}
            tone="amber"
            actions={healthiestConnection ? [
              {
                label: 'Switch to healthiest saved provider',
                meta: healthiestConnection.name,
                onClick: () => {
                  setActiveConnection(healthiestConnection.id);
                  setSelectedCategory((current) => current || 'all');
                },
              },
            ] : []}
          />
        ) : null}

        <ProviderTrustStack headline={mockHealth?.operatorHeadline} />

        {healthiestConnection && mockHealth?.surfaceRecoveryPlans?.live ? (
          <ProviderRecoveryRail
            eyebrow={mockHealth.surfaceRecoveryPlans.live.title}
            title={mockHealth.surfaceRecoveryPlans.live.detail}
            detail={getRecoverySupportLabel('live')}
            tone="sky"
            actions={[
              {
                label: getRecoveryActionLabel('live', healthiestConnection.name),
                meta: `${healthiestConnection.name} · ${mockHealth.surfaceRecoveryPlans.live.cta}`,
                onClick: () => {
                  setActiveConnection(healthiestConnection.id);
                  setSelectedCategory((current) => current || 'all');
                },
              },
            ]}
          />
        ) : null}

        {guideMessage ? (
          <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>{guideMessage}</p>
              <span className="text-xs uppercase tracking-[0.22em] text-amber-50/80">{activeScenario?.label ?? 'Guide fallback active'}</span>
            </div>
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            Live TV refresh failed. {loadError}
          </div>
        ) : null}

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Live TV browser</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Inline guide, instant preview, fast filtering.</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {connections.length > 1 ? (
                <select
                  value={activeConnection.id}
                  onChange={(event) => setActiveConnection(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                >
                  {connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name}</option>)}
                </select>
              ) : null}
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search channels"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => setSelectedCategory('all')} className={`rounded-full px-4 py-2 text-sm ${selectedCategory === 'all' ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-300'}`}>All</button>
            {categories.map((category) => (
              <button key={category.category_id} onClick={() => setSelectedCategory(category.category_id)} className={`rounded-full px-4 py-2 text-sm ${selectedCategory === category.category_id ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-300'}`}>
                {category.category_name}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ['Visible channels', filtered.length],
              ['Saved here', selectedFavoritesCount],
              ['Categories', selectedCategory === 'all' ? categories.length : 1],
              ['Preview target', selectedStream?.name ?? 'None'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.2rem] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
                <p className="mt-2 line-clamp-2 text-sm font-medium text-white">{value}</p>
              </div>
            ))}
          </div>
          {activeConnection.lastAuthSummary ? (
            <>
              <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Provider trust cockpit</p>
                <ProviderFactGrid summary={activeConnection.lastAuthSummary} className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" />
              </div>
              {providerAccountPressure ? (
                <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
                  {providerAccountPressure}
                </div>
              ) : null}
            </>
          ) : null}
          {mockManifest?.demoChecklist?.length ? (
            <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Live proof checklist</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {mockManifest.demoChecklist.slice(1, 4).map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {categorySummaries.map((category) => {
            const isSelected = selectedCategory === category.category_id;
            return (
              <button
                key={category.category_id}
                onClick={() => setSelectedCategory(category.category_id)}
                className={`rounded-[1.6rem] border p-4 text-left transition ${isSelected ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{category.category_name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{category.count} channels</p>
                  </div>
                  <span className="rounded-full bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
                    {isSelected ? 'Active' : 'Open'}
                  </span>
                </div>
                <div className="mt-4 aspect-[16/7] overflow-hidden rounded-[1.2rem] bg-black/30">
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${category.lead?.preview_art || category.lead?.stream_icon || ''})` }}
                  />
                </div>
                <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-slate-500">Live now in {category.category_name}</p>
                <p className="mt-2 text-sm text-slate-200">{category.activeGuide}</p>
              </button>
            );
          })}
        </div>

        {loading ? <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-sm text-slate-400">Refreshing live categories, channels, and inline guide data...</div> : null}

        <div className="rounded-[1.8rem] border border-white/10 bg-black/20 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Channel surf rail</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{selectedCategoryName}</h3>
            </div>
            <p className="text-sm text-slate-400">Focus a card and the preview player updates without leaving the grid.</p>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {filtered.slice(0, 10).map((stream) => {
              const streamId = getContentId(stream);
              const isActive = selectedStream ? getContentId(selectedStream) === streamId : false;
              return (
                <button
                  key={`rail-${streamId}`}
                  onClick={() => {
                    setSelectedStream(stream);
                    setPreviewUrl(buildLiveStreamUrl(activeConnection, stream));
                  }}
                  className={`min-w-[220px] rounded-[1.2rem] border p-3 text-left transition ${isActive ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                >
                  <p className="truncate text-sm font-semibold text-white">{stream.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{epg[streamId]?.now?.title ?? (guideMessage ? 'Guide unavailable' : 'Guide loading...')}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((stream) => {
            const contentId = getContentId(stream);
            const guide = epg[contentId];
            const selected = displayStream ? getContentId(displayStream) === contentId : false;
            const favourite = favorites.includes(contentId);
            const previewing = selectedStream ? getContentId(selectedStream) === contentId : false;
            const variants = getLiveVariants(stream);
            const topVariant = variants[0] ?? null;
            const categoryFallback = getCategoryFallback(stream, variants);
            return (
              <article
                key={contentId}
                onMouseEnter={() => {
                  setSelectedStream(stream);
                  setPreviewUrl(buildLiveStreamUrl(activeConnection, stream));
                }}
                onFocus={() => {
                  setSelectedStream(stream);
                  setPreviewUrl(buildLiveStreamUrl(activeConnection, stream));
                }}
                className={`group rounded-[1.6rem] border p-4 transition ${selected ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-white/5 hover:-translate-y-1 hover:border-white/20'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{stream.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{categories.find((item) => item.category_id === stream.category_id)?.category_name ?? 'Live'}</p>
                  </div>
                  <button onClick={() => toggleFavorite(activeConnection.id, contentId)} className={`rounded-full px-3 py-1 text-xs ${favourite ? 'bg-amber-400/20 text-amber-300' : 'bg-white/5 text-slate-400'}`}>
                    {favourite ? '★ Saved' : '☆ Save'}
                  </button>
                </div>
                <div className="mt-4 aspect-video rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${stream.preview_art || stream.stream_icon})` }} />
                <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-500">
                  <span>{previewing ? 'Preview armed' : 'Hover to preview'}</span>
                  <span>{contentId}</span>
                </div>
                {topVariant ? (
                  <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-[15rem] flex-1">
                        <ProviderTrustBadge
                          eyebrow="Alternate provider ready"
                          label={`${topVariant.providerName} ranks as the healthiest saved live copy.`}
                          detail={topVariant.warning || 'Exact live fallback is ready without leaving the surf flow.'}
                          tone="emerald"
                          compact
                        />
                      </div>
                      <span className="rounded-full border border-emerald-300/20 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">
                        {variants.length} backup{variants.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                ) : categoryFallback ? (
                  <div className="mt-3 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3 text-sm text-sky-100">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-[15rem] flex-1">
                        <ProviderTrustBadge
                          eyebrow="Category fallback ready"
                          label={`${categoryFallback.providerName} can keep ${categoryFallback.categoryName} surfing alive even without this exact channel copy.`}
                          detail={categoryFallback.warning || 'Same-category rescue is ready when an exact duplicate channel is missing.'}
                          tone="sky"
                          compact
                        />
                      </div>
                      <span className="rounded-full border border-sky-300/20 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-sky-100">
                        Same category rescue
                      </span>
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 space-y-2 text-sm">
                  <p className="text-slate-400">NOW</p>
                  <p className="font-medium text-white">{guide?.now?.title ?? (guideMessage ? 'Guide unavailable right now' : 'Loading EPG...')}</p>
                  <p className="text-slate-400">NEXT</p>
                  <p className="text-slate-200">{guide?.next?.title ?? (guideMessage ? 'Preview and playback still work' : 'Fetching next slot')}</p>
                </div>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => {
                      const url = buildLiveStreamUrl(activeConnection, stream);
                      setSelectedStream(stream);
                      setPreviewUrl(url);
                      playStream(stream, url, activeConnection.id);
                    }}
                    className="flex-1 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-medium text-white hover:bg-violet-400"
                  >
                    Play
                  </button>
                  <button onClick={() => { setSelectedStream(stream); setPreviewUrl(buildLiveStreamUrl(activeConnection, stream)); }} className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:bg-white/5">Preview</button>
                </div>
                {topVariant ? (
                  <div className="mt-3 grid gap-2">
                    <button
                      onClick={() => launchVariant(topVariant)}
                      className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-black hover:bg-emerald-400"
                    >
                      Play on healthiest provider
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!topVariant.playbackUrl) return;
                          setActiveConnection(topVariant.providerId);
                          setSelectedStream({
                            stream_id: topVariant.streamId,
                            name: topVariant.title,
                            stream_type: 'live',
                            category_id: topVariant.categoryId || 'alternate',
                            stream_icon: topVariant.artwork,
                            preview_art: topVariant.artwork,
                          });
                          setPreviewUrl(topVariant.playbackUrl);
                        }}
                        className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:bg-white/5"
                      >
                        Switch provider only
                      </button>
                      <span className="flex items-center rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
                        {topVariant.providerName}
                      </span>
                    </div>
                  </div>
                ) : categoryFallback ? (
                  <div className="mt-3 grid gap-2">
                    <button
                      onClick={() => launchCategoryFallback(categoryFallback)}
                      className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-medium text-slate-950 hover:bg-sky-400"
                    >
                      Open same category on healthiest provider
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setActiveConnection(categoryFallback.providerId);
                          setSelectedCategory(categoryFallback.categoryId || 'all');
                          setSelectedStream(categoryFallback.stream);
                          setPreviewUrl(categoryFallback.playbackUrl);
                        }}
                        className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:bg-white/5"
                      >
                        Switch category only
                      </button>
                      <span className="flex items-center rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
                        {categoryFallback.providerName}
                      </span>
                    </div>
                  </div>
                ) : null}
                {categoryFallback ? (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Fallback route</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2">
                      <div>
                        <p className="text-sm text-white">{categoryFallback.providerName}</p>
                        <p className="text-xs text-slate-400">Jump into {categoryFallback.categoryName} without losing surf momentum.</p>
                      </div>
                      <button
                        onClick={() => launchCategoryFallback(categoryFallback)}
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                      >
                        Open category
                      </button>
                    </div>
                  </div>
                ) : null}
                {variants.length > 1 ? (
                  <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">More saved provider copies</p>
                    {variants.slice(1, 3).map((variant) => (
                      <div key={`${variant.providerId}-${variant.streamId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2">
                        <div>
                          <p className="text-sm text-white">{variant.providerName}</p>
                          <p className="text-xs text-slate-400">Fallback live launch is ready.</p>
                        </div>
                        <button
                          onClick={() => launchVariant(variant)}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                        >
                          Play here
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                {collections.length > 0 ? (
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      if (!event.target.value) return;
                      addItemToCollection(event.target.value, {
                        providerId: activeConnection.id,
                        streamId: contentId,
                        streamType: 'live',
                        title: stream.name,
                        artwork: stream.stream_icon,
                        addedAt: Date.now(),
                      });
                      event.target.value = '';
                    }}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="">Add to collection…</option>
                    {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
                  </select>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-black/30 p-4">
          <div className="relative aspect-video overflow-hidden rounded-[1.4rem] bg-black">
            <VideoPlayer
              src={previewSource}
              poster={displayStream?.stream_icon}
              muted
              onStateChange={(state) => {
                setPreviewState(state);
                if (state === 'playing') {
                  if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                  setShowPreviewFallback(false);
                }
                if (state === 'error') {
                  if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                  setShowPreviewFallback(true);
                }
              }}
            />
            {showPreviewFallback && displayStream ? (
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black via-black/35 to-black/10 p-4">
                <div className="w-full rounded-[1.2rem] border border-white/10 bg-black/60 p-4 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-violet-300">Preview fallback</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="h-14 w-24 rounded-xl bg-cover bg-center"
                      style={{ backgroundImage: `url(${displayStream.preview_art || displayStream.stream_icon || ''})` }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{displayStream.name}</p>
                      <p className="mt-1 text-xs text-slate-300">
                        {previewState === 'error'
                          ? 'Preview could not start. Artwork stays visible so browsing still feels stable.'
                          : 'Preview is taking a moment, keeping artwork visible until playback catches up.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-4 px-2 pb-2">
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Instant channel preview</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{displayStream?.name ?? 'Select a channel'}</h3>
            <p className="mt-2 text-sm text-slate-400">{displayStream ? epg[getContentId(displayStream)]?.now?.title ?? (guideMessage ? 'Guide unavailable, preview still armed.' : 'Guide loading') : 'Choose a channel card to preview or play it here.'}</p>
            {selectedGuide?.next ? <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">Next up: {selectedGuide.next.title}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Health</p>
                <p className={`mt-1 font-medium ${streamHealth.status === 'healthy' ? 'text-emerald-300' : streamHealth.status === 'buffering' ? 'text-amber-300' : streamHealth.status === 'error' ? 'text-rose-300' : 'text-slate-200'}`}>{showPreviewFallback && previewState !== 'playing' ? 'fallback art' : streamHealth.status}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Bitrate</p>
                <p className="mt-1 font-medium text-white">{streamHealth.bitrateKbps ? `${streamHealth.bitrateKbps} kbps` : 'Pending'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Buffer</p>
                <p className="mt-1 font-medium text-white">{streamHealth.bufferSeconds !== null ? `${streamHealth.bufferSeconds}s` : 'Pending'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Video</p>
                <p className="mt-1 font-medium text-white">{streamHealth.resolution ?? streamHealth.codec ?? 'Detecting'}</p>
              </div>
            </div>
            {showPreviewFallback ? (
              <p className="mt-3 text-xs text-slate-500">Preview fallback is active. The card artwork stays up while the player buffers or if autoplay/HLS startup fails.</p>
            ) : streamHealth.message ? <p className="mt-3 text-xs text-slate-500">{streamHealth.message}</p> : null}
            {selectedGuide?.listings?.length ? (
              <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Guide timeline</p>
                <div className="mt-3 space-y-3">
                  {selectedGuide.listings.slice(0, 4).map((listing) => (
                    <div key={listing.id} className="rounded-xl bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span>{new Date(listing.start_timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                        <span>{new Date(listing.stop_timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-white">{listing.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{listing.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">Why this browser matters</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>• NOW and NEXT program data is shown inline, not hidden in a separate guide screen.</li>
            <li>• Hover or focus arms the preview player without navigating away from the grid.</li>
            <li>• Category cards turn the top of Live into a TV-style surf surface, not a dead filter bar.</li>
            <li>• Favorites stay one click from the main channel surface.</li>
            <li>• When a provider degrades, Live now says so clearly and can jump straight into the healthiest saved provider copy, or preserve the same category when an exact duplicate channel is missing.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
