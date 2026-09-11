import React, { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

interface HeroVideoBackgroundProps {
  videoUrl: string;
  overlayOpacity?: number;
  posterUrl?: string;
  title?: string;
  accent?: string;
  children?: React.ReactNode;
}

export function HeroVideoBackground({ 
  videoUrl, 
  overlayOpacity = 0.5,
  posterUrl,
  title,
  accent,
  children 
}: HeroVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [videoUrl]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let visible = false;
    let disposed = false;
    const sync = () => {
      if (paused || !visible || document.hidden) video.pause();
      else void video.play().catch(() => {
        if (!disposed && visible && !document.hidden) setPaused(true);
      });
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(video);
    document.addEventListener('visibilitychange', sync);
    return () => { disposed = true; observer.disconnect(); document.removeEventListener('visibilitychange', sync); video.pause(); };
  }, [videoUrl, paused]);

  return (
    <div className="kit-hero-video relative w-full overflow-hidden rounded-lg mb-8">
      {title && <div className="kit-hero-heading">
        <span className="text-[15px] font-semibold uppercase tracking-[0.16em] text-white">Brand kit</span>
        <h1 className="mt-4 text-balance text-[clamp(30px,3.5vw,52px)] font-bold leading-[1.08] text-white">{title}</h1>
        <span className="mt-6 block h-1 w-16 rounded-full" style={{ background: accent || '#FFFFFF' }} />
      </div>}
      <div className="kit-hero-media">
      <video
        key={videoUrl}
        ref={videoRef}
        loop
        muted
        playsInline
        preload="metadata"
        poster={posterUrl}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
      
      {/* A scrim, not a sheet. Dark where the type sits, clear through the
          middle so the gym itself is still visible behind the mark. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,
            rgba(0,0,0,${overlayOpacity * 0.85}) 0%,
            rgba(0,0,0,${overlayOpacity * 0.30}) 34%,
            rgba(0,0,0,${overlayOpacity * 0.30}) 58%,
            rgba(0,0,0,${overlayOpacity * 0.95}) 100%)`,
        }}
      />
      
      {/* No z-index here on purpose. A z-index would open a new stacking
          context, and mix-blend-mode only blends inside its own context — an
          animated mark on black would then screen against nothing and keep its
          black box. DOM order already paints this above the scrim. */}
      <div className="relative h-full flex flex-col items-center justify-center text-white">
        {children}
      </div>
      {failed && <p className="absolute bottom-3 left-3 rounded-lg bg-slate-950 px-3 py-2 text-[15px] text-white">Introduction unavailable</p>}
      {!failed && <button type="button" aria-label={playing ? 'Pause introduction' : 'Play introduction'} onClick={() => setPaused(playing)}
        className="absolute bottom-3 right-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-white/60 bg-slate-950/90 px-3 py-2 text-[15px] font-semibold text-white shadow-lg hover:bg-slate-700">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{playing ? 'Pause' : 'Play'}
      </button>}
      </div>
    </div>
  );
}
