import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadPureModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { fetchAssetFile, assetFilename, uniqueAssetPath } = await loadPureModule('../src/lib/assetFiles.ts');
const { readAllPages } = await loadPureModule('../src/lib/queryPages.ts');

test('rejects missing files and HTML disguised as a successful image response', async () => {
  const original = globalThis.fetch;
  try {
    for (const [body, status, type] of [['Missing', 404, 'text/html'], ['<!DOCTYPE html><h1>Error</h1>', 200, 'image/png'], ['', 200, 'image/png'], ['{"error":"denied"}', 200, 'application/json']]) {
      globalThis.fetch = async () => new Response(body, { status, headers: { 'Content-Type': type } });
      await assert.rejects(fetchAssetFile('https://example.test/logo.png', 'Logo'));
    }
  } finally { globalThis.fetch = original; }
});

test('keeps source bytes and corrects an extension that disagrees with the actual format', async () => {
  const original = globalThis.fetch;
  const bytes = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  try {
    globalThis.fetch = async () => new Response(bytes, { headers: { 'Content-Type': 'image/png' } });
    const blob = await fetchAssetFile('https://example.test/logo.png', 'Logo');
    assert.equal(blob.type, 'image/gif');
    assert.deepEqual(Buffer.from(await blob.arrayBuffer()), bytes);
    assert.equal(assetFilename('Holiday.png', blob), 'Holiday.gif');
  } finally { globalThis.fetch = original; }
});

test('same-name assets cannot overwrite one another in a ZIP', () => {
  const used = new Set();
  assert.equal(uniqueAssetPath('Email logos/Logo.png', used), 'Email logos/Logo.png');
  assert.equal(uniqueAssetPath('Email logos/logo.png', used), 'Email logos/logo-2.png');
  assert.equal(uniqueAssetPath('Email logos/Logo.png', used), 'Email logos/Logo-3.png');
  assert.equal(uniqueAssetPath('Primary logos/Logo.png', used), 'Primary logos/Logo.png');
});

test('reads beyond the server page limit and preserves the returned order', async () => {
  const records = Array.from({ length: 2101 }, (_, id) => ({ id }));
  const calls = [];
  const actual = await readAllPages(async (from, to) => { calls.push([from, to]); return { data: records.slice(from, to + 1), error: null }; });
  assert.deepEqual(actual, records);
  assert.deepEqual(calls, [[0, 999], [1000, 1999], [2000, 2999]]);
});

test('a later-page failure never becomes a successful partial inventory', async () => {
  await assert.rejects(readAllPages(async from => from === 0 ? { data: Array(1000).fill({}), error: null }
    : { data: null, error: { message: 'Network unavailable' } }), /Network unavailable/);
  await assert.rejects(readAllPages(async () => ({ data: null, error: null })), /returned no data/);
});
