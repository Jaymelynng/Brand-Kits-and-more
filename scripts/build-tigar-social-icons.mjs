import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Pinned glyphs; native vector paths keep the platform symbols intact.
// --manifest reads a verified inventory; there is no permanent roster in this generator.
const revision = 'b054428646591252023b9599defb56f6e0b32f10';
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing value for ' + name);
  return args[i + 1];
};
const manifestPath = option('--manifest');
if (!manifestPath) throw new Error('Supply --manifest with the verified gym inventory before generating artwork.');
const rendererPath = option('--renderer');
const sharp = rendererPath ? (await import(pathToFileURL(resolve(rendererPath)).href)).default : null;
const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
const batch = args.includes('--social-batch') ? manifest.socialBatch : manifest;
const only = option('--only');
const gyms = batch?.gyms?.filter(gym => !only || gym.code === only);
if (!Array.isArray(gyms) || !gyms.length) throw new Error('No verified gyms in manifest');

const xml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const mix = (hex, target, amount) => '#' + [1, 3, 5].map((i) => {
  const value = parseInt(hex.slice(i, i + 2), 16);
  return Math.round(value * (1 - amount) + target * amount).toString(16).padStart(2, '0');
}).join('');
async function save(file, value) {
  const content = Buffer.from(value);
  try {
    const existing = await readFile(file);
    if (!existing.equals(content)) throw new Error('Refusing to replace existing artwork: ' + file.pathname);
    return;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await writeFile(file, content, { flag: 'wx' });
}

const platformNames = { facebook: 'Facebook', instagram: 'Instagram', messenger: 'Messenger', youtube: 'YouTube', tiktok: 'TikTok' };
const platforms = option('--platforms')?.split(',') || batch.platforms || ['facebook', 'instagram', 'youtube', 'tiktok'];
const glyphs = [];
for (const slug of platforms) {
  const name = platformNames[slug];
  if (!name) throw new Error('Unsupported platform: ' + slug);
  const source = 'https://raw.githubusercontent.com/simple-icons/simple-icons/' + revision + '/icons/' + slug + '.svg';
  const response = await fetch(source);
  if (!response.ok) throw new Error('Glyph download failed: ' + source);
  const original = await response.text();
  const paths = original.match(/<path\b[^>]*\/>/g)?.join('');
  if (!paths) throw new Error('No vector paths for ' + name);
  glyphs.push({ slug, name, source, paths });
}
let count = 0;
for (const gym of gyms) {
  const { code, name: gymName, design } = gym;
  if (!/^[A-Z0-9_-]+$/.test(code)) throw new Error('Invalid kit code');
  for (const key of ['face', 'rim', 'edge']) {
    if (!/^#[0-9a-f]{6}$/i.test(design[key])) throw new Error('Unverified design color: ' + code + '/' + key);
    if (gym.palette && !gym.palette.some((hex) => hex.toLowerCase() === design[key].toLowerCase())) throw new Error('Color outside verified palette');
  }
  const { face, rim, edge } = design;
  const destination = new URL('../public/brand-elements/' + code + '/', import.meta.url);
  await mkdir(destination, { recursive: true });
  const badgeTemplate = args.includes('--social-batch') ? await readFile(new URL(code + '_social-facebook.svg', destination), 'utf8') : null;
  for (const { slug, name, source, paths } of glyphs) {
    const svgFile = new URL(code + '_social-' + slug + '.svg', destination);
    const pngFile = new URL(code + '_social-' + slug + '.png', destination);
    let existingSvg;
    if (badgeTemplate) {
      try { existingSvg = await readFile(svgFile, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (existingSvg && !existingSvg.includes(paths)) throw new Error('Existing artwork has a different glyph: ' + svgFile.pathname);
    const clonedSvg = badgeTemplate?.replace(/<title id="title">[\s\S]*?<\/title>/, '<title id="title">' + xml(name + ' — ' + gymName + ' social icon') + '</title>')
      .replace(/<desc id="desc">[\s\S]*?<\/desc>/, '<desc id="desc">' + xml('White ' + name + ' symbol in the matching gym badge. Transparent outside the badge.') + '</desc>')
      .replace(/icons\/facebook\.svg/, 'icons/' + slug + '.svg')
      .replace(/(<g\b[^>]*>)[\s\S]*?(<\/g>)/g, '$1' + paths + '$2');
    const svg = existingSvg || clonedSvg || '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-labelledby="title desc">\n'
      + '<title id="title">' + xml(name + ' — ' + gymName + ' social icon') + '</title>\n'
      + '<desc id="desc">' + xml('White ' + name + ' symbol in a raised circular badge using the saved gym palette. Transparent outside the badge.') + '</desc>\n'
      + '<metadata>' + xml('Glyph source: ' + source + ' ; Simple Icons, CC0-1.0. Platform trademarks belong to their respective owners. Badge artwork uses native SVG paths and gradients. This graphic does not assert that the gym has an account on this platform.') + '</metadata>\n'
      + '<defs>'
      + '<linearGradient id="rim" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#ffffff"/><stop offset=".16" stop-color="' + rim + '"/><stop offset=".68" stop-color="' + rim + '"/><stop offset="1" stop-color="' + mix(rim, 0, .30) + '"/></linearGradient>'
      + '<linearGradient id="face" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="' + mix(face, 255, .12) + '"/><stop offset=".5" stop-color="' + face + '"/><stop offset="1" stop-color="' + mix(face, 0, .35) + '"/></linearGradient>'
      + '<linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="' + edge + '"/></linearGradient>'
      + '</defs>\n'
      + '<circle cx="512" cy="532" r="458" fill="' + face + '" opacity=".12"/>'
      + '<circle cx="512" cy="522" r="458" fill="' + face + '" opacity=".18"/>'
      + '<circle cx="512" cy="512" r="458" fill="url(#rim)" stroke="' + mix(face, 0, .35) + '" stroke-width="8"/>'
      + '<circle cx="512" cy="512" r="412" fill="url(#face)" stroke="url(#edge)" stroke-width="14"/>'
      + '<path d="M202 287 A384 384 0 0 1 822 287" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity=".28"/>'
      + '<g transform="translate(276 286) scale(19.667)" fill="#000000" opacity=".3">' + paths + '</g>'
      + '<g transform="translate(276 276) scale(19.667)" fill="#ffffff">' + paths + '</g>\n</svg>';
    await save(svgFile, svg);
    if (sharp) {
      let existingPng;
      try { existingPng = await readFile(pngFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (existingPng) {
        const meta = await sharp(existingPng).metadata();
        if (meta.width !== 1024 || meta.height !== 1024 || !meta.hasAlpha) throw new Error('Invalid PNG companion: ' + pngFile.pathname);
      } else await save(pngFile, await sharp(Buffer.from(svg)).png().toBuffer());
    }
    count++;
  }
}
console.log('Stored ' + count + ' social icons as SVG' + (sharp ? ' and transparent PNG' : '') + '.');
