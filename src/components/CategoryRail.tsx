import { shade, readableOn, luminance, tint } from "@/lib/shade";

interface CategoryRailProps {
  categories: { name: string; count: number }[];
  activeCategories: string[];
  onToggleCategory: (name: string) => void;
  onClearCategories: () => void;
  total: number;
  /** The gym's own palette. Every colour on the rail comes from it. */
  palette: string[];
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
}: CategoryRailProps) => {
  const accent = palette[0] || "#41505F";
  const darkest = [...palette].sort((a, b) => luminance(a) - luminance(b))[0];
  const ink = darkest && luminance(darkest) < 0.5 ? darkest : shade(accent, 0.55);
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
      className="sticky shrink-0 self-start rounded-2xl bg-white p-3"
      style={{
        // The rail is tall, so it needs far less help than the row did - but
        // sticking it under the gym strip keeps it in reach on a long gallery.
        top: "calc(var(--strip-h, 96px) + 8px)",
        width: 202,
        boxShadow: "0 20px 60px rgba(0,0,0,0.30), 0 8px 20px rgba(0,0,0,0.20)",
      }}
    >
      <div
        className="mb-2 px-1 text-[11px] font-extrabold uppercase tracking-wider"
        style={{ color: tint(ink, 0.35) }}
      >
        Categories
      </div>

      <div className="flex flex-col gap-2">

        {categories.map(c => {
          const on = activeCategories.includes(c.name);
          const waiting = c.name === "Uncategorized" && c.count > 0;
          return (
            <button
              key={c.name}
              onClick={() => onToggleCategory(c.name)}
              title={c.name === "Uncategorized"
                ? (c.count ? `${c.count} waiting to be filed` : "Nothing waiting — everything is filed")
                : undefined}
              className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[14px] leading-tight transition-all duration-150 active:translate-y-[2px]"
              style={row(on, waiting)}
            >
              <span className="min-w-0 truncate">{c.name}</span>
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
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[14px] transition-all duration-150 active:translate-y-[2px]"
          style={row(activeCategories.length === 0, false)}
        >
          All
          <span
            className="ml-2 inline-flex min-w-[26px] items-center justify-center rounded-full px-1.5 py-0.5 text-[12px] font-black tabular-nums"
            style={chip(activeCategories.length === 0, false)}
          >
            {total}
          </span>
        </button>
      </div>
    </div>
  );
};
