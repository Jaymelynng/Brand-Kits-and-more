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

const { csvCell, gymDataCsv } = await loadPureModule('../src/lib/adminData.ts');

test('gym CSV preserves commas, quotes, multiline addresses and empty contact fields', () => {
  const csv = gymDataCsv([{ name: 'Sample "A", Gym', code: 'TEST', address: 'First floor\nSecond room', phone: null, email: '', website: 'https://example.test', colors: [{color_hex:'#123456'}, {color_hex:'#ffffff'}] }]);
  assert.equal(csv, '"Name","Code","Address","Phone","Email","Website","Colors"\r\n"Sample ""A"", Gym","TEST","First floor\nSecond room","","","https://example.test","#123456;#ffffff"');
  assert.equal(gymDataCsv([]), '"Name","Code","Address","Phone","Email","Website","Colors"');
});

test('gym CSV prevents spreadsheet formula execution without changing ordinary text', () => {
  for (const cell of ['=HYPERLINK("https://example.test")', '+123', '-123', '@SUM(A1)', '\t=1+1', '  +1']) {
    assert.ok(csvCell(cell).startsWith('"\''), cell);
  }
  assert.equal(csvCell('Sample Gym'), '"Sample Gym"');
  assert.equal(csvCell('123-456-7890'), '"123-456-7890"');
  assert.equal(csvCell(null), '""');
});

async function loadGymHooks(db) {
  const source = await readFile(new URL('../src/hooks/useGyms.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const exports = {};
  const require = name => name === '@tanstack/react-query' ? { useMutation: config => config, useQueryClient: () => ({ invalidateQueries: () => {} }) } : name === '@/integrations/supabase/client' ? { supabase: db } : {};
  new Function('require', 'exports', outputText)(require, exports);
  return exports;
}

test('gym edits reject denied writes and a zero-row update rather than reporting a save', async () => {
  for (const failure of ['Permission denied', 'Expected one updated row, received zero']) {
    const db = { from: () => ({ update: () => ({ eq: () => ({ select: () => ({ single: async () => ({error:new Error(failure),data:null}) }) }) }) }) };
    const hooks = await loadGymHooks(db);
    await assert.rejects(hooks.useUpdateGymInfo().mutationFn({gymId:'test-gym',updates:{phone:'123'}}), new RegExp(failure));
  }
});

test('gym contact edits send only the requested fields to the selected gym', async () => {
  const calls = [];
  const db = { from: table => { calls.push(table); return { update: fields => { calls.push(fields); return { eq: (field,id) => { calls.push([field,id]); return { select: () => ({single: async () => ({data:{id},error:null})}) }; } }; } }; } };
  const hooks = await loadGymHooks(db);
  await hooks.useUpdateGymInfo().mutationFn({gymId:'test-gym',updates:{email:'test@example.test'}});
  assert.deepEqual(calls, ['gyms',{email:'test@example.test'},['id','test-gym']]);
});
