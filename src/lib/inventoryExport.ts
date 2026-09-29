import { assetFilename, fetchAssetFile, safeFilename, saveDownload, uniqueAssetPath } from './assetFiles';
import { csvCell } from './adminData';
import { publicInventoryUrl, type InventoryItem } from './inventory';

export function inventoryCsv(items: InventoryItem[], origin: string) {
  return [['Gym', 'Name', 'Collection', 'Category', 'Treatment', 'Colorway', 'URL', 'Record ID'], ...items.map(i => [i.gyms, i.filename, i.kind, i.group, i.treatment, i.colorway, publicInventoryUrl(i.file_url, origin) || 'Inline artwork — download original', i.key])]
    .map(row => row.map(csvCell).join(',')).join('\r\n');
}

/** Flat ZIP, original bytes, one file per distinct URL; manifest preserves every record mapping. */
export async function downloadInventory(items: InventoryItem[], origin: string, signal: AbortSignal, progress: (value: string) => void) {
  if (!items.length) throw new Error('Select at least one item.');
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip(), used = new Set(['inventory.csv']);
  const paths = new Map<string, string>(), unique = [...new Map(items.map(i => [i.file_url, i])).values()];
  let bytes = 0;
  for (let start = 0; start < unique.length; start += 4) {
    signal.throwIfAborted();
    const files = await Promise.all(unique.slice(start, start + 4).map(async i => ({ item: i, blob: await fetchAssetFile(i.file_url, i.filename, signal) })));
    for (const { item, blob } of files) {
      bytes += blob.size;
      if (bytes > 512 * 1024 * 1024) throw new Error('This selection exceeds 512 MB. Download it in smaller groups. No partial ZIP was saved.');
      const name = item.filename.toLowerCase().startsWith(item.gyms.toLowerCase()) ? item.filename : `${safeFilename(item.gyms)}-${item.filename}`;
      const path = uniqueAssetPath(assetFilename(name, blob), used);
      zip.file(path, blob); paths.set(item.file_url, path);
    }
    progress(`Preparing ${Math.min(start + 4, unique.length)} of ${unique.length} files…`);
  }
  zip.file('inventory.csv', '\uFEFF' + [['Gym', 'Name', 'Category', 'File in ZIP', 'URL', 'Record ID'], ...items.map(i => [i.gyms, i.filename, i.group, paths.get(i.file_url)!, publicInventoryUrl(i.file_url, origin) || '', i.key])].map(row => row.map(csvCell).join(',')).join('\r\n'));
  progress('Packing ZIP…');
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, () => signal.throwIfAborted());
  signal.throwIfAborted();
  saveDownload(blob, 'Brand-Kit-Inventory.zip');
  return unique.length;
}
