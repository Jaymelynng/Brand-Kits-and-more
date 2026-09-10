import { useState } from "react";

interface LogoMediaProps {
  url: string;
  alt: string;
  className?: string;
  onContrast?: (preferDark: boolean) => void;
}

/** Files an <img> cannot show. */
const VIDEO = /\.(mp4|webm|mov|m4v)(\?|$)/i;
const contrastByUrl = new Map<string, boolean>();

/** White transparent artwork needs a dark preview, without changing its file. */
function prefersDarkPreview(img: HTMLImageElement): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  context.drawImage(img, 0, 0, 64, 64);
  const pixels = context.getImageData(0, 0, 64, 64).data;
  let visible = 0;
  let white = 0;
  let transparent = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 16) transparent++;
    if (pixels[i + 3] < 64) continue;
    visible++;
    if (pixels[i] > 225 && pixels[i + 1] > 225 && pixels[i + 2] > 225) white++;
  }
  return transparent > 0 && visible > 0 && white / visible > 0.98;
}

/**
 * Draws a logo whatever its file type.
 *
 * The gallery put every asset in an <img>, so the one genuinely animated
 * mark - TIG's claw strike, a real .mp4 sitting in storage with a correct
 * row pointing at it - rendered as an empty card. A GIF happens to work in
 * an <img>; an MP4 never does.
 */
export const LogoMedia = ({ url, alt, className, onContrast }: LogoMediaProps) => {
  const [corsFailedUrl, setCorsFailedUrl] = useState<string | null>(null);
  if (VIDEO.test(url)) {
    return (
      <video
        src={url}
        className={className}
        // An animated logo should behave like a logo, not like a video
        // player: it loops quietly and needs no one to press anything.
        autoPlay
        loop
        muted
        playsInline
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={className}
      crossOrigin={onContrast && corsFailedUrl !== url ? "anonymous" : undefined}
      onError={() => {
        // External hosts may deny canvas access; still show the original image.
        if (onContrast && corsFailedUrl !== url) setCorsFailedUrl(url);
      }}
      onLoad={(event) => {
        if (!onContrast) return;
        try {
          let preferDark = contrastByUrl.get(url);
          if (preferDark === undefined) {
            preferDark = prefersDarkPreview(event.currentTarget);
            contrastByUrl.set(url, preferDark);
          }
          onContrast(preferDark);
        } catch {
          // Cross-origin images without CORS cannot be sampled.
        }
      }}
    />
  );
};
