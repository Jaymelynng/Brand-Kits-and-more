import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { isIP } from 'node:net';

const origins = new Set(['https://gym-brand-kits.vercel.app', 'https://brandkits.mygymtools.com']);
const kinds = new Set(['visit','click','preview','download_ready']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const headers = { 'Content-Type':'application/json', 'Cache-Control':'no-store',
    'Access-Control-Allow-Origin':origins.has(origin) ? origin : 'null', 'Vary':'Origin',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods':'POST, OPTIONS' };
  const reply = (status:number, body:object) => new Response(JSON.stringify(body), {status,headers});
  if (!origins.has(origin)) return reply(403,{error:'Origin not allowed'});
  if (req.method==='OPTIONS') return new Response(null,{status:204,headers});
  if (req.method!=='POST') return reply(405,{error:'Method not allowed'});
  if (req.headers.get('dnt')==='1' || req.headers.get('sec-gpc')==='1') return reply(200,{skipped:true});
  const ua = req.headers.get('user-agent') || '';
  if (/bot|spider|crawler|preview|facebookexternalhit|slackbot|microsoftpreview/i.test(ua)) return reply(200,{skipped:true});
  if (Number(req.headers.get('content-length') || 0)>4096) return reply(413,{error:'Payload too large'});
  try {
    const text = await req.text();
    if (new TextEncoder().encode(text).length>4096) return reply(413,{error:'Payload too large'});
    const body = JSON.parse(text);
    if (!body || !uuid.test(body.id) || !uuid.test(body.session_id) || !uuid.test(body.gym_id)
      || !kinds.has(body.event_kind) || typeof body.label!=='string' || !body.label.trim()
      // eslint-disable-next-line no-control-regex -- Intentionally reject control characters at the API boundary.
      || body.label.length>240 || /[\x00-\x1f]/.test(body.label)
      || typeof body.page_path!=='string' || !/^\/(kit|gym)\/[a-zA-Z0-9_-]{1,80}$/.test(body.page_path)) {
      return reply(400,{error:'Invalid activity event'});
    }
    const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey);
    const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
    if (token && token!==Deno.env.get('SUPABASE_ANON_KEY')) {
      const {data:{user}}=await db.auth.getUser(token);
      if (user) {
        const {data:role,error}=await db.from('user_roles').select('role').eq('user_id',user.id).eq('role','admin').maybeSingle();
        if (error) return reply(503,{error:'Activity unavailable'});
        if (role) return reply(200,{skipped:true});
      }
    }
    const {data:gym,error:gymError}=await db.from('gyms').select('id,code').eq('id',body.gym_id).maybeSingle();
    if (gymError) return reply(503,{error:'Activity unavailable'});
    if (!gym || ![gym.code,gym.id].includes(body.page_path.split('/')[2])) return reply(400,{error:'Unknown kit'});
    // Supabase's managed Cloudflare gateway supplies this header. No client JSON
    // field or arbitrary forwarding-chain entry is accepted as a visitor address.
    const address=req.headers.get('cf-connecting-ip')?.trim() || '';
    const ip=isIP(address) ? address : null;
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(serviceKey),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ip || 'unknown'));
    const networkKey=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
    const device=/ipad|tablet/i.test(ua)?'Tablet':/mobile|iphone|android/i.test(ua)?'Phone':ua?'Desktop':'Unknown';
    const {data,error}=await db.rpc('record_kit_activity',{p_id:body.id,p_gym_id:gym.id,
      p_session_id:body.session_id,p_event_kind:body.event_kind,p_label:body.label.trim(),
      p_page_path:body.page_path,p_ip:ip,p_device:device,p_network_key:networkKey});
    if (error) return reply(503,{error:'Activity unavailable'});
    return data ? reply(200,{recorded:true}) : reply(429,{error:'Activity rate limit'});
  } catch { return reply(400,{error:'Invalid activity request'}); }
});
