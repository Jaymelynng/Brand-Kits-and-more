import { Copy, Download, Star } from "lucide-react";
import { GymLogo } from "@/hooks/useGyms";
import { shade, readableOn, luminance } from "@/lib/shade";

interface PrimaryShowcaseProps {
  logos: GymLogo[];
  palette: string[];
  isAdmin: boolean;
  onDownload: (url: string, filename: string) => void;
  onCopy: (url: string) => void;
  onSetDisplay: (logoId: string) => void;
}

/**
 * The primary logos, on their own, above the library.
 *
 * A carousel is a showcase device, not a finding device - you can admire five
 * things in one, you cannot scan eighty. Sitting inside the gallery it was
 * fighting the job of the gallery and losing. Up here it has the job it is
 * actually good at: this is the brand, at a glance, for whoever opens the
 * page. Everything below is the workbench.
 */
export const PrimaryShowcase = ({
  logos, palette, isAdmin, onDownload, onCopy, onSetDisplay,
}: PrimaryShowcaseProps) => {
  if (logos.length === 0) return null;

  const accent = palette[0] || "#41505F";
  const darkest = [...palette].sort((a, b) => luminance(a) - luminance(b))[0];
  const ink = darkest && luminance(darkest) < 0.5 ? darkest : shade(accent, 0.55);
  const onInk = readableOn(ink, "#FFFFFF");
  const onAccent = readableOn(accent, "#FFFFFF");

  const lift = (edge: string) => `0 3px 0 ${edge}, 0 7px 14px rgba(11,15,20,0.22)`;

  return (
    <div
      className="mb-4 rounded-2xl bg-white p-5"
      style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.30), 0 8px 20px rgba(0,0,0,0.20)" }}
    >
      <div className="mb-4 flex items-baseline gap-3">
        <h3 className="text-[20px] font-black" style={{ color: ink }}>
          Primary logos
        </h3>
        <span className="text-[12px] font-bold" style={{ color: ink, opacity: 0.65 }}>
          {logos.length === 1 ? "the mark" : `${logos.length} approved marks`}
        </span>
      </div>

      {/* Scrolls sideways rather than autoplaying: nothing slides out from
          under a cursor that is reaching for it. */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {logos.map(logo => (
          <div
            key={logo.id}
            className="flex shrink-0 flex-col rounded-xl p-3"
            style={{ width: 236, border: `2px solid ${ink}`, boxShadow: lift(ink) }}
          >
            <div className="relative mb-3 flex h-[168px] items-center justify-center rounded-lg bg-[#F7F9FB] p-3">
              <img
                src={logo.file_url}
                alt={logo.filename}
                loading="lazy"
                className="max-h-full max-w-full object-contain"
              />
              {logo.is_main_logo && (
                <span
                  className="absolute right-2 top-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                  style={{ background: accent, color: onAccent }}
                >
                  <Star className="h-3 w-3" />
                  On display
                </span>
              )}
            </div>

            <div
              className="mb-2 truncate text-[13px] font-bold"
              title={logo.filename}
              style={{ color: ink }}
            >
              {logo.filename}
            </div>

            <div className="mt-auto flex flex-col gap-1.5">
              <button
                onClick={() => onDownload(logo.file_url, logo.filename)}
                className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-extrabold"
                style={{ background: accent, color: onAccent, boxShadow: lift(shade(accent, 0.4)) }}
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
              <button
                onClick={() => onCopy(logo.file_url)}
                className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold"
                style={{ background: "#FFFFFF", color: ink, border: `2px solid ${ink}` }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy URL
              </button>
              {isAdmin && !logo.is_main_logo && (
                <button
                  onClick={() => onSetDisplay(logo.id)}
                  className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold"
                  style={{ background: ink, color: onInk }}
                >
                  <Star className="h-3.5 w-3.5" />
                  Use as display
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
