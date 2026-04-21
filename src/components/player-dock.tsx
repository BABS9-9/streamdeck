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

  if (!currentStream || !playbackUrl || !currentProviderId) return null;

  const contentId = currentStream.stream_id ?? currentStream.series_id ?? 0;
  const historyItem = watchHistory.find((item) => item.id === `${currentProviderId}-${contentId}`);

  return (
    <div className="fixed bottom-4 right-4 z-50 hidden w-[420px] max-w-[calc(100vw-2rem)] rounded-[1.8rem] border border-white/10 bg-black/85 p-4 shadow-2xl shadow-black/50 backdrop-blur xl:block">
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
                : `${formatSeconds(historyItem?.positionSeconds)} watched${historyItem?.durationSeconds ? ` of ${formatSeconds(historyItem.durationSeconds)}` : ''}`}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] ${streamHealth.status === 'healthy' ? 'bg-emerald-400/15 text-emerald-200' : streamHealth.status === 'buffering' ? 'bg-amber-400/15 text-amber-200' : streamHealth.status === 'error' ? 'bg-rose-400/15 text-rose-200' : 'bg-white/10 text-slate-300'}`}>
            {streamHealth.status}
          </span>
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
  );
}
