'use client';

import Hls from 'hls.js';
import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/player-store';

export function VideoPlayer({ src, poster }: { src: string | null; poster?: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const updateStreamHealth = usePlayerStore((state) => state.updateStreamHealth);
  const resetStreamHealth = usePlayerStore((state) => state.resetStreamHealth);

  useEffect(() => {
    const video = ref.current;

    if (!src) {
      resetStreamHealth();
      if (video) video.removeAttribute('src');
      return;
    }

    if (!video) return;

    let hls: Hls | null = null;
    let metricsTimer: ReturnType<typeof setInterval> | null = null;

    const getBufferSeconds = () => {
      const currentTime = video.currentTime;
      for (let index = 0; index < video.buffered.length; index += 1) {
        const start = video.buffered.start(index);
        const end = video.buffered.end(index);
        if (currentTime >= start && currentTime <= end) {
          return Number((end - currentTime).toFixed(1));
        }
      }
      return 0;
    };

    const pushVideoMetrics = (status?: 'healthy' | 'buffering' | 'degraded') => {
      const quality = video.getVideoPlaybackQuality?.();
      updateStreamHealth({
        status: status ?? 'healthy',
        bufferSeconds: getBufferSeconds(),
        droppedFrames: quality?.droppedVideoFrames ?? null,
        resolution: video.videoWidth && video.videoHeight ? `${video.videoWidth}x${video.videoHeight}` : null,
      });
    };

    const setNativeSource = () => {
      video.src = src;
      updateStreamHealth({ status: 'loading', codec: 'native', message: 'Starting native HLS playback' });
    };

    const handleWaiting = () => pushVideoMetrics('buffering');
    const handlePlaying = () => pushVideoMetrics('healthy');
    const handleError = () => {
      updateStreamHealth({ status: 'error', message: 'Playback error detected' });
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      setNativeSource();
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 });
      hls.loadSource(src);
      hls.attachMedia(video);
      updateStreamHealth({ status: 'loading', message: 'Loading stream manifest' });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const level = hls?.levels?.[hls.currentLevel] ?? hls?.levels?.[0];
        updateStreamHealth({
          status: 'healthy',
          codec: level?.videoCodec ?? level?.codecSet ?? 'HLS',
          bitrateKbps: level?.bitrate ? Math.round(level.bitrate / 1000) : null,
          message: 'Stream ready',
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls?.levels?.[data.level];
        updateStreamHealth({
          bitrateKbps: level?.bitrate ? Math.round(level.bitrate / 1000) : null,
          codec: level?.videoCodec ?? level?.codecSet ?? null,
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        updateStreamHealth({
          status: data.fatal ? 'error' : 'degraded',
          message: data.details,
        });
      });
    } else {
      updateStreamHealth({ status: 'error', message: 'HLS is not supported in this browser' });
    }

    metricsTimer = setInterval(() => {
      if (!video.paused && !video.ended) pushVideoMetrics();
    }, 2000);

    return () => {
      if (metricsTimer) clearInterval(metricsTimer);
      video.pause();
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
      if (hls) hls.destroy();
    };
  }, [src, resetStreamHealth, updateStreamHealth]);

  return (
    <video
      ref={ref}
      className="h-full w-full rounded-2xl bg-black object-cover"
      controls
      autoPlay
      playsInline
      poster={poster}
    />
  );
}
