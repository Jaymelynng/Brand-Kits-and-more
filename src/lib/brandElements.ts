import type { GymElement } from '@/hooks/useGyms';

export const elementTypes = ['divider', 'banner', 'shape', 'background', 'icon', 'other'];

/** Name the saved collection by its contents, without promising absent asset types. */
export function elementCollectionName(elements: readonly Pick<GymElement, 'element_type'>[], plural = true) {
  const types = [...new Set(elements.map(element => element.element_type))];
  const names: Record<string, string> = { divider: 'Divider', banner: 'Banner', shape: 'Shape', background: 'Background', icon: 'Icon' };
  const name = types.length === 1 ? names[types[0]] || 'Graphic' : 'Graphic';
  return plural ? `${name}s` : name;
}

export const isInlineSvg = (value: string) => /^\s*</.test(value) && /<svg(?:\s|>)/i.test(value);

export function elementSource(element: GymElement) {
  return isInlineSvg(element.svg_data)
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(element.svg_data)}`
    : element.svg_data;
}

export function elementFilename(element: GymElement) {
  const extension = isInlineSvg(element.svg_data) ? 'svg'
    : new URL(element.svg_data, window.location.origin).pathname.match(/\.([a-z0-9]+)$/i)?.[1] || 'png';
  const name = [...(element.display_name || element.element_type)].filter(c => c.charCodeAt(0) >= 32).join('').replace(/\.[a-z0-9]+$/i, '')
    .replace(/[<>:"/\\|?*]/g, '-').replace(/^\.+|[. ]+$/g, '').trim().slice(0, 150) || 'graphic';
  return `${name}.${extension}`;
}

export async function loadElementFile(element: GymElement) {
  if (isInlineSvg(element.svg_data)) return new Blob([element.svg_data], { type: 'image/svg+xml' });
  const response = await fetch(element.svg_data, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`Could not download ${element.display_name || element.element_type} (HTTP ${response.status}).`);
  const blob = await response.blob();
  if (!blob.size || !blob.type.startsWith('image/')) throw new Error(`${element.display_name || element.element_type} did not return an image.`);
  return blob;
}
