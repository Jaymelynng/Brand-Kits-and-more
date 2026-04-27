import { useState } from "react";
import { Globe, ExternalLink } from "lucide-react";

interface UrlPreviewProps {
  url: string;
  className?: string;
}

/**
 * Live website thumbnail for QR verification.
 * Uses WordPress mShots (free, no auth, returns PNG screenshot of the URL).
 * Lazy-loaded; gracefully falls back to a hostname tile on error.
 */
export const UrlPreview = ({ url, className }: UrlPreviewProps) => {
  const [errored, setErrored] = useState(false);

  const isWeb = /^https?:\/\//i.test(url);
  let host = "";
  try {
    if (isWeb) host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }

  const previewSrc = isWeb
    ? `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=400&h=300`
    : "";

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
        <img
          src={previewSrc}
          alt={`Preview of ${host}`}
          loading="lazy"
          onError={() => setErrored(true)}
          className="w-full h-full object-cover object-top"
        />
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
