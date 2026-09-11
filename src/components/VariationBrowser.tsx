import { useMemo, useState } from "react";
import { Copy, Download, Eye } from "lucide-react";
import { GymLogo } from "@/hooks/useGyms";
import { LogoMedia } from "./LogoMedia";
import { contrast } from "@/lib/shade";

interface VariationBrowserProps {
  logos: GymLogo[];
  gymCode: string;
  primaryColor: string;
  secondaryColor: string;
  onDownload: (url: string, name: string) => void;
  onCopy: (url: string) => void;
  onPreview: (logo: GymLogo) => void;
}

/**
 * The question a logo variation exists to answer is "what will this survive
 * on?" - not "what is it called". So the ground under the mark is the control:
 * flip it and a file that vanishes on black stops being a mystery.
 */
const GROUNDS = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "brand", label: "Brand" },
] as const;

type Ground = (typeof GROUNDS)[number]["key"];

export const VariationBrowser = ({
  logos,
  gymCode,
  primaryColor,
  secondaryColor, onDownload, onCopy, onPreview,
}: VariationBrowserProps) => {
  const [ground, setGround] = useState<Ground>("light");
  const [activeId, setActiveId] = useState<string | null>(logos[0]?.id ?? null);

  // Group by whatever the row actually carries. Treatment is the real axis
  // when it is populated; variant is the fallback for older rows.
  const groups = useMemo(() => {
    const m = new Map<string, GymLogo[]>();
    logos.forEach((l) => {
      const key = l.treatment || l.variant || "Other";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(l);
    });
    return [...m.entries()];
  }, [logos]);

  const active = logos.find((l) => l.id === activeId) || logos[0];
  if (!active) return null;

  const stageBg =
    ground === "light"
      ? "#FFFFFF"
      : ground === "dark"
        ? "#0B1119"
        : ground === "brand"
          ? primaryColor
          : undefined;

  const w = active.width as number | undefined;
  const h = active.height as number | undefined;
  const hasAlpha = active.has_alpha as boolean | undefined;

  return (
    <div data-logo-variations className="min-w-0 rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
      {/* The stage */}
      <div
        className="flex flex-col items-center gap-3 rounded-xl p-3 transition-colors duration-300 sm:p-4"
        style={{ background: stageBg }}
      >
        <div className="flex h-[clamp(160px,45cqi,260px)] w-full min-w-0 items-center justify-center">
          <LogoMedia
            key={active.id}
            url={active.file_url}
            alt={active.filename}
            className="h-full max-w-full object-contain"
          />
        </div>
        <style>{`@keyframes varIn{0%{opacity:0;transform:scale(0.97)}100%{opacity:1;transform:scale(1)}}`}</style>

        {/* what this file actually is, measured */}
        <div className="flex w-full flex-wrap gap-1.5">
          {w && h && (
            <span className="rounded-full bg-black/65 px-2.5 py-1 text-[15px] font-bold text-white">
              {w} × {h}
            </span>
          )}
          {hasAlpha != null && (
            <span
              className="rounded-full px-2.5 py-1 text-[15px] font-bold text-white"
              style={{ background: hasAlpha ? "#1C7A5A" : "#9A3412" }}
            >
              {hasAlpha ? "transparent" : "solid background"}
            </span>
          )}
        </div>

        {/* pick the ground */}
        <div className="order-first flex self-end gap-1 rounded-lg bg-black/65 p-1">
          {GROUNDS.map((g) => (
            <button
              key={g.key}
              onClick={() => setGround(g.key)}
              aria-pressed={ground === g.key}
              className="min-h-11 cursor-pointer rounded px-2.5 py-1 text-[15px] font-extrabold transition-colors hover:brightness-90"
              style={{
                background: ground === g.key ? "#FFFFFF" : "transparent",
                color: ground === g.key ? "#0B1119" : "#FFFFFF",
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* What it is, and what to do with it */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full min-w-0">
          <div className="break-words text-[15px] font-bold text-foreground" title={active.filename}>
            {active.filename}
          </div>
          {active.colorway && (
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-full border"
                style={{ background: active.colorway, borderColor: "#00000022" }}
              />
              <span className="text-xs font-semibold text-muted-foreground">
                {active.colorway}
              </span>
            </div>
          )}
        </div>
        <div className="variation-actions flex w-full flex-wrap gap-2">
          <button
            onClick={() => onCopy(active.file_url)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[15px] font-bold hover:bg-muted"
          >
            <Copy className="h-3.5 w-3.5" /> Copy URL
          </button>
          <button
            onClick={() => onDownload(active.file_url, active.filename)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[15px] font-bold text-white"
            style={{ background: primaryColor, color: contrast(primaryColor, "#FFFFFF") >= 4.5 ? "#FFFFFF" : "#111111" }}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          <button onClick={() => onPreview(active)} className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-[15px] font-bold text-white hover:bg-slate-700"><Eye className="h-4 w-4" />Preview</button>
        </div>
      </div>

      {/* The filmstrip, grouped. Every variation on screen at once. */}
      <div className="mt-4 space-y-3">
        {groups.map(([name, items]) => (
          <div key={name}>
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="text-[15px] font-extrabold tracking-wider text-muted-foreground">
                {name.toUpperCase()}
              </span>
              <span className="text-[15px] font-bold text-muted-foreground/60">{items.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((l) => {
                const on = l.id === active.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setActiveId(l.id)}
                    title={l.filename}
                    aria-label={`Preview ${l.filename}`}
                    aria-pressed={on}
                    className="flex h-14 w-16 items-center justify-center rounded-lg p-1 transition-all duration-150"
                    style={{
                      background: ground === "dark" ? "#0B1119" : "#FFFFFF",
                      border: `2px solid ${on ? primaryColor : "#E5E9EF"}`,
                      boxShadow: on ? `0 0 0 3px ${primaryColor}44` : "none",
                      transform: on ? "translateY(-2px)" : "none",
                    }}
                  >
                    <LogoMedia url={l.file_url} alt="" className="max-h-full max-w-full object-contain" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
