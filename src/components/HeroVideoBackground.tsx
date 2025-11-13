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
      
      <div 
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity }}
      />
      
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-white">
        {children}
      </div>
    </div>
  );
}
