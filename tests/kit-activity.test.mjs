import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import ts from 'typescript';

const gym='00112233-4455-4677-8899-aabbccddeeff';
const fixture={id:'11112233-4455-4677-8899-aabbccddeeff',gym_id:gym,session_id:'22112233-4455-4677-8899-aabbccddeeff',event_kind:'preview',label:'Logo preview',page_path:'/kit/TEST'};
async function handler({role=null,allowed=true,fail=false}={}) {
  let handle, recorded;
  const db={auth:{getUser:async()=>({data:{user:{id:'test-user'}}})},
    from:table=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:role,error:null})}),maybeSingle:async()=>({data:{id:gym,code:'TEST'},error:null})})})}),
    rpc:async(name,args)=>{recorded={name,args};return {data:allowed,error:fail?new Error('Unavailable'):null}}};
  const source=(await readFile(new URL('../supabase/functions/record-kit-activity/index.ts',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('Deno','createClient','isIP',js)({env:{get:key=>key==='SUPABASE_ANON_KEY'?'anon':'test-service-key'},serve:f=>handle=f},()=>db,isIP);
  return {call:handle,recorded:()=>recorded};
}
const request=(body=fixture,headers={})=>new Request('https://example.test/functions/v1/record-kit-activity',{method:'POST',headers:{origin:'https://gym-brand-kits.vercel.app',authorization:'Bearer anon','content-type':'application/json',...headers},body:JSON.stringify(body)});

test('activity rejects bad origins, oversized payloads and invalid event fields before writing',async()=>{
  const h=await handler();
  assert.equal((await h.call(request(fixture,{origin:'https://unrelated.invalid'}))).status,403);
  for(const update of [{event_kind:'delete'},{label:'x'.repeat(5000)},{page_path:'/kit/TEST?email=private'},{session_id:'not-a-session'},{label:'\u0000'}]) assert.ok((await h.call(request({...fixture,...update}))).status>=400);
  assert.equal(h.recorded(),undefined);
});
test('activity uses gateway IP, strips extra client fields, and has a distinct download-ready event',async()=>{
  const h=await handler();
  const r=await h.call(request({...fixture,event_kind:'download_ready',ip:'203.0.113.99',email:'not-recorded',created_at:'1999-01-01'},{'cf-connecting-ip':'2001:db8::1234','x-forwarded-for':'203.0.113.100'}));
  assert.equal(r.status,200);
  const {args}=h.recorded();assert.equal(args.p_ip,'2001:db8::1234');assert.equal(args.p_event_kind,'download_ready');
  assert.equal(args.p_network_key.length,64);assert.equal(JSON.stringify(args).includes('not-recorded'),false);
  assert.equal(args.created_at,undefined);assert.equal(args.email,undefined);
});
test('a missing gateway IP remains unknown; arbitrary forwarded headers are not trusted',async()=>{
  const h=await handler();await h.call(request(fixture,{'x-forwarded-for':'203.0.113.99'}));assert.equal(h.recorded().args.p_ip,null);
});
test('privacy signals, recognized bots and signed-in admins do not create activity',async()=>{
  for(const headers of [{'dnt':'1'},{'sec-gpc':'1'},{'user-agent':'Slackbot'}]){const h=await handler();assert.equal((await h.call(request(fixture,headers))).status,200);assert.equal(h.recorded(),undefined)}
  const h=await handler({role:{role:'admin'}});await h.call(request(fixture,{authorization:'Bearer user-token'}));assert.equal(h.recorded(),undefined);
});
test('activity never reports success when persistence fails or the rate limit is reached',async()=>{
  assert.equal((await (await handler({fail:true})).call(request())).status,503);
  assert.equal((await (await handler({allowed:false})).call(request())).status,429);
});
