'use client';

import { useEffect, useMemo } from 'react';
import { getContentId } from '@/lib/xtream-api';
import { getLiveCategoryRecovery, getLiveProviderVariants } from '@/lib/provider-recovery';
import { buildLivePlayerControlRuntime } from '@/lib/live-player-control-runtime';
import { buildLivePlayerContinuityRuntime } from '@/lib/live-player-continuity-runtime';
import { buildLivePlayerFocusReturnRuntime } from '@/lib/live-player-focus-return-runtime';
import { buildLivePlayerRemoteRuntime } from '@/lib/live-player-remote-runtime';
import { useAuthStore } from '@/stores/auth-store';
import { formatGuideUpdatedAge, getGuidePayload, useLiveGuideStore } from '@/stores/live-guide-store';
import { VideoPlayer } from './video-player';
import { usePlayerStore } from '@/stores/player-store';
import { LivePlayerContinuityPanel } from './live-player-continuity-panel';
import { LivePlayerControlPanel } from './live-player-control-panel';
import { LivePlayerFocusReturnPanel } from './live-player-focus-return-panel';
import { LivePlayerRemotePanel } from './live-player-remote-panel';
import { ProviderFactGrid } from './provider-fact-grid';
import { ProviderRecoveryRail } from './provider-recovery-rail';

