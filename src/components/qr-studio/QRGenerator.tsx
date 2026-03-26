import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { generateQRCode } from "@/utils/qrGenerator";
import { saveGeneratedQR, saveBulkGeneratedQRs } from "@/services/qrService";
import { supabase } from "@/integrations/supabase/client";
import { Download, Save, Layers, RefreshCw, X, AlertTriangle, QrCode, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeneratedQR {
  content: string;
  imageUrl: string;
  title?: string;
  sublabel?: string;
}

interface Logo {
  file: File;
  name: string;
  preview: string;
  image: HTMLImageElement;
}

interface GymWithLogo {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  primaryColor?: string;
}

const DESTINATION_TYPES = [
  'Classes', 'Waiver', 'Login', 'Trial', 'Camp', 'Event', 'Registration', 'Website', 'Other'
];

// ─── Gym Logo Grid ───────────────────────────────────────────────────
const GymLogoGrid = ({
  gyms,
  selected,
  onToggle,
  multi = false,
}: {
  gyms: GymWithLogo[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  multi?: boolean;
}) => {
  if (gyms.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--brand-navy) / 0.7)' }}>
          {multi ? 'Select Gyms for Logo Matching' : 'Select Gym'}
        </Label>
        <span className="text-xs font-medium" style={{ color: 'hsl(var(--brand-rose-gold))' }}>
          {selected.size} selected
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-2 p-3 rounded-xl" style={{
        background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.08), hsl(var(--brand-rose-gold) / 0.04))',
        border: '1px solid hsl(var(--brand-rose-gold) / 0.2)',
      }}>
        {gyms.map((gym) => {
          const isSelected = selected.has(gym.id);
          const color = gym.primaryColor || '#b48f8f';
          return (
            <div
              key={gym.id}
              onClick={() => onToggle(gym.id)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-1.5 py-1.5 cursor-pointer rounded-lg transition-all duration-200",
                isSelected ? "scale-105" : "opacity-60 hover:opacity-100"
              )}
              style={{
                border: isSelected ? `3px solid ${color}` : '2px solid hsl(var(--brand-rose-gold) / 0.25)',
                background: '#fff',
                boxShadow: isSelected
                  ? `0 3px 12px ${color}40, 0 1px 4px rgba(0,0,0,0.12)`
                  : '0 1px 4px rgba(0,0,0,0.06)',
                minWidth: '52px',
              }}
              title={gym.name}
            >
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center z-10" style={{ backgroundColor: color }}>
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <div className="w-9 h-9 flex items-center justify-center rounded overflow-hidden">
                {gym.logoUrl ? (
                  <img src={gym.logoUrl} alt={gym.code} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center rounded text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
                    {gym.code}
                  </div>
                )}
              </div>
              <span className="text-[9px] font-bold tracking-wider" style={{ color: isSelected ? color : 'hsl(var(--brand-navy) / 0.5)' }}>
                {gym.code}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────
export const QRGenerator = () => {
  // Single mode state
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [singleLogo, setSingleLogo] = useState<Logo | null>(null);
  const [singleGymId, setSingleGymId] = useState<string>("");
  const [destinationType, setDestinationType] = useState("");
  const [showSingleLabel, setShowSingleLabel] = useState(false);

  // Bulk mode state
  const [batchTitle, setBatchTitle] = useState("");
  const [bulkContent, setBulkContent] = useState("");
  const [generatedQRs, setGeneratedQRs] = useState<GeneratedQR[]>([]);
  const [selectedBulkGyms, setSelectedBulkGyms] = useState<Set<string>>(new Set());
  const [showBulkLabel, setShowBulkLabel] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [gyms, setGyms] = useState<GymWithLogo[]>([]);
  const [gymLogoImages, setGymLogoImages] = useState<Map<string, HTMLImageElement>>(new Map());

  // Load gyms with logos
  useEffect(() => {
    const load = async () => {
      const { data: gymData } = await supabase.from('gyms').select('id, name, code').order('name');
      if (!gymData) return;
      const { data: logos } = await supabase.from('gym_logos').select('gym_id, file_url, is_main_logo');
      const { data: colors } = await supabase.from('gym_colors').select('gym_id, color_hex, order_index').order('order_index');

      const gymsWithLogos: GymWithLogo[] = gymData.map(g => {
        const mainLogo = logos?.find(l => l.gym_id === g.id && l.is_main_logo) || logos?.find(l => l.gym_id === g.id);
        const primaryColor = colors?.find(c => c.gym_id === g.id)?.color_hex;
        return { ...g, logoUrl: mainLogo?.file_url, primaryColor };
      });
      setGyms(gymsWithLogos);

      // Preload logo images for QR overlay
      const imgMap = new Map<string, HTMLImageElement>();
      for (const gym of gymsWithLogos) {
        if (gym.logoUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = gym.logoUrl;
          img.onload = () => imgMap.set(gym.id, img);
        }
      }
      // Store after a short delay to allow images to load
      setTimeout(() => setGymLogoImages(new Map(imgMap)), 2000);
    };
    load();
  }, []);

  // Single mode: auto-load logo when gym selected
  const singleSelectedSet = useMemo(() => singleGymId ? new Set([singleGymId]) : new Set<string>(), [singleGymId]);

  const handleSingleGymToggle = (gymId: string) => {
    if (singleGymId === gymId) {
      setSingleGymId("");
      setSingleLogo(null);
    } else {
      setSingleGymId(gymId);
      // Auto-load logo
      const gym = gyms.find(g => g.id === gymId);
      if (gym?.logoUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setSingleLogo({ file: new File([], gym.name), name: gym.name, preview: gym.logoUrl!, image: img });
        };
        img.src = gym.logoUrl;
      }
    }
  };

  const handleBulkGymToggle = (gymId: string) => {
    setSelectedBulkGyms(prev => {
      const next = new Set(prev);
      if (next.has(gymId)) next.delete(gymId); else next.add(gymId);
      return next;
    });
  };

  // ─── Parsing Logic ─────────────────────────────────────────────────
  const parseLine = (line: string): { label?: string; sublabel?: string; content: string } | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const dashUrlMatch = trimmed.match(/^(.+?)\s+[-–—]\s+(https?:\/\/.+)$/i);
    if (dashUrlMatch) return { label: dashUrlMatch[1].trim(), content: dashUrlMatch[2].trim() };
    const urlMatch = trimmed.match(/^(.+?):\s*(https?:\/\/.+)$/i);
    if (urlMatch) return { label: urlMatch[1].trim(), content: urlMatch[2].trim() };
    const pipeUrlMatch = trimmed.match(/^(.+?)\s*\|\s*(https?:\/\/.+)$/i);
    if (pipeUrlMatch) return { label: pipeUrlMatch[1].trim(), content: pipeUrlMatch[2].trim() };
    const arrowUrlMatch = trimmed.match(/^(.+?)\s*(?:→|=>)\s*(https?:\/\/.+)$/i);
    if (arrowUrlMatch) return { label: arrowUrlMatch[1].trim(), content: arrowUrlMatch[2].trim() };
    if (trimmed.match(/^https?:\/\//i) || trimmed.match(/^(mailto|tel):/i)) return { content: trimmed };
    return { content: trimmed };
  };

  const cleanUrl = (url: string): string => url.replace(/\s*\([^)]*\)\s*$/, '').trim();

  const parseMultiLineEntries = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const entries: { label?: string; sublabel?: string; content: string }[] = [];
    const isUrl = (s: string) => /^https?:\/\//i.test(cleanUrl(s)) || /^(mailto|tel):/i.test(cleanUrl(s));
    let i = 0;
    while (i < lines.length) {
      const current = lines[i].trim();
      const next = i + 1 < lines.length ? lines[i + 1].trim() : null;
      const third = i + 2 < lines.length ? lines[i + 2].trim() : null;
      if (!isUrl(current) && next && !isUrl(next) && third && isUrl(third)) {
        entries.push({ label: current, sublabel: next, content: cleanUrl(third) });
        i += 3; continue;
      }
      if (!isUrl(current) && next && isUrl(next)) {
        entries.push({ label: current, content: cleanUrl(next) });
        i += 2; continue;
      }
      const singleLine = parseLine(current);
      if (singleLine && isUrl(singleLine.content)) {
        entries.push({ ...singleLine, content: cleanUrl(singleLine.content) });
        i++; continue;
      }
      if (isUrl(current)) { entries.push({ content: cleanUrl(current) }); i++; continue; }
      i++;
    }
    return entries;
  };

  const checkMismatch = (label: string | undefined, url: string): boolean => {
    if (!label) return false;
    try {
      const pathSlug = new URL(url).pathname.replace(/\//g, '').toLowerCase();
      if (!pathSlug) return false;
      const words = label.toLowerCase().split(/[\s\-()]+/).filter(w => w.length > 2);
      return !words.some(w => pathSlug.includes(w));
    } catch { return false; }
  };

  const findMatchingGymLogo = (label: string): HTMLImageElement | undefined => {
    if (!label || selectedBulkGyms.size === 0) return undefined;
    const keywords = label.toLowerCase().split(/[\s-]+/).filter(k => k.length > 2);
    for (const gymId of selectedBulkGyms) {
      const gym = gyms.find(g => g.id === gymId);
      if (!gym) continue;
      const gymWords = [...gym.name.toLowerCase().split(/[\s-]+/), gym.code.toLowerCase()];
      for (const keyword of keywords) {
        if (gymWords.some(w => w.includes(keyword) || keyword.includes(w))) {
          return gymLogoImages.get(gymId);
        }
      }
    }
    return undefined;
  };

  const parsedPreview = useMemo(() => parseMultiLineEntries(bulkContent), [bulkContent]);
  const mismatchCount = useMemo(() => parsedPreview.filter(e => checkMismatch(e.label, e.content)).length, [parsedPreview]);

  // ─── Actions ───────────────────────────────────────────────────────
  const clearSingle = () => {
    setContent(""); setTitle(""); setQrImage(""); setSingleLogo(null);
    setSingleGymId(""); setDestinationType("");
    toast({ title: "Session cleared" });
  };

  const clearBulk = () => {
    setBatchTitle(""); setBulkContent(""); setGeneratedQRs([]);
    setSelectedBulkGyms(new Set());
    toast({ title: "Session cleared" });
  };

  const handleSingleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const preview = event.target?.result as string;
      const img = new Image();
      img.onload = () => setSingleLogo({ file, name: file.name, preview, image: img });
      img.src = preview;
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!content.trim()) { toast({ title: "Content required", variant: "destructive" }); return; }
    setIsGenerating(true);
    try {
      const imageUrl = await generateQRCode({
        content,
        logoImage: singleLogo?.image,
        label: showSingleLabel && title ? title : undefined,
      });
      setQrImage(imageUrl);
      toast({ title: "QR code generated" });
    } catch {
      toast({ title: "Error generating QR code", variant: "destructive" });
    } finally { setIsGenerating(false); }
  };

  const handleDownload = () => {
    if (!qrImage) return;
    const link = document.createElement("a");
    link.download = `qr-${title || "code"}-${Date.now()}.png`;
    link.href = qrImage;
    link.click();
  };

  const handleSave = async () => {
    if (!qrImage) return;
    try {
      await saveGeneratedQR({
        content, qrImageUrl: qrImage, title: title || undefined,
        gymId: singleGymId || undefined, destinationType: destinationType || undefined,
      });
      toast({ title: "Saved to library" });
    } catch { toast({ title: "Error saving", variant: "destructive" }); }
  };

  const handleBulkGenerate = async () => {
    const entries = parseMultiLineEntries(bulkContent);
    if (entries.length === 0) { toast({ title: "Content required", variant: "destructive" }); return; }
    setIsGenerating(true);
    try {
      const generated: GeneratedQR[] = [];
      for (const entry of entries) {
        const { label, sublabel, content } = entry;
        const matchedLogo = label ? findMatchingGymLogo(label) : undefined;
        const resolvedSublabel = sublabel || batchTitle.trim() || undefined;
        const imageUrl = await generateQRCode({
          content,
          logoImage: matchedLogo,
          label: showBulkLabel && label ? label : undefined,
          sublabel: showBulkLabel ? resolvedSublabel : undefined,
        });
        generated.push({ content, imageUrl, title: label, sublabel: resolvedSublabel });
      }
      setGeneratedQRs(generated);
      toast({ title: `Generated ${generated.length} QR codes` });
    } catch {
      toast({ title: "Error generating", variant: "destructive" });
    } finally { setIsGenerating(false); }
  };

  const handleSaveAll = async () => {
    if (generatedQRs.length === 0) return;
    setIsGenerating(true);
    try {
      await saveBulkGeneratedQRs({
        batchName: batchTitle.trim() || `Batch ${new Date().toLocaleDateString()}`,
        qrCodes: generatedQRs.map(qr => ({ content: qr.content, qrImageUrl: qr.imageUrl, title: qr.title })),
      });
      toast({ title: `Saved ${generatedQRs.length} QR codes` });
    } catch { toast({ title: "Error saving", variant: "destructive" }); }
    finally { setIsGenerating(false); }
  };

  const handleDownloadAll = () => {
    generatedQRs.forEach((qr, index) => {
      const link = document.createElement("a");
      const gymName = qr.title?.toLowerCase().replace(/\s+/g, '-') || `qr-${index + 1}`;
      link.download = batchTitle.trim()
        ? `${batchTitle.trim().toLowerCase().replace(/\s+/g, '-')}_${gymName}.png`
        : `${gymName}.png`;
      link.href = qr.imageUrl;
      link.click();
    });
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <Tabs defaultValue="bulk" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-11" style={{
        background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.15), hsl(var(--brand-blue-gray) / 0.1))',
        border: '2px solid hsl(var(--brand-rose-gold) / 0.25)',
      }}>
        <TabsTrigger value="bulk" className="text-sm font-semibold gap-2 data-[state=active]:shadow-md">
          <Layers className="h-4 w-4" /> Bulk Generate
        </TabsTrigger>
        <TabsTrigger value="single" className="text-sm font-semibold gap-2 data-[state=active]:shadow-md">
          <QrCode className="h-4 w-4" /> Single QR
        </TabsTrigger>
      </TabsList>

      {/* ━━━ BULK TAB ━━━ */}
      <TabsContent value="bulk" className="mt-4 space-y-4">
        <Card className="p-4 space-y-4 max-w-3xl mx-auto" style={{
          border: '2px solid hsl(var(--brand-rose-gold) / 0.2)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
        }}>
          {/* Status bar */}
          <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid hsl(var(--brand-rose-gold) / 0.15)' }}>
            <span className="text-xs font-medium" style={{ color: 'hsl(var(--brand-navy) / 0.6)' }}>
              {selectedBulkGyms.size} gym{selectedBulkGyms.size !== 1 ? 's' : ''} • {generatedQRs.length} QR{generatedQRs.length !== 1 ? 's' : ''} generated
            </span>
            <Button variant="ghost" size="sm" onClick={clearBulk} className="h-7 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>

          {/* Gym Logo Grid */}
          <GymLogoGrid gyms={gyms} selected={selectedBulkGyms} onToggle={handleBulkGymToggle} multi />

          {/* Batch Title + Label Toggle */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label htmlFor="batchTitle" className="text-xs font-semibold">Batch Title</Label>
              <Input id="batchTitle" placeholder="e.g. Waiver Links March 2026" value={batchTitle}
                onChange={(e) => setBatchTitle(e.target.value)} className="mt-1 h-9 text-sm" />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Label htmlFor="showBulkLabel" className="text-xs">Labels</Label>
              <Switch id="showBulkLabel" checked={showBulkLabel} onCheckedChange={setShowBulkLabel} />
            </div>
          </div>

          {/* Bulk Content Paste Area */}
          <div>
            <Label htmlFor="bulkContent" className="text-xs font-semibold">Paste URLs</Label>
            <p className="text-[10px] mb-1" style={{ color: 'hsl(var(--brand-navy) / 0.5)' }}>
              Supports: "Name - URL", "Name: URL", or name + URL on separate lines
            </p>
            <Textarea id="bulkContent"
              placeholder={"Gym Name\nhttps://example.com/login\n\nAnother Gym - https://example.com/waiver"}
              value={bulkContent} onChange={(e) => setBulkContent(e.target.value)}
              rows={8} className="text-sm font-mono" />
          </div>

          {/* Parse Preview Table */}
          {parsedPreview.length >= 2 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold" style={{ color: 'hsl(var(--brand-navy))' }}>
                {parsedPreview.length} entries detected
                {mismatchCount > 0 && (
                  <span className="ml-2 text-yellow-600">({mismatchCount} potential mismatch{mismatchCount > 1 ? 'es' : ''})</span>
                )}
              </p>
              <div className="max-h-48 overflow-y-auto rounded-lg" style={{
                border: '1.5px solid hsl(var(--brand-rose-gold) / 0.2)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <table className="w-full text-xs">
                  <thead className="sticky top-0" style={{ background: 'hsl(var(--brand-rose-gold) / 0.1)' }}>
                    <tr>
                      <th className="px-2 py-1.5 text-left w-8 font-semibold">#</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Label</th>
                      <th className="px-2 py-1.5 text-left font-semibold">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedPreview.map((entry, i) => {
                      const isMismatch = checkMismatch(entry.label, entry.content);
                      return (
                        <tr key={i} className={isMismatch ? "bg-yellow-500/10" : i % 2 === 0 ? "bg-white" : "bg-muted/30"}>
                          <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                          <td className="px-2 py-1">
                            <div className="flex items-center gap-1">
                              {isMismatch && <AlertTriangle className="h-3 w-3 text-yellow-600 shrink-0" />}
                              {entry.label ? (
                                <div>
                                  <div className="font-medium">{entry.label}</div>
                                  {entry.sublabel && <div className="text-muted-foreground">{entry.sublabel}</div>}
                                </div>
                              ) : <span className="text-muted-foreground italic">No label</span>}
                            </div>
                          </td>
                          <td className="px-2 py-1 text-muted-foreground truncate max-w-[250px]">{entry.content}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button onClick={handleBulkGenerate} disabled={isGenerating} className="w-full h-10 text-sm font-semibold" style={{
            background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold-dark)))',
            color: 'white',
            boxShadow: '0 4px 14px hsl(var(--brand-rose-gold) / 0.4)',
          }}>
            {isGenerating ? "Generating..." : "Generate All QR Codes"}
          </Button>
        </Card>

        {/* Generated QR Results */}
        {generatedQRs.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button onClick={handleDownloadAll} variant="outline" className="flex-1 h-9 text-sm font-semibold" style={{
                border: '2px solid hsl(var(--brand-rose-gold) / 0.3)',
              }}>
                <Download className="h-4 w-4 mr-2" /> Download All ({generatedQRs.length})
              </Button>
              <Button onClick={handleSaveAll} disabled={isGenerating} className="flex-1 h-9 text-sm font-semibold" style={{
                background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold-dark)))',
                color: 'white',
              }}>
                <Save className="h-4 w-4 mr-2" /> Save All as Batch
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {generatedQRs.map((qr, index) => (
                <Card key={index} className="p-2.5 space-y-2" style={{
                  border: '1.5px solid hsl(var(--brand-rose-gold) / 0.2)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold truncate">{qr.title || `QR #${index + 1}`}</div>
                    {qr.sublabel && <div className="text-[10px] text-muted-foreground truncate">{qr.sublabel}</div>}
                  </div>
                  <img src={qr.imageUrl} alt={qr.title || `QR ${index + 1}`} className="w-full rounded-md" style={{
                    border: '1px solid hsl(var(--brand-rose-gold) / 0.15)',
                  }} />
                  <p className="text-[10px] text-muted-foreground break-all line-clamp-1">{qr.content}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* ━━━ SINGLE TAB ━━━ */}
      <TabsContent value="single" className="mt-4">
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <Card className="p-4 space-y-3" style={{
            border: '2px solid hsl(var(--brand-rose-gold) / 0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            {/* Status bar */}
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid hsl(var(--brand-rose-gold) / 0.15)' }}>
              <span className="text-xs font-medium" style={{ color: 'hsl(var(--brand-navy) / 0.6)' }}>
                {singleLogo ? "1 logo" : "No logo"} • {qrImage ? "1 QR" : "No QR yet"}
              </span>
              <Button variant="ghost" size="sm" onClick={clearSingle} className="h-7 text-xs">
                <RefreshCw className="h-3 w-3 mr-1" /> Clear
              </Button>
            </div>

            {/* Gym Logo Grid */}
            <GymLogoGrid gyms={gyms} selected={singleSelectedSet} onToggle={handleSingleGymToggle} />

            {/* Destination Type */}
            <div>
              <Label className="text-xs font-semibold">Destination Type</Label>
              <Select value={destinationType} onValueChange={setDestinationType}>
                <SelectTrigger className="mt-1 h-9 text-sm">
                  <SelectValue placeholder="e.g. Classes, Waiver, Login..." />
                </SelectTrigger>
                <SelectContent>
                  {DESTINATION_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Manual Logo Upload (fallback) */}
            {!singleGymId && (
              <div>
                <Label htmlFor="logo" className="text-xs font-semibold">Upload Logo</Label>
                <div className="space-y-1.5 mt-1">
                  <Input id="logo" type="file" accept="image/*" onChange={handleSingleLogoUpload} className="h-9 text-sm" />
                  {singleLogo && (
                    <div className="flex items-center gap-2">
                      <img src={singleLogo.preview} alt={singleLogo.name} className="w-12 h-12 rounded object-cover border-2 border-border" />
                      <Button variant="ghost" size="sm" onClick={() => setSingleLogo(null)} className="h-7">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Title + Label Toggle */}
            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <Label htmlFor="title" className="text-xs font-semibold">Title</Label>
                <Input id="title" placeholder="My QR Code" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-9 text-sm" />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Label htmlFor="showSingleLabel" className="text-xs">Label</Label>
                <Switch id="showSingleLabel" checked={showSingleLabel} onCheckedChange={setShowSingleLabel} />
              </div>
            </div>

            {/* Content */}
            <div>
              <Label htmlFor="content" className="text-xs font-semibold">Content *</Label>
              <Textarea id="content" placeholder="Enter URL, text, or any content..."
                value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="text-sm" />
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full h-10 text-sm font-semibold" style={{
              background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold-dark)))',
              color: 'white',
              boxShadow: '0 4px 14px hsl(var(--brand-rose-gold) / 0.4)',
            }}>
              {isGenerating ? "Generating..." : "Generate QR Code"}
            </Button>
          </Card>

          {/* QR Preview Panel */}
          <Card className="p-4 flex flex-col items-center justify-center space-y-3" style={{
            border: '2px solid hsl(var(--brand-rose-gold) / 0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            background: 'linear-gradient(180deg, hsl(var(--brand-rose-gold) / 0.04), transparent)',
          }}>
            {qrImage ? (
              <>
                <img src={qrImage} alt="Generated QR Code" className="w-full max-w-xs rounded-lg" style={{
                  border: '2px solid hsl(var(--brand-rose-gold) / 0.2)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                }} />
                <div className="flex gap-2 w-full max-w-xs">
                  <Button onClick={handleDownload} variant="outline" className="flex-1 h-9 text-sm" style={{
                    border: '2px solid hsl(var(--brand-rose-gold) / 0.3)',
                  }}>
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                  <Button onClick={handleSave} className="flex-1 h-9 text-sm" style={{
                    background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold-dark)))',
                    color: 'white',
                  }}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <QrCode className="h-20 w-20 mx-auto mb-3" style={{ color: 'hsl(var(--brand-rose-gold) / 0.2)' }} />
                <p className="text-sm" style={{ color: 'hsl(var(--brand-navy) / 0.4)' }}>Your QR code will appear here</p>
              </div>
            )}
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
};
