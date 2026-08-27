'use client';

import Hls from 'hls.js';
import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { PlayerTrackOption } from '@/lib/types';

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
  const currentProviderId = usePlayerStore((state) => state.currentProviderId);
  const markProviderDrop = usePlayerStore((state) => state.markProviderDrop);
  const updateStreamHealth = usePlayerStore((state) => state.updateStreamHealth);
  const updatePlaybackProgress = usePlayerStore((state) => state.updatePlaybackProgress);
  const updateControlTelemetry = usePlayerStore((state) => state.updateControlTelemetry);
  const resetStreamHealth = usePlayerStore((state) => state.resetStreamHealth);
  const resetControlTelemetry = usePlayerStore((state) => state.resetControlTelemetry);
  const pendingTrackCommand = usePlayerStore((state) => state.pendingTrackCommand);
  const clearTrackCommand = usePlayerStore((state) => state.clearTrackCommand);

  useEffect(() => {
    const video = ref.current;

    if (!src) {
      onStateChange?.('idle');
      resetStreamHealth();
      resetControlTelemetry();
      if (video) video.removeAttribute('src');
      return;
    }

    if (!video) return;

    let hls: Hls | null = null;
    let metricsTimer: ReturnType<typeof setInterval> | null = null;
    let resumed = false;
    onStateChange?.('loading');
    updateControlTelemetry({
      playbackState: 'loading',
      isMuted: muted,
      volumeLevel: null,
      audioTrackCount: 0,
      subtitleTrackCount: 0,
      audioTracks: [],
      subtitleTracks: [],
      hasSelectedAudioTrack: false,
      hasSelectedSubtitleTrack: false,
      selectedAudioTrackLabel: null,
      selectedSubtitleTrackLabel: null,
      seekableWindowSeconds: null,
      durationSeconds: null,
      atLiveEdge: null,
    });

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

    const getAudioTracks = () => {
      const mediaWithAudioTracks = video as HTMLVideoElement & {
        audioTracks?: ArrayLike<{ enabled?: boolean; id?: string; label?: string; language?: string; lang?: string; kind?: string }>;
      };
      return mediaWithAudioTracks.audioTracks ?? null;
    };

    const getAudioTrackOptions = (): PlayerTrackOption[] => {
      const audioTracks = getAudioTracks();
      if (!audioTracks) return [];

      return Array.from({ length: audioTracks.length }, (_, index) => {
        const track = audioTracks[index];
        const label = track?.label?.trim()
          || track?.language?.trim()
          || track?.lang?.trim()
          || `Audio ${index + 1}`;
        const language = track?.language?.trim() || track?.lang?.trim() || null;

        return {
          id: track?.id?.trim() || `audio-${index}`,
          label,
          language,
          kind: 'audio',
          isSelected: Boolean(track?.enabled),
          isForced: false,
        };
      });
    };

    const getSubtitleTrackOptions = (): PlayerTrackOption[] =>
      Array.from(video.textTracks || []).map((track, index) => ({
        id: `${track.id || track.language || 'subtitle'}-${index}`,
        label: track.label?.trim() || track.language?.trim() || `Subtitle ${index + 1}`,
        language: track.language?.trim() || null,
        kind: 'subtitle',
        isSelected: track.mode === 'showing',
        isForced: track.label?.toLowerCase().includes('forced') ?? false,
      }));

    const getSelectedAudioTrack = () => {
      return getAudioTrackOptions().some((track) => track.isSelected);
    };

    const getSelectedSubtitleTrack = () =>
      getSubtitleTrackOptions().some((track) => track.isSelected);

    const getSelectedTrackLabel = (tracks: PlayerTrackOption[]) =>
      tracks.find((track) => track.isSelected)?.label ?? null;

    const getSeekableWindowSeconds = () => {
      if (!video.seekable || video.seekable.length === 0) return null;
      const start = video.seekable.start(0);
      const end = video.seekable.end(video.seekable.length - 1);
      return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Number((end - start).toFixed(1))) : null;
    };

    const getAtLiveEdge = () => {
      if (!video.seekable || video.seekable.length === 0) return null;
      const liveEdge = video.seekable.end(video.seekable.length - 1);
      return liveEdge - video.currentTime <= 8;
    };

    const pushControlTelemetry = (playbackState?: 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error') => {
      const audioTrackOptions = getAudioTrackOptions();
      const subtitleTrackOptions = getSubtitleTrackOptions();
      updateControlTelemetry({
        playbackState: playbackState ?? (video.paused ? 'paused' : 'playing'),
        isMuted: video.muted,
        volumeLevel: Number.isFinite(video.volume) ? Number(video.volume.toFixed(2)) : null,
        audioTrackCount: audioTrackOptions.length,
        subtitleTrackCount: subtitleTrackOptions.length,
        audioTracks: audioTrackOptions,
        subtitleTracks: subtitleTrackOptions,
        hasSelectedAudioTrack: audioTrackOptions.some((track) => track.isSelected),
        hasSelectedSubtitleTrack: subtitleTrackOptions.some((track) => track.isSelected),
        selectedAudioTrackLabel: getSelectedTrackLabel(audioTrackOptions),
        selectedSubtitleTrackLabel: getSelectedTrackLabel(subtitleTrackOptions),
        seekableWindowSeconds: getSeekableWindowSeconds(),
        durationSeconds: Number.isFinite(video.duration) ? Number(video.duration.toFixed(1)) : null,
        atLiveEdge: getAtLiveEdge(),
      });
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
      pushControlTelemetry('loading');
    };

    const maybeResume = () => {
      if (!allowResume || resumed || !resumeFromSeconds || !Number.isFinite(video.duration) || video.duration <= 0) return;
      resumed = true;
      video.currentTime = Math.min(resumeFromSeconds, Math.max(0, video.duration - 2));
    };

    const handleWaiting = () => {
      onStateChange?.('buffering');
      pushVideoMetrics('buffering');
      pushControlTelemetry('buffering');
    };
    const handlePlaying = () => {
      onStateChange?.('playing');
      pushVideoMetrics('healthy');
      pushControlTelemetry('playing');
    };
    const handleLoadedMetadata = () => {
      maybeResume();
      pushControlTelemetry(video.paused ? 'paused' : 'playing');
    };
    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastProgressRef.current < 3000) return;
      lastProgressRef.current = now;
      updatePlaybackProgress(video.currentTime, Number.isFinite(video.duration) ? video.duration : null);
      pushControlTelemetry(video.paused ? 'paused' : 'playing');
    };
    const handleEnded = () => {
      updatePlaybackProgress(Number.isFinite(video.duration) ? video.duration : video.currentTime, Number.isFinite(video.duration) ? video.duration : null);
      pushControlTelemetry('paused');
    };
    const handleError = () => {
      onStateChange?.('error');
      updateStreamHealth({ status: 'error', message: 'Playback error detected' });
      pushControlTelemetry('error');
      if (currentProviderId) {
        markProviderDrop(currentProviderId, 'Playback error detected', 'playback-error');
      }
    };
    const handlePause = () => {
      if (!video.ended) pushControlTelemetry('paused');
    };
    const handleVolumeChange = () => pushControlTelemetry(video.paused ? 'paused' : 'playing');
    const handleTrackListChange = () => pushControlTelemetry(video.paused ? 'paused' : 'playing');

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    Array.from(video.textTracks || []).forEach((track) => {
      track.addEventListener('change', handleTrackListChange);
    });

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
        pushControlTelemetry(video.paused ? 'paused' : 'playing');
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
        pushControlTelemetry(data.fatal ? 'error' : 'buffering');
        if (data.fatal && currentProviderId) {
          markProviderDrop(currentProviderId, data.details || 'Fatal playback error detected', 'playback-error');
        }
      });
    } else {
      onStateChange?.('error');
      updateStreamHealth({ status: 'error', message: 'HLS is not supported in this browser' });
      pushControlTelemetry('error');
    }

    metricsTimer = setInterval(() => {
      if (!video.paused && !video.ended) {
        pushVideoMetrics();
        pushControlTelemetry('playing');
      }
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
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      Array.from(video.textTracks || []).forEach((track) => {
        track.removeEventListener('change', handleTrackListChange);
      });
      if (hls) hls.destroy();
    };
  }, [allowResume, currentProviderId, markProviderDrop, muted, onStateChange, poster, resetControlTelemetry, resetStreamHealth, resumeFromSeconds, src, updateControlTelemetry, updatePlaybackProgress, updateStreamHealth]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !pendingTrackCommand) return;

    const getAudioTracks = () => {
      const mediaWithAudioTracks = video as HTMLVideoElement & {
        audioTracks?: ArrayLike<{ enabled?: boolean; id?: string; label?: string; language?: string; lang?: string; kind?: string }>;
      };
      return mediaWithAudioTracks.audioTracks ?? null;
    };

    const getAudioTrackOptions = (): PlayerTrackOption[] => {
      const audioTracks = getAudioTracks();
      if (!audioTracks) return [];

      return Array.from({ length: audioTracks.length }, (_, index) => {
        const track = audioTracks[index];
        const label = track?.label?.trim()
          || track?.language?.trim()
          || track?.lang?.trim()
          || `Audio ${index + 1}`;
        const language = track?.language?.trim() || track?.lang?.trim() || null;

        return {
          id: track?.id?.trim() || `audio-${index}`,
          label,
          language,
          kind: 'audio',
          isSelected: Boolean(track?.enabled),
          isForced: false,
        };
      });
    };

    const getSubtitleTrackOptions = (): PlayerTrackOption[] =>
      Array.from(video.textTracks || []).map((track, index) => ({
        id: `${track.id || track.language || 'subtitle'}-${index}`,
        label: track.label?.trim() || track.language?.trim() || `Subtitle ${index + 1}`,
        language: track.language?.trim() || null,
        kind: 'subtitle',
        isSelected: track.mode === 'showing',
        isForced: track.label?.toLowerCase().includes('forced') ?? false,
      }));

    const getSelectedTrackLabel = (tracks: PlayerTrackOption[]) =>
      tracks.find((track) => track.isSelected)?.label ?? null;

    let handled = false;
    if (pendingTrackCommand.kind === 'cycle-audio') {
      const audioTracks = getAudioTracks();
      if (audioTracks?.length) {
        const currentIndex = Array.from({ length: audioTracks.length }).findIndex((_, index) => Boolean(audioTracks[index]?.enabled));
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % audioTracks.length : 0;
        Array.from({ length: audioTracks.length }).forEach((_, index) => {
          if (audioTracks[index]) {
            audioTracks[index].enabled = index === nextIndex;
          }
        });
        handled = true;
      }
    }

    if (pendingTrackCommand.kind === 'cycle-subtitle' && video.textTracks.length > 0) {
      const subtitleTracks = Array.from(video.textTracks || []);
      const currentIndex = subtitleTracks.findIndex((track) => track.mode === 'showing');
      const nextIndex = currentIndex >= subtitleTracks.length - 1 ? -1 : currentIndex + 1;
      subtitleTracks.forEach((track, index) => {
        track.mode = index === nextIndex ? 'showing' : 'disabled';
      });
      handled = true;
    }

    if (pendingTrackCommand.kind === 'open-picker') {
      handled = true;
    }

    if (handled) {
      const audioTracks = getAudioTrackOptions();
      const subtitleTracks = getSubtitleTrackOptions();
      updateControlTelemetry({
        playbackState: video.paused ? 'paused' : 'playing',
        isMuted: video.muted,
        volumeLevel: Number.isFinite(video.volume) ? Number(video.volume.toFixed(2)) : null,
        audioTrackCount: audioTracks.length,
        subtitleTrackCount: subtitleTracks.length,
        audioTracks,
        subtitleTracks,
        hasSelectedAudioTrack: audioTracks.some((track) => track.isSelected),
        hasSelectedSubtitleTrack: subtitleTracks.some((track) => track.isSelected),
        selectedAudioTrackLabel: getSelectedTrackLabel(audioTracks),
        selectedSubtitleTrackLabel: getSelectedTrackLabel(subtitleTracks),
      });
    }
    clearTrackCommand();
  }, [clearTrackCommand, pendingTrackCommand, updateControlTelemetry]);

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
