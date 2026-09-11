import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { backupStorage, storageUrl, validateInventory, verifyBackup } from '../scripts/backup-storage.mjs';

const projectUrl = 'https://abcdefghijklmnopqrst.supabase.co';
const inventory = () => ({ schemaVersion: 1, buckets: [{ id: 'logos', public: true }], objectCount: 2,
  objects: [{ bucket: 'logos', name: 'square/logo.png', bytes: 4 }, { bucket: 'logos', name: 'CON & circle.png', bytes: 4 }] });

test('complete backup preserves names, verifies every checksum and detects later corruption', async () => {
  const output = await mkdtemp(join(tmpdir(), 'brand-kit-backup-test-'));
  const result = await backupStorage(inventory(), { projectUrl, output, fetcher: async () => new Response('test') });
  assert.deepEqual(await verifyBackup(result.manifestPath), { objects: 2, bytes: 8 });
  const manifest = JSON.parse(await readFile(result.manifestPath));
  assert.equal(manifest.objects[1].name, 'CON & circle.png');
  assert.equal(manifest.objects[0].sha256, manifest.objects[1].sha256);
  const file = resolve(output, 'objects', manifest.objects[0].sha256.slice(0, 2), manifest.objects[0].sha256);
  await writeFile(file, 'bad!');
  await assert.rejects(verifyBackup(result.manifestPath), /checksum mismatch/);
});

test('missing or truncated objects cannot produce a complete backup', async () => {
  const output = await mkdtemp(join(tmpdir(), 'brand-kit-backup-test-'));
  await assert.rejects(backupStorage(inventory(), { projectUrl, output, fetcher: async url =>
    url.includes('square') ? new Response('tr') : new Response('missing', { status: 404 }) }), /2 files failed/);
  const files = await readdir(join(output, 'manifests'));
  const manifestPath = join(output, 'manifests', files[0]);
  await assert.rejects(verifyBackup(manifestPath), /incomplete/);
  await assert.rejects(readFile(join(output, 'latest.json')), { code: 'ENOENT' });
});

test('inventory cannot silently omit files, duplicate objects, read private buckets or escape its source', () => {
  assert.throws(() => validateInventory({ ...inventory(), objectCount: 3 }), /Incomplete/);
  assert.throws(() => validateInventory({ ...inventory(), buckets: [{ id: 'logos', public: false }] }), /private/);
  const copy = inventory(); copy.objects[1] = copy.objects[0];
  assert.throws(() => validateInventory(copy), /duplicate/);
  assert.throws(() => storageUrl('https://attacker.test', inventory().objects[0]), /Supabase/);
  assert.throws(() => storageUrl(projectUrl, { bucket: 'logos', name: '../secret' }), /Unsafe/);
  assert.ok(storageUrl(projectUrl, inventory().objects[1]).endsWith('CON%20%26%20circle.png'));
});

test('resuming verifies saved files and downloads only missing or changed objects', async () => {
  const output = await mkdtemp(join(tmpdir(), 'brand-kit-backup-test-'));
  const original = inventory();
  original.objects.forEach(item => { item.updatedAt = '2026-01-01T00:00:00Z'; item.etag = 'old'; });
  const first = await backupStorage(original, { projectUrl, output, fetcher: async () => new Response('test') });
  const updated = structuredClone(original);
  updated.objects[1].updatedAt = '2026-01-02T00:00:00Z'; updated.objects[1].etag = 'new';
  let requests = 0;
  const next = await backupStorage(updated, { projectUrl, output, resumePath: first.manifestPath, fetcher: async () => { requests++; return new Response('next'); } });
  assert.equal(requests, 1);
  assert.deepEqual(await verifyBackup(next.manifestPath), { objects: 2, bytes: 8 });
  assert.deepEqual(await verifyBackup(first.manifestPath), { objects: 2, bytes: 8 });
});
