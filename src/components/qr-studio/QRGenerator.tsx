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
import { Download, Save, Layers, RefreshCw, X, AlertTriangle, QrCode } from "lucide-react";

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

interface Gym {
  id: string;
  name: string;
  code: string;
}

const DESTINATION_TYPES = [
  'Classes', 'Waiver', 'Login', 'Trial', 'Camp', 'Event', 'Registration', 'Website', 'Other'
];

export const QRGenerator = () => {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [qrImage, setQrImage] = useState<string>("");
  const [singleLogo, setSingleLogo] = useState<Logo | null>(null);
  const [selectedGymId, setSelectedGymId] = useState<string>("");
  const [destinationType, setDestinationType] = useState<string>("");

  const [batchTitle, setBatchTitle] = useState("");
  const [bulkContent, setBulkContent] = useState("");
  const [generatedQRs, setGeneratedQRs] = useState<GeneratedQR[]>([]);
  const [bulkLogos, setBulkLogos] = useState<Logo[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [showSingleLabel, setShowSingleLabel] = useState(true);
  const [showBulkLabel, setShowBulkLabel] = useState(true);
  const [gyms, setGyms] = useState<Gym[]>([]);

  useEffect(() => {
    const loadGyms = async () => {
      const { data } = await supabase.from('gyms').select('id, name, code').order('name');
      if (data) setGyms(data);
    };
    loadGyms();
  }, []);

  // Auto-load gym logo when gym selected
  useEffect(() => {
    if (!selectedGymId) return;
    const loadGymLogo = async () => {
      const { data } = await supabase
        .from('gym_logos')
        .select('file_url, filename')
        .eq('gym_id', selectedGymId)
        .eq('is_main_logo', true)
        .maybeSingle();
      if (data?.file_url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setSingleLogo({
            file: new File([], data.filename),
            name: data.filename,
            preview: data.file_url,
            image: img,
          });
        };
        img.src = data.file_url;
      }
    };
    loadGymLogo();
  }, [selectedGymId]);

  const clearSingleSession = () => {
    setContent(""); setTitle(""); setQrImage(""); setSingleLogo(null);
    setSelectedGymId(""); setDestinationType("");
    toast({ title: "Session cleared" });
  };

  const clearBulkSession = () => {
    setBatchTitle(""); setBulkContent(""); setGeneratedQRs([]); setBulkLogos([]);
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

  const handleBulkLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newLogos: Logo[] = [];
    let loadedCount = 0;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          newLogos.push({ file, name: file.name, preview, image: img });
          loadedCount++;
          if (loadedCount === files.length) {
            setBulkLogos(prev => [...prev, ...newLogos]);
            toast({ title: `${newLogos.length} logo${newLogos.length > 1 ? 's' : ''} uploaded` });
          }
        };
        img.src = preview;
      };
      reader.readAsDataURL(file);
    });
  };

  const findMatchingLogo = (gymName: string): HTMLImageElement | undefined => {
    if (!gymName || bulkLogos.length === 0) return undefined;
    const keywords = gymName.toLowerCase().split(/[\s-]+/).filter(k => k.length > 2);
    for (const logo of bulkLogos) {
      const logoName = logo.name.toLowerCase();
      for (const keyword of keywords) {
        if (logoName.includes(keyword)) return logo.image;
      }
    }
    return undefined;
  };

  const handleGenerate = async () => {
    if (!content.trim()) {
      toast({ title: "Content required", variant: "destructive" });
      return;
    }
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
    } finally {
      setIsGenerating(false);
    }
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
        gymId: selectedGymId || undefined, destinationType: destinationType || undefined,
      });
      toast({ title: "Saved to library" });
    } catch {
      toast({ title: "Error saving", variant: "destructive" });
    }
  };

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

  const parseMultiLineEntries = (text: string): { label?: string; sublabel?: string; content: string }[] => {
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
      const urlObj = new URL(url);
      const pathSlug = urlObj.pathname.replace(/\//g, '').toLowerCase();
      if (!pathSlug) return false;
      const words = label.toLowerCase().split(/[\s\-()]+/).filter(w => w.length > 2);
      return !words.some(w => pathSlug.includes(w));
    } catch { return false; }
  };

  const parsedPreview = useMemo(() => parseMultiLineEntries(bulkContent), [bulkContent]);
  const mismatchCount = useMemo(() => parsedPreview.filter(e => checkMismatch(e.label, e.content)).length, [parsedPreview]);

  const handleBulkGenerate = async () => {
    const entries = parseMultiLineEntries(bulkContent);
    if (entries.length === 0) {
      toast({ title: "Content required", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const generated: GeneratedQR[] = [];
      for (const entry of entries) {
        const { label, sublabel, content } = entry;
        const matchedLogo = label ? findMatchingLogo(label) : undefined;
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
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAll = async () => {
    if (generatedQRs.length === 0) return;
    setIsGenerating(true);
    try {
      await saveBulkGeneratedQRs({
        batchName: batchTitle.trim() || `Batch ${new Date().toLocaleDateString()}`,
        qrCodes: generatedQRs.map(qr => ({
          content: qr.content,
          qrImageUrl: qr.imageUrl,
          title: qr.title,
        })),
      });
      toast({ title: `Saved ${generatedQRs.length} QR codes` });
    } catch {
      toast({ title: "Error saving", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
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

  return (
    <Tabs defaultValue="single" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="single">Single QR Code</TabsTrigger>
        <TabsTrigger value="bulk">
          <Layers className="h-4 w-4 mr-2" />
          Bulk Generate
        </TabsTrigger>
      </TabsList>

      <TabsContent value="single">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="text-sm text-muted-foreground">
                {singleLogo ? "1 logo" : "No logo"} • {qrImage ? "1 QR generated" : "No QR yet"}
              </div>
              <Button variant="ghost" size="sm" onClick={clearSingleSession}>
                <RefreshCw className="h-4 w-4 mr-2" /> Clear
              </Button>
            </div>

            {/* Gym Selector */}
            <div>
              <Label>Gym (Optional)</Label>
              <Select value={selectedGymId} onValueChange={setSelectedGymId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a gym to auto-load logo" />
                </SelectTrigger>
                <SelectContent>
                  {gyms.map(gym => (
                    <SelectItem key={gym.id} value={gym.id}>{gym.name} ({gym.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination Type */}
            <div>
              <Label>Destination Type (Optional)</Label>
              <Select value={destinationType} onValueChange={setDestinationType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="e.g. Classes, Waiver, Login..." />
                </SelectTrigger>
                <SelectContent>
                  {DESTINATION_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="logo">Logo (Optional)</Label>
              <div className="space-y-2 mt-1">
                <Input id="logo" type="file" accept="image/*" onChange={handleSingleLogoUpload} />
                {singleLogo && (
                  <div className="flex items-center gap-2">
                    <img src={singleLogo.preview} alt={singleLogo.name} className="w-16 h-16 rounded object-cover border-2 border-border" />
                    <Button variant="ghost" size="sm" onClick={() => setSingleLogo(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="title">Title (optional)</Label>
              <Input id="title" placeholder="My QR Code" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showSingleLabel">Show label on image</Label>
              <Switch id="showSingleLabel" checked={showSingleLabel} onCheckedChange={setShowSingleLabel} />
            </div>

            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea id="content" placeholder="Enter URL, text, or any content..." value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? "Generating..." : "Generate QR Code"}
            </Button>
          </Card>

          <Card className="p-6 flex flex-col items-center justify-center space-y-4">
            {qrImage ? (
              <>
                <img src={qrImage} alt="Generated QR Code" className="w-full max-w-sm rounded-lg border" />
                <div className="flex gap-2 w-full max-w-sm">
                  <Button onClick={handleDownload} variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                  <Button onClick={handleSave} className="flex-1">
                    <Save className="h-4 w-4 mr-2" /> Save
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground">
                <QrCode className="h-24 w-24 mx-auto mb-4 opacity-20" />
                <p>Your QR code will appear here</p>
              </div>
            )}
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="bulk">
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="text-sm text-muted-foreground">
                {bulkLogos.length} logo{bulkLogos.length !== 1 ? 's' : ''} • {generatedQRs.length} QR{generatedQRs.length !== 1 ? 's' : ''} generated
              </div>
              <Button variant="ghost" size="sm" onClick={clearBulkSession}>
                <RefreshCw className="h-4 w-4 mr-2" /> Clear
              </Button>
            </div>

            <div>
              <Label htmlFor="bulkLogo">Gym Logos (Optional) — Smart Matching</Label>
              <div className="space-y-2 mt-1">
                <Input id="bulkLogo" type="file" accept="image/*" multiple onChange={handleBulkLogoUpload} />
                {bulkLogos.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{bulkLogos.length} logo{bulkLogos.length > 1 ? 's' : ''}</p>
                      <Button variant="ghost" size="sm" onClick={() => setBulkLogos([])}>Clear All</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {bulkLogos.map((logo, index) => (
                        <div key={index} className="relative group">
                          <img src={logo.preview} alt={logo.name} className="w-14 h-14 rounded object-cover border border-border" title={logo.name} />
                          <Button variant="destructive" size="sm"
                            className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setBulkLogos(prev => prev.filter((_, i) => i !== index))}>×</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Logos auto-match gym names by filename</p>
            </div>

            <div>
              <Label htmlFor="batchTitle">Batch Title *</Label>
              <Input id="batchTitle" placeholder="Gift Certificates December 2024" value={batchTitle} onChange={(e) => setBatchTitle(e.target.value)} className="mt-1" />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showBulkLabel">Show label on image</Label>
              <Switch id="showBulkLabel" checked={showBulkLabel} onCheckedChange={setShowBulkLabel} />
            </div>

            <div>
              <Label htmlFor="bulkContent">Bulk Content *</Label>
              <p className="text-xs text-muted-foreground mb-1">Supports: "Name - URL", "Name: URL", name + URL on separate lines</p>
              <Textarea id="bulkContent" placeholder={"Gym Name\nhttps://example.com/login\n\nAnother Gym: https://example.com/waiver"} value={bulkContent} onChange={(e) => setBulkContent(e.target.value)} rows={10} />
            </div>

            {/* Parse Preview */}
            {parsedPreview.length >= 2 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {parsedPreview.length} entries detected
                  {mismatchCount > 0 && (
                    <span className="text-yellow-600 ml-2">({mismatchCount} potential mismatch{mismatchCount > 1 ? 'es' : ''})</span>
                  )}
                </p>
                <div className="max-h-60 overflow-y-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left w-8">#</th>
                        <th className="px-2 py-1 text-left">Label</th>
                        <th className="px-2 py-1 text-left">URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPreview.map((entry, i) => {
                        const isMismatch = checkMismatch(entry.label, entry.content);
                        return (
                          <tr key={i} className={isMismatch ? "bg-yellow-500/10" : ""}>
                            <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                            <td className="px-2 py-1">
                              <div className="flex items-center gap-1">
                                {isMismatch && <AlertTriangle className="h-3 w-3 text-yellow-600 shrink-0" />}
                                {entry.label ? (
                                  <div><div className="font-medium">{entry.label}</div>
                                    {entry.sublabel && <div className="text-muted-foreground">{entry.sublabel}</div>}
                                  </div>
                                ) : <span className="text-muted-foreground italic">No label</span>}
                              </div>
                            </td>
                            <td className="px-2 py-1 text-muted-foreground truncate max-w-[200px]">{entry.content}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Button onClick={handleBulkGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? "Generating..." : "Generate All QR Codes"}
            </Button>
          </Card>

          {generatedQRs.length > 0 && (
            <>
              <div className="flex gap-2">
                <Button onClick={handleDownloadAll} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" /> Download All ({generatedQRs.length})
                </Button>
                <Button onClick={handleSaveAll} disabled={isGenerating} className="flex-1">
                  <Save className="h-4 w-4 mr-2" /> Save All as Batch
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedQRs.map((qr, index) => (
                  <Card key={index} className="p-4 space-y-3">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{qr.title || `QR #${index + 1}`}</div>
                      {qr.sublabel && <div className="text-xs text-muted-foreground">{qr.sublabel}</div>}
                    </div>
                    <img src={qr.imageUrl} alt={qr.title || `QR Code ${index + 1}`} className="w-full rounded-lg border" />
                    <p className="text-xs text-muted-foreground break-all line-clamp-2">{qr.content}</p>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};
