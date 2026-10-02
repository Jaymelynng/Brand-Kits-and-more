import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, Download, Upload } from 'lucide-react';
import { useGyms } from '@/hooks/useGyms';
import { useAuth } from '@/hooks/useAuth';
import { galleryPath, useGalleryItems, useVariationGalleries, type GalleryItem } from '@/hooks/useVariationGalleries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { LogoPreview, type PreviewAsset } from '@/components/LogoPreview';
import { GymPillStrip } from '@/components/GymPillStrip';
import { VariationGalleriesSection } from '@/components/VariationGalleriesSection';
import { copyText } from '@/lib/copyText';
import { assetFilename, fetchAssetFile, saveDownload } from '@/lib/assetFiles';
import { downloadVariationGallery, uploadGalleryFiles } from '@/lib/variationGalleryFiles';
import { contrast, luminance } from '@/lib/shade';
import { supabase } from '@/integrations/supabase/client';

export default function VariationGallery({ solo = false }: { solo?: boolean }) {
  const { gymCode, gallerySlug } = useParams(), gyms=useGyms(), auth=useAuth();
  const gym=gyms.data?.find(g=>g.code===gymCode || g.id===gymCode);
  const admin=auth.isAdmin && !solo, galleries=useVariationGalleries(gym?.id,admin);
  const gallery=galleries.data?.find(g=>g.slug===gallerySlug), itemsQuery=useGalleryItems(gallery?.id,admin), items=itemsQuery.data ?? [];
  const [selected,setSelected]=useState<Set<string>>(new Set()), [filter,setFilter]=useState('all');
  const [preview,setPreview]=useState<PreviewAsset|null>(null), [comparing,setComparing]=useState(false), [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [error,setError]=useState('');
  const [edit,setEdit]=useState(false), [title,setTitle]=useState(''), [description,setDescription]=useState('');
  const cache=useQueryClient();
  useEffect(()=>{setSelected(new Set());setFilter('all');setPreview(null);setComparing(false);},[gallery?.id]);
  const palette=gym?.colors.map(c=>c.color_hex) ?? [], accent=palette[0] || '#101827';
  const dark=[...palette].sort((a,b)=>luminance(a)-luminance(b))[0] || '#101827';
  const surface=contrast(dark,'#ffffff')>=4.5?dark:'#101827';
  const action={backgroundColor:accent,color:contrast(accent,'#ffffff')>=4.5?'#ffffff':'#111111'};
  const filtered=items.filter(i=>filter==='all' || (filter==='transparent'?i.asset.has_alpha:filter==='reference'?i.is_reference:!i.asset.has_alpha && !i.is_reference));
  const visible=filtered;
  const picked=items.filter(i=>selected.has(i.asset_id));
  const previewAssets=items.map(i=>({id:i.asset_id,filename:i.title,file_url:i.asset.file_url,thumbnail_url:i.asset.thumbnail_url,variant:gallery?.title ?? 'Variations'}));
  async function run(task:()=>Promise<void>) { setBusy(true);setError('');setMessage('');try{await task();}catch(e){setError(e instanceof Error?e.message:'The action failed.');}finally{setBusy(false);} }
  async function original(item:GalleryItem) { await run(async()=>{const blob=await fetchAssetFile(item.asset.file_url,item.title);saveDownload(blob,assetFilename(item.asset.filename,blob));setMessage('Original prepared for download.');}); }
  async function saveDetails(published?:boolean) {
    if(!gallery) return;
    await run(async()=>{
      const {error:saveError}=await supabase.from('variation_galleries').update(published===undefined?{title:title.trim(),description:description.trim()}:{is_published:published}).eq('id',gallery.id).select().single();
      if(saveError) throw saveError;
      await cache.invalidateQueries({queryKey:['variation-galleries']});setEdit(false);setMessage(published===undefined?'Gallery details saved.':published?'Gallery is shareable.':'Gallery returned to draft. Previously shared file URLs remain accessible.');
    });
  }
  if(gyms.isLoading || (gym && galleries.isLoading) || auth.loading && !solo) return <main className="p-8 text-slate-950" role="status">Loading variation gallery…</main>;
  if(gyms.isError || galleries.isError) return <main className="p-8 text-slate-950"><p role="alert">The gallery could not load.</p><Button onClick={()=>{void gyms.refetch();void galleries.refetch();}}>Try again</Button></main>;
  if(!gym) return <main className="p-8 text-slate-950">Gym not found.</main>;
  if(!gallery) return <main className="mx-auto max-w-6xl p-6 text-slate-950"><Link className="font-bold underline" to={`/${solo?'kit':'gym'}/${gym.code}`}>Back to {gym.name}</Link><h1 className="my-5 text-3xl font-bold">Variation galleries</h1>{gallerySlug && <p className="mb-5">This collection is unavailable or still a draft.</p>}<VariationGalleriesSection gymId={gym.id} gymCode={gym.code} isAdmin={admin} solo={solo}/></main>;
  return <main style={{backgroundColor:accent}} className="variation-gallery min-h-screen bg-slate-50 text-slate-950 [&_button]:cursor-pointer [&_button]:text-[15px] [&_button]:hover:brightness-90 [&_p]:text-[15px] [&_h2]:text-[15px] [&_label]:text-[15px]">
    {import.meta.env.DEV && <div className="bg-slate-950 px-4 py-2 text-center text-sm font-semibold text-white">Local preview · website update has not been published</div>}
    <GymPillStrip readOnly={solo} />
    <header className="border-b border-slate-300 bg-white px-4 py-4 md:px-8" style={{borderBottomColor:accent,borderBottomWidth:3}}>
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-4 flex flex-wrap justify-center gap-2">{[["logo-gallery","Logos"],["variation-galleries","Variations"],["brand-elements","Graphics"],["brand-colors","Colors"],["brand-fonts","Fonts"]].map(([id,label])=><Link key={id} className="rounded-md border border-white/40 px-5 py-2 font-bold text-white" style={{backgroundColor:surface}} to={`/${solo?'kit':'gym'}/${gym.code}#${id}`}>{label}</Link>)}</div><div className="flex flex-wrap items-center justify-between gap-2"><Link className="flex items-center gap-2 text-sm font-bold hover:underline" to={`/${solo?'kit':'gym'}/${gym.code}#variation-galleries`}><ArrowLeft className="h-4 w-4"/>{gym.name} · Brand kit</Link><div className="flex items-center gap-1" aria-label="Gym palette">{palette.map((hex,index)=><span key={`${hex}-${index}`} title={hex} className="h-5 w-5 rounded-full border border-slate-400" style={{backgroundColor:hex}}/>)}</div></div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-widest">Variation gallery {gallery.is_published?'':'· Draft'}</p><h1 className="text-2xl font-bold md:text-3xl">{gallery.title}</h1>{gallery.description && <><p className="mt-1 hidden max-w-3xl text-base sm:block">{gallery.description}</p><details className="mt-2 sm:hidden"><summary className="cursor-pointer text-sm font-semibold">About this collection</summary><p className="mt-2">{gallery.description}</p></details></>}</div><Button style={action} disabled={!gallery.is_published || busy} onClick={()=>void run(async()=>{if(!await copyText(new URL(galleryPath(gym.code,gallery.slug),location.origin).href)) throw new Error('Could not copy. Copy the gallery address from the browser.');setMessage('Gallery link copied — ready to paste into your email.');})}><Copy className="mr-2 h-4 w-4"/>Copy gallery link</Button></div>
      </div>
    </header>
    <div className="mx-auto max-w-[1600px] px-4 py-4 md:px-8">
      {admin && <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-300 bg-white p-3"><Button disabled={busy} onClick={()=>{setTitle(gallery.title);setDescription(gallery.description);setEdit(true);}}>Edit gallery details</Button><Button disabled={busy || !items.length && !gallery.is_published} onClick={()=>void saveDetails(!gallery.is_published)}>{gallery.is_published?'Return to draft':'Make gallery shareable'}</Button><label className="inline-flex cursor-pointer items-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"><Upload className="mr-2 h-4 w-4"/>{busy?'Working…':'Add image files'}<input aria-label="Add image files" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value='';if(files.length) void run(async()=>{const added=await uploadGalleryFiles(gallery.id,gym.id,files,setMessage);await cache.invalidateQueries({queryKey:['variation-items']});setMessage(`${added} new images added; exact duplicates reused.`);});}}/></label></div>}
      {edit && <Dialog open onOpenChange={setEdit}><DialogContent className="bg-white text-slate-950"><DialogTitle>Edit gallery details</DialogTitle><DialogDescription>The link stays the same when the name changes.</DialogDescription><form className="space-y-4" onSubmit={e=>{e.preventDefault();void saveDetails();}}><label className="block font-semibold">Gallery name<Input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="block font-semibold">Description<textarea className="mt-2 w-full rounded-md border border-slate-400 p-3 text-base" rows={3} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)}/></label><Button disabled={busy || !title.trim()}>Save details</Button></form></DialogContent></Dialog>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3"><div className="flex flex-wrap gap-2" aria-label="Gallery filters">{[['all','All images'],['transparent','Transparent'],['background','With background'],['reference','Reference']].map(([value,label])=><Button key={value} aria-pressed={filter===value} style={filter===value?action:undefined} variant={filter===value?'default':'outline'} onClick={()=>{setFilter(value);}}>{label}</Button>)}</div><p className="text-sm font-semibold">{filtered.length} images · {picked.length} selected</p></div>
      <div className="my-3 flex flex-wrap items-center gap-2 rounded-xl bg-white p-3"><Button variant="outline" disabled={!filtered.length || busy} onClick={()=>setSelected(new Set([...selected,...filtered.map(i=>i.asset_id)]))}>Select all</Button>{<Button variant="outline" disabled={!picked.length || busy} onClick={()=>setSelected(new Set())}>Clear selection</Button>}{<Button disabled={picked.length<2 || picked.length>4 || busy} onClick={()=>setComparing(true)}>Compare selected {picked.length>4?'(up to 4)':''}</Button>}<Button style={action} disabled={busy || !items.length} onClick={()=>void run(async()=>{await downloadVariationGallery(picked.length?picked:items,`${gym.code}-${gallery.title}`,setMessage);setMessage('ZIP ready — original files included.');})}><Download className="mr-2 h-4 w-4"/>{busy?'Preparing…':picked.length?`Download selected (${picked.length})`:`Download all (${items.length})`}</Button>{picked.some(i=>!filtered.includes(i)) && <span className="text-sm font-semibold">Selection includes images outside this filter.</span>}</div>
      {error && <p className="mb-3 rounded-lg border-2 border-red-700 bg-white p-3 font-semibold text-red-800" role="alert">{error}</p>}{message && <p className="mb-3 text-sm font-semibold" role="status">{message}</p>}
      {itemsQuery.isLoading && <p role="status">Loading images…</p>}{itemsQuery.isError && <p role="alert">Images could not load. <button className="underline" onClick={()=>void itemsQuery.refetch()}>Try again</button></p>}
      {!itemsQuery.isLoading && !itemsQuery.isError && !visible.length && <p className="rounded-xl border border-slate-300 bg-white p-6">{items.length?'No images match this filter.':'This gallery has no images yet.'}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{visible.map(item=><article key={item.asset_id} className={`overflow-hidden rounded-xl border-2 bg-white ${selected.has(item.asset_id)?'border-slate-950':'border-slate-300'}`}>
        <div className="relative m-5 mb-0"><button className="flex h-48 w-full cursor-pointer items-center justify-center rounded-xl border-2 p-4 hover:brightness-110 xl:h-52" style={{backgroundColor:surface}} aria-label={`Preview ${item.title}`} onClick={()=>setPreview(previewAssets.find(p=>p.id===item.asset_id)??null)}><img src={item.asset.thumbnail_url} alt={item.title} className="max-h-full max-w-full object-contain" loading="lazy" onError={e=>{e.currentTarget.style.visibility='hidden';e.currentTarget.parentElement?.setAttribute('data-image-error','true');}}/></button><label className="absolute left-2 top-2 flex cursor-pointer items-center gap-2 rounded-md bg-white px-2 py-1 text-sm font-bold text-slate-950"><input aria-label={`Select ${item.title}`} className="h-4 w-4 accent-slate-950" type="checkbox" checked={selected.has(item.asset_id)} onChange={()=>setSelected(previous=>{const next=new Set(previous);if(next.has(item.asset_id))next.delete(item.asset_id);else next.add(item.asset_id);return next;})}/>{String(item.sort_order+1).padStart(2,'0')}</label></div>
        <div className="p-5"><h2 className="min-h-10 text-sm font-bold leading-5">{item.title}</h2><p className="mt-1 text-sm">{item.is_reference?'Reference board · ':''}{item.asset.width} × {item.asset.height} · {item.asset.has_alpha?'Transparent':'Background included'}</p><div className="mt-5 flex flex-col-reverse gap-2"><Button size="sm" variant="outline" onClick={()=>void run(async()=>{if(!await copyText(new URL(item.asset.file_url,location.origin).href)) throw new Error("Could not copy image URL.");setMessage("Image URL copied.");})}><Copy className="mr-1 h-4 w-4"/>Copy URL</Button><Button size="sm" className="flex-1" style={action} disabled={busy} onClick={()=>void original(item)}><Download className="mr-1 h-4 w-4"/>Download</Button></div></div>
      </article>)}</div>

    </div>
    {preview && <LogoPreview logo={preview} logos={previewAssets} palette={palette} onChoose={setPreview} onClose={()=>setPreview(null)} usageNote="These are variation options. Gallery inclusion does not establish approved-brand status."/>}
    {comparing && <Dialog open onOpenChange={setComparing}><DialogContent className="max-h-[90dvh] max-w-6xl overflow-auto bg-white text-slate-950"><DialogTitle>Compare selected variations</DialogTitle><DialogDescription>Preview backgrounds do not alter the downloaded originals.</DialogDescription><div className="grid gap-4 sm:grid-cols-2">{picked.map(item=><figure key={item.asset_id}><div className="flex h-56 items-center justify-center rounded-lg p-4" style={{backgroundColor:surface}}><img className="max-h-full max-w-full object-contain" src={item.asset.file_url} alt={item.title}/></div><figcaption className="mt-2 text-base font-bold">{item.title}</figcaption></figure>)}</div></DialogContent></Dialog>}
    <style>{'[data-image-error="true"]::after{content:"Image unavailable — try Preview";color:white;font-size:14px;}'}</style>
  </main>;
}
