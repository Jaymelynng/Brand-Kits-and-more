export interface BrandExample {
  id: string;
  title: string;
  image: string;
  description: string;
  principles: string[];
  source: { campaign: string; date: string; sha256: string };
  kind: string;
}

export interface BrandPresentation {
  logoRoles: Partial<Record<'circle' | 'dark' | 'light' | 'white' | 'black' | 'ring' | 'square' | 'glow' | 'holiday', string>>;
  featuredGraphics: string[];
  usageNotes?: Record<string, string>;
  vectorNote?: string;
  examples: BrandExample[];
}

// These are curated presentation choices, separate from saved logo approval/categories.
// A gym without a supplied presentation continues to use its current saved assets.
const presentations = import.meta.glob<BrandPresentation>('/public/brand-examples/*/manifest.json', { eager: true, import: 'default' });

export function brandPresentation(code: string): BrandPresentation | undefined {
  return presentations[`/public/brand-examples/${code}/manifest.json`];
}

/** Only curated file-to-role matches receive usage guidance. */
export function logoUsage(code: string, url: string): string | undefined {
  const presentation = brandPresentation(code);
  if (presentation?.usageNotes?.[url]) return presentation.usageNotes[url];
  const roles = presentation?.logoRoles;
  if (!roles) return undefined;
  const guidance: Record<keyof BrandPresentation['logoRoles'], string> = {
    circle: 'Email headers, signatures & profile images',
    ring: 'Framed badges & profile images',
    square: 'Square layouts & social tiles',
    dark: 'For dark backgrounds',
    light: 'For light backgrounds',
    white: 'One-color artwork on dark backgrounds',
    black: 'One-color artwork on light backgrounds',
    glow: 'Glow treatments for campaign headers',
    holiday: 'Seasonal campaigns',
  };
  const role = (Object.keys(roles) as (keyof typeof roles)[]).find(key => roles[key] === url);
  return role ? guidance[role] : undefined;
}
