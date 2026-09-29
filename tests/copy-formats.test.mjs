import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/copyFormats.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { buildCopyText, countCopy } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const gyms = [
  { name: 'First Gym', code: 'FIRST', colors: [{ color_hex: '#123456' }, { color_hex: '#FFFFFF' }], logos: [
    { file_url: 'https://example.test/variation.png', is_main_logo: false },
    { file_url: '/main.png', is_main_logo: true },
  ] },
  { name: 'Second Gym', code: 'SECOND', colors: [{ color_hex: '#ABCDEF' }], logos: [
    { file_url: 'https://example.test/other.png', is_main_logo: false },
  ] },
];

test('multi-gym colors retain names and codes beside each palette', () => {
  assert.equal(buildCopyText(gyms, 'colors', 'named'), 'First Gym (FIRST):\n#123456\n#FFFFFF\n\nSecond Gym (SECOND):\n#ABCDEF');
});

test('combined copy uses the assigned main logo, resolves its URL and flags missing assignments', () => {
  assert.equal(buildCopyText(gyms, 'colors-main', 'named', 'https://example.test'),
    'First Gym (FIRST):\nColors:\n#123456\n#FFFFFF\nMain logo URL: https://example.test/main.png\n\nSecond Gym (SECOND):\nColors:\n#ABCDEF\nMain logo URL: Not set');
  assert.deepEqual(countCopy(gyms, 'colors-main'), { gyms: 2, colors: 3, logos: 1 });
});

test('copying a subset includes only that subset, and clearing selection copies nothing', () => {
  const text = buildCopyText([gyms[1]], 'colors-main', 'named', 'https://example.test');
  assert.ok(text.startsWith('Second Gym (SECOND):'));
  assert.ok(!text.includes('First Gym'));
  assert.equal(buildCopyText([], 'colors-main', 'named'), '');
});
