import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFontPairings } from '@/hooks/useFontPairings';
import type { GymWithColors } from '@/hooks/useGyms';
import { useToast } from '@/hooks/use-toast';

export function BrandKitDownload({ gym }: { gym: GymWithColors }) {
  const fonts = useFontPairings(gym.id);
  const [working, setWorking] = useState<'zip' | 'pdf' | null>(null);
  const [status, setStatus] = useState('');
  const { toast } = useToast();
  const download = async (format: 'zip' | 'pdf') => {
    if (working) return;
    setWorking(format); setStatus('Preparing brand kit…');
    try {
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
      setStatus(format === 'zip' ? 'Brand kit downloaded.' : 'Brand guide downloaded.');
      toast({ description: format === 'zip' ? 'Your brand kit is ready in Downloads.' : 'Your PDF guide is ready in Downloads.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create the brand kit. Please try again.';
      setStatus(message);
      toast({ title: 'Download could not finish', description: message, variant: 'destructive' });
    } finally { setWorking(null); }
  };
  return (
    <div className="mt-4" data-brand-kit-download>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => download('zip')} disabled={!!working} className="cursor-pointer font-semibold bg-gym-primary text-gym-primary-foreground hover:brightness-110">
          {working === 'zip' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Download brand kit
        </Button>
        <Button onClick={() => download('pdf')} disabled={!!working} variant="outline" className="cursor-pointer bg-white text-slate-950 hover:bg-slate-100">
          {working === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          PDF guide
        </Button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 text-center text-xs leading-relaxed text-slate-800">
        {status || 'Primary logos · Color palette · Fonts & licenses · Visual guide'}
      </p>
    </div>
  );
}
