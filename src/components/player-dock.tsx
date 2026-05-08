'use client';

import { useMemo } from 'react';
import { buildLiveStreamUrl, getCachedSearchCatalog, getContentId } from '@/lib/xtream-api';
import { getProviderTrustScore } from '@/lib/provider-trust';
import { XtreamStream } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { VideoPlayer } from './video-player';
import { usePlayerStore } from '@/stores/player-store';

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
  const dockMode = usePlayerStore((state) => state.dockMode);
  const setDockMode = usePlayerStore((state) => state.setDockMode);
  const closePlayback = usePlayerStore((state) => state.closePlayback);
  const playStream = usePlayerStore((state) => state.playStream);
  const connections = useAuthStore((state) => state.connections);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const setActiveConnection = useAuthStore((state) => state.setActiveConnection);

  if (!currentStream || !playbackUrl || !currentProviderId) return null;

  const contentId = currentStream.stream_id ?? currentStream.series_id ?? 0;
  const historyItem = watchHistory.find((item) => item.id === `${currentProviderId}-${contentId}`);
  const isExpanded = dockMode === 'expanded';
  const statusTone = streamHealth.status === 'healthy'
    ? 'bg-emerald-400/15 text-emerald-200'
    : streamHealth.status === 'buffering'
      ? 'bg-amber-400/15 text-amber-200'
      : streamHealth.status === 'error'
        ? 'bg-rose-400/15 text-rose-200'
        : 'bg-white/10 text-slate-300';

  const liveRecovery = useMemo(() => {
    if (currentStream.stream_type !== 'live' || !currentProviderId) return { topVariant: null, categoryFallback: null as null | { providerId: string; providerName: string; playbackUrl: string; stream: XtreamStream; categoryName: string } };

    const normalize = (value?: string) => (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const variantKey = `live:${normalize(currentStream.name)}`;
    const variants = connections
      .filter((connection) => connection.id !== currentProviderId)
      .map((connection) => {
        const catalog = getCachedSearchCatalog(connection.id, Number.MAX_SAFE_INTEGER);
        const match = catalog?.live.find((entry) => `live:${normalize(entry.name)}` === variantKey);
        if (!match) return null;
        return {
          providerId: connection.id,
          providerName: connection.name,
          playbackUrl: buildLiveStreamUrl(connection, match),
          stream: match,
          trustScore: getProviderTrustScore(connection, connectionStatus[connection.id]),
        };
      })
      .filter(Boolean)
      .sort((left, right) => (right?.trustScore || 0) - (left?.trustScore || 0));

    const topVariant = variants[0] || null;
    if (topVariant) return { topVariant, categoryFallback: null };

    const categoryName = historyItem?.categoryName || currentStream.channel_group || 'Live';
    const categoryFallbacks = connections
      .filter((connection) => connection.id !== currentProviderId)
      .map((connection) => {
        const catalog = getCachedSearchCatalog(connection.id, Number.MAX_SAFE_INTEGER);
        const match = catalog?.live.find((entry) => normalize(entry.channel_group) === normalize(categoryName));
        if (!match) return null;
        return {
          providerId: connection.id,
          providerName: connection.name,
          playbackUrl: buildLiveStreamUrl(connection, match),
          stream: match,
          categoryName: match.channel_group || categoryName,
          trustScore: getProviderTrustScore(connection, connectionStatus[connection.id]),
        };
      })
      .filter(Boolean)
      .sort((left, right) => (right?.trustScore || 0) - (left?.trustScore || 0));

    return { topVariant: null, categoryFallback: categoryFallbacks[0] || null };
  }, [connectionStatus, connections, currentProviderId, currentStream, historyItem?.categoryName]);

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

              {currentStream.stream_type === 'live' && (liveRecovery.topVariant || liveRecovery.categoryFallback) ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-xs text-emerald-100">
                  <p className="uppercase tracking-[0.22em] text-emerald-200">Player recovery rail</p>
                  <p className="mt-2 text-sm text-slate-100">
                    Keep playback momentum from the dock when this provider goes bad, instead of forcing the user back through Live.
                  </p>
                  {liveRecovery.topVariant ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                      <div>
                        <p className="text-sm text-white">{liveRecovery.topVariant.providerName} has a healthier saved copy of this channel.</p>
                        <p className="mt-1 text-[11px] text-emerald-100/75">Exact live duplicate ready from the player dock.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setActiveConnection(liveRecovery.topVariant!.providerId);
                            playStream(liveRecovery.topVariant!.stream, liveRecovery.topVariant!.playbackUrl, liveRecovery.topVariant!.providerId);
                          }}
                          className="rounded-full border border-white/10 bg-emerald-400 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-black hover:bg-emerald-300"
                        >
                          Play on healthiest provider
                        </button>
                        <button
                          onClick={() => setActiveConnection(liveRecovery.topVariant!.providerId)}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:bg-white/10"
                        >
                          Switch only
                        </button>
                      </div>
                    </div>
                  ) : liveRecovery.categoryFallback ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-300/20 bg-sky-500/10 px-3 py-3 text-sky-50">
                      <div>
                        <p className="text-sm text-white">{liveRecovery.categoryFallback.providerName} can keep {liveRecovery.categoryFallback.categoryName} surfing alive.</p>
                        <p className="mt-1 text-[11px] text-sky-100/80">No exact duplicate survived, so the dock can reopen the same category on a healthier provider.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setActiveConnection(liveRecovery.categoryFallback!.providerId);
                            playStream(liveRecovery.categoryFallback!.stream, liveRecovery.categoryFallback!.playbackUrl, liveRecovery.categoryFallback!.providerId);
                          }}
                          className="rounded-full border border-white/10 bg-sky-400 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-950 hover:bg-sky-300"
                        >
                          Open same category
                        </button>
                        <button
                          onClick={() => setActiveConnection(liveRecovery.categoryFallback!.providerId)}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:bg-white/10"
                        >
                          Switch only
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
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
