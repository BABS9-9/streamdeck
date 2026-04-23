'use client';

import Hls from 'hls.js';
import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/player-store';

export function VideoPlayer({
  src,
  poster,
  resumeFromSeconds = 0,
  allowResume = false,
  muted = false,
  onStateChange,
}: {
  src: string | null;
  poster?: string;
  resumeFromSeconds?: number;
  allowResume?: boolean;
  muted?: boolean;
  onStateChange?: (state: 'idle' | 'loading' | 'playing' | 'buffering' | 'error') => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const lastProgressRef = useRef(0);
  const updateStreamHealth = usePlayerStore((state) => state.updateStreamHealth);
  const updatePlaybackProgress = usePlayerStore((state) => state.updatePlaybackProgress);
  const resetStreamHealth = usePlayerStore((state) => state.resetStreamHealth);

  useEffect(() => {
    const video = ref.current;

    if (!src) {
      onStateChange?.('idle');
      resetStreamHealth();
      if (video) video.removeAttribute('src');
      return;
    }

    if (!video) return;

    let hls: Hls | null = null;
    let metricsTimer: ReturnType<typeof setInterval> | null = null;
    let resumed = false;
    onStateChange?.('loading');

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
      onStateChange?.('loading');
      updateStreamHealth({ status: 'loading', codec: 'native', message: 'Starting native HLS playback' });
    };

    const maybeResume = () => {
      if (!allowResume || resumed || !resumeFromSeconds || !Number.isFinite(video.duration) || video.duration <= 0) return;
      resumed = true;
      video.currentTime = Math.min(resumeFromSeconds, Math.max(0, video.duration - 2));
    };

    const handleWaiting = () => {
      onStateChange?.('buffering');
      pushVideoMetrics('buffering');
    };
    const handlePlaying = () => {
      onStateChange?.('playing');
      pushVideoMetrics('healthy');
    };
    const handleLoadedMetadata = () => maybeResume();
    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastProgressRef.current < 3000) return;
      lastProgressRef.current = now;
      updatePlaybackProgress(video.currentTime, Number.isFinite(video.duration) ? video.duration : null);
    };
    const handleEnded = () => updatePlaybackProgress(Number.isFinite(video.duration) ? video.duration : video.currentTime, Number.isFinite(video.duration) ? video.duration : null);
    const handleError = () => {
      onStateChange?.('error');
      updateStreamHealth({ status: 'error', message: 'Playback error detected' });
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      setNativeSource();
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 });
      hls.loadSource(src);
      hls.attachMedia(video);
      onStateChange?.('loading');
      updateStreamHealth({ status: 'loading', message: 'Loading stream manifest' });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        maybeResume();
        const level = hls?.levels?.[hls.currentLevel] ?? hls?.levels?.[0];
        onStateChange?.('playing');
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
        onStateChange?.(data.fatal ? 'error' : 'buffering');
        updateStreamHealth({
          status: data.fatal ? 'error' : 'degraded',
          message: data.details,
        });
      });
    } else {
      onStateChange?.('error');
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
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      if (hls) hls.destroy();
    };
  }, [allowResume, onStateChange, poster, resetStreamHealth, resumeFromSeconds, src, updatePlaybackProgress, updateStreamHealth]);

  return (
    <video
      ref={ref}
      className="h-full w-full rounded-2xl bg-black object-cover"
      controls
      autoPlay
      muted={muted}
      playsInline
      poster={poster}
    />
  );
}
