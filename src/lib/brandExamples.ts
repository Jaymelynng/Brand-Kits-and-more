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
  examples: BrandExample[];
}

// These are curated presentation choices, separate from saved logo approval/categories.
// A gym without a supplied presentation continues to use its current saved assets.
const presentations = import.meta.glob<BrandPresentation>('/public/brand-examples/*/manifest.json', { eager: true, import: 'default' });

export function brandPresentation(code: string): BrandPresentation | undefined {
  return presentations[`/public/brand-examples/${code}/manifest.json`];
}
