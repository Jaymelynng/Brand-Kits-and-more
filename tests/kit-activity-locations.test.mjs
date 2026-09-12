import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import ts from 'typescript';

const ip='192.0.2.1';
const request=(ips=[ip],headers={})=>new Request('https://example.test/locations',{method:'POST',headers:{origin:'https://brandkits.mygymtools.com',authorization:'Bearer test',...headers},body:JSON.stringify({ips})});
async function handler({user=true,admin=true,allowed=[ip],cache=[],provider,saveError=false}={}) {
  let handle; const calls=[]; const saves=[];
  const db={auth:{getUser:async()=>({data:{user:user?{id:'test-admin'}:null},error:null})},
    rpc:async()=>({data:allowed.map(ip_address=>({ip_address})),error:null}),
    from:table=>table==='user_roles'
      ? {select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:admin?{role:'admin'}:null,error:null})})})})}
      : {select:()=>({in:async()=>({data:cache,error:null})}),upsert:async row=>{saves.push(row);return {error:saveError?new Error('Unavailable'):null}}}};
  const source=(await readFile(new URL('../supabase/functions/kit-activity-locations/index.ts',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('Deno','createClient','isIP','fetch',js)({env:{get:()=> 'test-only'},serve:f=>handle=f},()=>db,isIP,async(url,options)=>{
    calls.push({url,options});
    return provider ? provider(url,options) : Response.json({success:true,ip,city:'Example City',region:'Example Region',country:'Example Country',country_code:'XX',connection:{isp:'Example Network'},latitude:12,longitude:34});
  });
  return {call:handle,calls,saves};
}
test('location lookup denies public and non-admin callers before external requests',async()=>{
  for(const options of [{user:false},{admin:false}]) { const h=await handler(options); assert.ok((await h.call(request())).status>=400); assert.equal(h.calls.length,0); }
  const h=await handler(); assert.equal((await h.call(request([ip],{origin:'https://other.invalid'}))).status,403); assert.equal(h.calls.length,0);
});
test('location requests reject URLs, malformed IPs and excessive batches',async()=>{
  for(const ips of [[],['https://example.com'],['127.0.0.1/path'],Array(21).fill(ip)]) {const h=await handler();assert.equal((await h.call(request(ips))).status,400);assert.equal(h.calls.length,0);}
});
test('only addresses actually recorded in the reporting window are looked up',async()=>{
  const h=await handler({allowed:[]});assert.deepEqual(await (await h.call(request())).json(),{locations:{}});assert.equal(h.calls.length,0);
});
test('duplicate events reuse a cached estimate and never cause another external request',async()=>{
  const saved={ip_address:ip,city:'Cached City',retry_after:new Date(Date.now()+600000).toISOString()};
  const h=await handler({cache:[saved]});const r=await (await h.call(request([ip,ip]))).json();assert.equal(r.locations[ip].city,'Cached City');assert.equal(h.calls.length,0);
});
test('successful estimates retain only coarse location and network, with a bounded cache',async()=>{
  const h=await handler();const response=await h.call(request());assert.equal(response.status,200);
  const geo=(await response.json()).locations[ip];assert.equal(geo.city,'Example City');assert.equal(geo.network,'Example Network');assert.equal(geo.latitude,undefined);assert.equal(geo.longitude,undefined);
  assert.equal(h.saves.length,1);assert.equal(h.calls[0].options.redirect,'error');assert.ok(h.calls[0].url.startsWith('https://ipwho.is/192.0.2.1?fields='));
  assert.equal(Date.parse(geo.retry_after)-Date.parse(geo.checked_at),7*86400000);
});
test('invalid provider replies and outages remain unavailable rather than becoming invented places',async()=>{
  for(const provider of [()=>Response.json({success:false,city:'Ignore me'}),()=>Response.json({success:true,ip:'192.0.2.99',city:'Wrong address'}),()=>new Response('<html>Error</html>'),()=>{throw new Error('Timeout')}]) {
    const h=await handler({provider});const r=await (await h.call(request())).json();assert.equal(r.locations[ip].city,null);assert.equal(Date.parse(r.locations[ip].retry_after)-Date.parse(r.locations[ip].checked_at),3600000);
  }
});
test('rate limits respect cooldowns and cache persistence errors do not claim success',async()=>{
  const h=await handler({provider:()=>new Response('',{status:429,headers:{'retry-after':'86400'}})});
  const r=await (await h.call(request())).json();assert.equal(Date.parse(r.locations[ip].retry_after)-Date.parse(r.locations[ip].checked_at),86400000);
  assert.equal((await (await handler({saveError:true})).call(request())).status,503);
});
