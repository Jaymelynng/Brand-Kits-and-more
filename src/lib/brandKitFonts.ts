/** Locally packaged, licensed faces. Other saved fonts retain their source links. */
export const bundledFonts = [
  { family: 'Barlow Condensed', weight: '700', folder: 'barlowcondensed', file: 'BarlowCondensed-Bold.ttf' },
  { family: 'DM Sans', weight: '400', folder: 'dmsans', file: 'DMSans-Regular.ttf' },
  { family: 'Fredoka', weight: '600', folder: 'fredoka', file: 'Fredoka-SemiBold.ttf' },
] as const;

export const fontSource = (family: string) => `https://fonts.google.com/specimen/${encodeURIComponent(family).replace(/%20/g, '+')}`;

export const bundledFont = (family: string, weight: string) =>
  bundledFonts.find(f => f.family === family && f.weight === weight);
