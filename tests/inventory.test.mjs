import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/inventory.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { makeInventory, filterInventory, selectRange, inventoryUrls, inventoryChanges, reverseInventoryChanges } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const data = { logos: [{id:'a',gym_id:'gym-a',filename:'Same.png',file_url:'/same.png',variant:'Email logos',treatment:'Raised'}, {id:'b',gym_id:'gym-b',filename:'Same.png',file_url:'/same.png',variant:'Retired'}], elements:[], assets:[{id:'s',filename:'Shared.svg',file_url:'https://example.test/shared.svg',is_all_gyms:true}], assignments:[],categories:[] };
const gyms = [{id:'gym-a',code:'A'},{id:'gym-b',code:'B'},{id:'future-gym',code:'NEW'}];
const items = makeInventory(data,gyms);
test('inventory preserves distinct records with shared URLs, retired files and dynamically added gyms',()=>{
  assert.equal(items.length,3);
  const filtered=filterInventory(items,{kind:'',gymIds:new Set(['future-gym']),groups:new Set(),search:'',featured:false});
  assert.deepEqual(filtered.map(i=>i.id),['s']);
  assert.equal(filterInventory(items,{kind:'Logos',gymIds:new Set(['gym-b']),groups:new Set(['Retired']),search:'same',featured:false}).length,1);
});
test('search combines terms and filters intersect, instead of silently broadening selections',()=>{
  const f={kind:'Logos',gymIds:new Set(),groups:new Set(),search:'raised email',featured:false};
  assert.equal(filterInventory(items,f).length,1);
  assert.equal(filterInventory(items,{...f,gymIds:new Set(['gym-b'])}).length,0);
});
test('range selection crosses display pages and retains explicitly selected hidden records',()=>{
  const keys=Array.from({length:120},(_,i)=>`item-${i}`);
  const chosen=selectRange(new Set(['hidden']),keys,'item-45','item-55',true,true);
  assert.equal(chosen.size,12); assert.ok(chosen.has('item-48')); assert.ok(chosen.has('hidden'));
  const removed=selectRange(chosen,keys,'item-45','item-55',true,false);
  assert.deepEqual([...removed],['hidden']);
});
test('URL copying deduplicates actual hosted links and excludes inline artwork and unsafe protocols',()=>{
  assert.deepEqual(inventoryUrls([...items,{file_url:'data:image/svg+xml,abc'},{file_url:'javascript:alert(1)'}],'https://example.test'),['https://example.test/same.png','https://example.test/shared.svg']);
});
test('bulk changes contain only the targeted metadata and undo carries expected saved values',()=>{
  const changes=inventoryChanges(items,{field:'treatment',value:'Cream raised',find:'',replace:''});
  assert.equal(changes.length,2);
  assert.deepEqual(changes[0].before,{treatment:'Raised'});
  assert.deepEqual(changes[0].after,{treatment:'Cream raised'});
  assert.deepEqual(reverseInventoryChanges(changes)[0],{...changes[0],before:changes[0].after,after:changes[0].before});
  assert.deepEqual(inventoryChanges(items,{field:'file_url',value:'https://wrong.test',find:'',replace:''}),[]);
});
test('find and replace is literal, skips unchanged names, and rejects empty names',()=>{
  const changed=inventoryChanges(items,{field:'rename',find:'Same',replace:'New',value:''});
  assert.equal(changed.length,2); assert.equal(changed[0].after.filename,'New.png');
  assert.deepEqual(inventoryChanges(items,{field:'rename',find:'.*',replace:'Oops',value:''}),[]);
  assert.throws(()=>inventoryChanges(items,{field:'rename',find:'Same.png',replace:'',value:''}),/blank/);
});
test('gym-specific library URLs are included once and remain attached to their assigned gym',()=>{
  const extended=makeInventory({...data,assignments:[{id:'override',asset_id:'s',gym_id:'gym-a',file_url:'https://example.test/alternate.svg'}]},gyms);
  assert.equal(extended.length,4); assert.equal(extended.find(i=>i.source==='gym_asset_assignments').gyms,'A');
});
