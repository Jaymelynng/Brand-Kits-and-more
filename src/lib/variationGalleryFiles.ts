import { supabase } from '@/integrations/supabase/client';
import type { GalleryItem } from '@/hooks/useVariationGalleries';
import { assetFilename, fetchAssetFile, inspectAsset, safeFilename, saveDownload, uniqueAssetPath } from './assetFiles';

export async function downloadVariationGallery(items: GalleryItem[], name: string, progress: (message: string) => void) {
  if (!items.length) throw new Error('Select at least one variation.');
  if (items.reduce((sum, item) => sum + item.asset.bytes, 0) > 512 * 1024 * 1024) throw new Error('This selection exceeds 512 MB. Download a smaller selection.');
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip(), used = new Set<string>(), contents: object[] = [];
  for (let offset = 0; offset < items.length; offset += 3) {
    const batch = await Promise.all(items.slice(offset,offset+3).map(async item => {
      const blob = await fetchAssetFile(item.asset.file_url, item.title);
      const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(n => n.toString(16).padStart(2,'0')).join('');
      if (digest !== item.asset.sha256) throw new Error(`${item.title} differs from its saved original. No ZIP was downloaded.`);
      return { item, blob };
    }));
    for (const { item, blob } of batch) {
      const path = uniqueAssetPath(`${item.is_reference ? 'Reference' : 'Variations'}/${assetFilename(item.title,blob)}`, used);
      zip.file(path,blob);
      contents.push({ title:item.title, path, original_filename:item.asset.filename, source:item.asset.file_url, sha256:item.asset.sha256, bytes:blob.size, reference:item.is_reference });
    }
    progress(`Preparing ${Math.min(offset+3,items.length)} of ${items.length} files…`);
  }
  zip.file('Contents.json', JSON.stringify(contents,null,2));
  saveDownload(await zip.generateAsync({type:'blob',compression:'DEFLATE'}), `${safeFilename(name)}.zip`);
}

export async function uploadGalleryFiles(galleryId: string, gymId: string, files: File[], progress: (message: string) => void) {
  if (!files.length || files.length > 100) throw new Error('Choose between 1 and 100 PNG, JPG or WebP files.');
  const assets = [];
  for (const [index,file] of files.entries()) {
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error(`${file.name}: use PNG, JPG or WebP.`);
    if (file.size > 30*1024*1024) throw new Error(`${file.name} exceeds 30 MB.`);
    progress(`Preparing ${index+1} of ${files.length}: ${file.name}`);
    const info = await inspectAsset(file);
    const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
    const { data: existing, error: lookupError } = await supabase.from('variation_assets').select('*').eq('gym_id',gymId).eq('sha256',sha256).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) { assets.push({ ...existing, title:file.name.replace(/\.[^.]+$/,''), is_reference:false }); continue; }
    const image = new Image(); image.src=info.preview; await image.decode();
    const canvas=document.createElement('canvas');
    const scale=Math.min(1,640/image.naturalWidth);
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale)); canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const context=canvas.getContext('2d'); if (!context) throw new Error('Thumbnail creation is unavailable.');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const thumb=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Thumbnail creation failed.')),'image/webp',0.85));
    const prefix=`variations/${gymId}/${sha256}`, originalPath=`${prefix}/original.${info.format.toLowerCase()}`, thumbPath=`${prefix}/preview.webp`;
    // Retry-safe immutable paths. If a prior attempt uploaded only the bytes, verify before reusing them.
    for (const [path,blob] of [[originalPath,file],[thumbPath,thumb]] as const) {
      const { error }=await supabase.storage.from('gym-logos').upload(path,blob,{upsert:false,contentType:blob.type});
      if (error) {
        const url=supabase.storage.from('gym-logos').getPublicUrl(path).data.publicUrl;
        const present=await fetchAssetFile(url,file.name);
        if (path===originalPath) {
          const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await present.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
          if (hash!==sha256) throw error;
        } else { const inspected=await inspectAsset(present); if(inspected.width!==canvas.width || inspected.height!==canvas.height) throw error; }
      }
    }
    assets.push({ filename:file.name,title:file.name.replace(/\.[^.]+$/,''),sha256,bytes:file.size,width:info.width,height:info.height,has_alpha:info.transparent===true,
      file_url:supabase.storage.from('gym-logos').getPublicUrl(originalPath).data.publicUrl,thumbnail_url:supabase.storage.from('gym-logos').getPublicUrl(thumbPath).data.publicUrl,is_reference:false });
  }
  const { data,error }=await supabase.rpc('add_variation_gallery_assets',{p_gallery_id:galleryId,p_assets:assets});
  if(error) throw new Error(`Files were prepared, but the gallery was not saved: ${error.message}. Retry the same files to reuse those bytes.`);
  return data;
}
