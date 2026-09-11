import { jsPDF } from 'jspdf';
import type { BrandKit, KitLogo, KitElement } from './brandKit';
import { colorValues, kitInk } from './brandKit';
import { contrast, readableOn, tint } from './shade';

/** Real PDF pages, with embedded type and original logo artwork; no screenshot of the app. */
export async function createBrandGuide(kit: BrandKit): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true, putOnlyUsedFonts: true });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const M = 38, CW = W - M * 2;
  const ink = kitInk(kit), accent = kit.palette[0], paper = '#FFFFFF';
  const embedded = new Map<string, string>();
  for (const [i, font] of kit.fonts.entries()) {
    if (!font.blob || !font.file) continue;
    const bytes = new Uint8Array(await font.blob.arrayBuffer());
    let binary = '';
    for (let n = 0; n < bytes.length; n += 8192) binary += String.fromCharCode(...bytes.subarray(n, n + 8192));
    const name = `brand-face-${i}`;
    doc.addFileToVFS(font.file, btoa(binary));
    doc.addFont(font.file, name, 'normal');
    embedded.set(`${font.family}:${font.weight}`, name);
  }
  const preferred = kit.pairings.find(p => p.is_preferred) || kit.pairings[0];
  const body = preferred ? embedded.get(`${preferred.body_font}:${preferred.body_weight}`) || 'helvetica' : 'helvetica';
  const setFont = (family?: string, weight?: string) => {
    doc.setFont(family ? embedded.get(`${family}:${weight}`) || body : body, 'normal');
  };
  const text = (value: string, x: number, y: number, size = 12, color = ink, width = CW, family?: string, weight?: string) => {
    setFont(family, weight); doc.setFontSize(size); doc.setTextColor(color);
    // Replace punctuation unsupported by standard PDF fonts only when no embedded face is available.
    const normalized = body === 'helvetica' ? value.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-') : value;
    const lines = doc.splitTextToSize(normalized, width) as string[];
    doc.text(lines, x, y, { lineHeightFactor: 1.3 });
    return y + lines.length * size * 1.3;
  };
  const box = (x: number, y: number, w: number, h: number, fill: string, stroke?: string) => {
    doc.setFillColor(fill); doc.setDrawColor(stroke || fill); doc.roundedRect(x, y, w, h, 10, 10, stroke ? 'FD' : 'F');
  };
  const logoImage = (logo: KitLogo | KitElement, x: number, y: number, w: number, h: number) => {
    if (!logo.preview) { text(`${logo.format} original included`, x + 12, y + h / 2, 14, ink, w - 24); return; }
    const ratio = Math.min(w / logo.width, h / logo.height);
    const dw = logo.width * ratio, dh = logo.height * ratio;
    doc.addImage(logo.preview, 'PNG', x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, logo.sha256, 'FAST');
  };
  const title = (eyebrow: string, heading: string, description?: string) => {
    doc.addPage(); doc.setFillColor(paper); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(accent); doc.rect(M, 31, 36, 4, 'F');
    text(eyebrow.toUpperCase(), M + 48, 37, 10, ink);
    text(heading, M, 83, 30);
    if (description) text(description, M, 111, 12, ink, CW);
  };
  const link = (label: string, url: string, x: number, y: number, width = CW) => {
    const next = text(label, x, y, 11, ink, width);
    doc.link(x, y - 12, Math.min(width, doc.getTextWidth(label)), next - y + 12, { url });
    return next;
  };
  doc.setProperties({ title: `${kit.gym.name} - Brand Guide`, subject: 'Primary logos, colors, typography and practical usage', author: kit.gym.name });

  // Cover: the identity, palette and two entry points, in one brand board.
  doc.setFillColor(ink); doc.rect(0, 0, W, H, 'F');
  text(kit.gym.name.toUpperCase(), M, 43, 13, '#FFFFFF');
  text('BRAND KIT', W - 150, 43, 12, '#FFFFFF', 112);
  text('Brand essentials', M, 106, 42, '#FFFFFF');
  text(kit.elements.length ? 'Logos. Color. Type. Dividers & graphics.' : 'Logos. Color. Type. Ready to use together.', M, 136, 15, '#FFFFFF');
  const coverLogo = kit.logos.find(l => l.logo.is_main_logo && l.preview) || kit.logos.filter(l => l.transparent && l.colorful && l.width / l.height > 2)
    .sort((a, b) => b.width - a.width)[0] || kit.logos.find(l => l.logo.is_main_logo) || kit.logos[0];
  box(M, 164, CW, 192, coverLogo.lightArtwork ? ink : paper, kit.palette[2] || accent);
  logoImage(coverLogo, M + 24, 180, CW - 48, 157);
  const sw = CW / kit.palette.length;
  kit.palette.forEach((c, i) => {
    doc.setFillColor(c); doc.rect(M + i * sw, 380, sw, 60, 'F');
    text(c, M + i * sw + 12, 417, 12, readableOn(c, ink), sw - 24);
  });
  text(`${kit.logos.length} active logos  /  ${kit.palette.length} colors  /  ${kit.pairings.length} font pairings`, M, 478, 16, '#FFFFFF');
  text('Primary marks, email treatments, campaign artwork and original animations. All active categories are included.', M, 507, 12, '#FFFFFF', CW - 60);

  // A separate contact sheet for each saved category keeps email treatments easy to find.
  const groups = new Map<string, KitLogo[]>();
  kit.logos.forEach(logo => { const category = logo.logo.variant || 'Uncategorized'; groups.set(category, [...(groups.get(category) || []), logo]); });
  const orderedGroups = [...groups].sort(([a], [b]) => a === 'Primary logos' ? -1 : b === 'Primary logos' ? 1 : a.localeCompare(b));
  for (const [category, files] of orderedGroups) for (let offset = 0; offset < files.length; offset += 4) {
    title('01 / Logo library', category, `${files.length} original files in Logos/${category}/. Previews of animations show one frame; the files retain their motion.`);
    const gap = 18, cardW = (CW - gap) / 2;
    files.slice(offset, offset + 4).forEach((l, n) => {
      const x = M + (n % 2) * (cardW + gap), y = 136 + Math.floor(n / 2) * 193;
      const ground = l.lightArtwork ? ink : tint(ink, 0.96);
      box(x, y, cardW, 176, paper, tint(ink, 0.8));
      box(x + 9, y + 9, cardW - 18, 100, ground);
      logoImage(l, x + 20, y + 17, cardW - 40, 84);
      text(l.logo.filename, x + 12, y + 129, 11, ink, cardW - 24);
      const details = [l.format, l.width ? `${l.width} x ${l.height} px` : '', l.transparent === null ? '' : l.transparent ? 'Transparent' : 'Solid background'].filter(Boolean).join(' | ');
      text(details, x + 12, y + 161, 10, ink, cardW - 24);
    });
  }

  title('02 / Color', 'The palette', 'Exact HEX and RGB values from the saved brand colors.');
  const colorW = (CW - 14 * (Math.min(4, kit.palette.length) - 1)) / Math.min(4, kit.palette.length);
  // Color pages are paginated rather than shrinking an expanding palette.
  for (let offset = 0; offset < kit.palette.length; offset += 4) {
    if (offset) title('02 / Color', 'The palette / continued');
    kit.palette.slice(offset, offset + 4).forEach((c, n) => {
      const x = M + n * (colorW + 14);
      box(x, 144, colorW, 136, c, tint(ink, 0.8));
      text(c, x + 14, 316, 19, ink, colorW - 28);
      text(`RGB ${colorValues(c).rgb.join(' / ')}`, x + 14, 342, 11, ink, colorW - 28);
      const on = contrast(c, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#101010';
      text('Aa', x + 14, 237, 45, on, colorW - 28);
      text(`${on === '#FFFFFF' ? 'White' : 'Dark'} text on this color`, x + 14, 370, 11, ink, colorW - 28);
    });
    box(M, 403, CW, 112, tint(ink, 0.96));
    text('Using color', M + 18, 428, 17);
    text('Use the palette across backgrounds, type and accents. Keep text readable over every fill. Use a solid field behind a logo when a photograph makes the mark hard to see.', M + 18, 452, 12, ink, CW - 36);
    text('Print: these are RGB/sRGB colors. Ask your printer for a color-managed conversion and proof; no CMYK or Pantone match is specified.', M + 18, 490, 11, ink, CW - 36);
  }

  kit.pairings.forEach(p => {
    title('03 / Typography', p.name, p.notes || 'A starting point for campaign typography.');
    const linkedOnly = [[p.heading_font, p.heading_weight], [p.body_font, p.body_weight]]
      .filter(([family, weight]) => !embedded.has(`${family}:${weight}`)).map(([family]) => family);
    text(`${p.heading_font} ${p.heading_weight} + ${p.body_font} ${p.body_weight}`, M, 149, 14);
    box(M, 166, CW, 222, tint(ink, 0.96));
    const heading = p.sample_heading || kit.gym.name;
    const afterHeading = text(heading, M + 22, 212, 38, ink, CW - 44, p.heading_font, p.heading_weight);
    text(p.sample_body || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789', M + 22, afterHeading + 12, 16, ink, CW - 44, p.body_font, p.body_weight);
    text('ABCDEFGHIJKLM', M + 22, 366, 20, ink, CW - 44, p.heading_font, p.heading_weight);
    let y = text(p.sample_source ? `Campaign sample: ${p.sample_source}. Wording demonstrates type; it is not a current offer.` : 'Type specimen. No campaign offer is implied.', M, 411, 11);
    if (linkedOnly.length) y = text(`${[...new Set(linkedOnly)].join(', ')}: linked, not embedded. The sample uses the document fallback.`, M, y + 7, 11);
    text(`Email fallback: ${p.email_fallback}`, M, Math.max(y + 8, 450), 12);
    text('Use the real fonts in graphics and supported web layouts. In email, use the fallback stack for live text when a client cannot load web fonts.', M, 475, 12, ink, CW);
    link(`Heading font: ${p.heading_font}`, kit.fonts.find(f => f.family === p.heading_font)?.source || kit.url, M, 520, CW / 2);
    link(`Body font: ${p.body_font}`, kit.fonts.find(f => f.family === p.body_font)?.source || kit.url, W / 2, 520, CW / 2);
  });
  if (!kit.pairings.length) {
    title('03 / Typography', 'Typography not yet supplied');
    text('No font pairings are saved for this gym. Add them in the Fonts editor to include them in the next download.', M, 160, 16);
  }

  for (let offset = 0; offset < kit.elements.length; offset += 6) {
    title('04 / Graphics', 'Dividers & graphics', 'Original files are included in Graphics/. Keep their proportions when fitting them to your design.');
    const gap = 18, cardW = (CW - gap) / 2;
    kit.elements.slice(offset, offset + 6).forEach((element, n) => {
      const x = M + (n % 2) * (cardW + gap), y = 136 + Math.floor(n / 2) * 131;
      box(x, y, cardW, 119, paper, tint(ink, 0.8));
      box(x + 8, y + 8, cardW - 16, 55, element.lightArtwork && !element.colorful ? ink : paper);
      logoImage(element, x + 16, y + 11, cardW - 32, 49);
      text(element.element.display_name || element.element.element_type, x + 12, y + 81, 11, ink, cardW - 24);
      text(`${element.width} x ${element.height} px`, x + 12, y + 108, 10, ink, cardW - 24);
    });
  }

  title(`${kit.elements.length ? '05' : '04'} / Use the kit`, 'From file to finished design', 'Practical starting points for marketing work.');
  const rows = [
    ['Choose the right mark', 'Use a transparent logo for flexible placement, a white mark on a dark surface, and a circle or square for compact placements. The preview background is not added to transparent files.'],
    ['Give the logo room', 'Keep the full mark visible. Start with clear space about one quarter of the logo height, then check it in the actual design. Avoid stretching, squashing or rebuilding the lettering with a font.'],
    ['Keep small work readable', 'Judge the logo at its final display size. For email, supply an image around twice its displayed pixel width when an original of that size is available. Preserve aspect ratio.'],
    ['Make type do a job', 'Use the heading face for the message and the body face for the details. The saved pairings are useful starting points; a campaign can take a different direction.'],
    ['Use the full library', 'Email treatments, themed logos and animations are included in their own folders. Keep animated originals for motion. Retired and Needs review files are excluded; Uncategorized files are unfiled.'],
  ];
  let y = 150;
  rows.forEach(([head, copy], i) => {
    box(M, y - 17, 30, 30, accent);
    text(String(i + 1).padStart(2, '0'), M + 6, y + 3, 12, readableOn(accent, ink));
    text(head, M + 48, y, 16);
    const bottom = text(copy, M + 48, y + 22, 12, ink, CW - 48);
    y = bottom + 25;
  });

  title(`${kit.elements.length ? '06' : '05'} / Handoff`, 'What is in the download', 'Open the ZIP once. Start with the guide.');
  const included = [
    ['Brand Guide.pdf', 'The visual guide you are reading, with logo previews, colors, font samples and usage notes.'],
    ['Logos/', `${kit.logos.length} active logos, filed by category, including email treatments and original animations.`],
    ['Fonts/', 'Installable font files where available, family licenses, saved weights and official source links.'],
    ['Colors/', 'HEX/RGB values as text, JSON, CSS variables and a GIMP-compatible palette.'],
    ...(kit.elements.length ? [['Graphics/', `${kit.elements.length} dividers and supporting graphics in their original formats.`]] : []),
    ['Contents.json', 'A file inventory with dimensions, transparency, source URLs and integrity hashes.'],
  ];
  let iy = 153;
  included.forEach(([name, description]) => {
    text(name, M, iy, 16);
    text(description, M + 170, iy, 12, ink, CW - 170);
    iy += kit.elements.length ? 46 : 55;
  });
  if (kit.notes.length) {
    text('Production notes', M, 448, 16);
    const notes = kit.notes.slice(0, 3).join(' ');
    text(notes, M, 470, 11, ink, CW);
  }
  link('Open the current online brand library', kit.url, M, 536);

  const count = doc.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    doc.setPage(i);
    const color = i === 1 ? '#FFFFFF' : ink;
    doc.setDrawColor(i === 1 ? '#FFFFFF' : tint(ink, 0.7)); doc.setLineWidth(0.4); doc.line(M, H - 33, W - M, H - 33);
    text(`${kit.gym.name}  /  Brand guide`, M, H - 17, 9, color);
    text(`${kit.created.slice(0, 10)}  /  ${i} of ${count}`, W - M - 140, H - 17, 9, color, 140);
  }
  return doc.output('blob');
}
