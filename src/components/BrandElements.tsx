import { useState } from 'react';
import { Download, Copy, Grid3X3, Rows3, Columns, Plus, Trash2, Moon, Sun, Loader2, Eye, ArrowUp } from 'lucide-react';
import type { GymElement, GymWithColors } from '@/hooks/useGyms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InlineRename } from '@/components/shared/InlineRename';
import { useToast } from '@/hooks/use-toast';
import { cn, scrollToSection } from '@/lib/utils';
import { LogoPreview, type PreviewAsset } from '@/components/LogoPreview';
import { contrast, luminance } from '@/lib/shade';
import { copyText } from '@/lib/copyText';
import { elementCollectionName, elementFilename, elementSource, elementTypes, isInlineSvg, loadElementFile } from '@/lib/brandElements';
import { safeFilename, saveDownload } from '@/lib/brandKit';
import { isActiveLogo } from '@/lib/logoOrder';

interface Props {
  gym: GymWithColors;
  isAdmin: boolean;
  onUpload: () => void;
  onRename: (id: string, name: string) => void;
  onTypeChange: (id: string, type: string) => void;
  onDelete: (id: string, name: string) => void;
}

export function BrandElements({ gym, isAdmin, onUpload, onRename, onTypeChange, onDelete }: Props) {
  const [view, setView] = useState<'grid' | 'strip' | 'list'>('grid');
  const [filter, setFilter] = useState('all');
  const [darkPreview, setDarkPreview] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const { toast } = useToast();
  const accent = gym.colors[0]?.color_hex || '#111827';
  const ink = [...gym.colors].sort((a, b) => luminance(a.color_hex) - luminance(b.color_hex))[0]?.color_hex || '#111827';
  const darkFill = contrast(ink, '#FFFFFF') >= 4.5 ? ink : '#111827';
  const accentText = contrast(accent, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#111111';
  const typeOrder: Record<string, number> = { icon: 0, shape: 1, banner: 2, background: 3, divider: 4 };
  const orderedElements = [...gym.elements].sort((a, b) => (typeOrder[a.element_type] ?? 5) - (typeOrder[b.element_type] ?? 5));
  const types = [...new Set(orderedElements.map(e => e.element_type))];
  const collectionName = elementCollectionName(gym.elements);
  const visible = filter === 'all' ? orderedElements : orderedElements.filter(e => e.element_type === filter);
  const previewAssets: PreviewAsset[] = visible.map(element => ({
    id: element.id, filename: elementFilename(element), file_url: elementSource(element), variant: element.element_type,
  }));
  const preview = previewAssets.find(asset => asset.id === previewId);
  const previewElement = visible.find(element => element.id === previewId);
  const buttonClass = 'h-10 min-w-0 cursor-pointer px-2 text-[15px] font-semibold shadow-sm hover:brightness-90';
  const actionStyle = { backgroundColor: accent, color: accentText };
  const secondaryStyle = { backgroundColor: darkFill, color: '#FFFFFF' };

  const download = async (elements: GymElement[], zipped = false) => {
    if (busy) return;
    setBusy(zipped ? 'zip' : elements[0].id);
    try {
      if (!zipped) saveDownload(await loadElementFile(elements[0]), elementFilename(elements[0]));
      else {
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        const folder = `${safeFilename(gym.code)}-${elementCollectionName(elements)}`;
        const used = new Set<string>();
        for (let i = 0; i < elements.length; i += 4) {
          const batch = await Promise.all(elements.slice(i, i + 4).map(async element => ({ element, blob: await loadElementFile(element) })));
          for (const { element, blob } of batch) {
            const original = elementFilename(element);
            let name = original, n = 2;
            while (used.has(name.toLowerCase())) name = original.replace(/(\.[^.]+)$/, `-${n++}$1`);
            used.add(name.toLowerCase());
            zip.file(`${folder}/${name}`, blob);
          }
        }
        saveDownload(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), `${folder}.zip`);
      }
      toast({ description: `${elements.length === 1 ? elementCollectionName(elements, false) : `${elements.length} ${elementCollectionName(elements).toLowerCase()}`} downloaded.` });
    } catch (error) {
      toast({ variant: 'destructive', description: error instanceof Error ? error.message : 'Download could not finish. Please try again.' });
    } finally { setBusy(null); }
  };

  if (!gym.elements.length && !isAdmin) return null;
  return <><Card id="brand-elements" data-brand-elements className="mb-8 scroll-mt-24 border-2 bg-white shadow-xl" style={{ borderColor: `${accent}65` }}>
    <CardHeader className="gap-3 p-4 sm:p-6 sm:pb-4">
      <nav aria-label={`Browse from ${collectionName.toLowerCase()}`} className="flex flex-wrap gap-2">
        {[...(gym.logos.some(isActiveLogo) || isAdmin && gym.logos.length ? [{ id: 'logo-gallery', label: 'Logos' }] : []), { id: 'brand-colors', label: 'Brand colors' },
          ...(gym.logos.some(logo => logo.variant === 'Primary logos') ? [{ id: 'brand-fonts', label: 'Fonts' }] : [])].map(section =>
          <Button key={section.id} onClick={() => scrollToSection(section.id)} className={buttonClass} style={secondaryStyle}><ArrowUp className="mr-1 h-4 w-4" />{section.label}</Button>)}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-2xl text-slate-950">{collectionName} <span className="text-base font-medium">({gym.elements.length})</span></CardTitle>
        <div className="flex flex-wrap gap-2">
          {!!gym.elements.length && <Button disabled={!!busy || !visible.length} onClick={() => download(visible, true)} className={buttonClass} style={actionStyle}>
            {busy === 'zip' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download {filter === 'all' ? 'all' : 'shown'}
          </Button>}
          {isAdmin && <Button onClick={onUpload} className={buttonClass} style={secondaryStyle}><Plus className="mr-2 h-4 w-4" />Add graphics</Button>}
        </div>
      </div>
      {!!gym.elements.length && <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Graphic categories">
          {['all', ...types].map(type => <Button key={type} aria-pressed={filter === type} onClick={() => setFilter(type)}
            className={cn(buttonClass, 'capitalize')} style={filter === type ? actionStyle : secondaryStyle}>
            {type === 'all' ? 'All' : type} · {type === 'all' ? gym.elements.length : gym.elements.filter(e => e.element_type === type).length}
          </Button>)}
        </div>
        <div className="flex gap-2" role="group" aria-label="Graphic views">
          {([{ value: 'grid', label: 'Grid', Icon: Grid3X3 }, { value: 'strip', label: 'Strip', Icon: Columns }, { value: 'list', label: 'List', Icon: Rows3 }] as const).map(({ value, label, Icon }) =>
            <Button key={value} title={label} aria-label={`${label} view`} aria-pressed={view === value} onClick={() => setView(value)} className={cn(buttonClass, 'px-3')} style={view === value ? actionStyle : secondaryStyle}><Icon className="h-4 w-4" /></Button>)}
          <Button onClick={() => setDarkPreview(!darkPreview)} title="Change preview background" aria-label="Change graphic preview background" aria-pressed={darkPreview} className={cn(buttonClass, 'px-3')} style={secondaryStyle}>
            {darkPreview ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>}
    </CardHeader>
    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
      {!gym.elements.length ? <p className="text-base text-slate-950">Add dividers, banners, backgrounds or icons to this kit.</p> :
        <div data-graphic-view={view} className={cn(view === 'strip' ? 'flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4' : 'grid auto-rows-fr gap-4', view === 'grid' && 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3')}>
          {visible.map(element => <article key={element.id} data-element-id={element.id} data-activity-asset={element.display_name || element.element_type} className={cn('flex min-w-0 flex-col rounded-xl border-2 bg-white p-4 shadow-md', view === 'strip' && 'w-[min(90%,440px)] shrink-0 snap-start', view === 'list' && 'sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-5')} style={{ borderColor: `${accent}55` }}>
            <button type="button" aria-label={`Preview ${elementCollectionName([element], false).toLowerCase()}: ${element.display_name || element.element_type}`} onClick={() => setPreviewId(element.id)}
              className="group relative flex h-40 w-full min-w-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-slate-300 p-2 transition-shadow hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ backgroundColor: darkPreview ? darkFill : '#FFFFFF' }}>
              <img src={elementSource(element)} alt={element.display_name || element.element_type} className="max-h-full w-full object-contain" loading="lazy" />
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-1 text-[15px] font-semibold shadow-md" style={secondaryStyle}><Eye className="h-4 w-4" />Preview</span>
            </button>
            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="my-3 break-words text-base font-bold text-slate-950">
                {isAdmin ? <InlineRename value={element.display_name || element.element_type} onSave={name => onRename(element.id, name)} /> : element.display_name || element.element_type}
              </h3>
              <div className="mt-auto grid grid-cols-2 gap-2">
                <Button disabled={!!busy} onClick={() => download([element])} className={buttonClass} style={actionStyle}><Download className="hidden h-4 w-4 shrink-0 sm:block" />Download</Button>
                <Button onClick={async () => {
                  const value = isInlineSvg(element.svg_data) ? element.svg_data : new URL(element.svg_data, window.location.origin).href;
                  const ok = await copyText(value);
                  toast({ variant: ok ? 'default' : 'destructive', description: ok ? 'Copied.' : 'Could not copy. Please try again.' });
                }} className={buttonClass} style={secondaryStyle}><Copy className="hidden h-4 w-4 shrink-0 sm:block" />{isInlineSvg(element.svg_data) ? 'Copy SVG' : 'Copy URL'}</Button>
              </div>
              {isAdmin && <div className="mt-2 flex gap-2">
                <Select value={element.element_type} onValueChange={type => onTypeChange(element.id, type)}>
                  <SelectTrigger aria-label="Graphic category" className="min-w-0 flex-1 capitalize text-slate-950"><SelectValue /></SelectTrigger>
                  <SelectContent>{[...new Set([...elementTypes, element.element_type])].map(type => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={() => onDelete(element.id, element.display_name || element.element_type)} aria-label={`Delete ${element.display_name || element.element_type}`} className={buttonClass} style={{ backgroundColor: '#b91c1c', color: '#FFFFFF' }}><Trash2 className="h-4 w-4" /></Button>
              </div>}
            </div>
          </article>)}
        </div>}
    </CardContent>
  </Card>
    {preview && previewElement && <LogoPreview logo={preview} logos={previewAssets} kind="graphic"
      palette={gym.colors.map(color => color.color_hex)} onChoose={asset => setPreviewId(asset.id)} onClose={() => setPreviewId(null)}
      copyValue={isInlineSvg(previewElement.svg_data) ? previewElement.svg_data : new URL(previewElement.svg_data, window.location.origin).href}
      copyLabel={isInlineSvg(previewElement.svg_data) ? 'Copy SVG' : 'Copy URL'} />}
  </>;
}
