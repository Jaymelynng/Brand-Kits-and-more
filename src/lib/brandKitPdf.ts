import { jsPDF } from 'jspdf';
import type { BrandKit, KitLogo, KitElement, KitExample } from './brandKit';
import { colorValues, kitInk } from './brandKit';
import { contrast, describeColor, readableOn, tint } from './shade';
import { elementCollectionName } from './brandElements';

/** A visual usage guide. The complete original-file catalog belongs in the ZIP. */
export async function createBrandGuide(kit: BrandKit): Promise<Blob> {
  const elementCollection = elementCollectionName(kit.elements.map(item => item.element));
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true, putOnlyUsedFonts: true });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const M = 38, CW = W - M * 2;
  const ink = kitInk(kit), accent = kit.palette[0], sky = kit.palette[2] || tint(ink, .8);
  const embedded = new Map<string, string>();
  for (const [i, font] of kit.fonts.entries()) {
    if (!font.blob || !font.file) continue;
    const bytes = new Uint8Array(await font.blob.arrayBuffer());
    let binary = '';
    for (let n = 0; n < bytes.length; n += 8192) binary += String.fromCharCode(...bytes.subarray(n, n + 8192));
    const name = `brand-face-${i}`;
    doc.addFileToVFS(font.file, btoa(binary)); doc.addFont(font.file, name, 'normal');
    embedded.set(`${font.family}:${font.weight}`, name);
  }
  const preferred = kit.pairings.find(p => p.is_preferred) || kit.pairings[0];
  const body = preferred ? embedded.get(`${preferred.body_font}:${preferred.body_weight}`) || 'helvetica' : 'helvetica';
  const face = preferred ? embedded.get(`${preferred.heading_font}:${preferred.heading_weight}`) || body : body;
  const text = (value: string, x: number, y: number, size = 13, color = ink, width = CW, font = body) => {
    doc.setFont(font, 'normal'); doc.setFontSize(size); doc.setTextColor(color);
    const normalized = value.replace(/[–—]/g, '-');
    const lines = doc.splitTextToSize(font === 'helvetica' ? normalized.replace(/[’‘]/g, "'").replace(/[“”]/g, '"') : normalized, width) as string[];
    doc.text(lines, x, y, { lineHeightFactor: 1.25 });
    return y + lines.length * size * 1.25;
  };
  const box = (x: number, y: number, w: number, h: number, fill: string, stroke?: string) => {
    doc.setFillColor(fill); doc.setDrawColor(stroke || fill);
    doc.roundedRect(x, y, w, h, 9, 9, stroke ? 'FD' : 'F');
  };
  const photoBytes = new Map<string, Uint8Array>();
  for (const e of kit.examples) photoBytes.set(e.sha256, new Uint8Array(await e.blob.arrayBuffer()));
  const image = (asset: KitLogo | KitElement | KitExample | undefined, x: number, y: number, w: number, h: number) => {
    if (!asset?.preview || !asset.width || !asset.height) return;
    const ratio = Math.min(w / asset.width, h / asset.height), dw = asset.width * ratio, dh = asset.height * ratio;
    const bytes = photoBytes.get(asset.sha256);
    doc.addImage(bytes || asset.preview, bytes ? 'JPEG' : 'PNG', x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, asset.sha256, 'SLOW');
    if ('logo' in asset) doc.link(x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, { url: asset.logo.file_url });
    if ('element' in asset && !asset.element.svg_data.trimStart().startsWith('<')) {
      doc.link(x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, { url: new URL(asset.element.svg_data, kit.url).href });
    }
  };
  const role = (name: keyof NonNullable<BrandKit['presentation']>['logoRoles']) => kit.logos.find(l => l.logo.file_url === kit.presentation?.logoRoles[name]);
  const main = kit.logos.find(l => l.logo.is_main_logo) || kit.logos[0];
  const circle = role('circle') || main;
  const link = (label: string, url: string, x: number, y: number, width = CW) => {
    const next = text(label, x, y, 12, ink, width);
    doc.link(x, y - 12, Math.min(width, doc.getTextWidth(label)), next - y + 12, { url });
    return next;
  };
  const title = (number: string, heading: string, description: string) => {
    doc.addPage();
    doc.setFillColor('#FFFFFF'); doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(accent); doc.rect(M, 30, 32, 4, 'F');
    text(number.replace(/^\d+ \/ /, ''), M + 46, 38, 11);
    text(heading, M, 87, 37, ink, CW, face);
    text(description, M, 116, 13);
  };
  doc.setProperties({ title: `${kit.gym.name} - Brand Guide`, subject: 'Logo choices, typography, color and campaign applications', author: kit.gym.name });

  // 1. Identity: a recognizable mark with enough scale to carry the opening.
  doc.setFillColor(ink); doc.rect(0, 0, W, H, 'F');
  text(kit.gym.name.toUpperCase(), M, 47, 14, '#FFFFFF');
  text('BRAND GUIDE', W - 168, 47, 12, '#FFFFFF', 130);
  text('Make it\nrecognizable.', M, 174, 65, '#FFFFFF', 400, face);
  text(kit.examples.length ? 'Logos, color and type - with examples\nthat put them to work.' : kit.pairings.length ? 'Logos, color and type.\nReady to use together.' : 'Logos and color.\nReady to use together.', M, 337, 18, '#FFFFFF', 395);
  box(W - M - 300, 126, 300, 290, '#FFFFFF');
  image(circle, W - M - 282, 143, 264, 254);
  const sw = CW / kit.palette.length;
  kit.palette.forEach((c, i) => {
    doc.setFillColor(c); doc.rect(M + i * sw, 450, sw, 52, 'F');
    text(c, M + i * sw + 12, 482, 12, readableOn(c, ink), sw - 20);
  });
  text(['Identity', 'Color', ...(kit.pairings.length ? ['Type'] : []), ...(kit.elements.length ? [elementCollection] : []), ...(kit.examples.length ? ['Brand in use'] : [])].join('  /  '), M, 535, 13, '#FFFFFF');

  // 2. Explicit placement roles prevent a dark-background logo appearing on white.
  const curated = [
    { asset: role('dark'), label: 'On dark backgrounds', ground: ink, copy: 'Full color with room around the mark.' },
    { asset: role('light'), label: 'On light backgrounds', ground: '#FFFFFF', copy: 'Keep the outline and lettering distinct.' },
    { asset: role('black'), label: 'One color / black', ground: '#FFFFFF', copy: 'For simple, high-contrast reproduction.' },
    { asset: role('white'), label: 'One color / white', ground: ink, copy: 'Place on a solid dark field.' },
  ].filter(item => item.asset);
  const choices = curated.length ? curated : kit.logos.filter(l => l.logo.variant === 'Primary logos').slice(0, 4).map((asset, i) => ({
    asset, label: `Primary logo ${i + 1}`, ground: asset.lightArtwork ? ink : '#FFFFFF', copy: asset.transparent ? 'Transparent original included.' : 'Use the supplied background as part of this treatment.'
  }));
  if (!choices.length) choices.push({ asset: main, label: 'Featured logo', ground: main.lightArtwork ? ink : '#FFFFFF', copy: 'Original file included in the library.' });
  title('01 / THE IDENTITY', 'Choose for the background', 'Use the supplied artwork and preserve its proportions.');
  const cardW = (CW - 20) / 2;
  choices.forEach((item, i) => {
    const x = M + i % 2 * (cardW + 20), y = 148 + Math.floor(i / 2) * 187;
    box(x, y, cardW, 171, '#FFFFFF', tint(ink, .8));
    box(x + 9, y + 9, cardW - 18, 98, item.ground, tint(ink, .9));
    image(item.asset, x + 30, y + 17, cardW - 60, 82);
    text(item.label, x + 14, y + 129, 16, ink, cardW - 28, face);
    text(item.copy, x + 14, y + 150, 11, ink, cardW - 28);
  });
  text('Click a logo to open its original. Transparent files keep clear pixels; preview backgrounds are not added.', M, 537, 12);

  // 3. Distinct email treatments shown in context, without a repetitive full catalog.
  const email = [role('circle'), role('ring'), role('square')].filter((l, i, all): l is KitLogo => !!l && all.findIndex(a => a?.sha256 === l.sha256) === i);
  for (const l of kit.logos.filter(l => l.logo.variant === 'Email logos')) {
    if (email.length >= 3) break;
    if (!email.some(a => a.sha256 === l.sha256)) email.push(l);
  }
  if (email.length) {
  title('02 / COMPACT PLACEMENTS', 'Email treatments', 'Circles, cards and shadow. Choose a treatment that suits the composition.');
  const ew = (CW - 20 * (email.length - 1)) / email.length;
  email.forEach((asset, i) => {
    const x = M + i * (ew + 20);
    box(x, 150, ew, 302, i === 1 ? sky : '#FFFFFF', tint(ink, .8));
    text(['Email header', 'A framed accent', 'A compact card'][i], x + 16, 178, 19, ink, ew - 32, face);
    image(asset, x + 25, 201, ew - 50, 154);
    doc.setFillColor(ink); doc.rect(x + 22, 379, ew - 44, 4, 'F');
    doc.setFillColor(tint(ink, .7)); doc.rect(x + 22, 392, ew - 64, 3, 'F');
    box(x + 22, 411, ew - 44, 25, ink);
    text('Header composition', x + 27, 428, 11, '#FFFFFF', ew - 54);
  });
  text('Keep the edge and shadow visible.', M, 487, 22, ink, CW, face);
  text('Check the logo at the size it will appear in the email. Give the outer edge room and use a clear surrounding field. Choose a simpler treatment when the details become too small to read.', M, 512, 13, ink, CW);
  }

  // 4. Exact palette and readable combinations; no invented print equivalents.
  for (let offset = 0; offset < kit.palette.length; offset += 4) {
    title('03 / COLOR', offset ? 'The palette / continued' : 'Color with a purpose', 'Exact HEX and RGB values from the saved brand palette.');
    const colors = kit.palette.slice(offset, offset + 4), pw = (CW - 14 * (colors.length - 1)) / colors.length;
    colors.forEach((c, i) => {
      const x = M + i * (pw + 14), on = contrast(c, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#101010';
      box(x, 150, pw, 159, c, tint(ink, .8));
      text('Aa', x + 17, 262, 60, on, pw - 34, face);
      text(describeColor(c), x, 325, 12, ink, pw);
      text(c, x, 347, 20, ink, pw, face);
      text(`RGB ${colorValues(c).rgb.join(' / ')}`, x, 364, 12, ink, pw);
      text(`${on === '#FFFFFF' ? 'White' : 'Dark'} text`, x, 386, 12, ink, pw);
    });
    box(M, 416, CW, 79, ink);
    text('Use color to separate the message from the action.', M + 18, 445, 23, '#FFFFFF', CW - 36, face);
    text('A calm reading surface gives the vivid logo, accent or button room to stand out.', M + 18, 473, 13, '#FFFFFF', CW - 36);
    text('Print: RGB/sRGB values. Request a color-managed proof; no CMYK or Pantone match is specified.', M, 531, 11);
  }

  // 5. Real embedded faces. Each pairing keeps the same specimen dimensions.
  for (let offset = 0; offset < kit.pairings.length; offset += 2) {
    title('04 / TYPOGRAPHY', 'A message and a supporting voice', 'Font pairings are starting points. Campaigns can take their own creative direction.');
    kit.pairings.slice(offset, offset + 2).forEach((p, i) => {
      const x = M + i * (cardW + 20), headingFace = embedded.get(`${p.heading_font}:${p.heading_weight}`) || body;
      const bodyFace = embedded.get(`${p.body_font}:${p.body_weight}`) || body;
      box(x, 148, cardW, 314, '#FFFFFF', tint(ink, .8));
      text(p.name, x + 18, 177, 17, ink, cardW - 36, face);
      const heading = p.sample_heading || kit.gym.name;
      doc.setFont(headingFace); doc.setFontSize(36);
      const headingLines = doc.splitTextToSize(heading, cardW - 36).length;
      const size = headingLines > 2 ? 27 : 36;
      const after = text(heading, x + 18, 225, size, ink, cardW - 36, headingFace);
      text(p.sample_body || 'ABCDEFGHIJKLM', x + 18, after + 9, 14, ink, cardW - 36, bodyFace);
      text('ABCDEFGHIJKLM', x + 18, 413, 22, ink, cardW - 36, headingFace);
      text(`${p.heading_font} ${p.heading_weight} / ${p.body_font} ${p.body_weight}`, x + 18, 443, 11, ink, cardW - 36);
      const font = kit.fonts.find(f => f.family === p.heading_font);
      link(`Font source: ${p.heading_font}`, font?.source || kit.url, x, 489, cardW);
      text(`Email fallback: ${p.email_fallback}`, x, 511, 11, ink, cardW);
      if (!embedded.has(`${p.heading_font}:${p.heading_weight}`)) text('Font linked; specimen uses a fallback.', x, 540, 11, ink, cardW);
    });
    text('Sample copy demonstrates type, not a current offer. Use email fallbacks where web fonts cannot load.', M, 547, 11);
  }

  // 6. Selected graphics at realistic email-width proportions.
  const selected = (kit.presentation?.featuredGraphics || []).map(name => kit.elements.find(e => e.element.display_name === name)).filter((e): e is KitElement => !!e);
  const graphics = (selected.length ? selected : kit.elements.filter(e => e.element.element_type === 'divider')).slice(0, 2);
  if (graphics.length) {
    title(`05 / ${elementCollectionName(graphics.map(item => item.element)).toUpperCase()}`, 'Let the divider do a job', 'Use a transition to connect two sections, then leave the reading area calm.');
    for (const [i, e] of graphics.entries()) {
      const x = M + i * (cardW + 20), y = 150, width = cardW - 2;
      const height = Math.min(width * e.height / e.width, 130);
      // Match the lower panel to the existing artwork's edge, without altering the original.
      const source = new Image(); source.src = e.preview; await source.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!;
      context.drawImage(source, Math.floor(source.width / 2), source.height - 1, 1, 1, 0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      const lower = pixel[3] > 240 ? '#' + [...pixel.slice(0, 3)].map(v => v.toString(16).padStart(2, '0')).join('') : ink;
      box(x, y, cardW, 269, '#FFFFFF', tint(ink, .8));
      text('A clear message', x + 19, y + 41, 23, ink, cardW - 38, face);
      text('Space for the details.', x + 19, y + 66, 13, ink, cardW - 38);
      doc.setFillColor(lower); doc.rect(x + 1, y + 191, width, 77, 'F');
      image(e, x + 1, y + 191 - height, width, height);
      text('A new section', x + 19, y + 228, 23, readableOn(lower, ink), cardW - 38, face);
      text(e.element.display_name || e.element.element_type, x, 453, 23, ink, cardW, face);
      text(i === 0 ? 'A more expressive transition. Let the shape reach both edges of the content area.' : 'A quieter repeat. Carry the accent through the design while keeping the message clear.', x, 480, 13, ink, cardW);
    }
    text(`Use the original PNG at its natural proportions. View all saved ${elementCollection.toLowerCase()} in the online library.`, M, 544, 11);
  }

  // Show every icon and supporting shape, with links to the original artwork.
  const graphicGroups = [
    { name: 'Icons', items: kit.elements.filter(e => e.element.element_type === 'icon') },
    { name: 'Shapes & social graphics', items: kit.elements.filter(e => !['icon', 'divider'].includes(e.element.element_type)) },
  ];
  for (const group of graphicGroups) {
    for (let offset = 0; offset < group.items.length; offset += 4) {
      title('05 / GRAPHICS', group.name + (offset ? ' / continued' : ''), 'Reusable artwork for email and social designs. Click an image to open its original.');
      group.items.slice(offset, offset + 4).forEach((asset, i) => {
        const x = M + i % 2 * (cardW + 20), y = 148 + Math.floor(i / 2) * 191;
        box(x, y, cardW, 178, '#FFFFFF', tint(ink, .8));
        image(asset, x + 16, y + 10, cardW - 32, 125);
        text(asset.element.display_name || asset.element.element_type, x + 16, y + 155, 16, ink, cardW - 32, face);
      });
      text('Keep the artwork in proportion. Use the original files from the kit when placing graphics in a design.', M, 544, 11);
    }
  }

  // Campaign provenance remains in the downloadable manifest.
  kit.examples.forEach(({ example: e, ...asset }) => {
    title('06 / BRAND IN USE', e.title, e.description);
    image({ example: e, ...asset }, M, 145, 335, 386);
    const x = M + 371, tw = CW - 371;
    text('THE COMPOSITION', x, 166, 12);
    let y = 202;
    e.principles.forEach((principle, i) => {
      box(x, y - 15, 27, 27, ink);
      text(String(i + 1), x + 9, y + 3, 12, '#FFFFFF', 18);
      y = text(principle, x + 41, y, 16, ink, tw - 41) + 24;
    });
    text('Adapted design example', x, 465, 19, ink, tw, face);
    text(`Shows how ${kit.gym.name}'s logo, colors and fonts work together.`, x, 491, 12, ink, tw);
    text('Download the full-size example in Examples/. It is a design reference, not a send-ready email.', M, 547, 11);
  });

  // Handoff. Everything stays available; the guide is a curated route through it.
  title('07 / HANDOFF', 'From the kit to the next design', 'The ZIP keeps the original files and their supporting information together.');
  const included = [
    ['Logos/', `${kit.logos.length} active logo files, organized by saved category. Original animations keep their motion.`],
    ['Fonts/', kit.fonts.length ? 'Installable files where available, licenses, saved weights and official sources.' : 'Font-guide.txt records that no font pairings are saved.'],
    ['Colors/', 'Exact HEX/RGB values, CSS variables, JSON and a GIMP-compatible palette.'],
    ...(kit.elements.length ? [[`${elementCollection}/`, `${kit.elements.length} original ${elementCollection.toLowerCase()}. All remain available, including treatments not featured here.`]] : []),
    ...(kit.examples.length ? [['Examples/', `${kit.examples.length} adapted compositions, with source dates and usage notes. Design references only.`]] : []),
    ['Contents.json', 'Artwork inventory with dimensions and verification checksums.'],
  ];
  let y = 155;
  included.forEach(([name, description]) => {
    text(name, M, y, 20, ink, 164, face);
    text(description, M + 182, y, 13, ink, CW - 182);
    y += 48;
  });
  const notes = kit.notes.join(' ');
  if (notes) {
    text('Production note', M, 467, 19, ink, CW, face);
    text(notes, M, 490, 12, ink, CW);
  }
  link('Open the current online brand library', kit.url, M, 545);

  const count = doc.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    doc.setPage(i);
    const color = i === 1 ? '#FFFFFF' : ink;
    doc.setDrawColor(i === 1 ? '#FFFFFF' : tint(ink, .7)); doc.setLineWidth(.4); doc.line(M, H - 31, W - M, H - 31);
    text(`${kit.gym.name} / Brand guide`, M, H - 14, 11, color);
    text(`${String(i).padStart(2, '0')} / ${count}`, W - M - 65, H - 14, 11, color, 65);
  }
  return doc.output('blob');
}
