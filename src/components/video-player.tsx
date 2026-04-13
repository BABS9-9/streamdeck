'use client';

import Hls from 'hls.js';
import { useEffect, useRef } from 'react';

export function VideoPlayer({ src, poster }: { src: string | null; poster?: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
  }, [src]);

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
