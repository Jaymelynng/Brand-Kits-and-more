import { useState } from 'react';
import { Download, Images, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { brandPresentation } from '@/lib/brandExamples';
import { assetFilename, fetchAssetFile, saveDownload } from '@/lib/assetFiles';
import { useToast } from '@/hooks/use-toast';

export function BrandExamples({ code, ink, accent }: { code: string; ink: string; accent: string }) {
  const examples = brandPresentation(code)?.examples || [];
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { toast } = useToast();
  if (!examples.length) return null;
  const current = examples[index];
  const download = async () => {
    setBusy(true);
    try {
      const blob = await fetchAssetFile(current.image, current.title);
      saveDownload(blob, assetFilename(`${code}-${current.id}-design-example`, blob));
    } catch (error) {
      toast({ title: 'Example could not download', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };
  return <>
    <Button onClick={() => { setImageError(false); setOpen(true); }} className="mt-2 h-10 w-full cursor-pointer gap-2 text-[15px] shadow-sm hover:brightness-90"
      style={{ backgroundColor: ink, color: '#FFFFFF' }}>
      <Images size={17} /> Brand in use <span>· {examples.length} examples</span>
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex max-h-[94dvh] w-[calc(100%-24px)] max-w-5xl flex-col overflow-y-auto rounded-xl border-2 bg-white p-4 text-slate-950 sm:p-6 [&>button]:hidden" style={{ borderColor: accent }}>
        <div className="sticky -top-4 z-10 bg-white pb-3 pt-1 sm:-top-6" data-example-header>
        <div className="pr-12">
          <DialogTitle className="text-2xl">Brand in use</DialogTitle>
          <DialogDescription className="mt-1 text-[15px] text-slate-950">Adapted from sent campaigns. Design references, not live offers.</DialogDescription>
        </div>
        <DialogClose asChild><button aria-label="Close examples" className="absolute right-0 top-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg hover:brightness-90" style={{ backgroundColor: ink, color: '#FFFFFF' }}><X size={19} /></button></DialogClose>
        <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Choose a design example">
          {examples.map((example, i) => <Button key={example.id} aria-pressed={index === i}
            onClick={() => { setIndex(i); setImageError(false); }}
            className="h-auto min-h-11 cursor-pointer whitespace-normal px-2 py-2 text-[15px] leading-tight hover:brightness-90"
            style={{ backgroundColor: index === i ? ink : '#E8EEF2', color: index === i ? '#FFFFFF' : '#101820', boxShadow: index === i ? `inset 0 -3px ${accent}` : undefined }}>
            {example.title}
          </Button>)}
        </div>
        </div>
        <div className="grid min-h-0 gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 items-start justify-center rounded-lg bg-slate-100 p-2">
            {imageError ? <p role="alert" className="p-8 text-base">The preview could not load. Close and reopen this example to retry.</p>
              : <img key={current.id} src={current.image} alt={`${current.title}: adapted ${code} campaign composition`}
                className="max-h-[58dvh] w-full object-contain object-top md:max-h-[66dvh]" onError={() => setImageError(true)} />}
          </div>
          <div className="flex min-w-0 flex-col items-start">
            <h3 className="text-xl font-bold">{current.description}</h3>
            <ol className="mt-5 space-y-4">
              {current.principles.map((principle, i) => <li className="flex items-start gap-3 text-base leading-relaxed" key={principle}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: ink, color: '#FFFFFF' }}>{i + 1}</span>
                <span>{principle}</span>
              </li>)}
            </ol>
            <p className="mt-5 border-t border-slate-200 pt-4 text-[15px] leading-relaxed">Based on a campaign sent {current.source.date}. Layout and typography have been adapted for this guide.</p>
            <Button disabled={busy} onClick={download} className="mt-5 h-11 cursor-pointer gap-2 px-5 text-[15px] hover:brightness-90" style={{ backgroundColor: ink, color: '#FFFFFF' }}>
              <Download size={17} />{busy ? 'Downloading…' : 'Download example'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
