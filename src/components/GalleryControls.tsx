import { CheckSquare, Columns, Grid3X3, LayoutGrid, List, Rows3, Tag as TagIcon } from "lucide-react";
import { shade, readableOn, luminance, tint } from "@/lib/shade";

interface Facet { name: string; count: number }

interface GalleryControlsProps {
  categories: { name: string; count: number }[];
  activeCategories: string[];
  onToggleCategory: (name: string) => void;
  onClearCategories: () => void;
  tagFacets: [string, Facet[]][];
  activeTags: string[];
  onToggleTag: (name: string) => void;
  onClearTags: () => void;
  shown: number;
  total: number;
  /** The gym's own palette, in order. Every colour here comes from it. */
  palette: string[];
  isAdmin: boolean;
  selectionMode: boolean;
  onToggleSelection: () => void;
  onOpenTags: () => void;
  viewMode: string;
  onViewMode: (v: string) => void;
}

/** Five ways to look at the same files. Icons rather than a dropdown, because
 *  a dropdown hides a browseable set behind a click. */
const VIEWS = [
  { key: "carousel", label: "Carousel", Icon: LayoutGrid },
  { key: "grid", label: "Grid", Icon: Grid3X3 },
  { key: "masonry", label: "Masonry", Icon: Columns },
  { key: "list", label: "List", Icon: List },
  { key: "variations", label: "Variations", Icon: Rows3 },
];

/**
 * The filter row. Five things were wrong with the version before this and
 * every one of them is a rule from the philosophy doc:
 *
 *  - no shadow on any pill, so nothing read as a button. "Every card,
 *    container, button and image gets some shadow."
 *  - the count sat orange on a peach pill: orange on orange.
 *  - Tags and Select were white on a white panel.
 *  - the peach itself was invented by tinting the accent toward white - a
 *    fourth colour the brand does not own.
 *  - everything was flat, which is the washed-out look, an automatic reject.
 *
 * Every button here is a physical object: a hard bottom edge in the brand's
 * dark tone plus a soft cast shadow - the "two shadows = a real object" rule -
 * so it looks pressable before it is read. Only the gym's own colours are
 * used, and every text colour goes through readableOn().
 */
