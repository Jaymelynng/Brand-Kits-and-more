import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ACTIVITY_PREFERENCE, activityOptedOut, setKitActivityContext, trackKitActivity } from '@/lib/kitActivity';

export function KitActivityNotice({ gymId, enabled, token }: { gymId:string; enabled:boolean; token?:string }) {
  const { pathname } = useLocation();
  const [open,setOpen] = useState(false);
  const [optedOut,setOptedOut] = useState(activityOptedOut);
  useEffect(() => {
    if (!enabled || optedOut) { setKitActivityContext(null); return; }
    setKitActivityContext({gymId,path:pathname,token});
    // Delay also cancels React's development-only double mount.
    const timer = window.setTimeout(() => trackKitActivity('visit','Opened brand kit'), 250);
    const capture = (event:MouseEvent) => {
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLElement>('button,a,[role="button"]');
      if (!button || button.matches(':disabled,[aria-disabled="true"]') || button.closest('[data-no-activity]')) return;
      const label = button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent?.trim();
      if (!label) return;
      const asset = button.closest<HTMLElement>('[data-activity-asset]')?.dataset.activityAsset;
      trackKitActivity('click', asset && !label.includes(asset) ? `${label} · ${asset}` : label);
    };
    document.addEventListener('click',capture,true);
    const downloaded = (event:Event) => trackKitActivity('download_ready', (event as CustomEvent<{filename:string}>).detail.filename);
    window.addEventListener('kit-download-ready',downloaded);
    return () => { clearTimeout(timer); document.removeEventListener('click',capture,true); window.removeEventListener('kit-download-ready',downloaded); setKitActivityContext(null); };
  },[gymId,pathname,enabled,optedOut,token]);
  if (!enabled) return null;
  return <div className="mx-auto max-w-7xl px-6 pb-6 pt-3 text-center" data-no-activity>
    <button onClick={()=>setOpen(true)} className="cursor-pointer rounded-lg border border-slate-400 bg-white px-3 py-2 text-[15px] font-semibold text-slate-950 shadow-sm hover:bg-slate-100">Usage & privacy</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-no-activity className="max-h-[90dvh] overflow-y-auto bg-white text-slate-950">
        <DialogTitle>Brand kit activity</DialogTitle>
        <DialogDescription className="text-[15px] text-slate-950">The kit owner records visits, button clicks, previews and prepared downloads to understand which materials are useful.</DialogDescription>
        <p className="text-[15px]">Records include the gym, action, time, device category, a temporary browsing-session ID and the network IP address. Names, email addresses, form entries and browsing on other websites are not collected.</p>
        <p className="text-[15px]">The activity report is administrator-only. It covers the last 30 days; older records are deleted daily. An IP or session does not identify a person. A prepared download does not prove that a file was saved or opened.</p>
        <p className="text-[15px]">Do Not Track and Global Privacy Control are respected. You can also turn activity recording off for this browser without losing access to any kit files.</p>
        <button className="cursor-pointer rounded-lg bg-slate-900 px-4 py-3 text-[15px] font-bold text-white hover:bg-slate-700" disabled={optedOut}
          onClick={()=>{ try { localStorage.setItem(ACTIVITY_PREFERENCE,'1'); } catch { /* Session opt-out still takes effect. */ } setOptedOut(true); setKitActivityContext(null); }}>
          {optedOut ? 'Activity recording is off' : 'Turn off activity recording'}
        </button>
      </DialogContent>
    </Dialog>
  </div>;
}
