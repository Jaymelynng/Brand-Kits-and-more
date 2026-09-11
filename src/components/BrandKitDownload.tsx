import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFontPairings } from '@/hooks/useFontPairings';
import { useGyms, type GymWithColors } from '@/hooks/useGyms';
import { useToast } from '@/hooks/use-toast';
import { contrast, luminance, shade } from '@/lib/shade';
import { isActiveLogo } from '@/lib/logoOrder';
import { fetchAssetFile, assetFilename, saveDownload } from '@/lib/assetFiles';
import { BrandExamples } from './BrandExamples';
import { elementCollectionName } from '@/lib/brandElements';

export function BrandKitDownload({ gym }: { gym: GymWithColors }) {
  const fonts = useFontPairings(gym.id);
  const collectionName = elementCollectionName(gym.elements).toLowerCase();
  // The page already loads inventory. Refresh explicitly only when exporting.
  const inventory = useGyms({ enabled: false });
  const [working, setWorking] = useState<'zip' | 'pdf' | 'logo' | null>(null);
  const [status, setStatus] = useState('');
  const { toast } = useToast();
  const featuredLogo = gym.logos.find(logo => logo.is_main_logo && isActiveLogo(logo));
  const palette = gym.colors.map(color => color.color_hex);
  const accent = palette[0] || '#0F172A';
  const darkest = [...palette].sort((a, b) => luminance(a) - luminance(b))[0] || '#0F172A';
  const darkFill = luminance(darkest) < 0.18 ? darkest : shade(darkest, 0.65);
  const kitFill = luminance(accent) > 0.7 ? darkFill : accent;
  const kitText = contrast(kitFill, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#111111';
  const buttonClass = 'h-11 min-w-0 cursor-pointer rounded-lg px-1 text-[15px] font-semibold whitespace-nowrap shadow-md transition-[filter,box-shadow] hover:brightness-90 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2';
  const download = async (format: 'zip' | 'pdf' | 'logo') => {
    if (working) return;
    setWorking(format); setStatus(format === 'logo' ? 'Downloading logo…' : 'Preparing brand kit…');
    try {
      if (format === 'logo') {
        if (!featuredLogo) throw new Error('No featured logo is selected.');
        const blob = await fetchAssetFile(featuredLogo.file_url, featuredLogo.filename);
        saveDownload(blob, assetFilename(featuredLogo.filename, blob));
        setStatus('');
        toast({ description: 'Your logo is ready in Downloads.' });
        return;
      }
      // Read current pairings even when the editor changed them after page load.
      const [result, currentInventory] = await Promise.all([fonts.refetch(), inventory.refetch()]);
      if (currentInventory.error) throw new Error('Could not refresh the current files. Please try again.');
      const currentGym = currentInventory.data?.find(item => item.id === gym.id);
      if (!currentGym) throw new Error('This gym could not be found. Refresh the page and try again.');
      if (result.error) throw new Error('Could not load the saved fonts. Please try again.');
      const [kitTools, pdfTools] = await Promise.all([import('@/lib/brandKit'), import('@/lib/brandKitPdf')]);
      const kit = await kitTools.prepareBrandKit(currentGym, result.data || [], setStatus);
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
    <div className="my-3" data-brand-kit-download aria-busy={!!working}>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Download files">
        <Button onClick={() => download('zip')} disabled={!!working} aria-label="Download brand kit"
          title={`Complete ZIP: all active logo categories, original animations, ${gym.elements.length ? `${collectionName}, ` : ''}colors, fonts and licenses, and the PDF guide. Retired files are excluded.`}
          className={buttonClass} style={{ backgroundColor: kitFill, color: kitText }}>
          Brand kit
        </Button>
        <Button onClick={() => download('logo')} disabled={!!working || !featuredLogo} aria-label="Download featured logo"
          title={featuredLogo ? 'Download the logo shown above in its original format' : 'No featured logo is selected'}
          className={buttonClass} style={{ backgroundColor: darkFill, color: '#FFFFFF' }}>
          Logo only
        </Button>
        <Button onClick={() => download('pdf')} disabled={!!working} aria-label="PDF guide"
          title="Download the visual brand guide separately. It is also included in the ZIP."
          className={buttonClass} style={{ backgroundColor: darkFill, color: '#FFFFFF' }}>
          PDF guide
        </Button>
      </div>
      <BrandExamples code={gym.code} ink={darkFill} accent={accent} />
      <p role="status" aria-live="polite" className={status ? 'mt-2 text-sm leading-relaxed text-slate-950' : 'sr-only'}>
        {status}
      </p>
    </div>
  );
}
