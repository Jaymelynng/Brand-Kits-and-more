import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { isIP } from 'node:net';

const origins = new Set(['https://gym-brand-kits.vercel.app', 'https://brandkits.mygymtools.com']);
const fields = 'ip,success,city,region,country,country_code,connection.isp';
const columns = 'ip_address,city,region,country,country_code,network,checked_at,retry_after';
type Estimate = { ip_address:string; city:string|null; region:string|null; country:string|null;
  country_code:string|null; network:string|null; checked_at:string; retry_after:string };
const clean = (value:unknown) => typeof value === 'string' && value.trim() ? value.trim().slice(0,160) : null;
const canonical = (ip:string) => isIP(ip) === 6 ? new URL(`https://[${ip}]/`).hostname.slice(1,-1) : ip;

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const headers = { 'Content-Type':'application/json', 'Cache-Control':'no-store',
    'Access-Control-Allow-Origin':origins.has(origin) ? origin : 'null', 'Vary':'Origin',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods':'POST, OPTIONS' };
  const reply = (status:number, body:object) => new Response(JSON.stringify(body), {status,headers});
  if (!origins.has(origin)) return reply(403,{error:'Origin not allowed'});
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (req.method !== 'POST') return reply(405,{error:'Method not allowed'});
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply(401,{error:'Administrator sign-in required'});
  if (Number(req.headers.get('content-length') || 0) > 2048) return reply(413,{error:'Payload too large'});
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const {data:{user},error:authError} = await db.auth.getUser(token);
    if (authError || !user) return reply(401,{error:'Administrator sign-in required'});
    const {data:role,error:roleError} = await db.from('user_roles').select('role').eq('user_id',user.id).eq('role','admin').maybeSingle();
    if (roleError) return reply(503,{error:'Locations temporarily unavailable'});
    if (!role) return reply(403,{error:'Administrator access required'});
    const text = await req.text();
    if (new TextEncoder().encode(text).length > 2048) return reply(413,{error:'Payload too large'});
    let body;
    try { body = JSON.parse(text); } catch { return reply(400,{error:'Invalid location request'}); }
    if (!Array.isArray(body?.ips) || !body.ips.length || body.ips.length > 20
      || body.ips.some((ip:unknown) => typeof ip !== 'string' || !isIP(ip))) {
      return reply(400,{error:'Request up to 20 valid IP addresses'});
    }
    const ips = [...new Set((body.ips as string[]).map(canonical))];
    const {data:recorded,error:recordedError} = await db.rpc('get_kit_activity_location_ips',{p_ips:ips});
    if (recordedError) return reply(503,{error:'Locations temporarily unavailable'});
    const allowed:string[] = (recorded || []).map((row:{ip_address:string}) => row.ip_address);
    if (!allowed.length) return reply(200,{locations:{}});
    const {data:cached,error:cacheError} = await db.from('kit_activity_locations').select(columns).in('ip_address',allowed);
    if (cacheError) return reply(503,{error:'Locations temporarily unavailable'});
    const saved = new Map<string,Estimate>((cached || []).map((row:Estimate) => [row.ip_address,row]));
    const locations:Record<string,Estimate> = {};
    const pending = [...allowed];
    // Limit concurrent external calls. A failed lookup never blocks the activity report.
    await Promise.all(Array.from({length:Math.min(4,pending.length)},async () => {
      for (let ip = pending.shift(); ip; ip = pending.shift()) {
        const previous = saved.get(ip);
        if (previous && Date.parse(previous.retry_after) > Date.now()) { locations[ip]=previous; continue; }
        const now = Date.now();
        const estimate:Estimate = {ip_address:ip,city:null,region:null,country:null,country_code:null,
          network:null,checked_at:new Date(now).toISOString(),retry_after:new Date(now+3600000).toISOString()};
        try {
          const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=${fields}`,{
            signal:AbortSignal.timeout(3500),redirect:'error',headers:{Accept:'application/json'} });
          if (response.status === 429) {
            const seconds = Number(response.headers.get('retry-after'));
            estimate.retry_after = new Date(now+Math.max(3600,Math.min(Number.isFinite(seconds) && seconds>0 ? seconds : 86400,86400))*1000).toISOString();
          }
          if (response.ok) {
            const payload = await response.text();
            if (payload.length > 20000) throw new Error('Unexpected provider response');
            const geo = JSON.parse(payload);
            if (geo.success === true && typeof geo.ip === 'string' && isIP(geo.ip) && canonical(geo.ip) === ip) {
              estimate.city=clean(geo.city); estimate.region=clean(geo.region);
              estimate.country=clean(geo.country); estimate.country_code=clean(geo.country_code);
              estimate.network=clean(geo.connection?.isp);
              if (estimate.city || estimate.region || estimate.country) estimate.retry_after=new Date(now+7*86400000).toISOString();
            }
          }
        } catch { /* Unknown stays unknown; retry after the cooldown. */ }
        const {error:saveError} = await db.from('kit_activity_locations').upsert(estimate,{onConflict:'ip_address'});
        if (saveError) throw new Error('Location cache unavailable');
        locations[ip]=estimate;
      }
    }));
    return reply(200,{locations});
  } catch { return reply(503,{error:'Locations temporarily unavailable'}); }
});