const formatSeconds = (value?: number) => {
  if (!value || value <= 0) return '0:00';
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export function PlayerDock() {
  const currentStream = usePlayerStore((state) => state.currentStream);
  const playbackUrl = usePlayerStore((state) => state.playbackUrl);
  const watchHistory = usePlayerStore((state) => state.watchHistory);
  const currentProviderId = usePlayerStore((state) => state.currentProviderId);
  const resumeFromSeconds = usePlayerStore((state) => state.resumeFromSeconds);
  const streamHealth = usePlayerStore((state) => state.streamHealth);
  const controlTelemetry = usePlayerStore((state) => state.controlTelemetry);
  const dockMode = usePlayerStore((state) => state.dockMode);
  const setDockMode = usePlayerStore((state) => state.setDockMode);
  const closePlayback = usePlayerStore((state) => state.closePlayback);
  const playStream = usePlayerStore((state) => state.playStream);
  const connections = useAuthStore((state) => state.connections);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);
  const lastSwitchContext = useAuthStore((state) => state.lastSwitchContext);
  const lookupStreamGuide = useLiveGuideStore((state) => state.lookupStreamGuide);
  const markGuideFromCache = useLiveGuideStore((state) => state.markGuideFromCache);
  const refreshGuideEntry = useLiveGuideStore((state) => state.refreshGuideEntry);
  const getCoverageReport = useLiveGuideStore((state) => state.getCoverageReport);
  const syncByGuideKey = useLiveGuideStore((state) => state.syncByGuideKey);

  const contentId = currentStream ? (currentStream.stream_id ?? currentStream.series_id ?? 0) : 0;
  const historyItem = currentProviderId ? watchHistory.find((item) => item.id === `${currentProviderId}-${contentId}`) : undefined;
  const currentProvider = connections.find((connection) => connection.id === currentProviderId) ?? null;
  const isExpanded = dockMode === 'expanded';
  const currentGuideEntry = currentProviderId ? lookupStreamGuide(currentProviderId, currentStream, Number.MAX_SAFE_INTEGER) : null;
  const currentGuide = getGuidePayload(currentGuideEntry);
  const currentGuideState = currentProviderId ? syncByGuideKey[`${currentProviderId}:${contentId}`] : null;
  const currentGuideCoverage = useMemo(
    () => (currentProviderId && contentId ? getCoverageReport(currentProviderId, [contentId], Number.MAX_SAFE_INTEGER) : null),
    [contentId, currentProviderId, getCoverageReport]
  );
  const statusTone = streamHealth.status === 'healthy'
    ? 'bg-emerald-400/15 text-emerald-200'
    : streamHealth.status === 'buffering'
      ? 'bg-amber-400/15 text-amber-200'
      : streamHealth.status === 'error'
        ? 'bg-rose-400/15 text-rose-200'
        : 'bg-white/10 text-slate-300';

  const liveRecovery = useMemo(() => {
    if (!currentStream || currentStream.stream_type !== 'live' || !currentProviderId) return { topVariant: null, categoryFallback: null };

    const variants = getLiveProviderVariants({
      title: currentStream.name,
      activeConnectionId: currentProviderId,
      connections,
      connectionStatus,
    });

    const topVariant = variants[0] || null;
    if (topVariant) return { topVariant, categoryFallback: null };

    const categoryName = historyItem?.categoryName || currentStream.channel_group || 'Live';

    return {
      topVariant: null,
      categoryFallback: getLiveCategoryRecovery({
        activeConnectionId: currentProviderId,
        connections,
        connectionStatus,
        categoryId: currentStream.category_id,
        categoryName,
      }),
    };
  }, [connectionStatus, connections, currentProviderId, currentStream, historyItem?.categoryName]);

  const livePlayerControlRuntime = useMemo(() => buildLivePlayerControlRuntime({
    currentStream,
    currentProviderId,
    activeConnectionId: currentProviderId,
    connections,
    connectionStatus,
    watchHistory,
    controlTelemetry,
    streamHealthStatus: streamHealth.status,
    dockMode,
    currentGuideCoverage,
    guideContinuity: null,
    lastSwitchContext,
    recoveryTarget: liveRecovery.topVariant
      ? {
          providerId: liveRecovery.topVariant.providerId,
          providerName: liveRecovery.topVariant.providerName,
        }
      : liveRecovery.categoryFallback
        ? {
            providerId: liveRecovery.categoryFallback.providerId,
            providerName: liveRecovery.categoryFallback.providerName,
            categoryName: liveRecovery.categoryFallback.categoryName,
          }
        : null,
  }), [
    connectionStatus,
    connections,
    controlTelemetry,
    currentGuideCoverage,
    currentProviderId,
    currentStream,
    dockMode,
    lastSwitchContext,
    liveRecovery.categoryFallback,
    liveRecovery.topVariant,
    streamHealth.status,
    watchHistory,
  ]);

  const livePlayerRemoteRuntime = useMemo(() => buildLivePlayerRemoteRuntime({
    currentStream,
    currentProviderId,
    activeConnectionId: currentProviderId,
    connections,
    connectionStatus,
    watchHistory,
    controlTelemetry,
    playPauseState: livePlayerControlRuntime.playPauseState,
    seekWindowState: livePlayerControlRuntime.seekWindowState,
    focusReturnState: livePlayerControlRuntime.focusReturnState,
    playbackContinuityState: livePlayerControlRuntime.playbackContinuityState,
    streamHealthStatus: streamHealth.status,
    lastSwitchContext,
    recoveryTarget: liveRecovery.topVariant
      ? {
          providerId: liveRecovery.topVariant.providerId,
          providerName: liveRecovery.topVariant.providerName,
        }
      : liveRecovery.categoryFallback
        ? {
            providerId: liveRecovery.categoryFallback.providerId,
            providerName: liveRecovery.categoryFallback.providerName,
            categoryName: liveRecovery.categoryFallback.categoryName,
          }
        : null,
  }), [
    connectionStatus,
    connections,
    controlTelemetry,
    currentProviderId,
    currentStream,
    lastSwitchContext,
    livePlayerControlRuntime.focusReturnState,
    livePlayerControlRuntime.playPauseState,
    livePlayerControlRuntime.playbackContinuityState,
    livePlayerControlRuntime.seekWindowState,
    liveRecovery.categoryFallback,
    liveRecovery.topVariant,
    streamHealth.status,
    watchHistory,
  ]);

  const livePlayerFocusReturnRuntime = useMemo(() => buildLivePlayerFocusReturnRuntime({
    currentStream,
    currentProviderId,
    activeConnectionId: currentProviderId,
    connections,
    connectionStatus,
    watchHistory,
    focusReturnState: livePlayerControlRuntime.focusReturnState,
    playbackContinuityState: livePlayerControlRuntime.playbackContinuityState,
    streamHealthStatus: streamHealth.status,
    lastSwitchContext,
    recoveryTarget: liveRecovery.topVariant
      ? {
          providerId: liveRecovery.topVariant.providerId,
          providerName: liveRecovery.topVariant.providerName,
        }
      : liveRecovery.categoryFallback
        ? {
            providerId: liveRecovery.categoryFallback.providerId,
            providerName: liveRecovery.categoryFallback.providerName,
            categoryName: liveRecovery.categoryFallback.categoryName,
          }
        : null,
  }), [
    connectionStatus,
    connections,
    currentProviderId,
    currentStream,
    lastSwitchContext,
    livePlayerControlRuntime.focusReturnState,
    livePlayerControlRuntime.playbackContinuityState,
    liveRecovery.categoryFallback,
    liveRecovery.topVariant,
    streamHealth.status,
    watchHistory,
  ]);

  const livePlayerContinuityRuntime = useMemo(() => buildLivePlayerContinuityRuntime({
    currentStream,
    currentProviderId,
    activeConnectionId: currentProviderId,
    connections,
    connectionStatus,
    watchHistory,
    playbackContinuityState: livePlayerControlRuntime.playbackContinuityState,
    streamHealthStatus: streamHealth.status,
    currentGuideCoverage,
    lastSwitchContext,
    recoveryTarget: liveRecovery.topVariant
      ? {
          providerId: liveRecovery.topVariant.providerId,
          providerName: liveRecovery.topVariant.providerName,
        }
      : liveRecovery.categoryFallback
        ? {
            providerId: liveRecovery.categoryFallback.providerId,
            providerName: liveRecovery.categoryFallback.providerName,
            categoryName: liveRecovery.categoryFallback.categoryName,
          }
        : null,
  }), [
    connectionStatus,
    connections,
    currentGuideCoverage,
    currentProviderId,
    currentStream,
    lastSwitchContext,
    livePlayerControlRuntime.playbackContinuityState,
    liveRecovery.categoryFallback,
    liveRecovery.topVariant,
    streamHealth.status,
    watchHistory,
  ]);

  useEffect(() => {
    if (!currentProvider || !currentStream || currentStream.stream_type !== 'live' || !contentId) return;
    markGuideFromCache(currentProvider.id, [contentId]);
    refreshGuideEntry(currentProvider, contentId).catch(() => {});
  }, [contentId, currentProvider, currentStream?.stream_type, markGuideFromCache, refreshGuideEntry]);

  if (!currentStream || !playbackUrl || !currentProviderId) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-4 lg:left-auto lg:right-4 lg:w-[420px] lg:max-w-[calc(100vw-2rem)]">
      <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/90 shadow-2xl shadow-black/50 backdrop-blur">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <button
            onClick={() => setDockMode(isExpanded ? 'compact' : 'expanded')}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <div
              className="h-12 w-20 shrink-0 rounded-xl bg-cover bg-center"
              style={{ backgroundImage: `url(${currentStream.stream_icon || currentStream.cover || ''})` }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{currentStream.name}</p>
              <p className="mt-1 truncate text-xs text-slate-400">
                {currentStream.stream_type === 'live'
                  ? 'Live playback'
                  : `${historyItem?.kind === 'series' && historyItem.seasonNumber && historyItem.episodeNumber ? `S${historyItem.seasonNumber}E${historyItem.episodeNumber} · ` : ''}${formatSeconds(historyItem?.positionSeconds)} watched${historyItem?.durationSeconds ? ` of ${formatSeconds(historyItem.durationSeconds)}` : ''}`}
              </p>
            </div>
          </button>
          <span className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${statusTone}`}>
            {streamHealth.status}
          </span>
          <button
            onClick={() => setDockMode(isExpanded ? 'compact' : 'expanded')}
            className="rounded-full border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-300 hover:bg-white/5"
          >
            {isExpanded ? 'Minimize' : 'Expand'}
          </button>
          <button
            onClick={closePlayback}
            className="rounded-full border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-300 hover:bg-white/5"
          >
            Close
          </button>
        </div>

        {isExpanded ? (
          <div className="p-4">
            <div className="aspect-video overflow-hidden rounded-[1.2rem] bg-black">
              <VideoPlayer
                src={playbackUrl}
                poster={currentStream.stream_icon || currentStream.cover}
                resumeFromSeconds={resumeFromSeconds}
                allowResume={currentStream.stream_type !== 'live'}
              />
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-violet-300">Now playing</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{currentStream.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {currentStream.stream_type === 'live'
                      ? 'Live stream'
                      : `${historyItem?.kind === 'series' && historyItem.seasonNumber && historyItem.episodeNumber ? `S${historyItem.seasonNumber}E${historyItem.episodeNumber} · ` : ''}${formatSeconds(historyItem?.positionSeconds)} watched${historyItem?.durationSeconds ? ` of ${formatSeconds(historyItem.durationSeconds)}` : ''}`}
                  </p>
                  {historyItem?.kind === 'series' && historyItem.seriesTitle ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">{historyItem.seriesTitle}</p>
                  ) : null}
                </div>
              </div>

              <div className="h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.max(4, Math.min(100, Math.round((historyItem?.progress ?? 0) * 100)))}%` }} />
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs text-slate-400">
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="uppercase tracking-[0.22em] text-slate-500">Bitrate</p>
                  <p className="mt-1 text-sm font-medium text-white">{streamHealth.bitrateKbps ? `${streamHealth.bitrateKbps} kbps` : 'Pending'}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="uppercase tracking-[0.22em] text-slate-500">Buffer</p>
                  <p className="mt-1 text-sm font-medium text-white">{streamHealth.bufferSeconds !== null ? `${streamHealth.bufferSeconds}s` : 'Pending'}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="uppercase tracking-[0.22em] text-slate-500">Video</p>
                  <p className="mt-1 text-sm font-medium text-white">{streamHealth.resolution ?? streamHealth.codec ?? 'Detecting'}</p>
                </div>
              </div>

              <LivePlayerControlPanel contract={livePlayerControlRuntime} />
              <LivePlayerContinuityPanel contract={livePlayerContinuityRuntime} />
              <LivePlayerFocusReturnPanel contract={livePlayerFocusReturnRuntime} />
              <LivePlayerRemotePanel contract={livePlayerRemoteRuntime} />

              {currentStream.stream_type === 'live' ? (
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Player now / next</p>
                  {currentGuide?.now ? (
                    <>
                      <p className="mt-3 text-base font-medium text-white">{currentGuide.now.title}</p>
                      {currentGuide.now.description ? <p className="mt-2 text-sm leading-7 text-slate-300">{currentGuide.now.description}</p> : null}
                      {currentGuide.next?.title ? <p className="mt-3 text-sm text-slate-400">Next: {currentGuide.next.title}</p> : null}
                      <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                        {currentGuideState?.source === 'cache' ? 'Saved provider guide' : 'Live provider guide'}
                      </p>
                      {currentGuideCoverage?.freshestUpdatedAt ? (
                        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                          Updated {formatGuideUpdatedAge(currentGuideCoverage.freshestUpdatedAt)}
                        </p>
                      ) : null}
                      {currentGuideCoverage?.status && currentGuideCoverage.status !== 'fresh' ? (
                        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                          Guide continuity: {currentGuideCoverage.summary}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">
                      {currentGuideState?.status === 'refreshing'
                        ? 'Refreshing player guide...'
                        : currentGuideState?.error
                          ? `Player guide refresh failed: ${currentGuideState.error}`
                          : 'Guide data is unavailable for this channel right now.'}
                    </p>
                  )}
                </div>
              ) : null}

              {currentProvider?.lastAuthSummary ? (
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Active playback provider posture</p>
                  <ProviderFactGrid summary={currentProvider.lastAuthSummary} className="mt-4 grid gap-3 sm:grid-cols-2" />
                </div>
              ) : null}

              {currentStream.stream_type === 'live' && (liveRecovery.topVariant || liveRecovery.categoryFallback) ? (
                liveRecovery.topVariant ? (
                  <ProviderRecoveryRail
                    eyebrow="Player recovery rail"
                    title={`${liveRecovery.topVariant.providerName} has a healthier saved copy of this channel.`}
                    detail="Keep playback momentum from the dock instead of forcing the user back through Live."
                    tone="emerald"
                    actions={[
                      {
                        label: 'Play on healthiest provider',
                        onClick: () => {
                          setActiveConnection(liveRecovery.topVariant!.providerId, {
                            sourceSurface: 'player',
                            reason: 'recovery',
                            preservedTitle: currentStream.name,
                          });
                          playStream(liveRecovery.topVariant!.stream!, liveRecovery.topVariant!.playbackUrl!, liveRecovery.topVariant!.providerId, {
                            sourceSurface: 'player',
                          });
                        },
                      },
                      {
                        label: 'Switch only',
                        tone: 'secondary',
                        onClick: () => setActiveConnection(liveRecovery.topVariant!.providerId, {
                          sourceSurface: 'player',
                          reason: 'recovery',
                          preservedTitle: currentStream.name,
                        }),
                      },
                    ]}
                  />
                ) : liveRecovery.categoryFallback ? (
                  <ProviderRecoveryRail
                    eyebrow="Player recovery rail"
                    title={`${liveRecovery.categoryFallback.providerName} can keep ${liveRecovery.categoryFallback.categoryName} surfing alive.`}
                    detail="No exact duplicate survived, so the dock can reopen the same category on a healthier provider."
                    tone="sky"
                    actions={[
                      {
                        label: 'Open same category',
                        onClick: () => {
                          setActiveConnection(liveRecovery.categoryFallback!.providerId, {
                            sourceSurface: 'player',
                            reason: 'recovery',
                            preservedTitle: currentStream.name,
                          });
                          playStream(liveRecovery.categoryFallback!.stream, liveRecovery.categoryFallback!.playbackUrl, liveRecovery.categoryFallback!.providerId, {
                            sourceSurface: 'player',
                          });
                        },
                      },
                      {
                        label: 'Switch only',
                        tone: 'secondary',
                        onClick: () => setActiveConnection(liveRecovery.categoryFallback!.providerId, {
                          sourceSurface: 'player',
                          reason: 'recovery',
                          preservedTitle: currentStream.name,
                        }),
                      },
                    ]}
                  />
                ) : null
              ) : null}
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4">
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.max(4, Math.min(100, Math.round((historyItem?.progress ?? 0) * 100)))}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="uppercase tracking-[0.2em] text-slate-500">Bitrate</p>
                <p className="mt-1 text-white">{streamHealth.bitrateKbps ? `${streamHealth.bitrateKbps} kbps` : 'Pending'}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="uppercase tracking-[0.2em] text-slate-500">Buffer</p>
                <p className="mt-1 text-white">{streamHealth.bufferSeconds !== null ? `${streamHealth.bufferSeconds}s` : 'Pending'}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="uppercase tracking-[0.2em] text-slate-500">Video</p>
                <p className="mt-1 text-white">{streamHealth.resolution ?? streamHealth.codec ?? 'Detecting'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
