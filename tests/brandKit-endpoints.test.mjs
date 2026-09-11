import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function handler(name, createClient, compareSync = () => false) {
  const source = (await readFile(new URL('../supabase/functions/' + name + '/index.ts', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  let result;
  const deno = { env: { get: () => 'test-only-secret' }, serve: fn => { result = fn; } };
  new Function('Deno', 'createClient', 'compareSync', 'hashSync', 'serve', outputText)(deno, createClient, compareSync, () => 'test-hash', deno.serve);
  return result;
}
const request = (body) => new Request('https://example.test/function', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('PIN input is strictly four digits before any credential lookup', async () => {
  const h = await handler('verify-pin', () => ({}));
  for (const pin of ['abcd', [], 1234, null, '12345']) assert.equal((await h(request({pin}))).status, 400);
});

test('PIN throttling fails closed and returns a retry delay without reading PIN hashes', async () => {
  for (const fixture of [{data: 900, error: null, status: 429}, {data: null, error: new Error('offline'), status: 503}]) {
    const h = await handler('verify-pin', () => ({rpc: async () => fixture, from: () => {throw new Error('credential lookup must not run');}}));
    const r = await h(request({pin:'1234'})); assert.equal(r.status, fixture.status);
    if (fixture.status === 429) assert.equal(r.headers.get('Retry-After'),'900');
  }
});

test('matching a PIN still requires a current admin role and returns only the session token', async () => {
  for (const permitted of [false,true]) {
    const pin = { user_id:'test-user', email:'admin@example.test', pin_hash:'fake-hash', role:'admin' };
    const roleQuery={eq(){return this;},maybeSingle:async()=>({data:permitted?{role:'admin'}:null})};
    const client = {rpc:async()=>({data:0,error:null}),from:table=>({select:()=>table==='admin_pins'?Promise.resolve({data:[pin]}):roleQuery}),
      auth:{admin:{getUserById:async()=>({data:{user:{id:pin.user_id}}}),generateLink:async()=>({data:{properties:{hashed_token:'test-token',email_otp:'not-returned',action_link:'not-returned'}}})}}};
    const h=await handler('verify-pin',()=>client,()=>true);
    const r=await h(request({pin:'1234'}));
    assert.equal(r.status,permitted?200:401);
    if(permitted)assert.deepEqual(await r.json(),{session:{hashed_token:'test-token'}});
  }
});

test('image analysis denies anonymous and non-admin callers before making an AI request', async () => {
  for(const authenticated of [false,true]){
    const query={eq(){return this;},maybeSingle:async()=>({data:null})};
    const client={auth:{getUser:async()=>({data:{user:authenticated?{id:'test-user'}:null},error:authenticated?null:new Error('no session')})},from:()=>({select:()=>query})};
    const h=await handler('analyze-image',()=>client);
    const r=await h(request({imageUrl:'https://example.test/image.png'}));
    assert.equal(r.status,authenticated?403:401);
  }
});
