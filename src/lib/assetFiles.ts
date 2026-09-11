import type { GymLogo } from '@/hooks/useGyms';

export const safeFilename = (value: string) =>
  [...value.normalize('NFKC')].filter(c => c.charCodeAt(0) >= 32).join('').replace(/[<>:"/\\|?*]/g, '-').replace(/^\.+|[. ]+$/g, '').trim().slice(0, 160) || 'asset';

export interface AssetInfo {
  preview: string;
  width: number;
  height: number;
  transparent: boolean | null;
  lightArtwork: boolean;
  colorful: boolean;
  format: string;
  bytes: number;
  duration?: number;
}

/** Validate the response bytes, including hosts that return an HTML error with HTTP 200. */
export async function fetchAssetFile(url: string, label: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`Could not load ${label} (HTTP ${response.status}).`);
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.slice(0, 1024).arrayBuffer());
  const ascii = new TextDecoder().decode(bytes);
  let type: string;
  if (bytes[0] === 137 && ascii.slice(1, 4) === 'PNG') type = 'image/png';
  else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) type = 'image/jpeg';
  else if (/^GIF8[79]a/.test(ascii)) type = 'image/gif';
  else if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') type = 'image/webp';
  else if (ascii.slice(4, 8) === 'ftyp') type = /avif|avis/.test(ascii.slice(8, 32)) ? 'image/avif' : 'video/mp4';
  else if (bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163) type = 'video/webm';
  else if (ascii.startsWith('%PDF-')) type = 'application/pdf';
  else if (/^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[^]*?-->\s*)?(?:<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(ascii)) type = 'image/svg+xml';
  else throw new Error(`${label} did not return a supported image, animation or PDF. No file was downloaded.`);
  return blob.slice(0, blob.size, type);
}

export const assetFormat = (blob: Blob) => ({ 'image/jpeg': 'JPG', 'image/svg+xml': 'SVG', 'application/pdf': 'PDF' }[blob.type]
  || blob.type.split('/')[1]?.toUpperCase() || 'FILE');

export function assetFilename(name: string, blob: Blob) {
  const ext = assetFormat(blob).toLowerCase();
  const safe = safeFilename(name);
  if (new RegExp(`\\.${ext === 'jpg' ? 'jpe?g' : ext}$`, 'i').test(safe)) return safe;
  return `${safe.replace(/\.(png|jpe?g|gif|webp|svg|avif|mp4|webm|mov|m4v|pdf)$/i, '')}.${ext}`;
}

export function uniqueAssetPath(path: string, used: Set<string>) {
  let candidate = path, number = 2;
  while (used.has(candidate.toLowerCase())) candidate = path.replace(/(\.[^./]+)?$/, (_, ext = '') => `-${number++}${ext}`);
  used.add(candidate.toLowerCase());
  return candidate;
}

export async function inspectAsset(blob: Blob): Promise<AssetInfo> {
  const base = { format: assetFormat(blob), bytes: blob.size };
  if (blob.type === 'application/pdf') return { ...base, preview: '', width: 0, height: 0, transparent: null, lightArtwork: false, colorful: false };
  const url = URL.createObjectURL(blob);
  const video = blob.type.startsWith('video/') ? document.createElement('video') : null;
  try {
    let source: HTMLImageElement | HTMLVideoElement, width: number, height: number;
    if (video) {
      video.preload = 'auto'; video.muted = true; video.playsInline = true;
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => finish(new Error('Animation preview timed out.')), 20000);
        const finish = (error?: Error) => { clearTimeout(timer); video.onloadeddata = null; video.onerror = null; if (error) reject(error); else resolve(); };
        video.onloadeddata = () => finish(); video.onerror = () => finish(new Error('Animation could not be decoded.')); video.src = url;
      });
      // The opening frame can be an intentional black fade. Use a later frame as the poster.
      if (Number.isFinite(video.duration) && video.duration > 0.1) await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => finish(new Error('Animation poster timed out.')), 10000);
        const finish = (error?: Error) => { clearTimeout(timer); video.onseeked = null; video.onerror = null; if (error) reject(error); else resolve(); };
        video.onseeked = () => finish(); video.onerror = () => finish(new Error('Animation poster could not be decoded.'));
        video.currentTime = video.duration * 0.7;
      });
      source = video; width = video.videoWidth; height = video.videoHeight;
    } else {
      const img = new Image(); img.src = url; await img.decode();
      source = img; width = img.naturalWidth; height = img.naturalHeight;
    }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1200 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Image preview is unavailable.');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0, visible = 0, brightness = 0, colored = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 255) clear++;
      if (pixels[i + 3] < 128) continue;
      visible++;
      brightness += pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
      if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) - Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 40) colored++;
    }
    return { ...base, preview: canvas.toDataURL('image/png'), width, height,
      transparent: video || blob.type === 'image/gif' ? null : clear > 0,
      lightArtwork: clear > 0 && visible > 0 && brightness / visible > 190,
      colorful: visible > 0 && colored / visible > 0.2,
      ...(video && Number.isFinite(video.duration) ? { duration: video.duration } : {}) };
  } finally {
    if (video) { video.removeAttribute('src'); video.load(); }
    URL.revokeObjectURL(url);
  }
}

export function saveDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = safeFilename(filename); document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/** All-or-nothing: never silently omit a failed file or overwrite a duplicate name. */
export async function downloadLogoArchive(logos: GymLogo[], filename: string, onProgress: (message: string) => void) {
  if (!logos.length) throw new Error('No logos match this selection.');
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip(), used = new Set<string>();
  let finished = 0;
  for (let offset = 0; offset < logos.length; offset += 4) {
    const files = await Promise.all(logos.slice(offset, offset + 4).map(async logo => ({ logo, blob: await fetchAssetFile(logo.file_url, logo.filename) })));
    files.forEach(({ logo, blob }) => zip.file(uniqueAssetPath(`${safeFilename(logo.variant || 'Uncategorized')}/${assetFilename(logo.filename, blob)}`, used), blob));
    finished += files.length; onProgress(`Preparing ${finished} of ${logos.length} logos…`);
  }
  saveDownload(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), filename);
}