export const GalleryControls = ({
  categories, activeCategories, onToggleCategory, onClearCategories,
  tagFacets, activeTags, onToggleTag, onClearTags,
  shown, total, palette, isAdmin, selectionMode, onToggleSelection, onOpenTags,
  viewMode, onViewMode,
}: GalleryControlsProps) => {
  const filtering = activeCategories.length > 0 || activeTags.length > 0;

  const accent = palette[0] || "#41505F";
  const darkest = [...palette].sort((a, b) => luminance(a) - luminance(b))[0];
  const ink = darkest && luminance(darkest) < 0.5 ? darkest : shade(accent, 0.55);
  const onInk = readableOn(ink, "#FFFFFF");
  const onAccent = readableOn(accent, "#FFFFFF");

  /** Tight hard edge + wide soft cast: the two-shadow rule for a real object. */
  const lift = (edge: string) =>
    `0 3px 0 ${edge}, 0 7px 14px rgba(11,15,20,0.22)`;
  const liftHigh = (edge: string) =>
    `0 4px 0 ${edge}, 0 12px 22px rgba(11,15,20,0.30)`;

  const restingPill = {
    background: "#FFFFFF",
    color: ink,
    fontWeight: 700,
    border: `2px solid ${ink}`,
    boxShadow: lift(ink),
  } as const;

  const chosenPill = {
    background: ink,
    color: onInk,
    fontWeight: 800,
    border: `2px solid ${ink}`,
    boxShadow: liftHigh(shade(ink, 0.45)),
    transform: "translateY(-2px)",
  } as const;

  const waitingPill = {
    background: "#FFFFFF",
    color: readableOn("#FFFFFF", accent),
    fontWeight: 800,
    border: `2px solid ${accent}`,
    boxShadow: lift(accent),
  } as const;

  const actionResting = {
    background: ink,
    color: onInk,
    borderColor: ink,
    boxShadow: lift(shade(ink, 0.45)),
  } as const;

  const actionActive = {
    background: accent,
    color: onAccent,
    borderColor: accent,
    boxShadow: liftHigh(shade(accent, 0.4)),
    transform: "translateY(-2px)",
  } as const;

  /** The count never sits colour-on-colour: it is always its own solid chip. */
  const countChip = (on: boolean, waiting: boolean) =>
    on
      ? { background: "#FFFFFF", color: ink }
      : waiting
        ? { background: accent, color: onAccent }
        : { background: ink, color: onInk };

  return (
    <div
      className="sticky z-30 mt-4 rounded-2xl bg-white p-4"
      style={{
        // Sits just under the gym strip, which publishes its own height, so
        // the filters travel down the page with her instead of scrolling away.
        top: "calc(var(--strip-h, 96px) + 8px)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.30), 0 8px 20px rgba(0,0,0,0.20)",
      }}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {/* The count is what a filter is for, so it gets hero weight - in ink,
            never the accent, so it can never land orange on orange. */}
        <div className="flex shrink-0 items-baseline gap-2">
          <span
            className="tabular-nums leading-none"
            style={{ fontSize: 34, fontWeight: 900, color: ink }}
          >
            {shown}
          </span>
          <span
            className="text-[12px] font-extrabold uppercase tracking-wider"
            style={{ color: ink }}
          >
            {filtering ? `of ${total}` : "files"}
          </span>
        </div>

        <div className="h-9 w-px shrink-0" style={{ background: tint(ink, 0.78) }} />

        <div className="min-w-0 flex-1" />

        {/* Actions, not filters - so they are filled, not outlined, and never
            white on the white panel. */}
        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          {tagFacets.length > 0 && (
            <button
              onClick={onOpenTags}
              className="flex items-center gap-2 rounded-full border-2 px-4 py-2 text-[15px] font-extrabold transition-all duration-150 active:translate-y-[2px]"
              style={activeTags.length > 0 ? actionActive : actionResting}
            >
              <TagIcon className="h-4 w-4" />
              Tags
              {activeTags.length > 0 && (
                <span
                  className="inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[12px] font-black"
                  style={{ background: "#FFFFFF", color: accent }}
                >
                  {activeTags.length}
                </span>
              )}
            </button>
          )}

          <div
            className="flex items-center gap-1 rounded-full p-1"
            style={{ background: tint(ink, 0.90) }}
          >
            {VIEWS.map(({ key, label, Icon }) => {
              const on = viewMode === key;
              return (
                <button
                  key={key}
                  onClick={() => onViewMode(key)}
                  title={label}
                  aria-label={label}
                  className="rounded-full p-2 transition-all duration-150"
                  style={on
                    ? { background: ink, color: onInk, boxShadow: lift(shade(ink, 0.45)) }
                    : { background: "transparent", color: ink }}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          {isAdmin && (
            <button
              onClick={onToggleSelection}
              className="flex items-center gap-2 rounded-full border-2 px-4 py-2 text-[15px] font-extrabold transition-all duration-150 active:translate-y-[2px]"
              style={selectionMode ? actionActive : actionResting}
            >
              <CheckSquare className="h-4 w-4" />
              {selectionMode ? "Done" : "Select"}
            </button>
          )}
        </div>
      </div>

      {activeTags.length > 0 && (
        <div
          className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3"
          style={{ borderColor: tint(ink, 0.82) }}
        >
          {activeTags.map(name => (
            <button
              key={name}
              onClick={() => onToggleTag(name)}
              title="Remove"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-extrabold transition-all duration-150 active:translate-y-[2px]"
              style={{
                background: accent,
                color: onAccent,
                border: `2px solid ${accent}`,
                boxShadow: lift(shade(accent, 0.4)),
              }}
            >
              {name}
              <span className="text-base leading-none">×</span>
            </button>
          ))}
          <button
            onClick={onClearTags}
            className="text-[13px] font-extrabold underline"
            style={{ color: ink }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
