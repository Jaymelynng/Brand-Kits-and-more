interface LogoMediaProps {
  url: string;
  alt: string;
  className?: string;
}

/** Files an <img> cannot show. */
const VIDEO = /\.(mp4|webm|mov|m4v)(\?|$)/i;

/**
 * Draws a logo whatever its file type.
 *
 * The gallery put every asset in an <img>, so the one genuinely animated
 * mark - TIG's claw strike, a real .mp4 sitting in storage with a correct
 * row pointing at it - rendered as an empty card. A GIF happens to work in
 * an <img>; an MP4 never does.
 */
export const LogoMedia = ({ url, alt, className }: LogoMediaProps) => {
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

  return <img src={url} alt={alt} loading="lazy" className={className} />;
};
