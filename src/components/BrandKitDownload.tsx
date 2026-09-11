import { useState } from 'react';
import { Download, FileArchive, FileImage, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFontPairings } from '@/hooks/useFontPairings';
import type { GymWithColors } from '@/hooks/useGyms';
import { useToast } from '@/hooks/use-toast';

export function BrandKitDownload({ gym }: { gym: GymWithColors }) {
  const fonts = useFontPairings(gym.id);
  const [working, setWorking] = useState<'zip' | 'pdf' | 'logo' | null>(null);
  const [status, setStatus] = useState('');
  const { toast } = useToast();
  const featuredLogo = gym.logos.find(logo => logo.is_main_logo);
  const download = async (format: 'zip' | 'pdf' | 'logo') => {
    if (working) return;
    setWorking(format); setStatus(format === 'logo' ? 'Downloading logo…' : 'Preparing brand kit…');
    try {
      if (format === 'logo') {
        if (!featuredLogo) throw new Error('No featured logo is selected.');
        const response = await fetch(featuredLogo.file_url, { signal: AbortSignal.timeout(25000) });
        if (!response.ok) throw new Error('Could not download the featured logo. Please try again.');
        const blob = await response.blob();
        if (!blob.size || /text\/html/.test(blob.type)) throw new Error('The logo did not return a usable file.');
        const { saveDownload } = await import('@/lib/brandKit');
        saveDownload(blob, featuredLogo.filename);
        setStatus('');
        toast({ description: 'Your logo is ready in Downloads.' });
        return;
      }
      // Read current pairings even when the editor changed them after page load.
      const result = await fonts.refetch();
      if (result.error) throw new Error('Could not load the saved fonts. Please try again.');
      const [kitTools, pdfTools] = await Promise.all([import('@/lib/brandKit'), import('@/lib/brandKitPdf')]);
      const kit = await kitTools.prepareBrandKit(gym, result.data || [], setStatus);
      setStatus('Building visual guide…');
      const pdf = await pdfTools.createBrandGuide(kit);
      if (format === 'pdf') kitTools.saveDownload(pdf, `${gym.code}-Brand-Guide.pdf`);
      else {
        setStatus('Packing files…');
        kitTools.saveDownload(await kitTools.createBrandKitZip(kit, pdf), `${gym.code}-Brand-Kit.zip`);
      }
      setStatus('');
      toast({ description: format === 'zip' ? 'Your brand kit is ready in Downloads.' : 'Your PDF guide is ready in Downloads.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create the brand kit. Please try again.';
      setStatus(message);
      toast({ title: 'Download could not finish', description: message, variant: 'destructive' });
    } finally { setWorking(null); }
  };
  return (
    <div className="my-4" data-brand-kit-download aria-busy={!!working}>
      <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-950">
        <Download className="h-4 w-4" aria-hidden="true" /> Downloads
      </h3>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Download files">
        <Button onClick={() => download('zip')} disabled={!!working} aria-label="Download brand kit"
          title="ZIP containing primary logos, colors, font files and licenses, and the PDF guide"
          className="h-[72px] min-w-0 cursor-pointer flex-col gap-1.5 rounded-xl px-1 font-semibold shadow-sm bg-gym-primary text-gym-primary-foreground hover:brightness-110">
          <span className="flex items-center gap-1.5 text-sm">
            {working === 'zip' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />} ZIP
          </span>
          <span className="whitespace-nowrap text-[15px]">Brand kit</span>
        </Button>
        <Button onClick={() => download('logo')} disabled={!!working || !featuredLogo} aria-label="Download featured logo"
          title={featuredLogo ? 'Download the logo shown above in its original format' : 'No featured logo is selected'}
          variant="outline" className="h-[72px] min-w-0 cursor-pointer flex-col gap-1.5 rounded-xl px-1 font-semibold shadow-sm bg-white text-slate-950 hover:bg-slate-100">
          {working === 'logo' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileImage className="h-5 w-5" />}
          <span className="whitespace-nowrap text-[15px]">Logo only</span>
        </Button>
        <Button onClick={() => download('pdf')} disabled={!!working} aria-label="PDF guide"
          title="Download the visual brand guide separately. It is also included in the ZIP."
          variant="outline" className="h-[72px] min-w-0 cursor-pointer flex-col gap-1.5 rounded-xl px-1 font-semibold shadow-sm bg-white text-slate-950 hover:bg-slate-100">
          <span className="flex items-center gap-1.5 text-sm">
            {working === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PDF
          </span>
          <span className="whitespace-nowrap text-[15px]">Guide</span>
        </Button>
      </div>
      <p role="status" aria-live="polite" className={status ? 'mt-2 text-sm leading-relaxed text-slate-950' : 'sr-only'}>
        {status}
      </p>
    </div>
  );
}
