import type { GymLogo } from '@/hooks/useGyms';

export const isActiveLogo = (logo: GymLogo) =>
  logo.variant !== 'Retired' && logo.variant !== 'Needs review';

export const compareLogoOrder = (a: GymLogo, b: GymLogo) =>
  (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER)
  || (a.created_at || '').localeCompare(b.created_at || '')
  || a.id.localeCompare(b.id);

/** Reordering a filtered category changes its slots, not other categories. */
export function mergeLogoOrder(all: GymLogo[], reordered: GymLogo[]): string[] {
  const ids = new Set(reordered.map(logo => logo.id));
  let next = 0;
  return all.map(logo => ids.has(logo.id) ? reordered[next++].id : logo.id);
}
