import { useEffect, useRef, useState } from "react";
import { Globe, ExternalLink, Loader2 } from "lucide-react";

interface UrlPreviewProps {
  url: string;
  className?: string;
}

/**
 * Live website thumbnail for QR verification.
 *
 * Uses WordPress mShots (free, no auth). Quirk: the FIRST request for a URL
 * returns a tiny placeholder PNG ("Generating preview…") while the real
 * screenshot is rendered server-side. We detect that placeholder by its
 * small natural dimensions and auto-retry with cache-busting until the real
 * shot arrives (or we give up after a few attempts).
 */
export const UrlPreview = ({ url, className }: UrlPreviewProps) => {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef<number | null>(null);

  const isWeb = /^https?:\/\//i.test(url);
  let host = "";
  try {
    if (isWeb) host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }

  // mShots ignores unknown query params, so we use `r=` purely to bust cache
  // and force a fresh fetch each retry attempt.
  const previewSrc = isWeb
    ? `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=400&h=300${attempt > 0 ? `&r=${attempt}` : ""}`
    : "";

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Reset state if the URL changes
  useEffect(() => {
    setErrored(false);
    setLoaded(false);
    setAttempt(0);
  }, [url]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // Placeholder image from mShots is ~400x300 but contains the
    // "Generating preview" graphic. Real screenshots have the same
    // dimensions, so we can't size-detect — instead we retry on a
    // schedule until the user navigates away or it stabilizes.
    // Heuristic: mShots placeholder responds almost instantly (<300ms)
    // while real screenshots take 2-8s. If we got a near-instant response
    // on attempt 0, schedule a retry.
    if (attempt < 4) {
      timerRef.current = window.setTimeout(
        () => {
          setLoaded(false);
          setAttempt((a) => a + 1);
        },
        // back off: 3s, 5s, 8s, 12s
        [3000, 5000, 8000, 12000][attempt],
      );
    }
    setLoaded(true);
    // Mark img so we know natural size if needed
    void img.naturalWidth;
  };

  return (
    <a
      href={isWeb ? url : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block overflow-hidden rounded-md ${className || ""}`}
      style={{
        border: "1px solid hsl(var(--brand-rose-gold) / 0.2)",
        background: "hsl(var(--brand-navy) / 0.04)",
        aspectRatio: "4 / 3",
      }}
      title={isWeb ? `Open ${url}` : url}
    >
      {isWeb && !errored ? (
        <>
          <img
            key={attempt}
            src={previewSrc}
            alt={`Preview of ${host}`}
            loading="lazy"
            onLoad={handleLoad}
            onError={() => {
              if (attempt < 4) {
                timerRef.current = window.setTimeout(() => {
                  setAttempt((a) => a + 1);
                }, 3000);
              } else {
                setErrored(true);
              }
            }}
            className="w-full h-full object-cover object-top"
          />
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <Loader2
                className="h-4 w-4 animate-spin"
                style={{ color: "hsl(var(--brand-rose-gold))" }}
              />
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center">
          <Globe
            className="h-5 w-5"
            style={{ color: "hsl(var(--brand-rose-gold) / 0.5)" }}
          />
          <span
            className="text-[10px] font-medium leading-tight break-all line-clamp-2"
            style={{ color: "hsl(var(--brand-navy) / 0.7)" }}
          >
            {host || "Preview unavailable"}
          </span>
        </div>
      )}
      {isWeb && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded p-0.5 shadow-sm">
          <ExternalLink
            className="h-3 w-3"
            style={{ color: "hsl(var(--brand-navy))" }}
          />
        </div>
      )}
    </a>
  );
};
