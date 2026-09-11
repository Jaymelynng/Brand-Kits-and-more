import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';

export function validateInventory(inventory) {
  if (inventory.schemaVersion !== 1 || !Array.isArray(inventory.buckets) || !Array.isArray(inventory.objects)
    || inventory.objectCount !== inventory.objects.length) throw new Error('Incomplete or unsupported inventory');
  const buckets = new Set();
  for (const bucket of inventory.buckets) {
    if (typeof bucket.id !== 'string' || !bucket.id || bucket.public !== true || buckets.has(bucket.id)) {
      throw new Error('Inventory includes a private, invalid or duplicate bucket; no files downloaded');
    }
    buckets.add(bucket.id);
  }
  const keys = new Set();
  for (const item of inventory.objects) {
    const key = JSON.stringify([item.bucket, item.name]);
    if (!buckets.has(item.bucket) || typeof item.name !== 'string' || !item.name
      || !Number.isSafeInteger(item.bytes) || item.bytes < 0 || keys.has(key)) throw new Error('Invalid or duplicate storage object');
    keys.add(key);
  }
}

export function storageUrl(projectUrl, item) {
  const url = new URL(projectUrl);
  if (url.protocol !== 'https:' || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)
    || url.port || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Expected an HTTPS Supabase project URL');
  }
  // Source names are URL data only, never local filesystem paths.
  const parts = [item.bucket, ...item.name.split('/')];
  if (parts.some(part => part === '.' || part === '..')) throw new Error('Unsafe source path');
  return url.origin + '/storage/v1/object/public/' + parts.map(encodeURIComponent).join('/');
}

async function hashFile(path) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); bytes += chunk.length; }
  return { sha256: hash.digest('hex'), bytes };
}

function objectPath(root, sha256) {
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Invalid object checksum');
  return resolve(root, 'objects', sha256.slice(0, 2), sha256);
}

async function downloadObject(root, url, item, fetcher) {
  const temp = resolve(root, 'pending', randomUUID() + '.part');
  await mkdir(dirname(temp), { recursive: true });
  try {
    const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(120_000) });
    if (!response.ok || !response.body) {
      const error = new Error('Storage returned HTTP ' + response.status);
      const retry = response.headers.get('retry-after');
      const retryMs = retry && (/^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now());
      error.retryMs = Number.isFinite(retryMs) ? Math.min(60_000, Math.max(0, retryMs)) : 0;
      throw error;
    }
    const length = response.headers.get('content-length');
    const compressed = response.headers.get('content-encoding');
    if (length !== null && !compressed && Number(length) !== item.bytes) throw new Error('Source size changed since inventory');
    const hash = createHash('sha256');
    let bytes = 0;
    const measure = new Transform({ transform(chunk, encoding, callback) {
      bytes += chunk.length;
      if (bytes > item.bytes) return callback(new Error('Downloaded file exceeds inventoried size'));
      hash.update(chunk); callback(null, chunk);
    } });
    await pipeline(Readable.fromWeb(response.body), measure, createWriteStream(temp, { flags: 'wx' }));
    if (bytes !== item.bytes) throw new Error('Downloaded file is incomplete');
    const sha256 = hash.digest('hex');
    const finalPath = objectPath(root, sha256);
    await mkdir(dirname(finalPath), { recursive: true });
    const existing = await stat(finalPath).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
    if (existing) {
      const verified = await hashFile(finalPath);
      if (verified.sha256 !== sha256 || verified.bytes !== bytes) throw new Error('Existing backup object failed verification');
    } else {
      await rename(temp, finalPath);
    }
    return { ...item, sourceUrl: url, sha256, bytes };
  } finally {
    // A single temporary file created by this run, never a source object.
    await rm(temp, { force: true });
  }
}

