import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useGyms } from '@/hooks/useGyms';
import { supabase } from '@/integrations/supabase/client';
import { activityNames, type ActivityKind, type ActivityReport, type ActivityRow } from '@/lib/kitActivity';

export function KitActivityPanel() {
  const { data: gyms = [] } = useGyms();
  const [gymId, setGymId] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [kind, setKind] = useState<ActivityKind | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const report = useQuery({ queryKey: ['kit-activity', gymId, days, kind, sessionId, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_kit_activity', { p_days: days, p_gym_id: gymId, p_kind: kind, p_session_id: sessionId, p_offset: offset });
      if (error) throw new Error('Activity could not be loaded. Check your administrator access and try again.');
      const result = data as unknown as ActivityReport;
      if (!result || !Array.isArray(result.rows) || typeof result.total !== 'number') throw new Error('The activity report returned an unexpected response.');
      return result;
    }, refetchInterval: 30000, refetchIntervalInBackground: false });
  const reset = () => setOffset(0);
  const data = report.data;
  const stamp = (row: ActivityRow) => <time dateTime={row.created_at} title={new Date(row.created_at).toISOString()}>{new Date(row.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })}</time>;
  const session = (row: ActivityRow) => <button title="Show this browsing session" className="admin-session" onClick={() => { setSessionId(row.session_id); reset(); }}>{row.session_id.slice(0, 8)}</button>;
  return <section aria-label="Kit activity" className="admin-panel admin-activity">
    <div className="admin-panel-heading"><div><h2>Kit activity</h2><p>Visits, previews and downloads by browsing session.</p></div><button onClick={() => void report.refetch()} disabled={report.isFetching} aria-label="Refresh activity" className="admin-action admin-refresh"><RefreshCw className={report.isFetching ? 'animate-spin' : ''} size={17} /><span>Refresh</span></button></div>
    <div className="admin-activity-filters">
      <div className="admin-filter-row" role="group" aria-label="Activity date range">{[1, 7, 30].map(value => <button key={value} aria-label={value === 1 ? 'Last 24 hours' : `Last ${value} days`} aria-pressed={days === value} onClick={() => { setDays(value); reset(); }}>{value === 1 ? '24 hours' : `${value} days`}</button>)}</div>
      <div className="admin-filter-row admin-gym-filter" role="group" aria-label="Activity gym"><button aria-label="All gyms" aria-pressed={!gymId} onClick={() => { setGymId(null); reset(); }}>All</button>{gyms.map(gym => <button key={gym.id} title={gym.name} aria-pressed={gymId === gym.id} onClick={() => { setGymId(gym.id); reset(); }}>{gym.code}</button>)}</div>
      <div className="admin-filter-row" role="group" aria-label="Activity type"><button aria-pressed={!kind} onClick={() => { setKind(null); reset(); }}>All actions</button>{([{ kind: 'visit', label: 'Visits' }, { kind: 'click', label: 'Clicks' }, { kind: 'preview', label: 'Previews' }, { kind: 'download_ready', label: 'Downloads' }] as const).map(item => <button key={item.kind} aria-pressed={kind === item.kind} onClick={() => { setKind(item.kind); reset(); }}>{item.label}</button>)}{sessionId && <button aria-label="Clear session filter" aria-pressed="true" onClick={() => { setSessionId(null); reset(); }}>Session {sessionId.slice(0, 8)} <X size={15} /></button>}</div>
    </div>
    {report.error ? <div role="alert" className="admin-error">{report.error.message}</div> : report.isLoading ? <p role="status" className="admin-state">Loading activity…</p> : data && <>
      <p className="admin-activity-totals"><strong>{data.total.toLocaleString()}</strong> actions · <strong>{data.sessions.toLocaleString()}</strong> sessions <span> {data.visits.toLocaleString()} visits · {data.previews.toLocaleString()} previews · {data.downloads.toLocaleString()} downloads prepared</span></p>
      {!data.rows.length ? <div className="admin-state"><h3>No recorded activity in this view</h3><p>Tracking starts from installation. Earlier visits are unavailable; signed-in admins and opted-out browsers are excluded.</p></div> : <>
        <div className="admin-activity-table" tabIndex={0} aria-label="Activity records"><table><thead><tr>{['Time', 'Gym', 'Session', 'Action / item', 'Device', 'IP address'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{data.rows.map(row => <tr key={row.id}><td>{stamp(row)}</td><td><strong>{row.gym_code}</strong></td><td>{session(row)}</td><td><strong>{activityNames[row.event_kind]}</strong><p>{row.label}</p></td><td>{row.device}</td><td className="admin-ip">{row.ip_address || 'Unavailable'}</td></tr>)}</tbody></table></div>
        <div className="admin-activity-cards">{data.rows.map(row => <article key={row.id}><div className="admin-activity-card-heading"><strong>{activityNames[row.event_kind]}</strong><span className="admin-code">{row.gym_code}</span></div><p>{row.label}</p><div className="admin-activity-card-meta">{stamp(row)}<span>{row.device}</span></div><dl><div><dt>IP address</dt><dd className="admin-ip">{row.ip_address || 'Unavailable'}</dd></div><div><dt>Session</dt><dd>{session(row)}</dd></div></dl></article>)}</div>
      </>}
      {!!data.total && <div className="admin-pagination"><span>{offset + 1}–{Math.min(offset + 100, data.total)} of {data.total.toLocaleString()}</span><div><button disabled={!offset} className="admin-action" onClick={() => setOffset(Math.max(0, offset - 100))}><ArrowLeft size={16} />Previous</button><button disabled={offset + 100 >= data.total} className="admin-action" onClick={() => setOffset(offset + 100)}>Next<ArrowRight size={16} /></button></div></div>}
    </>}
    <details className="admin-activity-help"><summary>About this report</summary><p>Sessions are browsing sessions, not identified people. IP addresses may be shared or changed by office connections, mobile networks and VPNs; they do not reveal a visitor’s name.</p><p>“Download prepared” means the site handed a file to the browser. It does not prove that it was saved or read. Direct file links, offline PDFs and recording blocked by privacy tools are outside coverage.</p><p>Administrator-only · 30-day reporting window · Older records deleted daily.</p></details>
    <p className="admin-footnote">Private activity · 30-day retention{report.dataUpdatedAt ? ` · Updated ${new Date(report.dataUpdatedAt).toLocaleTimeString()}` : ''}</p>
  </section>;
}
