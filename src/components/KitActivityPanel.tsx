import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useGyms } from '@/hooks/useGyms';
import { supabase } from '@/integrations/supabase/client';
import { activityNames, type ActivityKind, type ActivityReport } from '@/lib/kitActivity';

export function KitActivityPanel() {
  const { data:gyms=[] } = useGyms();
  const [gymId,setGymId] = useState<string|null>(null);
  const [days,setDays] = useState(7);
  const [kind,setKind] = useState<ActivityKind|null>(null);
  const [sessionId,setSessionId] = useState<string|null>(null);
  const [offset,setOffset] = useState(0);
  const report=useQuery({queryKey:['kit-activity',gymId,days,kind,sessionId,offset],
    queryFn:async()=>{
      const {data,error}=await supabase.rpc('get_kit_activity',{p_days:days,p_gym_id:gymId,p_kind:kind,p_session_id:sessionId,p_offset:offset});
      if(error) throw new Error('Activity could not be loaded. Check your administrator access and try again.');
      const result=data as unknown as ActivityReport;
      if(!result || !Array.isArray(result.rows) || typeof result.total!=='number') throw new Error('The activity report returned an unexpected response.');
      return result;
    },refetchInterval:30000,refetchIntervalInBackground:false});
  const reset=()=>{setOffset(0);};
  const chip=(active:boolean)=>`cursor-pointer rounded-lg border px-3 py-2 text-[15px] font-semibold shadow-sm transition-colors ${active?'border-slate-900 bg-slate-900 text-white hover:bg-slate-700':'border-slate-300 bg-white text-slate-950 hover:bg-slate-100'}`;
  const data=report.data;
  return <section aria-label="Kit activity" className="space-y-4 rounded-xl border border-slate-300 bg-white p-4 text-slate-950 shadow-lg sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-2xl font-bold">Kit activity</h2><p className="mt-1 text-[15px]">Visits and actions recorded after tracking was enabled. Sessions are browsing sessions, not identified people.</p></div>
      <button onClick={()=>void report.refetch()} disabled={report.isFetching} className={chip(false)}><RefreshCw className={`mr-2 inline h-4 w-4 ${report.isFetching?'animate-spin':''}`}/>Refresh</button>
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Activity date range">
      {[{days:1,label:'Last 24 hours'},{days:7,label:'Last 7 days'},{days:30,label:'Last 30 days'}].map(item=><button key={item.days} aria-pressed={days===item.days} className={chip(days===item.days)} onClick={()=>{setDays(item.days);reset();}}>{item.label}</button>)}
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Activity gym">
      <button aria-pressed={!gymId} className={chip(!gymId)} onClick={()=>{setGymId(null);reset();}}>All gyms</button>
      {gyms.map(gym=><button key={gym.id} title={gym.name} aria-pressed={gymId===gym.id} className={chip(gymId===gym.id)} onClick={()=>{setGymId(gym.id);reset();}}>{gym.code}</button>)}
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Activity type">
      <button aria-pressed={!kind} className={chip(!kind)} onClick={()=>{setKind(null);reset();}}>All actions</button>
      {(Object.entries(activityNames) as [ActivityKind,string][]).map(([value,label])=><button key={value} aria-pressed={kind===value} className={chip(kind===value)} onClick={()=>{setKind(value);reset();}}>{label}</button>)}
      {sessionId&&<button className={chip(true)} onClick={()=>{setSessionId(null);reset();}}>Session {sessionId.slice(0,8)} <X className="ml-1 inline h-4 w-4"/><span className="sr-only">Clear session filter</span></button>}
    </div>
    {report.error?<div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-[15px] text-red-950">{report.error.message}</div>
      :report.isLoading?<p role="status" className="py-8 text-[15px]">Loading activity…</p>:data&&<>
      <p className="rounded-lg bg-slate-100 px-4 py-3 text-[15px]"><strong>{data.total.toLocaleString()}</strong> matching actions · <strong>{data.sessions.toLocaleString()}</strong> sessions · <strong>{data.visits.toLocaleString()}</strong> visits · <strong>{data.previews.toLocaleString()}</strong> previews · <strong>{data.downloads.toLocaleString()}</strong> downloads prepared</p>
      {!data.rows.length?<div className="rounded-lg border border-dashed border-slate-400 p-7"><h3 className="text-lg font-bold">No recorded activity in this view</h3><p className="mt-2 text-[15px]">Try another date range or filter. Tracking starts from installation; earlier visits cannot be reconstructed. Signed-in admins and opted-out browsers are excluded.</p></div>
      :<div className="max-h-[60dvh] overflow-auto rounded-lg border border-slate-300" tabIndex={0} aria-label="Activity records">
        <table className="w-full min-w-[800px] text-left text-[15px]">
          <thead className="sticky top-0 bg-slate-900 text-white"><tr>{['Time','Gym','Session','Action / item','Device','IP address'].map(label=><th key={label} className="p-3 font-bold">{label}</th>)}</tr></thead>
          <tbody>{data.rows.map(row=><tr key={row.id} className="border-t border-slate-200 align-top even:bg-slate-50">
            <td className="p-3"><time dateTime={row.created_at} title={new Date(row.created_at).toISOString()}>{new Date(row.created_at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'})}</time></td>
            <td className="p-3 font-semibold">{row.gym_code}</td>
            <td className="p-3"><button title="Show this browsing session" onClick={()=>{setSessionId(row.session_id);reset();}} className="cursor-pointer rounded-md bg-slate-200 px-2 py-1 font-mono text-slate-950 hover:bg-slate-300">{row.session_id.slice(0,8)}</button></td>
            <td className="max-w-md break-words p-3"><strong className="block">{activityNames[row.event_kind]}</strong><span>{row.label}</span></td>
            <td className="p-3">{row.device}</td>
            <td className="max-w-[220px] break-all p-3 font-mono">{row.ip_address||'Unavailable'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {!!data.total&&<div className="flex flex-wrap items-center justify-between gap-2 text-[15px]">
        <span>{offset+1}–{Math.min(offset+100,data.total)} of {data.total.toLocaleString()} actions</span>
        <div className="flex gap-2"><button disabled={!offset} className={chip(false)} onClick={()=>setOffset(Math.max(0,offset-100))}><ArrowLeft className="mr-1 inline h-4 w-4"/>Previous</button><button disabled={offset+100>=data.total} className={chip(false)} onClick={()=>setOffset(offset+100)}>Next<ArrowRight className="ml-1 inline h-4 w-4"/></button></div>
      </div>}
    </>}
    <div className="space-y-1 border-t border-slate-200 pt-3 text-[15px]">
      <p>IP addresses can be shared or changed by VPNs, mobile networks and office connections. They do not reveal a visitor’s name.</p>
      <p>“Download prepared” means the site handed a file to the browser; it does not prove it was saved or read. Privacy tools may block recording. Direct file links and offline PDF activity are not tracked.</p>
      <p>Administrator-only · 30-day reporting window · Older records deleted daily{report.dataUpdatedAt?` · Updated ${new Date(report.dataUpdatedAt).toLocaleTimeString()}`:''}</p>
    </div>
  </section>;
}
