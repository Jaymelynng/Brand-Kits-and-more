import { useRef, useState, type CSSProperties } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Building2, Database, Shield, Pencil, Check, ExternalLink, Plus, Search, Sparkles, Tags, Activity, Copy, Download, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePersonalBrandColors } from '@/hooks/usePersonalBrand';
import { useGyms, useUpdateGymInfo, type GymWithColors } from '@/hooks/useGyms';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddGymModal } from '@/components/AddGymModal';
import { LogoCategoryManager } from '@/components/LogoCategoryManager';
import { KitActivityPanel } from '@/components/KitActivityPanel';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { copyText } from '@/lib/copyText';
import { saveDownload } from '@/lib/assetFiles';
import { gymDataCsv } from '@/lib/adminData';
import './Admin.css';

const tabs = [
  { id: 'gyms', label: 'Manage gyms', short: 'Gyms', icon: Building2 },
  { id: 'categories', label: 'Categories & tags', short: 'Labels', icon: Tags },
  { id: 'users', label: 'Users & roles', short: 'Users', icon: Users },
  { id: 'bulk', label: 'Bulk data', short: 'Bulk', icon: Database },
  { id: 'activity', label: 'Kit activity', short: 'Activity', icon: Activity },
] as const;
type AdminTab = typeof tabs[number]['id'];
const contactFields = [{ key: 'address', label: 'Address' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'website', label: 'Website' }] as const;
type ContactField = typeof contactFields[number]['key'];
type ContactDraft = Record<ContactField, string>;
const contactDraft = (gym: GymWithColors): ContactDraft => ({ address: gym.address || '', phone: gym.phone || '', email: gym.email || '', website: gym.website || '' });

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const { data: brandColors = [] } = usePersonalBrandColors();
  const color = (name: string, fallback: string) => brandColors.find(item => item.color_name === name && /^#[0-9a-f]{6}$/i.test(item.color_hex))?.color_hex || fallback;
  const brandStyle = { '--admin-rose': color('Rose Mauve', 'hsl(var(--brand-rose-gold))'), '--admin-dusty': color('Dusty Rose', 'hsl(var(--brand-rose-gold-dark))'), '--admin-lavender': color('Lavender Gray', 'hsl(var(--brand-blue-gray))'), '--admin-gray': color('Warm Gray', 'hsl(var(--brand-text-primary))') } as CSSProperties;
  const { data: gyms = [], isLoading, error, refetch } = useGyms();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get('tab');
  const activeTab: AdminTab = tabs.find(tab => tab.id === requestedTab)?.id || 'gyms';
  const main = useRef<HTMLElement>(null);
  const { toast } = useToast();
  const updateGym = useUpdateGymInfo();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<GymWithColors | null>(null);
  const [draft, setDraft] = useState<ContactDraft>({ address: '', phone: '', email: '', website: '' });
  const [saveError, setSaveError] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const users = useQuery({
    queryKey: ['admin-users'], enabled: isAdmin && activeTab === 'users',
    queryFn: async () => {
      const [roles, profiles] = await Promise.all([
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('user_profiles').select('id, email'),
      ]);
      if (roles.error || profiles.error) throw new Error('Users could not be loaded. Please try again.');
      return (roles.data || []).map(role => ({ id: role.user_id, role: role.role, email: profiles.data?.find(profile => profile.id === role.user_id)?.email || 'Email unavailable' }));
    },
  });

  if (loading) return <div className="admin-loading" role="status">Loading administration…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <div className="admin-loading"><Shield size={36} /><h1>Administrator access required</h1><button className="admin-action" onClick={() => navigate('/')}>Back to brand kits</button></div>;

  const changeTab = (tab: AdminTab) => { setParams({ tab }); main.current?.scrollTo({ top: 0 }); };
  const filtered = gyms.filter(gym => [gym.name, gym.code].some(value => value.toLowerCase().includes(search.trim().toLowerCase())));
  const startEdit = (gym: GymWithColors) => { setEditing(gym); setDraft(contactDraft(gym)); setSaveError(''); };
  const changes = editing ? Object.fromEntries(contactFields.filter(({ key }) => draft[key] !== (editing[key] || '')).map(({ key }) => [key, draft[key] || null])) : {};
  const save = async () => {
    if (!editing || !Object.keys(changes).length || updateGym.isPending) return;
    setSaveError('');
    try {
      await updateGym.mutateAsync({ gymId: editing.id, updates: changes });
      toast({ description: `${editing.code} contact details saved.` }); setEditing(null);
    } catch { setSaveError('The changes did not save. Your entries are still here; please try again.'); }
  };
  const copy = async (text: string, description: string) => {
    setBulkBusy(true);
    try { const ok = await copyText(text); toast({ description: ok ? description : 'Copy failed. Please try again.', variant: ok ? 'default' : 'destructive' }); }
    finally { setBulkBusy(false); }
  };
  const gymLogo = (gym: GymWithColors) => {
    const logo = gym.logos.find(item => item.is_main_logo);
    return <span className="admin-gym-logo">{logo ? <img src={logo.file_url} alt="" /> : <Building2 size={22} />}</span>;
  };
  const swatches = (gym: GymWithColors) => <div className="admin-swatches" aria-label={`${gym.code} brand colors`}>{gym.colors.map(color => <span key={color.id} title={color.color_hex} style={{ background: color.color_hex }} />)}{!gym.colors.length && <span className="admin-no-color">No colors saved</span>}</div>;
  const listState = isLoading ? <p className="admin-state" role="status">Loading gyms…</p> : error ? <div className="admin-state" role="alert"><h3>Gym data could not be loaded</h3><button className="admin-action" onClick={() => void refetch()}><RefreshCw size={17} />Try again</button></div> : null;

  return <div className="admin-shell" style={brandStyle}>
    <header className="admin-topbar">
      <button className="admin-back" onClick={() => navigate('/')} aria-label="Back to brand kits"><ArrowLeft size={21} /></button>
      <div className="admin-heading"><h1>Administration</h1><p>{user.email}</p></div>
      <button className="admin-action admin-my-brand" aria-label="My Brand" onClick={() => navigate('/my-brand')}><Sparkles size={17} /><span>My Brand</span></button>
    </header>
    <nav className="admin-nav" aria-label="Administration sections">
      <div className="admin-nav-caption"><Shield size={18} /> Workspace settings</div>
      <div className="admin-nav-items">{tabs.map(tab => <button key={tab.id} className="admin-nav-item" aria-label={tab.label} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => changeTab(tab.id)}><tab.icon size={20} /><span className="admin-nav-long">{tab.label}</span><span className="admin-nav-short">{tab.short}</span></button>)}</div>
      <p className="admin-nav-note">Your public brand kits keep their own gym branding.</p>
    </nav>
    <main ref={main} className="admin-main" id="admin-content" aria-label={tabs.find(tab => tab.id === activeTab)?.label}>
      {activeTab === 'gyms' && <section className="admin-panel admin-gym-panel">
        <div className="admin-panel-heading"><div><h2>Manage gyms</h2><p>Contact details, brand colors and profile access.</p></div><button className="admin-action admin-action-primary" onClick={() => setAdding(true)}><Plus size={18} />Add gym</button></div>
        <div className="admin-list-tools"><div className="admin-search"><Search size={18} /><input aria-label="Search gyms" placeholder="Search by name or code" value={search} onChange={event => setSearch(event.target.value)} />{search && <button onClick={() => setSearch('')} aria-label="Clear search">×</button>}</div><span>{filtered.length} of {gyms.length} gyms</span></div>
        {listState || (!filtered.length ? <div className="admin-state"><h3>{search ? 'No gyms match your search' : 'No gyms saved yet'}</h3>{search && <button className="admin-action" onClick={() => setSearch('')}>Clear search</button>}</div> : <div className="admin-gym-results">
          <div className="admin-table-wrap"><table className="admin-gym-table"><thead><tr><th>Gym</th><th>Address</th><th>Contact</th><th>Website</th><th>Colors</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(gym => <tr key={gym.id}>
            <td><div className="admin-gym-identity">{gymLogo(gym)}<div><strong>{gym.name}</strong><span className="admin-code">{gym.code}</span></div></div></td>
            <td><button className="admin-field" onClick={() => startEdit(gym)} aria-label={`Edit ${gym.code} address`}>{gym.address || 'Address not set'}</button></td>
            <td><button className="admin-field" onClick={() => startEdit(gym)} aria-label={`Edit ${gym.code} contact details`}><span>{gym.phone || 'Phone not set'}</span><span>{gym.email || 'Email not set'}</span></button></td>
            <td><button className="admin-field" onClick={() => startEdit(gym)} aria-label={`Edit ${gym.code} website`}>{gym.website || 'Website not set'}</button></td>
            <td>{swatches(gym)}</td>
            <td><div className="admin-row-actions"><button className="admin-action" onClick={() => startEdit(gym)} aria-label={`Edit ${gym.code} details`}><Pencil size={16} />Edit</button><button className="admin-action" onClick={() => navigate(`/gym/${gym.code}`)} aria-label={`Open ${gym.code} profile`}><ExternalLink size={16} />Profile</button></div></td>
          </tr>)}</tbody></table></div>
          <div className="admin-gym-cards">{filtered.map(gym => <article key={gym.id} className="admin-gym-card"><div className="admin-gym-identity">{gymLogo(gym)}<div><strong>{gym.name}</strong><span className="admin-code">{gym.code}</span></div></div><div className="admin-card-contact"><p>{gym.phone || 'Phone not set'}</p><p>{gym.email || 'Email not set'}</p></div><div className="admin-card-bottom">{swatches(gym)}<div className="admin-row-actions"><button className="admin-action" onClick={() => startEdit(gym)} aria-label={`Edit ${gym.code} details`}><Pencil size={16} />Edit</button><button className="admin-action" onClick={() => navigate(`/gym/${gym.code}`)} aria-label={`Open ${gym.code} profile`}><ExternalLink size={16} />Profile</button></div></div></article>)}</div>
        </div>)}
      </section>}
      {activeTab === 'categories' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Categories & tags</h2><p>Set the gallery order and maintain reusable labels.</p></div></div><LogoCategoryManager /></section>}
      {activeTab === 'users' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Users & roles</h2><p>Accounts with an assigned role in this app.</p></div><button className="admin-action" disabled={users.isFetching} onClick={() => void users.refetch()}><RefreshCw size={17} />Refresh</button></div>
        {users.isLoading ? <p className="admin-state" role="status">Loading users…</p> : users.error ? <p className="admin-error" role="alert">{users.error.message}</p> : !users.data?.length ? <p className="admin-state">No accounts with assigned roles.</p> : <div className="admin-user-list">{users.data.map(account => <div key={`${account.id}:${account.role}`} className="admin-user-row"><span className="admin-user-icon"><Users size={21} /></span><strong>{account.email}</strong><span className="admin-role">{account.role}</span></div>)}</div>}
      </section>}
      {activeTab === 'bulk' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Bulk data</h2><p>Export the saved gym records or copy them for another tool.</p></div></div>{listState || <><div className="admin-export-grid">
        <button disabled={bulkBusy || !gyms.length} className="admin-export" onClick={() => void copy(gyms.map(gym => `${gym.name} (${gym.code})\nAddress: ${gym.address || 'Not set'}\nPhone: ${gym.phone || 'Not set'}\nEmail: ${gym.email || 'Not set'}\nWebsite: ${gym.website || 'Not set'}\nColors: ${gym.colors.map(color => color.color_hex).join(', ')}`).join('\n\n'), 'Gym records copied.')}><Copy size={25} /><strong>Copy gym records</strong><span>Names, contacts, websites and colors</span><span className="admin-export-cta">Copy records <ArrowLeft className="rotate-180" size={17} /></span></button>
        <button disabled={!gyms.length} className="admin-export admin-export-featured" onClick={() => { saveDownload(new Blob(['\uFEFF' + gymDataCsv(gyms)], { type: 'text/csv;charset=utf-8' }), 'gyms-export.csv'); toast({ description: 'CSV prepared for download.' }); }}><Download size={25} /><strong>Download CSV</strong><span>Saved records in a spreadsheet format</span><span className="admin-export-cta">Download file <ArrowLeft className="rotate-180" size={17} /></span></button>
        <button disabled={bulkBusy || !gyms.length} className="admin-export" onClick={() => void copy(gyms.flatMap(gym => gym.colors.map(color => color.color_hex)).join('\n'), 'All saved HEX colors copied.')}><Copy size={25} /><strong>Copy color values</strong><span>Every saved HEX color, one per line</span><span className="admin-export-cta">Copy colors <ArrowLeft className="rotate-180" size={17} /></span></button>
      </div><p className="admin-inventory"><strong>{gyms.length}</strong> gyms · <strong>{gyms.reduce((sum, gym) => sum + gym.logos.length, 0)}</strong> saved logos · <strong>{gyms.reduce((sum, gym) => sum + gym.colors.length, 0)}</strong> saved colors</p><p className="admin-footnote">{gyms.filter(gym => gym.address && gym.phone && gym.email).length} of {gyms.length} gym records include an address, phone and email.</p></>}
      </section>}
      {activeTab === 'activity' && <KitActivityPanel />}
    </main>
    <Sheet open={!!editing} onOpenChange={open => { if (!open && !updateGym.isPending) setEditing(null); }}>
      <SheetContent className="admin-drawer w-full sm:max-w-[520px]" style={brandStyle}><div className="admin-drawer-heading"><SheetTitle>Edit {editing?.code} details</SheetTitle><SheetDescription>{editing?.name}</SheetDescription></div><form className="admin-edit-form" onSubmit={event => { event.preventDefault(); void save(); }}><div className="admin-edit-fields">{contactFields.map(field => <label key={field.key} htmlFor={`admin-${field.key}`}><span>{field.label}</span>{field.key === 'address' ? <textarea id={`admin-${field.key}`} rows={3} value={draft[field.key]} disabled={updateGym.isPending} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} /> : <input id={`admin-${field.key}`} type={field.key === 'email' ? 'email' : field.key === 'phone' ? 'tel' : 'text'} value={draft[field.key]} disabled={updateGym.isPending} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} />}</label>)}{saveError && <p className="admin-error" role="alert">{saveError}</p>}</div><div className="admin-edit-actions"><button type="button" className="admin-action" disabled={updateGym.isPending} onClick={() => setEditing(null)}>Cancel</button><button className="admin-action admin-action-primary" disabled={!Object.keys(changes).length || updateGym.isPending}><Check size={18} />{updateGym.isPending ? 'Saving…' : 'Save changes'}</button></div></form></SheetContent>
    </Sheet>
    <AddGymModal isOpen={adding} onClose={() => setAdding(false)} />
  </div>;
}
