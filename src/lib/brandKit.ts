import type { FontPairing } from '@/hooks/useFontPairings';
import type { GymElement, GymLogo, GymWithColors } from '@/hooks/useGyms';
import { bundledFont, fontSource } from './brandKitFonts';
import { luminance } from './shade';
import { compareLogoOrder } from './logoOrder';
import { elementFilename, loadElementFile } from './brandElements';

export interface KitLogo {
  logo: GymLogo;
  blob: Blob;
  path: string;
  sha256: string;
  preview: string;
  width: number;
  height: number;
  transparent: boolean;
  lightArtwork: boolean;
  colorful: boolean;
}
export interface KitFont {
  family: string;
  weight: string;
  source: string;
  file?: string;
  blob?: Blob;
  license?: string;
}
export interface KitElement extends Omit<KitLogo, 'logo'> {
  element: GymElement;
}
export interface BrandKit {
  gym: GymWithColors;
  pairings: FontPairing[];
  logos: KitLogo[];
  elements: KitElement[];
  fonts: KitFont[];
  palette: string[];
  created: string;
  url: string;
  notes: string[];
}

export const safeFilename = (value: string) =>
  [...value.normalize('NFKC')].filter(c => c.charCodeAt(0) >= 32).join('').replace(/[<>:"/\\|?*]/g, '-').replace(/^\.+|[. ]+$/g, '').trim().slice(0, 160) || 'asset';

export function primaryLogos(gym: GymWithColors) {
  // Category membership is saved data. Never infer approval from a filename.
  return gym.logos.filter(l => l.variant === 'Primary logos').sort(compareLogoOrder);
}

async function fetchFile(url: string, label: string) {
  let response: Response;
  try { response = await fetch(url, { signal: AbortSignal.timeout(25000) }); }
  catch { throw new Error(`Could not load ${label}. Please try again.`); }
  if (!response.ok) throw new Error(`Could not load ${label} (HTTP ${response.status}).`);
  const blob = await response.blob();
  if (!blob.size || /text\/html/.test(blob.type)) throw new Error(`${label} did not return a usable file.`);
  return blob;
}

async function measureLogo(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Image preview is unavailable.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0, visible = 0, brightness = 0, colored = 0;
    for (let i = 0; i < pixels.length; i += 16) {
      if (pixels[i + 3] < 240) clear++;
      if (pixels[i + 3] < 128) continue;
      visible++;
      brightness += pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
      if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) - Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 40) colored++;
    }
    return { preview: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight,
      transparent: clear > 0, lightArtwork: clear > 0 && visible > 0 && brightness / visible > 150,
      colorful: visible > 0 && colored / visible > 0.2 };
  } catch { throw new Error(`The artwork ${name} cannot be previewed. Check the file before exporting.`); }
  finally { URL.revokeObjectURL(url); }
}