export async function verifyBackup(manifestPath) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.status !== 'complete') throw new Error('Backup is incomplete');
  validateInventory(manifest);
  const root = resolve(dirname(manifestPath), '..');
  for (const item of manifest.objects) {
    const file = await hashFile(objectPath(root, item.sha256));
    if (file.sha256 !== item.sha256 || file.bytes !== item.bytes) throw new Error('Backup checksum mismatch: ' + item.name);
  }
  return { objects: manifest.objects.length, bytes: manifest.objects.reduce((sum, item) => sum + item.bytes, 0) };
}

export async function backupStorage(inventory, { projectUrl, output, resumePath, fetcher = fetch, onProgress = () => {} }) {
  validateInventory(inventory);
  const urls = inventory.objects.map(item => storageUrl(projectUrl, item));
  const root = resolve(output);
  const previous = new Map();
  if (resumePath) {
    const saved = JSON.parse(await readFile(resolve(resumePath), 'utf8'));
    if (saved.schemaVersion !== 1 || saved.projectUrl !== projectUrl
      || resolve(dirname(resumePath), '..') !== root) throw new Error('Resume manifest belongs to a different project or backup directory');
    for (const item of saved.objects) previous.set(JSON.stringify([item.bucket, item.name]), item);
  }
  await mkdir(resolve(root, 'manifests'), { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID();
  const manifestPath = resolve(root, 'manifests', runId + '.json');
  const results = new Array(inventory.objects.length);
  const failures = [];
  let next = 0;
  let completed = 0;
  await Promise.all(Array.from({ length: Math.min(2, inventory.objects.length) }, async () => {
    while (next < inventory.objects.length) {
      const index = next++;
      const item = inventory.objects[index];
      const prior = previous.get(JSON.stringify([item.bucket, item.name]));
      if (prior && prior.bytes === item.bytes && prior.updatedAt === item.updatedAt && prior.etag === item.etag) {
        const verified = await hashFile(objectPath(root, prior.sha256));
        if (verified.sha256 !== prior.sha256 || verified.bytes !== prior.bytes) throw new Error('Resume object failed checksum verification');
        results[index] = { ...item, sourceUrl: urls[index], sha256: prior.sha256 };
        onProgress(++completed, inventory.objects.length);
        continue;
      }
      let failure;
      for (let attempt = 0; attempt < 5; attempt++) {
        try { results[index] = await downloadObject(root, urls[index], item, fetcher); failure = null; break; }
        catch (error) { failure = error; }
        if (attempt < 4) await new Promise(resolve => setTimeout(resolve, Math.max(failure.retryMs || 0, 500 * 2 ** attempt)));
      }
      if (failure) failures.push({ bucket: item.bucket, name: item.name, error: failure.message });
      completed++;
      onProgress(completed, inventory.objects.length);
    }
  }));
  const manifest = { ...inventory, projectUrl, completedAt: new Date().toISOString(), status: failures.length ? 'incomplete' : 'complete', objects: results.filter(Boolean), failures };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  if (failures.length) throw new Error(failures.length + ' files failed; incomplete manifest: ' + manifestPath);
  const verified = await verifyBackup(manifestPath);
  await writeFile(resolve(root, 'latest.json'), JSON.stringify({ manifest: 'manifests/' + runId + '.json', ...verified }, null, 2) + '\n');
  return { manifestPath, ...verified };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const value = name => args[args.indexOf(name) + 1];
    if (args.includes('--verify')) {
      console.log(JSON.stringify(await verifyBackup(resolve(value('--verify')))));
    } else {
      if (!args.includes('--inventory') || !args.includes('--project') || !args.includes('--out')) {
        throw new Error('Usage: npm run backup:storage -- --inventory inventory.json --project https://PROJECT.supabase.co --out .backups/storage\nVerify: npm run backup:storage -- --verify .backups/storage/manifests/FILE.json');
      }
      const inventory = JSON.parse(await readFile(resolve(value('--inventory')), 'utf8'));
      const result = await backupStorage(inventory, { projectUrl: value('--project'), output: value('--out'), resumePath: args.includes('--resume') ? value('--resume') : undefined, onProgress(done, total) {
        if (done % 50 === 0 || done === total) console.log('Processed ' + done + '/' + total);
      } });
      console.log(JSON.stringify(result));
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
