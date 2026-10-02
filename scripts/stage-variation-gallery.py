"""Stage supplied gallery originals and lightweight previews; never publish or delete sources."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--code', required=True)
parser.add_argument('--slug', required=True)
parser.add_argument('--source', action='append', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
manifest = root / 'assets/generated' / f'{args.code.lower()}-{args.slug}-gallery.json'
previous = {i['sha256']: i for i in json.loads(manifest.read_text(encoding='utf-8'))['items']} if manifest.exists() else {}
ledger_path = root / 'assets/generated/inventory.json'
ledger = json.loads(ledger_path.read_text(encoding='utf-8'))
known = {entry['sha256']: entry for entry in ledger['files']}
out = root / 'public/brand-variations' / args.code / args.slug
out.mkdir(parents=True, exist_ok=True)
files = []
for source in args.source:
    candidate = Path(source)
    files.extend(sorted(candidate.parent.glob(candidate.name)))
grouped = {}
for path in files:
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    grouped.setdefault(digest, []).append(path)
for digest, sources in grouped.items():
    if digest not in known:
        raise RuntimeError(f'Archive this original first: {sources[0]}')
items = []
for position, (digest, sources) in enumerate(grouped.items()):
    source = next((p for p in sources if 'DUPLICATE' not in p.name), sources[0])
    # The ledger owns provenance. Refuse to file an unarchived source silently.
    if digest not in known:
        raise RuntimeError(f'Archive this original first: {source}')
    original = out / source.name
    data = source.read_bytes()
    if original.exists() and original.read_bytes() != data:
        raise RuntimeError(f'Conflicting destination: {original}')
    original.write_bytes(data)
    preview = out / f'{digest[:16]}-preview.webp'
    with Image.open(source) as image:
        width, height = image.size
        image = image.convert('RGBA')
        alpha = image.getchannel('A').getextrema()[0] < 255
        image.thumbnail((640, 400), Image.Resampling.LANCZOS)
        image.save(preview, 'WEBP', quality=85, method=6)
    title = source.stem.removeprefix('TIGAR-gymnastics-').replace('-', ' ')
    title = {'textured block gymanstics': 'Textured block gymnastics', 'comparison': 'Four-option comparison board',
             'condensed': 'Tall condensed lettering', 'athletic': 'Athletic italic lettering', 'brush': 'Brush lettering + underline',
             'raised navy': 'Raised wordmark · navy background', 'raised transparent': 'Raised wordmark · transparent'}.get(title, title.capitalize())
    path = original.relative_to(root).as_posix()
    entry = known[digest]
    copies = entry.setdefault('otherProjectCopies', [])
    if path != entry['projectPath'] and path not in copies:
        copies.append(path)
    items.append(dict(title=title, filename=source.name, file_url='/' + original.relative_to(root / 'public').as_posix(),
        thumbnail_url='/' + preview.relative_to(root / 'public').as_posix(), sha256=digest, bytes=len(data), width=width,
        height=height, has_alpha=alpha, sort_order=position, is_reference=source.name=='TIGAR-gymnastics-comparison.png'))
ledger_path.write_text(json.dumps(ledger, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
for item in items:
    if item['sha256'] in previous:
        old = previous[item['sha256']]
        item['title'], item['sort_order'], item['is_reference'] = old['title'], old['sort_order'], old['is_reference']
items.sort(key=lambda i: i['sort_order'])
manifest.write_text(json.dumps({'gymCode': args.code, 'slug': args.slug, 'items': items}, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
print(json.dumps(dict(source_files=len(files), unique_images=len(items), exact_duplicates=len(files)-len(items),
    original_bytes=sum(i['bytes'] for i in items), thumbnail_bytes=sum(p.stat().st_size for p in out.glob('*-preview.webp')), manifest=str(manifest))))