export async function prepareBrandKit(gym: GymWithColors, pairings: FontPairing[], onProgress: (text: string) => void): Promise<BrandKit> {
  const originals = primaryLogos(gym);
  if (!originals.length) throw new Error('Mark a logo as Primary logos before downloading the brand kit.');
  const palette = [...new Set(gym.colors.map(c => c.color_hex.toUpperCase()))];
  if (!palette.length || palette.some(c => !/^#[0-9A-F]{6}$/.test(c))) throw new Error('Save valid brand colors before downloading the kit.');
  onProgress('Collecting primary logos…');
  const paths = new Set<string>();
  const planned = originals.map(logo => {
    const base = safeFilename(logo.filename);
    let name = base, n = 2;
    while (paths.has(name.toLowerCase())) name = base.replace(/(\.[^.]+)?$/, (_, ext = '') => `-${n++}${ext}`);
    paths.add(name.toLowerCase());
    return { logo, path: `Logos/${name}` };
  });
  const logos: KitLogo[] = [];
  // Bounded batches keep large brand libraries from exhausting the browser.
  for (let i = 0; i < planned.length; i += 4) {
    logos.push(...await Promise.all(planned.slice(i, i + 4).map(async ({ logo, path }) => {
      const blob = await fetchFile(logo.file_url, logo.filename);
      const [preview, digest] = await Promise.all([measureLogo(blob, logo.filename), crypto.subtle.digest('SHA-256', await blob.arrayBuffer())]);
      return { logo, blob, path, sha256: [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join(''), ...preview };
    })));
  }
  onProgress('Collecting dividers and graphics…');
  const elements: KitElement[] = [];
  const elementPaths = new Set<string>();
  for (let i = 0; i < gym.elements.length; i += 4) {
    const plannedElements = gym.elements.slice(i, i + 4).map(element => {
      const base = elementFilename(element);
      let name = base, n = 2;
      while (elementPaths.has(name.toLowerCase())) name = base.replace(/(\.[^.]+)$/, `-${n++}$1`);
      elementPaths.add(name.toLowerCase());
      return { element, path: `Graphics/${safeFilename(element.element_type)}/${name}` };
    });
    elements.push(...await Promise.all(plannedElements.map(async ({ element, path }) => {
      const blob = await loadElementFile(element);
      const [preview, digest] = await Promise.all([measureLogo(blob, element.display_name || element.element_type), crypto.subtle.digest('SHA-256', await blob.arrayBuffer())]);
      return { element, blob, path, sha256: [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join(''), ...preview };
    })));
  }
  onProgress('Preparing fonts…');
  const choices = pairings.flatMap(p => [
    { family: p.heading_font, weight: p.heading_weight },
    { family: p.body_font, weight: p.body_weight },
    ...(p.accent_font ? [{ family: p.accent_font, weight: p.accent_weight || '400' }] : []),
  ]);
  const unique = [...new Map(choices.map(f => [`${f.family}:${f.weight}`, f])).values()];
  const fonts: KitFont[] = await Promise.all(unique.map(async (f): Promise<KitFont> => {
    const bundled = bundledFont(f.family, f.weight);
    if (!bundled) return { ...f, source: fontSource(f.family) };
    const [blob, licenseBlob] = await Promise.all([
      fetchFile(`/fonts/${bundled.folder}/${bundled.file}`, f.family),
      fetchFile(`/fonts/${bundled.folder}/OFL.txt`, `${f.family} license`),
    ]);
    return { ...f, source: fontSource(f.family), file: bundled.file, blob, license: await licenseBlob.text() };
  }));
  const notes: string[] = [];
  if (!pairings.length) notes.push('No font pairings are saved for this gym.');
  if (!logos.some(l => /\.svg$/i.test(l.path))) notes.push('The saved primary logos are raster images. A vector master is still needed for large signs, embroidery or other production that requires vector artwork.');
  fonts.filter(f => !f.blob).forEach(f => notes.push(`${f.family} ${f.weight}: use the source link in Fonts; its installable file is not bundled.`));
  return { gym, pairings, logos, elements, fonts, palette, created: new Date().toISOString(),
    url: `${location.origin}/kit/${encodeURIComponent(gym.code)}`, notes };
}

export function kitInk(kit: BrandKit) {
  return [...kit.palette].sort((a, b) => luminance(a) - luminance(b))[0];
}

export function colorValues(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { hex, rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255] };
}

export async function createBrandKitZip(kit: BrandKit, pdf: Blob) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const root = zip.folder(`${safeFilename(kit.gym.code)}-Brand-Kit`)!;
  root.file(`${safeFilename(kit.gym.code)}-Brand-Guide.pdf`, pdf);
  kit.logos.forEach(l => root.file(l.path, l.blob));
  kit.elements.forEach(e => root.file(e.path, e.blob));
  kit.fonts.forEach(f => {
    if (f.blob && f.file) {
      root.file(`Fonts/${safeFilename(f.family)}/${f.file}`, f.blob);
      root.file(`Fonts/${safeFilename(f.family)}/OFL.txt`, f.license!);
    }
  });
  root.file('Fonts/Font-guide.txt', [
    `${kit.gym.name} - Fonts`, '',
    'Open each TTF font file and choose Install. Restart your design app if the font does not appear.',
    'In Canva, choose the exact font name and weight. Upload fonts only where your account supports it.',
    'Keep each OFL license with its font. DM Sans and Fredoka are static instances at the saved weights.', '',
    ...kit.pairings.flatMap(p => [p.name, `Heading: ${p.heading_font} ${p.heading_weight}`, `Body: ${p.body_font} ${p.body_weight}`,
      ...(p.accent_font ? [`Accent: ${p.accent_font} ${p.accent_weight || '400'}`] : []),
      `Email fallback: ${p.email_fallback}`, p.notes || '', '']),
    'Sources', ...kit.fonts.map(f => `${f.family} ${f.weight}: ${f.source}${f.file ? ` (included: ${f.file})` : ' (source link only)'}`),
    'https://github.com/google/fonts',
  ].join('\n'));
  const colors = kit.palette.map(colorValues);
  root.file('Colors/Palette.json', JSON.stringify({ name: kit.gym.name, colors }, null, 2));
  root.file('Colors/Palette.txt', colors.map(c => `${c.hex}   RGB ${c.rgb.join(', ')}`).join('\n') + '\n\nRGB/sRGB values. Ask the printer for a color-managed conversion and proof; no CMYK or Pantone match is specified.');
  root.file('Colors/Palette.css', `:root {\n${kit.palette.map((c, i) => `  --brand-color-${i + 1}: ${c};`).join('\n')}\n}\n`);
  root.file('Colors/Palette.gpl', `GIMP Palette\nName: ${kit.gym.name.replace(/[\r\n]/g, ' ')}\nColumns: ${colors.length}\n#\n${colors.map(c => `${c.rgb.join(' ')} ${c.hex}`).join('\n')}\n`);
  root.file('START-HERE.txt', [
    `${kit.gym.name} - Brand Kit`, '',
    'Start with the PDF guide. Logos contains the saved primary marks in their original formats.',
    'Fonts contains installable files where available, licenses, pairing weights and source links.',
    'Colors contains HEX/RGB values plus CSS, JSON and a GIMP-compatible palette.',
    ...(kit.elements.length ? [`Graphics contains ${kit.elements.length} saved dividers and supporting graphics in their original formats.`, 'For email, download the PNG or copy its URL from the online kit. Preserve its proportions when sizing it to the email width.'] : []),
    'Transparent logo files have clear pixels, not a printed checkerboard. A white logo needs a dark surface.',
    'Keep logo proportions. Choose a file that reads clearly on its background. Do not enlarge raster files past a useful size.',
    'Themed logos, animation, retired artwork and uncategorized files remain in the online library.',
    'Font pairings are starting points for campaigns, not restrictions on creative work.', '',
    ...kit.notes, '', `Online library: ${kit.url}`, `Exported: ${kit.created}`,
  ].join('\n'));
  root.file('Contents.json', JSON.stringify({ gym: kit.gym.name, code: kit.gym.code, exported_at: kit.created, source: kit.url,
    logos: kit.logos.map(l => ({ file: l.path, name: l.logo.filename, width: l.width, height: l.height, transparent: l.transparent, sha256: l.sha256, source: l.logo.file_url })),
    graphics: kit.elements.map(e => ({ file: e.path, name: e.element.display_name, type: e.element.element_type, width: e.width, height: e.height, transparent: e.transparent, sha256: e.sha256 })),
    pairings: kit.pairings.map(({ name, heading_font, heading_weight, body_font, body_weight, accent_font, accent_weight, email_fallback, notes, sample_heading, sample_body, sample_source }) =>
      ({ name, heading_font, heading_weight, body_font, body_weight, accent_font, accent_weight, email_fallback, notes, sample_heading, sample_body, sample_source })),
    colors, notes: kit.notes }, null, 2));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export function saveDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = safeFilename(filename); document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
