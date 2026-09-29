import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckSquare, Copy, Download, Eye, Filter, Grid2X2, List, Pencil, RefreshCw, RotateCcw, Search, X } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useGyms } from '@/hooks/useGyms';
import { useLogoCategories } from '@/hooks/useLogoCategories';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { filterInventory, inventoryChanges, inventoryUrls, makeInventory, reverseInventoryChanges, selectRange, type InventoryChange, type InventoryDraft, type InventoryItem } from '@/lib/inventory';
import { inventoryCsv, downloadInventory } from '@/lib/inventoryExport';
import { saveDownload } from '@/lib/assetFiles';
import { copyText } from '@/lib/copyText';
import { elementTypes } from '@/lib/brandElements';
import { LogoMedia } from './LogoMedia';
import { LogoPreview } from './LogoPreview';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import './InventoryManager.css';

const PAGE_SIZE = 48;
const blankDraft: InventoryDraft = { field: 'rename', value: '', find: '', replace: '' };
const toggle = (set: Set<string>, value: string) => { const next = new Set(set); if (next.has(value)) next.delete(value); else next.add(value); return next; };

function InventoryThumbnail({ item, surface }: { item: InventoryItem; surface: string }) {
  const [dark, setDark] = useState(false);
  return <div className="inventory-thumbnail" style={{ background: surface === 'Auto' ? dark ? '#172433' : '#fff' : surface === 'Dark' ? '#172433' : '#fff' }}>
    <LogoMedia key={item.file_url} url={item.file_url} alt={item.filename} className="inventory-image" onContrast={setDark} />
  </div>;
}

