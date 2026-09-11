import { CheckSquare, ChevronDown, ChevronUp, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { shade, readableOn, luminance, tint, contrast } from "@/lib/shade";
import { scrollToSection } from "@/lib/utils";

interface CategoryRailProps {
  categories: { name: string; count: number }[];
  activeCategories: string[];
  onToggleCategory: (name: string) => void;
  onClearCategories: () => void;
  total: number;
  /** The gym's own palette. Every colour on the rail comes from it. */
  palette: string[];
  isAdmin: boolean;
  selectionMode: boolean;
  onToggleSelection: () => void;
  /** A share link must not offer a way back into the rest of the app. */
  solo?: boolean;
  sections?: { id: string; label: string; count?: number }[];
}

/**
 * Categories as a column down the left of the gallery rather than a row above
 * it. Two reasons, both from watching it fail as a row: seven pills wrapped
 * onto a second line the moment the window narrowed, and a horizontal bar is
 * only as tall as one line of buttons - so it scrolls away almost immediately
 * and no amount of position:sticky saves it inside a card that ends.
 *
 * A column is naturally tall, so it stays beside the logos the whole way down,
 * and it reads top-to-bottom as a list of places a file can live.
 */
export const CategoryRail = ({
  categories, activeCategories, onToggleCategory, onClearCategories, total, palette,
  isAdmin, selectionMode, onToggleSelection, solo = false, sections = [],
}: CategoryRailProps) => {
  const navigate = useNavigate();
  const accent = palette[0] || "#41505F";
  const darkest = [...palette].sort((a, b) => luminance(a) - luminance(b))[0];
  const ink = darkest && contrast(darkest, '#FFFFFF') >= 4.5 ? darkest : shade(accent, 0.65);
  const onInk = readableOn(ink, "#FFFFFF");
  const onAccent = readableOn(accent, "#FFFFFF");

  const lift = (edge: string) => `0 3px 0 ${edge}, 0 7px 14px rgba(11,15,20,0.22)`;
  const liftHigh = (edge: string) => `0 4px 0 ${edge}, 0 12px 22px rgba(11,15,20,0.30)`;

  const row = (on: boolean, waiting: boolean) =>
    on
      ? {
          background: ink, color: onInk, fontWeight: 800,
          border: `2px solid ${ink}`, boxShadow: liftHigh(shade(ink, 0.45)),
          transform: "translateY(-2px)",
        }
      : waiting
        ? {
            background: "#FFFFFF", color: readableOn("#FFFFFF", accent), fontWeight: 800,
            border: `2px solid ${accent}`, boxShadow: lift(accent),
          }
        : {
            background: "#FFFFFF", color: ink, fontWeight: 700,
            border: `2px solid ${ink}`, boxShadow: lift(ink),
          };

  const chip = (on: boolean, waiting: boolean) =>
    on
      ? { background: "#FFFFFF", color: ink }
      : waiting
        ? { background: accent, color: onAccent }
        : { background: ink, color: onInk };

  return (
    <div
      className="w-full min-w-0 shrink-0 self-start rounded-2xl bg-white p-3 md:sticky md:w-[202px]"
      data-category-rail
      style={{
        // The rail is tall, so it needs far less help than the row did - but
        // sticking it under the gym strip keeps it in reach on a long gallery.
        top: "calc(var(--strip-h, 96px) + 8px)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.30), 0 8px 20px rgba(0,0,0,0.20)",
      }}
    >
      <div
        className="mb-3 px-1 text-[15px] font-extrabold"
        style={{ color: ink }}
      >
        Browse kit
      </div>

      <nav aria-label="Kit sections" className="mb-3 grid grid-cols-2 gap-2 pb-2">
        {sections.map(section => <button key={section.id} type="button"
          onClick={() => scrollToSection(section.id)}
          className="flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[15px] font-bold shadow-md transition-[filter] hover:brightness-125"
          style={{ background: ink, color: '#FFFFFF', gridColumn: section.count !== undefined ? '1 / -1' : undefined }}>
          <span>{section.label}</span>
          {section.count !== undefined && <span className="rounded-full bg-white px-2 text-[13px]" style={{ color: ink }}>{section.count}</span>}
        </button>)}
      </nav>

      <div className="mb-2 px-1 text-[15px] font-bold" style={{ color: ink }}>Logos</div>

      <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">

        {categories.filter(c => isAdmin || c.count > 0).map(c => {
          const on = activeCategories.includes(c.name);
          const waiting = c.name === "Uncategorized" && c.count > 0;
          return (
            <button
              key={c.name}
              aria-pressed={on}
              onClick={() => onToggleCategory(c.name)}
              title={c.name === "Uncategorized"
                ? (c.count ? `${c.count} waiting to be filed` : "Nothing waiting — everything is filed")
                : undefined}
              className="flex w-auto shrink-0 cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[15px] leading-tight transition-all duration-150 hover:brightness-95 active:translate-y-[2px] md:w-full"
              style={row(on, waiting)}
            >
              <span className="min-w-0">{c.name}</span>
              <span
                className="inline-flex min-w-[26px] shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[12px] font-black tabular-nums"
                style={chip(on, waiting)}
              >
                {c.count}
              </span>
            </button>
          );
        })}

        <button
          onClick={onClearCategories}
          aria-pressed={activeCategories.length === 0}
          className="flex w-auto shrink-0 cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-[15px] transition-all duration-150 hover:brightness-95 active:translate-y-[2px] md:w-full"
          style={row(activeCategories.length === 0, false)}
        >
          All logos
          <span
            className="ml-2 inline-flex min-w-[26px] items-center justify-center rounded-full px-1.5 py-0.5 text-[12px] font-black tabular-nums"
            style={chip(activeCategories.length === 0, false)}
          >
            {total}
          </span>
        </button>
      </div>

      {/* Selecting used to live only in the header, so filing a card near the
          bottom of a long gallery meant scrolling all the way up and back
          again. The rail travels down the page, so the switch travels too. */}
      {/* A share link is read-only even for an admin who opens it: the whole
          point of /kit/CODE is that what she sees is what the vendor sees. */}
      {isAdmin && !solo && (
        <button
          onClick={onToggleSelection}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[14px] font-extrabold transition-all duration-150 active:translate-y-[2px]"
          style={selectionMode
            ? {
                background: accent, color: onAccent, border: `2px solid ${accent}`,
                boxShadow: liftHigh(shade(accent, 0.4)), transform: "translateY(-2px)",
              }
            : { background: ink, color: onInk, border: `2px solid ${ink}`, boxShadow: lift(shade(ink, 0.45)) }}
        >
          <CheckSquare className="h-4 w-4" />
          {selectionMode ? "Done selecting" : "Select"}
        </button>
      )}

      {/* Home and the page jumps, in the gym's colours instead of the app's
          rose, and parked under the categories rather than floating over the
          logos in the middle of the screen. */}
      <div
        className="mt-3 flex items-center justify-center gap-2 border-t pt-3"
        style={{ borderColor: tint(ink, 0.82) }}
      >
        {!solo && (
          <button
            onClick={() => navigate("/")}
            title="Back to dashboard"
            aria-label="Back to dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 active:translate-y-[2px]"
            // onAccent walks white down to a grey on a mid-orange, which
            // reads as neither brand nor deliberate. The gym's own dark tone
            // on its accent is both, and clears 4.5:1.
            style={{ background: accent, color: ink, boxShadow: lift(shade(accent, 0.4)) }}
          >
            <Home className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Back to top"
          aria-label="Back to top"
          className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 active:translate-y-[2px]"
          style={{ background: "#FFFFFF", color: ink, border: `2px solid ${ink}`, boxShadow: lift(ink) }}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
          title="Jump to bottom"
          aria-label="Jump to bottom"
          className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 active:translate-y-[2px]"
          style={{ background: "#FFFFFF", color: ink, border: `2px solid ${ink}`, boxShadow: lift(ink) }}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
