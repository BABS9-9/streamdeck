'use client';

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
