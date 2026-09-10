import React from "react";

interface HeroVideoBackgroundProps {
  videoUrl: string;
  overlayOpacity?: number;
  children?: React.ReactNode;
}

export function HeroVideoBackground({ 
  videoUrl, 
  overlayOpacity = 0.5,
  children 
}: HeroVideoBackgroundProps) {
  return (
    <div className="relative w-full h-[60vh] overflow-hidden rounded-lg mb-8">
      <video
        autoPlay
        loop
        muted
        playsInline
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
    </div>
  );
}
