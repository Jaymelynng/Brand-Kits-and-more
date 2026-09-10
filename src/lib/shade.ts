/**
 * Derive shades from a gym's own palette, so a surface is never generic grey.
 *
 * The failure this replaces: chips painted #F1F4F8 with #5B6B7C text - a grey
 * button on white with grey words on it. Low contrast and, worse, nothing to
 * do with the brand. Every gym already has three real colours; tint and shade
 * turn those three into as many surfaces as the UI needs.
 */

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

const parse = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return [90, 107, 124];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map(v => clamp(v).toString(16).padStart(2, "0")).join("")}`;

/** Mix toward white. amount 0 = unchanged, 1 = white. */
export const tint = (hex: string, amount: number) => {
  const [r, g, b] = parse(hex);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
};

/** Mix toward black. amount 0 = unchanged, 1 = black. */
export const shade = (hex: string, amount: number) => {
  const [r, g, b] = parse(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
};

/** Relative luminance, for deciding what text can sit on a colour. */
export const luminance = (hex: string) => {
  const [r, g, b] = parse(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio between two colours, 1 to 21. */
export const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/**
 * A text colour guaranteed to be readable on `bg`, preferring the brand's own
 * dark tone and only darkening it further if the ratio is short of 4.5:1.
 */
export const readableOn = (bg: string, preferred: string) => {
  if (contrast(bg, preferred) >= 4.5) return preferred;
  for (const amount of [0.2, 0.35, 0.5, 0.65, 0.8]) {
    const darker = shade(preferred, amount);
    if (contrast(bg, darker) >= 4.5) return darker;
  }
  return luminance(bg) > 0.45 ? "#0B0F14" : "#FFFFFF";
};
