import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

export type ActivityKind = 'visit' | 'click' | 'preview' | 'download_ready';
type Context = { gymId: string; path: string; token?: string };
let context: Context | null = null;
let memorySession: { id: string; last: number } | null = null;
export const ACTIVITY_PREFERENCE = 'kit.activity.optout';

export function activityOptedOut() {
  try {
    return navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
      || localStorage.getItem(ACTIVITY_PREFERENCE) === '1';
  } catch { return true; }
}

function sessionId() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('kit.activity.session') || 'null');
    if (saved && typeof saved.id === 'string' && Number.isFinite(saved.last)) memorySession = saved;
  } catch { /* In-memory session still works when storage is unavailable. */ }
  if (!memorySession || Date.now() - memorySession.last > 30 * 60 * 1000) memorySession = { id: crypto.randomUUID(), last: Date.now() };
  memorySession.last = Date.now();
  try { sessionStorage.setItem('kit.activity.session', JSON.stringify(memorySession)); } catch { /* No persistent tracking required. */ }
  return memorySession.id;
}

export function setKitActivityContext(value: Context | null) { context = value; }

/** Best effort: analytics can never prevent opening or downloading artwork. */
export function trackKitActivity(kind: ActivityKind, label: string) {
  if (!context || activityOptedOut() || !import.meta.env.PROD) return;
  try {
    const body = { id: crypto.randomUUID(), gym_id: context.gymId, session_id: sessionId(),
      event_kind: kind, label: label.replace(/[\x00-\x1f]/g, ' ').trim().slice(0,240), page_path: context.path };
    void fetch(`${SUPABASE_URL}/functions/v1/record-kit-activity`, {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type':'application/json', apikey:SUPABASE_PUBLISHABLE_KEY,
        Authorization:`Bearer ${context.token || SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify(body),
    }).catch(() => { /* Browsers and privacy tools may block optional activity. */ });
  } catch { /* Tracking is optional, including in restricted browsers. */ }
}

export interface ActivityRow {
  id:string; created_at:string; gym_code:string; session_id:string; event_kind:ActivityKind;
  label:string; page_path:string; ip_address:string|null; device:string;
}
export interface ActivityReport {
  total:number; sessions:number; visits:number; previews:number; downloads:number; rows:ActivityRow[];
}
export const activityNames: Record<ActivityKind,string> = {
  visit:'Kit visit', click:'Clicked', preview:'Preview opened', download_ready:'Download prepared',
};
