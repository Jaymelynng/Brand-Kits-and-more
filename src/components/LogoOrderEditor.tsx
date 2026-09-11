import { useState } from 'react';
import { ArrowLeft, ArrowRight, GripVertical, Loader2 } from 'lucide-react';
import type { GymLogo } from '@/hooks/useGyms';
import { useSaveLogoOrder } from '@/hooks/useGyms';
import { mergeLogoOrder } from '@/lib/logoOrder';
import { contrast } from '@/lib/shade';
import { LogoMedia } from './LogoMedia';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { useToast } from '@/hooks/use-toast';

function Thumbnail({ logo, dark }: { logo: GymLogo; dark: string }) {
  const [darkGround, setDarkGround] = useState(false);
  return <div className="flex h-24 items-center justify-center rounded-lg p-2" style={{ background: darkGround ? dark : '#F1F5F9' }}>
    <LogoMedia url={logo.file_url} alt={logo.filename} className="max-h-full max-w-full object-contain" onContrast={setDarkGround} />
  </div>;
}

/** Mounted for one editing session so refetches cannot reset an unsaved draft. */
export function LogoOrderEditor({ gymId, gymCode, allLogos, logos, label, ink, accent, onClose }: {
  gymId: string; gymCode: string; allLogos: GymLogo[]; logos: GymLogo[]; label: string;
  ink: string; accent: string; onClose: () => void;
}) {
  const [snapshot] = useState(allLogos);
  const [original] = useState(logos);
  const [draft, setDraft] = useState(logos);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const save = useSaveLogoOrder();
  const { toast } = useToast();
  const changed = draft.some((logo, i) => logo.id !== original[i]?.id);
  const fill = contrast(accent, '#FFFFFF') >= 4.5 ? accent : ink;
  const buttonClass = 'h-11 cursor-pointer whitespace-nowrap font-semibold text-white shadow-sm hover:brightness-125 disabled:cursor-default';

  const move = (id: string, to: number) => {
    if (save.isPending) return;
    const from = draft.findIndex(logo => logo.id === id);
    if (from < 0 || to < 0 || to >= draft.length || from === to) return;
    const next = [...draft];
    const [logo] = next.splice(from, 1);
    next.splice(to, 0, logo);
    setDraft(next);
    setMessage(`Moved ${logo.filename} to position ${to + 1}.`);
  };

  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose(); }}>
    <DialogContent className="flex max-h-[90dvh] w-[calc(100%-24px)] max-w-5xl flex-col gap-3 rounded-xl border-2 bg-white p-4 text-slate-950 sm:p-5" style={{ borderColor: accent }}
      onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (save.isPending) event.preventDefault(); }}>
      <div className="pr-8">
        <DialogTitle className="text-xl">Change order · {label}</DialogTitle>
        <DialogDescription className="mt-1 text-[15px] text-slate-700">Drag a logo or use its arrows. Save to update the gallery and primary carousel.</DialogDescription>
      </div>
      <ol aria-label="Logo order" className="grid min-h-0 grid-cols-1 gap-3 overflow-y-auto p-1 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {draft.map((logo, index) => <li key={logo.id} data-logo-id={logo.id}
          className="flex min-w-0 flex-col gap-2 rounded-xl border-2 p-2 transition-colors"
          style={{ borderColor: overId === logo.id ? accent : '#CBD5E1', background: dragId === logo.id ? '#E2E8F0' : '#FFFFFF' }}
          onDragOver={event => { if (dragId && !save.isPending) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setOverId(logo.id); } }}
          onDrop={event => { event.preventDefault(); event.stopPropagation(); if (dragId) move(dragId, index); setDragId(null); setOverId(null); }}>
          <button type="button" draggable={!save.isPending} disabled={save.isPending}
            aria-label={`Drag ${logo.filename}`} title="Drag to a new position, or use the arrows below"
            className="flex h-8 cursor-grab items-center justify-between rounded-md px-2 text-[15px] font-bold text-white active:cursor-grabbing"
            style={{ background: ink }}
            onDragStart={event => { setDragId(logo.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', logo.id); }}
            onDragEnd={() => { setDragId(null); setOverId(null); }}>
            <span>{index + 1}</span><GripVertical className="h-4 w-4" />
          </button>
          <Thumbnail logo={logo} dark={ink} />
          <span title={logo.filename} className="flex-1 break-words text-[15px] font-semibold leading-snug">
            {(logo.filename.startsWith(`${gymCode} - `) ? logo.filename.slice(gymCode.length + 3) : logo.filename).replace(/\.(png|jpe?g|webp|gif|svg|mp4|webm)$/i, '')}
          </span>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" aria-label={`Move ${logo.filename} earlier`} disabled={index === 0 || save.isPending}
              className={buttonClass} style={{ background: ink }} onClick={() => move(logo.id, index - 1)}><ArrowLeft className="h-4 w-4" /></Button>
            <Button type="button" aria-label={`Move ${logo.filename} later`} disabled={index === draft.length - 1 || save.isPending}
              className={buttonClass} style={{ background: ink }} onClick={() => move(logo.id, index + 1)}><ArrowRight className="h-4 w-4" /></Button>
          </div>
        </li>)}
      </ol>
      <div role="status" className="sr-only">{message}</div>
      {save.isError && <p role="alert" className="text-[15px] font-medium text-red-800">{save.error.message}</p>}
      <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
        <span className="text-[15px] font-medium">{draft.length} logos</span>
        <div className="flex gap-2">
          <Button className={buttonClass} style={{ background: ink }} disabled={save.isPending} onClick={onClose}>Cancel</Button>
          <Button className={buttonClass} style={{ background: fill }} disabled={!changed || save.isPending}
            onClick={async () => {
              try {
                await save.mutateAsync({ gymId, orderedIds: mergeLogoOrder(snapshot, draft), expectedIds: snapshot.map(logo => logo.id) });
                toast({ description: 'Logo order saved. The shared kit uses this order too.' });
                onClose();
              } catch { /* Keep the draft and show the server error above. */ }
            }}>{save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{save.isPending ? 'Saving…' : 'Save order'}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
