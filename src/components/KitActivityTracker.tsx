import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { activityOptedOut, setKitActivityContext, trackKitActivity } from '@/lib/kitActivity';

export function KitActivityTracker({ gymId, enabled, token }: { gymId:string; enabled:boolean; token?:string }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!enabled || activityOptedOut()) { setKitActivityContext(null); return; }
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
  },[gymId,pathname,enabled,token]);
  return null;
}
