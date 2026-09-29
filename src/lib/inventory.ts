import type { Tables } from '@/integrations/supabase/types';

export type InventorySource = 'gym_logos' | 'gym_elements' | 'gym_assets' | 'gym_asset_assignments';
export type InventoryKind = 'Logos' | 'Graphics' | 'Library';
export type InventoryItem = {
  key: string; id: string; source: InventorySource; kind: InventoryKind;
  filename: string; file_url: string; gymIds: string[]; gyms: string; allGyms: boolean;
  group: string; treatment: string; colorway: string; featured: boolean;
  tags: string[]; created: string; raw: Record<string, unknown>;
};
export type InventoryChange = { source: InventorySource; id: string; before: Record<string, string | null>; after: Record<string, string | null> };
export type InventorySnapshot = {
  logos: Tables<'gym_logos'>[]; elements: Tables<'gym_elements'>[]; assets: Tables<'gym_assets'>[];
  assignments: Tables<'gym_asset_assignments'>[]; categories: Tables<'asset_categories'>[];
};

export function makeInventory(data: InventorySnapshot, gyms: { id: string; code: string; logos?: { id: string; tags?: string[] }[] }[]): InventoryItem[] {
  const codes = new Map(gyms.map(g => [g.id, g.code]));
  const tags = new Map(gyms.flatMap(g => (g.logos || []).map(l => [l.id, l.tags || []] as const)));
  const base = (source: InventorySource, raw: { id: string; created_at?: string | null }, gymIds: string[], allGyms = false) => ({
    key: `${source}:${raw.id}`, id: raw.id, source, raw, gymIds, allGyms,
    gyms: allGyms ? 'All gyms' : gymIds.map(id => codes.get(id) || 'Unknown gym').join(', ') || 'Unassigned',
    treatment: '', colorway: '', featured: false, tags: [] as string[], created: raw.created_at || '',
  });
  return [
    ...data.logos.map(l => ({ ...base('gym_logos', l, l.gym_id ? [l.gym_id] : []), kind: 'Logos' as const,
      filename: l.filename, file_url: l.file_url, group: l.variant || 'Uncategorized', treatment: l.treatment || '', colorway: l.colorway || '', featured: !!l.is_main_logo, tags: tags.get(l.id) || [] })),
    ...data.elements.map(e => ({ ...base('gym_elements', e, [e.gym_id]), kind: 'Graphics' as const,
      filename: e.display_name || e.element_type, file_url: /^\s*</.test(e.svg_data) ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(e.svg_data)}` : e.svg_data, group: e.element_type })),
    ...data.assets.flatMap(a => {
      const assigned = data.assignments.filter(x => x.asset_id === a.id);
      const shared = { kind: 'Library' as const, filename: a.filename, group: data.categories.find(c => c.id === a.category_id)?.name || 'Uncategorized' };
      return [{ ...base('gym_assets', a, assigned.map(x => x.gym_id), !!(a.is_all_gyms || a.is_global)), ...shared, file_url: a.file_url },
        ...assigned.filter(x => x.file_url && x.file_url !== a.file_url).map(x => ({ ...base('gym_asset_assignments', x, [x.gym_id]), ...shared, file_url: x.file_url! }))];
    }),
  ].sort((a, b) => a.gyms.localeCompare(b.gyms) || a.filename.localeCompare(b.filename) || a.key.localeCompare(b.key));
}

export type InventoryFilters = { kind: string; gymIds: Set<string>; groups: Set<string>; search: string; featured: boolean };
export function filterInventory(items: InventoryItem[], f: InventoryFilters) {
  const words = f.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(i => (!f.kind || i.kind === f.kind)
    && (!f.gymIds.size || i.allGyms || i.gymIds.some(id => f.gymIds.has(id)) || (!i.gymIds.length && f.gymIds.has('unassigned')))
    && (!f.groups.size || f.groups.has(i.group)) && (!f.featured || i.featured)
    && words.every(word => [i.filename, i.gyms, i.group, i.kind, i.treatment, i.colorway, ...i.tags].join(' ').toLowerCase().includes(word)));
}

/** Selection is independent of pagination. Hidden selections remain explicit in the action bar. */
export function selectRange(previous: Set<string>, orderedKeys: string[], anchor: string | null, key: string, range: boolean, checked: boolean) {
  const next = new Set(previous), start = anchor ? orderedKeys.indexOf(anchor) : -1, end = orderedKeys.indexOf(key);
  const keys = range && start >= 0 && end >= 0 ? orderedKeys.slice(Math.min(start, end), Math.max(start, end) + 1) : [key];
  keys.forEach(k => checked ? next.add(k) : next.delete(k));
  return next;
}

export function publicInventoryUrl(value: string, origin: string) {
  try { const url = new URL(value, origin); return /^https?:$/.test(url.protocol) ? url.href : null; } catch { return null; }
}

export function inventoryUrls(items: InventoryItem[], origin: string) {
  return [...new Set(items.map(i => publicInventoryUrl(i.file_url, origin)).filter((url): url is string => !!url))];
}

export type InventoryDraft = { field: string; value: string; find: string; replace: string };
/** Only changed fields go to the server, so an undo never rewrites unrelated metadata. */
export function inventoryChanges(items: InventoryItem[], draft: InventoryDraft): InventoryChange[] {
  return items.flatMap(item => {
    let field = draft.field, value: string | null = draft.value.trim() || null;
    if (field === 'rename') {
      if (!draft.find || item.source === 'gym_asset_assignments') return [];
      field = item.source === 'gym_elements' ? 'display_name' : 'filename';
      value = item.filename.split(draft.find).join(draft.replace).trim();
      if (!value) throw new Error('A file name cannot be blank.');
    }
    const allowed: Record<InventorySource, string[]> = {
      gym_logos: ['filename', 'variant', 'treatment', 'colorway'],
      gym_elements: ['display_name', 'element_type'], gym_assets: ['filename', 'description', 'category_id'], gym_asset_assignments: [],
    };
    if (!allowed[item.source].includes(field)) return [];
    if (['filename', 'variant', 'element_type'].includes(field) && !value) throw new Error('Choose a non-empty value.');
    const before = item.raw[field] == null ? null : String(item.raw[field]);
    return before === value ? [] : [{ source: item.source, id: item.id, before: { [field]: before }, after: { [field]: value } }];
  });
}

export const reverseInventoryChanges = (changes: InventoryChange[]) => changes.map(c => ({ ...c, before: c.after, after: c.before }));
