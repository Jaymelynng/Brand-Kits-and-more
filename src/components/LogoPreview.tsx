import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Download, Loader2, RotateCcw, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { GymLogo } from '@/hooks/useGyms';
import { fetchAssetFile, inspectAsset, assetFilename, saveDownload, type AssetInfo } from '@/lib/assetFiles';
import { copyText } from '@/lib/copyText';
import { contrast, luminance } from '@/lib/shade';
import { LogoMedia } from './LogoMedia';
import { trackKitActivity } from '@/lib/kitActivity';

export type PreviewAsset = Pick<GymLogo, 'id' | 'filename' | 'file_url' | 'variant'>;

interface Props<T extends PreviewAsset> {
  logo: T;
  logos: T[];
  palette: string[];
  onChoose: (logo: T) => void;
  onClose: () => void;
  children?: ReactNode;
  kind?: 'logo' | 'graphic';
  copyValue?: string;
  copyLabel?: string;
  usageNote?: string;
}

/** A file inspector: backgrounds affect the preview only, and facts come from decoded bytes. */
export function LogoPreview<T extends PreviewAsset>({ logo, logos, palette, onChoose, onClose, children, kind = 'logo', copyValue, copyLabel = 'Copy URL', usageNote }: Props<T>) {
  const [file, setFile] = useState<{ url: string; blob: Blob; info: AssetInfo } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [surface, setSurface] = useState('auto');
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(640);
  const [darkThumbs, setDarkThumbs] = useState<Record<string, boolean>>({});
  const selectedThumb = useRef<HTMLButtonElement>(null);
  const index = logos.findIndex(l => l.id === logo.id);
  const ink = [...palette].sort((a, b) => luminance(a) - luminance(b))[0] || '#101827';
  const dark = contrast(ink, '#FFFFFF') >= 4.5 ? ink : '#101827';
  const accent = palette[0] || dark;
  const action = { background: accent, color: contrast(accent, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#111111' };
  const ground = surface === 'auto' ? (file?.info.lightArtwork ? dark : '#FFFFFF') : surface === 'dark' ? dark : surface;
  const step = (by: number) => { if (logos.length > 1) onChoose(logos[(Math.max(0, index) + by + logos.length) % logos.length]); };

  useEffect(() => { trackKitActivity('preview', `${kind}: ${logo.filename}`); }, [logo.id, kind]);

  useEffect(() => {
    const controller = new AbortController(); let objectUrl = '';
    setFile(null); setError(''); setCopied(false); setCopyFallback(false);
    (async () => {
      try {
        const blob = await fetchAssetFile(logo.file_url, logo.filename, controller.signal);
        const info = await inspectAsset(blob);
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob); setFile({ blob, info, url: objectUrl });
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'This file could not be opened.'); }
    })();
    const thumb = selectedThumb.current;
    const strip = thumb?.parentElement;
    if (thumb && strip) {
      const thumbRect = thumb.getBoundingClientRect();
      const stripRect = strip.getBoundingClientRect();
      strip.scrollLeft += thumbRect.left - stripRect.left - (strip.clientWidth - thumb.clientWidth) / 2;
    }
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [logo.id, logo.file_url, logo.filename, retry]);

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent data-activity-asset={logo.filename} data-logo-preview={kind === 'logo' ? '' : undefined} data-graphic-preview={kind === 'graphic' ? '' : undefined} className="z-[100] max-h-[94dvh] w-[calc(100%_-_24px)] max-w-5xl grid-cols-[minmax(0,1fr)] gap-0 overflow-y-auto rounded-2xl border-2 bg-white p-0 text-slate-950 shadow-2xl [&>button]:hidden"
      style={{ borderColor: accent }}
      onKeyDown={event => {
        if ((event.target as HTMLElement).closest('input,textarea,select,video')) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); }
      }}>
      <div className="sticky top-0 z-20 bg-white px-4 pb-3 pt-5 pr-16 sm:px-6 sm:pr-16">
        <DialogDescription className="mb-1 text-[15px] font-semibold text-slate-700">{logo.variant || 'Uncategorized'}{index >= 0 && ` · ${index + 1} of ${logos.length}`}</DialogDescription>
        <DialogTitle className="break-words text-lg font-bold leading-snug sm:text-2xl">{logo.filename.replace(/\.(png|jpe?g|webp|gif|svg|mp4|webm)$/i, '')}</DialogTitle>
        {usageNote && <p className="mt-2 text-[15px] leading-snug text-slate-700">{usageNote}</p>}
        <DialogClose asChild><button aria-label="Close preview" className="absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-700"><X className="h-5 w-5" /></button></DialogClose>
      </div>
      <div className={`relative mx-3 flex items-center justify-center rounded-xl border border-slate-300 py-4 sm:mx-6 ${kind === 'graphic' ? 'min-h-[140px] px-3' : 'h-[clamp(180px,36dvh,440px)] px-12 sm:px-16'}`} style={{ background: ground }} data-preview-stage>
        {!file && !error && <span role="status" className="flex items-center gap-2 rounded-lg bg-white p-3 text-[15px] text-slate-950"><Loader2 className="h-5 w-5 animate-spin" />Loading original…</span>}
        {error && <div role="alert" className="max-w-lg rounded-xl bg-white p-4 text-center text-[15px] text-slate-950 shadow-lg"><p className="break-words">{error}</p><Button onClick={() => setRetry(n => n + 1)} className="mt-3 cursor-pointer bg-slate-900 text-white hover:bg-slate-700"><RotateCcw className="mr-2 h-4 w-4" />Retry file</Button></div>}
        {file && (file.blob.type.startsWith('video/') ? <video key={file.url} src={file.url} poster={file.info.preview} controls loop muted playsInline aria-label={logo.filename} className="h-full max-w-full object-contain" />
          : file.blob.type === 'application/pdf' ? <p className="rounded-lg bg-white p-4 text-slate-950">PDF original ready to download</p>
          : <img src={file.url} alt={logo.filename} className={kind === 'graphic' ? 'max-w-full object-contain' : 'h-full w-full object-contain'} style={kind === 'graphic' ? { width: previewWidth, height: 'auto', maxHeight: '38dvh' } : undefined} />)}
        {logos.length > 1 && kind === 'logo' && <>
          <Button aria-label="Previous logo" onClick={() => step(-1)} className="absolute left-2 h-9 w-9 cursor-pointer rounded-full bg-slate-900 p-0 text-white shadow-lg hover:bg-slate-700"><ArrowLeft className="h-5 w-5" /></Button>
          <Button aria-label="Next logo" onClick={() => step(1)} className="absolute right-2 h-9 w-9 cursor-pointer rounded-full bg-slate-900 p-0 text-white shadow-lg hover:bg-slate-700"><ArrowRight className="h-5 w-5" /></Button>
        </>}
      </div>
      <div className="space-y-3 p-4 sm:px-6">
        {kind === 'graphic' && <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label="Graphic preview width" className="flex gap-2">
            {[{ label: 'Email', width: 640 }, { label: 'Phone', width: 320 }].map(({ label, width }) => <button key={width} type="button" aria-pressed={previewWidth === width} onClick={() => setPreviewWidth(width)} className="cursor-pointer rounded-lg px-3 py-2 text-[15px] font-bold shadow-sm hover:brightness-90" style={previewWidth === width ? action : { background: '#E8EDF2', color: '#111827' }}>{label}</button>)}
          </div>
          {logos.length > 1 && <div className="flex gap-2">
            <Button aria-label="Previous graphic" onClick={() => step(-1)} className="h-10 w-10 cursor-pointer bg-slate-900 p-0 text-white hover:bg-slate-700"><ArrowLeft className="h-5 w-5" /></Button>
            <Button aria-label="Next graphic" onClick={() => step(1)} className="h-10 w-10 cursor-pointer bg-slate-900 p-0 text-white hover:bg-slate-700"><ArrowRight className="h-5 w-5" /></Button>
          </div>}
        </div>}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Preview background">
          {([{ label: 'Auto', value: 'auto' }, { label: 'Light', value: '#FFFFFF' }, { label: 'Dark', value: 'dark' }]).map(({ label, value }) =>
            <button key={value} aria-pressed={surface === value} onClick={() => setSurface(value)} className="cursor-pointer rounded-lg px-3 py-2 text-[15px] font-semibold shadow-sm hover:brightness-90" style={{ background: surface === value ? dark : '#E8EDF2', color: surface === value ? '#FFFFFF' : '#111827' }}>{label}</button>)}
          {[...new Set(palette)].map(color => <button key={color} aria-label={`Preview on ${color}`} title={color} aria-pressed={surface === color} onClick={() => setSurface(color)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-slate-400 shadow-sm hover:scale-110" style={{ background: color, color: contrast(color, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#111111' }}>{surface === color && <Check className="h-4 w-4" />}</button>)}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[15px] font-medium" data-file-details aria-live="polite">
          {file && <><span className="font-bold">{file.info.format}</span>{file.info.width > 0 && <span>{file.info.width} × {file.info.height} px</span>}<span>{file.info.bytes >= 1048576 ? `${(file.info.bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(file.info.bytes / 1024)} KB`}</span>{file.info.transparent !== null && <span>{file.info.transparent ? 'Transparent background' : 'Solid background'}</span>}{file.info.duration !== undefined && <span>{file.info.duration.toFixed(1)} seconds</span>}</>}
        </div>
        <p className="text-[15px] leading-snug text-slate-700">{kind === 'graphic' ? 'Email and phone previews scale to fit your screen. Background choices affect the preview only.' : 'Background choices are for preview.'} Downloads keep the original file.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button aria-label="Download original" disabled={!file} onClick={() => file && saveDownload(file.blob, assetFilename(logo.filename, file.blob))} className="h-11 min-w-0 cursor-pointer px-2 text-[15px] font-bold shadow-md hover:brightness-90" style={action}><Download className="mr-2 hidden h-4 w-4 sm:block" /><span>Download<span className="hidden sm:inline"> original</span></span></Button>
          <Button onClick={async () => { const ok = await copyText(copyValue ?? logo.file_url); setCopied(ok); setCopyFallback(!ok); }} className="h-11 cursor-pointer bg-slate-900 px-2 text-[15px] font-bold text-white shadow-md hover:bg-slate-700">{copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied ? 'Copied' : copyLabel}</Button>
        </div>
        {copyFallback && <label className="block text-[15px]">{copyLabel === 'Copy SVG' ? 'Copy this SVG:' : 'Copy this link:'}<textarea readOnly value={copyValue ?? logo.file_url} onFocus={e => e.target.select()} className="mt-1 w-full rounded-lg border border-slate-400 p-2 text-[15px]" /></label>}
        {logos.length > 1 && <div className="flex gap-2 overflow-x-auto py-2" aria-label={kind === 'graphic' ? 'Graphic thumbnails' : 'Logo thumbnails'}>
          {logos.map(item => <button ref={item.id === logo.id ? selectedThumb : undefined} key={item.id} title={item.filename} aria-label={`Preview ${item.filename}`} aria-current={item.id === logo.id ? 'true' : undefined} onClick={() => onChoose(item)} className="flex h-16 w-20 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 bg-slate-100 p-1 shadow-sm hover:border-slate-900" style={{ borderColor: item.id === logo.id ? accent : undefined, backgroundColor: darkThumbs[item.file_url] ? dark : undefined }}><LogoMedia onContrast={prefer => setDarkThumbs(previous => previous[item.file_url] === prefer ? previous : { ...previous, [item.file_url]: prefer })} url={item.file_url} alt="" className="h-full w-full object-contain" /></button>)}
        </div>}
        {children}
      </div>
    </DialogContent>
  </Dialog>;
}
