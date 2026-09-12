import type { FontPairing } from '@/hooks/useFontPairings';
import type { GymElement, GymLogo, GymWithColors } from '@/hooks/useGyms';
import { bundledFont, fontSource } from './brandKitFonts';
import { luminance } from './shade';
import { compareLogoOrder, isActiveLogo } from './logoOrder';
import { elementCollectionName, elementFilename, loadElementFile } from './brandElements';
import { brandPresentation, type BrandExample, type BrandPresentation } from './brandExamples';
import { assetFilename, fetchAssetFile, inspectAsset, safeFilename, uniqueAssetPath, type AssetInfo } from './assetFiles';
export { safeFilename, saveDownload } from './assetFiles';

export interface KitLogo extends AssetInfo {
  logo: GymLogo;
  blob: Blob;
  path: string;
  sha256: string;
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
export interface KitExample extends Omit<KitLogo, 'logo'> {
  example: BrandExample;
}
export interface BrandKit {
  gym: GymWithColors;
  pairings: FontPairing[];
  logos: KitLogo[];
  elements: KitElement[];
  examples: KitExample[];
  presentation?: BrandPresentation;
  fonts: KitFont[];
  palette: string[];
  created: string;
  url: string;
  notes: string[];
}

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

export async function prepareBrandKit(gym: GymWithColors, pairings: FontPairing[], onProgress: (text: string) => void): Promise<BrandKit> {
  const originals = gym.logos.filter(isActiveLogo).sort(compareLogoOrder);
  if (!originals.length) throw new Error('No active logos are saved for this gym.');
  const palette = [...new Set(gym.colors.map(c => c.color_hex.toUpperCase()))];
  if (!palette.length || palette.some(c => !/^#[0-9A-F]{6}$/.test(c))) throw new Error('Save valid brand colors before downloading the kit.');
  const paths = new Set<string>();
  const logos: KitLogo[] = [];
  // Keep every active category, using original bytes; animation is never flattened in the ZIP.
  for (let i = 0; i < originals.length; i += 4) {
    onProgress(`Collecting logos ${i + 1}–${Math.min(i + 4, originals.length)} of ${originals.length}…`);
    const batch = await Promise.all(originals.slice(i, i + 4).map(async logo => {
      const blob = await fetchAssetFile(logo.file_url, logo.filename);
      const [preview, digest] = await Promise.all([inspectAsset(blob), crypto.subtle.digest('SHA-256', await blob.arrayBuffer())]);
      return { logo, blob, sha256: [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join(''), ...preview };
    }));
    batch.forEach(file => logos.push({ ...file, path: uniqueAssetPath(`Logos/${safeFilename(file.logo.variant || 'Uncategorized')}/${assetFilename(file.logo.filename, file.blob)}`, paths) }));
  }
  const elementFolder = elementCollectionName(gym.elements);
  onProgress(`Collecting ${elementFolder.toLowerCase()}…`);
  const elements: KitElement[] = [];
  const elementPaths = new Set<string>();
  for (let i = 0; i < gym.elements.length; i += 4) {
    const plannedElements = gym.elements.slice(i, i + 4).map(element => {
      const base = elementFilename(element);
      let name = base, n = 2;
      while (elementPaths.has(name.toLowerCase())) name = base.replace(/(\.[^.]+)$/, `-${n++}$1`);
      elementPaths.add(name.toLowerCase());
      return { element, path: `${elementFolder}/${safeFilename(element.element_type)}/${name}` };
    });
    elements.push(...await Promise.all(plannedElements.map(async ({ element, path }) => {
      const blob = await loadElementFile(element);
      const [preview, digest] = await Promise.all([inspectAsset(blob), crypto.subtle.digest('SHA-256', await blob.arrayBuffer())]);
      return { element, blob, path, sha256: [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join(''), ...preview };
    })));
  }
  onProgress('Collecting design examples…');
  const presentation = brandPresentation(gym.code);
  const examples: KitExample[] = await Promise.all((presentation?.examples || []).map(async example => {
    const blob = await fetchAssetFile(example.image, example.title);
    const [preview, digest] = await Promise.all([inspectAsset(blob), crypto.subtle.digest('SHA-256', await blob.arrayBuffer())]);
    return { example, blob, path: `Examples/${assetFilename(example.id, blob)}`,
      sha256: [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join(''), ...preview };
  }));
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
  if (!logos.some(l => l.format === 'SVG')) notes.push('No SVG logo artwork is included. Confirm artwork and color requirements with your production supplier. Embroidery requires a separate digitized stitch file.');
  else if (presentation?.vectorNote) notes.push(presentation.vectorNote);
  fonts.filter(f => !f.blob).forEach(f => notes.push(`${f.family} ${f.weight}: use the source link in Fonts; its installable file is not bundled.`));
  return { gym, pairings, logos, elements, examples, presentation, fonts, palette, created: new Date().toISOString(),
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
  const elementFolder = elementCollectionName(kit.elements.map(item => item.element));
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const root = zip.folder(`${safeFilename(kit.gym.code)}-Brand-Kit`)!;
  root.file(`${safeFilename(kit.gym.code)}-Brand-Guide.pdf`, pdf);
  kit.logos.forEach(l => root.file(l.path, l.blob));
  kit.elements.forEach(e => root.file(e.path, e.blob));
  const graphicPaths = new Set(kit.elements.map(e => e.path.toLowerCase()));
  for (const e of kit.elements.filter(e => e.format === 'SVG')) {
    root.file(uniqueAssetPath(e.path.replace(/\.svg$/i, '.png'), graphicPaths), await (await fetch(e.preview)).blob());
  }
  kit.examples.forEach(e => root.file(e.path, e.blob));
  if (kit.examples.length) root.file('Examples/Read-me.txt', [
    'Adapted design examples', '',
    'These compositions demonstrate the brand in use. They are not sent campaign screenshots, live offers or send-ready email templates.',
    'Historical discounts and countdowns are not reproduced. Verify current details and test the email implementation before sending.', '',
    ...kit.examples.flatMap(({ example: e, path }) => [e.title, `File: ${path}`, `Based on: ${e.source.campaign.trim()} (${e.source.date})`, e.description, ...e.principles, '']),
  ].join('\n'));
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
    'Start with the PDF guide. Logos contains every active logo, organized by its saved category and preserved in its original format.',
    'Fonts contains installable files where available, licenses, pairing weights and source links.',
    'Colors contains HEX/RGB values plus CSS, JSON and a GIMP-compatible palette.',
    ...(kit.examples.length ? ['Examples contains adapted campaign compositions. These are design references, not current offers or send-ready email templates.'] : []),
    ...(kit.elements.length ? [`${elementFolder} contains ${kit.elements.length} saved ${elementFolder.toLowerCase()} in their original formats.`, 'For email, download the PNG or copy its URL from the online kit. Preserve its proportions when sizing it to the email width.'] : []),
    ...(kit.elements.some(e => e.format === 'SVG') ? ['SVG graphics also include transparent PNG companions for email. Social-platform symbols are provided as artwork; use them only with your own account links and follow the platform brand guidelines. Glyph sources and licenses are recorded inside the SVG files.'] : []),
    'Transparent logo files have clear pixels, not a printed checkerboard. A white logo needs a dark surface.',
    'Keep logo proportions. Choose a file that reads clearly on its background. Do not enlarge raster files past a useful size.',
    'Email logos, variations, themed artwork and animations are included when saved. Retired and Needs review artwork are excluded. Uncategorized is an unfiled category, not a claim of approval.',
    'Font pairings are starting points for campaigns, not restrictions on creative work.', '',
    ...kit.notes, '', `Online library: ${kit.url}`, `Exported: ${kit.created}`,
  ].join('\n'));
  root.file('Contents.json', JSON.stringify({ gym: kit.gym.name, code: kit.gym.code, exported_at: kit.created, source: kit.url,
    logos: kit.logos.map(l => ({ file: l.path, name: l.logo.filename, category: l.logo.variant || 'Uncategorized', format: l.format, bytes: l.bytes, duration_seconds: l.duration, width: l.width, height: l.height, transparent: l.transparent, sha256: l.sha256, source: l.logo.file_url })),
    graphics: kit.elements.map(e => ({ file: e.path, name: e.element.display_name, type: e.element.element_type, width: e.width, height: e.height, transparent: e.transparent, sha256: e.sha256 })),
    examples: kit.examples.map(e => ({ file: e.path, name: e.example.title, kind: e.example.kind, width: e.width, height: e.height, sha256: e.sha256, source_campaign: e.example.source })),
    pairings: kit.pairings.map(({ name, heading_font, heading_weight, body_font, body_weight, accent_font, accent_weight, email_fallback, notes, sample_heading, sample_body, sample_source }) =>
      ({ name, heading_font, heading_weight, body_font, body_weight, accent_font, accent_weight, email_fallback, notes, sample_heading, sample_body, sample_source })),
    colors, notes: kit.notes }, null, 2));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
