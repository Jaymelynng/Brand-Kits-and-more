import { useMemo, useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { GymLogo } from "@/hooks/useGyms";
import { useToast } from "@/hooks/use-toast";

interface LogoCatalogProps {
  logos: GymLogo[];
  primaryColor: string;
}

/** The three things a person is ever looking for. */
const SECTIONS = [
  { key: "main", label: "Main logo" },
  { key: "variations", label: "Logo variations" },
  { key: "themed", label: "Themed logos" },
] as const;
type Section = (typeof SECTIONS)[number]["key"];

const GROUNDS = [
  { key: "light", label: "Light", bg: "#FFFFFF" },
  { key: "dark", label: "Dark", bg: "#0B1119" },
  { key: "brand", label: "Brand", bg: "" },
  { key: "check", label: "Checker", bg: "" },
] as const;
type Ground = (typeof GROUNDS)[number]["key"];

const CHECKER =
  "repeating-conic-gradient(#CBD5E1 0% 25%, #F1F5F9 0% 50%) 50% / 16px 16px";

/** A treatment whose whole point is decoration rather than the bare mark. */
const DECORATED = /sticker|backdrop|gradient frame|glow|shadow/i;

const sectionOf = (l: GymLogo): Section => {
  const v = l.variant || "";
  const t = l.treatment || "";
  if (v === "Needs review" || DECORATED.test(t)) return "themed";
  if (v === "Styles") return "variations";
  return "main";
};

export const LogoCatalog = ({ logos, primaryColor }: LogoCatalogProps) => {
  const [section, setSection] = useState<Section>("main");
  const [ground, setGround] = useState<Ground>("light");
  const [onlyTransparent, setOnlyTransparent] = useState(false);
  const [colorway, setColorway] = useState<string | null>(null);
  const [open, setOpen] = useState<GymLogo | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const bySection = useMemo(() => {
    const m: Record<Section, GymLogo[]> = { main: [], variations: [], themed: [] };
    logos.forEach((l) => m[sectionOf(l)].push(l));
    return m;
  }, [logos]);

  const colourways = useMemo(() => {
    const s = new Set<string>();
    bySection[section].forEach((l) => {
      const c = l.colorway;
      if (c) s.add(c);
    });
    return [...s].sort();
  }, [bySection, section]);

  const shown = useMemo(() => {
    return bySection[section].filter((l) => {
      if (onlyTransparent && l.has_alpha === false) return false;
      if (colorway && l.colorway !== colorway) return false;
      return true;
    });
  }, [bySection, section, onlyTransparent, colorway]);

  const groundStyle = (g: Ground) =>
    g === "brand"
      ? { background: primaryColor }
      : g === "check"
        ? { backgroundImage: CHECKER }
        : { background: GROUNDS.find((x) => x.key === g)!.bg };

  const copyUrl = (l: GymLogo) => {
    navigator.clipboard.writeText(l.file_url).then(() => {
      setCopied(l.id);
      setTimeout(() => setCopied(null), 1500);
      toast({ description: "Link copied", duration: 1500 });
    });
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* What kind of thing you are after */}
      <div className="flex shrink-0 gap-2 overflow-x-auto lg:w-48 lg:flex-col lg:overflow-visible">
        {SECTIONS.map((s) => {
          const n = bySection[s.key].length;
          const on = section === s.key;
          return (
            <button
              key={s.key}
              onClick={() => {
                setSection(s.key);
                setColorway(null);
              }}
              className="flex shrink-0 items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-all duration-150"
              style={{
                background: on ? primaryColor : "#F1F4F8",
                color: on ? "#FFFFFF" : "#41505F",
                boxShadow: on ? `0 4px 14px ${primaryColor}55` : "none",
              }}
            >
              {s.label}
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-extrabold"
                style={{
                  background: on ? "rgba(255,255,255,0.25)" : "#DCE3EB",
                  color: on ? "#FFFFFF" : "#5B6B7C",
                }}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0 flex-1">
        {/* Facets. Every one of these is measured, not typed in. */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-[#EEF2F6] p-1">
            {GROUNDS.map((g) => (
              <button
                key={g.key}
                onClick={() => setGround(g.key)}
                className="rounded px-2.5 py-1 text-[11px] font-extrabold transition-colors"
                style={{
                  background: ground === g.key ? "#FFFFFF" : "transparent",
                  color: ground === g.key ? "#101820" : "#697887",
                  boxShadow: ground === g.key ? "0 1px 3px rgba(16,24,32,0.18)" : "none",
                }}
              >
                {g.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setOnlyTransparent((v) => !v)}
            className="rounded-full px-3 py-1.5 text-[11px] font-extrabold transition-colors"
            style={{
              background: onlyTransparent ? "#1C7A5A" : "#EEF2F6",
              color: onlyTransparent ? "#FFFFFF" : "#697887",
            }}
          >
            Transparent only
          </button>

          {colourways.map((c) => (
            <button
              key={c}
              onClick={() => setColorway(colorway === c ? null : c)}
              title={c}
              className="h-6 w-6 rounded-full transition-transform duration-150 hover:scale-110"
              style={{
                background: c,
                border: colorway === c ? "2px solid #101820" : "1px solid #00000022",
                boxShadow: colorway === c ? `0 0 0 3px ${c}55` : "none",
              }}
            />
          ))}

          <span className="ml-auto text-[11px] font-bold text-muted-foreground">
            {shown.length} of {bySection[section].length}
          </span>
        </div>

        {/* One dense sheet. No stacked groups, no infinite column. */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
          {shown.map((l) => (
            <button
              key={l.id}
              onClick={() => setOpen(l)}
              title={l.treatment || l.filename}
              className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl p-2 transition-all duration-150 hover:z-10 hover:scale-105"
              style={{ ...groundStyle(ground), border: "1px solid #E2E8F0" }}
            >
              <img
                src={l.file_url}
                alt={l.filename}
                loading="lazy"
                className="max-h-full max-w-full object-contain"
              />
              {l.has_alpha === false && (
                <span
                  className="absolute right-1 top-1 h-2 w-2 rounded-full"
                  title="has a solid background"
                  style={{ background: "#9A3412" }}
                />
              )}
            </button>
          ))}
          {shown.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm font-semibold text-muted-foreground">
              Nothing matches those filters.
            </p>
          )}
        </div>
      </div>

      {/* One file, big, on whatever ground you picked */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(6,10,16,0.72)" }}
          onClick={() => setOpen(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex min-h-[300px] items-center justify-center p-8"
              style={groundStyle(ground)}
            >
              <img
                src={open.file_url}
                alt={open.filename}
                className="max-h-[46vh] max-w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">
                  {open.treatment || open.variant || open.filename}
                </div>
                <div className="text-xs font-semibold text-muted-foreground">
                  {open.width} × {open.height}
                  {open.has_alpha === false && " · solid background"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyUrl(open)}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold hover:bg-muted"
                >
                  {copied === open.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === open.id ? "Copied" : "Copy link"}
                </button>
                <a
                  href={open.file_url}
                  download={open.filename}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white"
                  style={{ background: primaryColor }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
                <button
                  onClick={() => setOpen(null)}
                  className="flex items-center rounded-lg border px-2.5 py-2 hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
