import { mkdir, writeFile } from 'node:fs/promises';

// Pinned glyphs; native vector paths keep the platform symbols intact.
const revision = 'b054428646591252023b9599defb56f6e0b32f10';
const destination = new URL('../public/brand-elements/TIG/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const [slug, name] of [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['tiktok', 'TikTok']]) {
  const source = `https://raw.githubusercontent.com/simple-icons/simple-icons/${revision}/icons/${slug}.svg`;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Glyph download failed: ${source}`);
  const original = await response.text();
  const paths = original.match(/<path\b[^>]*\/>/g)?.join('');
  if (!paths) throw new Error(`No vector paths for ${name}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-labelledby="title desc">
<title id="title">${name} — TIGAR social icon</title>
<desc id="desc">White ${name} symbol in a navy circular badge with orange and sky blue edging. Transparent outside the badge.</desc>
<metadata>Glyph source: ${source} ; Simple Icons, CC0-1.0. Platform trademarks belong to their respective owners. TIGAR badge artwork uses native SVG paths and gradients.</metadata>
<defs>
 <linearGradient id="rim" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="#ffffff"/><stop offset=".16" stop-color="#f57f20"/><stop offset=".68" stop-color="#f57f20"/><stop offset="1" stop-color="#ad4600"/></linearGradient>
 <linearGradient id="face" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#205774"/><stop offset=".5" stop-color="#0a3651"/><stop offset="1" stop-color="#061d2c"/></linearGradient>
 <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#7fc4e0"/></linearGradient>
</defs>
<circle cx="512" cy="532" r="458" fill="#0a3651" opacity=".12"/>
<circle cx="512" cy="522" r="458" fill="#0a3651" opacity=".18"/>
<circle cx="512" cy="512" r="458" fill="url(#rim)" stroke="#0a3651" stroke-width="8"/>
<circle cx="512" cy="512" r="412" fill="url(#face)" stroke="url(#edge)" stroke-width="14"/>
<path d="M202 287 A384 384 0 0 1 822 287" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity=".28"/>
<g transform="translate(276 286) scale(19.667)" fill="#00101d" opacity=".3">${paths}</g>
<g transform="translate(276 276) scale(19.667)" fill="#ffffff">${paths}</g>
</svg>`;
  await writeFile(new URL(`TIG_social-${slug}.svg`, destination), svg);
  console.log(`Created ${name}`);
}