/** Mounted only inside the authenticated administrator frame. */
export function InventoryManager() {
  const inventory = useInventory();
  const gymQuery = useGyms();
  const categories = useLogoCategories();
  const qc = useQueryClient();
  const gyms = gymQuery.data || [];
  const items = useMemo(() => inventory.data ? makeInventory(inventory.data, gymQuery.data || []) : [], [inventory.data, gymQuery.data]);
  const [kind, setKind] = useState('Logos');
  const [gymIds, setGymIds] = useState(new Set<string>());
  const [groups, setGroups] = useState(new Set<string>());
  const [search, setSearch] = useState('');
  const [featured, setFeatured] = useState(false);
  const [selected, setSelected] = useState(new Set<string>());
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [layout, setLayout] = useState('grid');
  const [surface, setSurface] = useState('Auto');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [preview, setPreview] = useState<InventoryItem | null>(null);
  const [editing, setEditing] = useState<InventoryItem[] | null>(null);
  const [draft, setDraft] = useState(blankDraft);
  const [undo, setUndo] = useState<InventoryChange[] | null>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [copyFallback, setCopyFallback] = useState('');
  const controller = useRef<AbortController | null>(null);
  const anchor = useRef<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  // Remove stale selection keys after a record has actually disappeared.
  useEffect(() => { const keys = new Set(items.map(i => i.key)); setSelected(old => new Set([...old].filter(k => keys.has(k)))); }, [items]);
  const filtered = useMemo(() => filterInventory(items, { kind, gymIds, groups, search, featured }), [items, kind, gymIds, groups, search, featured]);
  const chosen = useMemo(() => items.filter(i => selected.has(i.key)), [items, selected]);
  const visible = selectedOnly ? chosen : filtered;
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = visible.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const outside = chosen.filter(i => !filtered.some(f => f.key === i.key)).length;
  const groupOptions = [...new Set(items.filter(i => !kind || i.kind === kind).map(i => i.group))].sort();
  const uniqueFiles = new Set(items.map(i => i.file_url)).size;
  const previewItems = selectedOnly ? chosen : filtered;
  const previewLogos = previewItems.map(i => ({ ...i, id: i.key, variant: `${i.gyms} · ${i.group}` }));
  const previewLogo = preview ? { ...preview, id: preview.key, variant: `${preview.gyms} · ${preview.group}` } : null;
  const commonSource = editing?.every(i => i.source === editing[0].source) ? editing[0]?.source : null;
  let changes: InventoryChange[] = [], draftError = '';
  try { changes = inventoryChanges(editing || [], draft); } catch (e) { draftError = (e as Error).message; }
  const resetPage = () => { setPage(0); resultsRef.current?.scrollTo({ top: 0 }); };
  const clearFilters = () => { setGymIds(new Set()); setGroups(new Set()); setSearch(''); setFeatured(false); setSelectedOnly(false); resetPage(); };
  const refresh = async () => { await Promise.all([inventory.refetch(), gymQuery.refetch(), categories.refetch()]); };
  const beginEdit = (rows: InventoryItem[]) => { setEditing(rows); setDraft(rows.length === 1 ? { ...blankDraft, field: rows[0].source === 'gym_elements' ? 'display_name' : 'filename', value: rows[0].filename } : blankDraft); setActionError(''); };
  const changeSelection = (item: InventoryItem, shift: boolean) => {
    setSelected(old => selectRange(old, visible.map(i => i.key), anchor.current, item.key, shift, !old.has(item.key)));
    anchor.current = item.key;
  };
  const save = async (batch: InventoryChange[], isUndo = false) => {
    if (!batch.length || busy) return;
    setBusy(isUndo ? 'Undoing changes…' : 'Saving changes…'); setActionError(''); setMessage('');
    try {
      const { data, error } = await supabase.rpc('edit_inventory_items', { p_changes: batch as unknown as Json });
      if (error) throw error;
      if (data !== batch.length) throw new Error('The saved count was unexpected. Refresh inventory before editing again.');
      setUndo(isUndo ? null : reverseInventoryChanges(batch)); setEditing(null);
      setMessage(`${data} ${data === 1 ? 'record' : 'records'} ${isUndo ? 'restored' : 'saved'}.`);
      await Promise.all([qc.invalidateQueries({ queryKey: ['admin-inventory'] }), qc.invalidateQueries({ queryKey: ['gyms'] }), qc.invalidateQueries({ queryKey: ['assets-with-assignments'] })]);
    } catch (e) { setActionError(e instanceof Error ? e.message : (e as { message?: string }).message || 'Changes could not be saved.'); }
    finally { setBusy(''); }
  };
  const copyUrls = async () => {
    setActionError(''); const urls = inventoryUrls(chosen, window.location.origin), text = urls.join('\n');
    if (!urls.length) { setActionError('These items contain inline artwork with no hosted URL. Use Download ZIP.'); return; }
    const ok = await copyText(text);
    if (!ok) setCopyFallback(text);
    const inline = chosen.filter(i => i.file_url.startsWith('data:')).length;
    setMessage(`${ok ? 'Copied' : 'Ready to copy'} ${urls.length} unique URLs.${inline ? ` ${inline} inline graphics have no hosted URL; download them instead.` : ''}`);
  };
  const download = async () => {
    const abort = new AbortController(); controller.current = abort;
    setBusy('Preparing files…'); setActionError(''); setMessage('');
    try { const count = await downloadInventory(chosen, window.location.origin, abort.signal, setBusy); setMessage(`ZIP prepared: ${count} original files and a CSV matching all ${chosen.length} selected records.`); }
    catch (e) { setActionError(abort.signal.aborted ? 'Download cancelled. No partial ZIP was saved.' : (e as Error).message); }
    finally { controller.current = null; setBusy(''); }
  };
  const loadError = inventory.error || gymQuery.error;
  if (inventory.isLoading || gymQuery.isLoading) return <div className="admin-state" role="status">Loading complete inventory…</div>;
  if (loadError) return <div className="admin-state" role="alert"><h2>Inventory could not be loaded</h2><p>{loadError.message}</p><button className="admin-action" onClick={() => void refresh()}>Try again</button></div>;

  return <section className="admin-panel inventory-panel" aria-label="Logo and asset inventory">
    <div className="inventory-heading"><div><h2>Logo & asset manager</h2><p title="Collection counts are saved records. Multiple records can reference the same file URL.">{uniqueFiles.toLocaleString()} distinct URLs · {gyms.length} gyms</p></div><button className="admin-action" disabled={!!busy || inventory.isFetching} onClick={() => void refresh()} aria-label="Refresh inventory"><RefreshCw size={18} /></button></div>
    <div className="inventory-kinds" role="group" aria-label="Inventory collection">{['Logos', 'Graphics', 'Library', ''].map(value => <button key={value} aria-pressed={kind === value && !selectedOnly} onClick={() => { setKind(value); setGroups(new Set()); setFeatured(false); setSelectedOnly(false); resetPage(); }}><strong>{value ? items.filter(i => i.kind === value).length : items.length}</strong><span>{value || 'All'}</span></button>)}</div>
    <div className="inventory-tools">
      <label className="admin-search"><Search size={18} /><input aria-label="Search inventory" placeholder="Search names, gym codes, styles or tags" value={search} onChange={e => { setSearch(e.target.value); setSelectedOnly(false); resetPage(); }} />{search && <button aria-label="Clear inventory search" onClick={() => { setSearch(''); resetPage(); }}><X size={17} /></button>}</label>
      <button className="admin-action inventory-filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><Filter size={17} />Filters{gymIds.size + groups.size + Number(featured) > 0 ? ` (${gymIds.size + groups.size + Number(featured)})` : ''}</button>
      <div className="inventory-toggle" role="group" aria-label="Inventory view"><button aria-label="Grid view" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><Grid2X2 size={18} /></button><button aria-label="List view" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><List size={18} /></button></div>
      <div className="inventory-toggle inventory-surfaces" role="group" aria-label="Preview background">{['Auto', 'Light', 'Dark'].map(s => <button key={s} aria-pressed={surface === s} onClick={() => setSurface(s)}>{s}</button>)}</div>
    </div>
    <div className="inventory-workspace">
    <div className={`inventory-filters ${filtersOpen ? 'is-open' : ''}`}>
      <div className="inventory-filter-row" role="group" aria-label="Filter by gym"><strong>Gyms</strong><button aria-pressed={!gymIds.size} onClick={() => { setGymIds(new Set()); setSelectedOnly(false); resetPage(); }}>All gyms</button>{gyms.map(g => <button key={g.id} title={g.name} aria-label={`Filter ${g.code}`} aria-pressed={gymIds.has(g.id)} onClick={() => { setGymIds(toggle(gymIds, g.id)); setSelectedOnly(false); resetPage(); }}>{g.code}</button>)}{items.some(i => !i.gymIds.length && !i.allGyms) && <button aria-pressed={gymIds.has('unassigned')} onClick={() => { setGymIds(toggle(gymIds, 'unassigned')); resetPage(); }}>Unassigned</button>}</div>
      <div className="inventory-filter-row" role="group" aria-label="Filter by category"><strong>Category</strong><button aria-pressed={!groups.size} onClick={() => { setGroups(new Set()); setSelectedOnly(false); resetPage(); }}>All categories</button>{groupOptions.map(g => <button key={g} aria-pressed={groups.has(g)} onClick={() => { setGroups(toggle(groups, g)); setSelectedOnly(false); resetPage(); }}>{g}</button>)}</div>
      <div className="inventory-filter-row"><label><input type="checkbox" checked={featured} onChange={e => { setFeatured(e.target.checked); setSelectedOnly(false); resetPage(); }} /> Display logos only</label><button onClick={clearFilters}>Reset filters</button></div>
    </div>
    <div className="inventory-browse">
    <div className="inventory-results-heading"><strong>{selectedOnly ? `${chosen.length} selected records` : `${filtered.length} matching records`}</strong><div><button className="admin-action" disabled={!visible.length || !!busy} onClick={() => setSelected(old => new Set([...old, ...visible.map(i => i.key)]))}><CheckSquare size={16} />Select all {visible.length}</button><button className="admin-action" disabled={!pageItems.length || !!busy} onClick={() => setSelected(old => new Set([...old, ...pageItems.map(i => i.key)]))}>Select page</button></div></div>
    <div ref={resultsRef} className={`inventory-results inventory-${layout}`} aria-label="Inventory results" aria-busy={!!busy}>
      {!visible.length && <div className="admin-state"><h3>{selectedOnly ? 'No items selected' : 'No matching items'}</h3><button className="admin-action" onClick={clearFilters}>Reset filters</button></div>}
      {pageItems.map(item => <article key={item.key} className={`inventory-card ${selected.has(item.key) ? 'is-selected' : ''}`}>
        <label className="inventory-select"><input type="checkbox" aria-label={`Select ${item.gyms} ${item.filename}`} checked={selected.has(item.key)} disabled={!!busy} onChange={() => {}} onClick={e => changeSelection(item, e.shiftKey)} /><span className="sr-only">Select {item.filename}</span></label>
        <button className="inventory-preview-button" aria-label={`Preview ${item.gyms} ${item.filename}`} onClick={() => setPreview(item)}><InventoryThumbnail item={item} surface={surface} /></button>
        <div className="inventory-card-info"><div className="inventory-card-meta"><strong>{item.gyms}</strong>{item.featured && <span>Display</span>}</div><button className="inventory-name" onClick={() => setPreview(item)}>{item.filename}</button><p>{item.group}{item.treatment ? ` · ${item.treatment}` : ''}</p></div>
        <button className="inventory-edit" aria-label={`Edit ${item.gyms} ${item.filename}`} disabled={!!busy || item.source === 'gym_asset_assignments'} onClick={() => beginEdit([item])}><Pencil size={16} /><span>Edit</span></button>
      </article>)}
    </div>
    <div className="inventory-pagination"><span>{visible.length ? `${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, visible.length)} of ${visible.length}` : '0 records'}</span><div><button className="admin-action" aria-label="Previous inventory page" disabled={!safePage} onClick={() => { setPage(safePage - 1); resultsRef.current?.scrollTo({ top: 0 }); }}><ArrowLeft size={16} /></button><span>Page {safePage + 1} / {pageCount}</span><button className="admin-action" aria-label="Next inventory page" disabled={safePage + 1 >= pageCount} onClick={() => { setPage(safePage + 1); resultsRef.current?.scrollTo({ top: 0 }); }}><ArrowRight size={16} /></button></div></div>
    </div></div>
    {chosen.length > 0 ? <div className="inventory-action-bar">
      <div className="inventory-selection-count"><strong>{chosen.length} selected</strong>{outside > 0 && <span>{outside} outside current filters</span>}</div>
      <button disabled={!chosen.length || !!busy} onClick={() => { setSelectedOnly(!selectedOnly); resetPage(); }} aria-pressed={selectedOnly}><Eye size={17} />{selectedOnly ? 'Back to results' : 'View selection'}</button>
      <button disabled={!chosen.length || !!busy} onClick={() => void copyUrls()}><Copy size={17} />Copy URLs</button>
      <button disabled={!chosen.length || !!busy} onClick={() => void download()}><Download size={17} />Download ZIP</button>
      <button disabled={!chosen.length || !!busy} onClick={() => { saveDownload(new Blob(['\uFEFF' + inventoryCsv(chosen, window.location.origin)], { type: 'text/csv;charset=utf-8' }), 'Brand-Kit-Inventory.csv'); setMessage(`CSV prepared for ${chosen.length} records.`); }}>Export CSV</button>
      <button disabled={!chosen.length || !!busy} onClick={() => beginEdit(chosen)}><Pencil size={17} />Bulk edit</button>
      <button disabled={!chosen.length || !!busy} aria-label="Clear selection" onClick={() => { setSelected(new Set()); setSelectedOnly(false); }}><X size={17} /></button>
    </div> : <p className="inventory-hint">Select items to copy, download or bulk edit.<span className="inventory-desktop-note"> Shift-click selects a range.</span></p>}
    {(busy || message || actionError || undo) && <div className="inventory-status" role={actionError ? 'alert' : 'status'}><span>{busy || actionError || message}</span>{controller.current && <button className="admin-action" onClick={() => controller.current?.abort()}>Cancel download</button>}{undo && !busy && <button className="admin-action" onClick={() => void save(undo, true)}><RotateCcw size={16} />Undo last edit ({undo.length})</button>}</div>}
    {previewLogo && <LogoPreview logo={previewLogo} logos={previewLogos} palette={gyms.find(g => g.id === preview?.gymIds[0])?.colors.map(c => c.color_hex) || []} onChoose={i => setPreview(items.find(x => x.key === i.key) || null)} onClose={() => setPreview(null)} kind={preview?.kind === 'Logos' ? 'logo' : 'graphic'}><button className="admin-action" onClick={() => { const item = preview!; setPreview(null); beginEdit([item]); }} disabled={preview?.source === 'gym_asset_assignments'}>Edit this item</button></LogoPreview>}
    <Dialog open={!!copyFallback} onOpenChange={open => { if (!open) setCopyFallback(''); }}><DialogContent><DialogTitle>Copy selected URLs</DialogTitle><DialogDescription>Your browser blocked automatic copying. Select and copy these links.</DialogDescription><textarea aria-label="Selected URLs" className="inventory-copy-field" readOnly value={copyFallback} onFocus={e => e.target.select()} /></DialogContent></Dialog>
    <Dialog open={!!editing} onOpenChange={open => { if (!open && !busy) setEditing(null); }}><DialogContent className="inventory-editor">
      <DialogTitle>{editing?.length === 1 ? 'Edit item' : `Bulk edit ${editing?.length || 0} items`}</DialogTitle><DialogDescription>Preview the changes below, then save. Original files and their URLs stay the same.</DialogDescription>
      <div className="inventory-edit-fields" role="group" aria-label="Field to edit">
        {(editing?.length === 1 ? [{ key: commonSource === 'gym_elements' ? 'display_name' : 'filename', label: 'Name' }] : [{ key: 'rename', label: 'Find & replace names' }]).concat(commonSource === 'gym_logos' ? [{ key: 'variant', label: 'Category' }, { key: 'treatment', label: 'Treatment' }, { key: 'colorway', label: 'Colorway' }] : commonSource === 'gym_elements' ? [{ key: 'element_type', label: 'Graphic type' }] : commonSource === 'gym_assets' ? [{ key: 'category_id', label: 'Category' }, { key: 'description', label: 'Description' }] : []).map(f => <button key={f.key} className="admin-action" aria-pressed={draft.field === f.key} onClick={() => setDraft({ ...blankDraft, field: f.key })}>{f.label}</button>)}
      </div>
      {draft.field === 'rename' ? <div className="inventory-rename-fields"><label>Find text (exact case)<input value={draft.find} onChange={e => setDraft({ ...draft, find: e.target.value })} /></label><label>Replace with<input value={draft.replace} onChange={e => setDraft({ ...draft, replace: e.target.value })} /></label></div> : ['variant', 'element_type', 'category_id'].includes(draft.field) ? <div className="inventory-edit-choices">
        {(draft.field === 'variant' ? (categories.data || []).map(c => ({ value: c.name, label: c.name })) : draft.field === 'element_type' ? elementTypes.map(t => ({ value: t, label: t })) : [{ value: '', label: 'Uncategorized' }, ...(inventory.data?.categories || []).map(c => ({ value: c.id, label: c.name }))]).map(option => <button key={option.value} className="admin-action" aria-pressed={draft.value === option.value} onClick={() => setDraft({ ...draft, value: option.value })}>{option.label}</button>)}
        {draft.field === 'variant' && categories.error && <p role="alert">Categories could not be loaded. Close this editor and refresh inventory.</p>}
      </div> : <label className="inventory-value-field">{draft.field === 'description' ? 'Description' : 'New value'}<input maxLength={2000} value={draft.value} onChange={e => setDraft({ ...draft, value: e.target.value })} />{['treatment', 'colorway', 'description'].includes(draft.field) && <span>Leave blank to clear this field.</span>}</label>}
      <p><strong>{changes.length} of {editing?.length || 0} records will change.</strong>{editing?.some(i => i.source === 'gym_asset_assignments') && ' Gym-specific library versions inherit their name from the library asset.'}{['Retired','Needs review'].includes(draft.value) && ' This category hides these logos from public kit galleries.'}</p>
      <div className="inventory-edit-preview" aria-label="Proposed changes">{changes.map(c => { const item = editing?.find(i => i.id === c.id && i.source === c.source); const oldValue = Object.values(c.before)[0], newValue = Object.values(c.after)[0]; const label = (v: string | null) => draft.field === 'category_id' ? inventory.data?.categories.find(x => x.id === v)?.name || 'Uncategorized' : v || '(empty)'; return <div key={`${c.source}:${c.id}`}><strong>{item?.gyms} · {item?.filename}</strong><span>{label(oldValue)} <span aria-hidden>→</span> {label(newValue)}</span></div>; })}</div>
      {(draftError || actionError) && <p className="admin-error" role="alert">{draftError || actionError}</p>}
      <div className="inventory-editor-actions"><button className="admin-action" disabled={!!busy} onClick={() => setEditing(null)}>Cancel</button><button className="admin-action admin-action-primary" disabled={!changes.length || !!draftError || !!busy} onClick={() => void save(changes)}>{busy || `Save ${changes.length} changes`}</button></div>
    </DialogContent></Dialog>
  </section>;
}
