import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Copy, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVariationGalleries, galleryPath } from '@/hooks/useVariationGalleries';
import { supabase } from '@/integrations/supabase/client';
import { copyText } from '@/lib/copyText';
export function VariationGalleriesSection({ gymId, gymCode, isAdmin, solo }: { gymId: string; gymCode: string; isAdmin: boolean; solo: boolean }) {
  const galleries = useVariationGalleries(gymId, isAdmin);
  const [creating, setCreating] = useState(false), [title, setTitle] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const cache = useQueryClient(), navigate = useNavigate();
  async function create() {
    setBusy(true); setMessage('');
    try {
      const slug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,80).replace(/-$/, '') || 'collection';
      const { data, error } = await supabase.from('variation_galleries').insert({ gym_id: gymId, title: title.trim(), slug: `${slug}-${crypto.randomUUID().slice(0,8)}` }).select().single();
      if (error) throw error;
      await cache.invalidateQueries({ queryKey: ['variation-galleries'] });
      navigate(galleryPath(gymCode, data.slug, false));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create the gallery.'); }
    finally { setBusy(false); }
  }
  if (!isAdmin && !galleries.data?.length && !galleries.isError) return null;
  return <section id="variation-galleries" className="lg:col-span-4 scroll-mt-28 rounded-2xl border border-slate-300 bg-white p-5 text-slate-950 md:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-bold uppercase tracking-widest">Collections to share</p><h2 className="text-2xl font-bold">Variation galleries</h2><p className="mt-1 text-base">Open a collection to compare options and download the originals.</p></div>
      {isAdmin && <Button onClick={() => setCreating(!creating)}><Plus className="mr-2 h-4 w-4" />New gallery</Button>}
    </div>
    {galleries.isError && <p role="alert" className="mt-4">Galleries could not load. <button className="underline" onClick={() => void galleries.refetch()}>Try again</button></p>}
    {creating && <form className="mt-4 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); void create(); }}><Input className="max-w-md" aria-label="Gallery name" placeholder="Name this collection" required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /><Button disabled={busy || !title.trim()}>{busy ? 'Creating…' : 'Create draft gallery'}</Button></form>}
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{galleries.data?.map(g => <article key={g.id} className="rounded-xl border-2 border-slate-200 p-4">
      <Link className="flex items-center justify-between gap-2 text-lg font-bold underline-offset-4 hover:underline" to={galleryPath(gymCode, g.slug, solo)}>{g.title}<ArrowUpRight className="h-5 w-5 shrink-0" /></Link>
      {g.description && <p className="mt-2 text-sm">{g.description}</p>}
      <div className="mt-3 flex items-center gap-3"><span className="text-sm font-semibold">{g.is_published ? 'Shareable gallery' : 'Draft · admin only'}</span>{g.is_published && <Button size="sm" onClick={async () => { try { if(!await copyText(new URL(galleryPath(gymCode,g.slug), location.origin).href)) throw new Error('Copy failed'); setMessage('Gallery link copied.'); } catch { setMessage('Could not copy. Open the gallery and copy its address.'); } }}><Copy className="mr-2 h-4 w-4" />Copy link</Button>}</div>
    </article>)}</div>
    {isAdmin && !galleries.isLoading && !galleries.data?.length && <p className="mt-4">Create a named collection, then add its variations.</p>}
    {message && <p className="mt-3 text-sm font-semibold" role="status">{message}</p>}
  </section>;
}
