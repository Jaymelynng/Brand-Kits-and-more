import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  getScannedQRHistory,
  getGeneratedQRHistory,
  deleteQRScan,
  deleteGeneratedQR,
  deleteBatch,
} from "@/services/qrService";
import { ExternalLink, Trash2, Copy, ChevronDown, ChevronRight, Layers, Search, Download } from "lucide-react";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";

interface GeneratedQR {
  id: string;
  content: string;
  qr_type: string;
  qr_image_url: string;
  title?: string;
  batch_id?: string;
  batch_name?: string;
  destination_type?: string;
  created_at: string;
}

interface BatchGroup {
  batchId: string | null;
  batchName: string;
  qrCodes: GeneratedQR[];
  createdAt: string;
}

export const QRLibrary = () => {
  const [scannedQRs, setScannedQRs] = useState<any[]>([]);
  const [generatedQRs, setGeneratedQRs] = useState<GeneratedQR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openBatches, setOpenBatches] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const [scanned, generated] = await Promise.all([getScannedQRHistory(), getGeneratedQRHistory()]);
      setScannedQRs(scanned || []);
      setGeneratedQRs((generated || []) as GeneratedQR[]);
    } catch {
      toast({ title: "Error loading history", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const groupByBatch = (qrCodes: GeneratedQR[]): BatchGroup[] => {
    const batches = new Map<string, BatchGroup>();
    qrCodes.forEach(qr => {
      const key = qr.batch_id || `single-${qr.id}`;
      if (!batches.has(key)) {
        batches.set(key, { batchId: qr.batch_id || null, batchName: qr.batch_name || qr.title || 'Single QR Code', qrCodes: [], createdAt: qr.created_at });
      }
      batches.get(key)!.qrCodes.push(qr);
    });
    return Array.from(batches.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isThisWeek(date)) return "This Week";
    return format(date, "MMM d, yyyy");
  };

  const toggleBatch = (batchKey: string) => {
    const newOpen = new Set(openBatches);
    newOpen.has(batchKey) ? newOpen.delete(batchKey) : newOpen.add(batchKey);
    setOpenBatches(newOpen);
  };

  const handleDeleteScan = async (id: string) => {
    try {
      await deleteQRScan(id);
      setScannedQRs(scannedQRs.filter(qr => qr.id !== id));
      toast({ title: "Deleted" });
    } catch { toast({ title: "Error deleting", variant: "destructive" }); }
  };

  const handleDeleteGenerated = async (id: string) => {
    try {
      await deleteGeneratedQR(id);
      setGeneratedQRs(generatedQRs.filter(qr => qr.id !== id));
      toast({ title: "Deleted" });
    } catch { toast({ title: "Error deleting", variant: "destructive" }); }
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      await deleteBatch(batchId);
      setGeneratedQRs(generatedQRs.filter(qr => qr.batch_id !== batchId));
      toast({ title: "Batch deleted" });
    } catch { toast({ title: "Error deleting batch", variant: "destructive" }); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  const filteredGenerated = generatedQRs.filter(qr => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (qr.title?.toLowerCase().includes(q) || qr.content.toLowerCase().includes(q) || qr.batch_name?.toLowerCase().includes(q));
  });

  const filteredScanned = scannedQRs.filter(qr => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (qr.qr_data?.toLowerCase().includes(q) || qr.file_name?.toLowerCase().includes(q));
  });

  if (isLoading) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Loading library...</p></div>;
  }

  const batchGroups = groupByBatch(filteredGenerated);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search QR codes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      <Tabs defaultValue="generated">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generated">Generated ({filteredGenerated.length})</TabsTrigger>
          <TabsTrigger value="scanned">Scanned ({filteredScanned.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="generated" className="space-y-4">
          {batchGroups.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No generated QR codes yet</p></Card>
          ) : (
            <div className="space-y-3">
              {batchGroups.map((batch) => {
                const batchKey = batch.batchId || batch.qrCodes[0].id;
                const isOpen = openBatches.has(batchKey);
                const isSingleQR = !batch.batchId;

                if (isSingleQR) {
                  const qr = batch.qrCodes[0];
                  return (
                    <Card key={qr.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <img src={qr.qr_image_url} alt="QR Code" className="w-24 h-24 rounded-lg border shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {qr.title && <h3 className="font-semibold">{qr.title}</h3>}
                            <Badge variant="secondary">{qr.qr_type}</Badge>
                            {qr.destination_type && <Badge variant="outline">{qr.destination_type}</Badge>}
                            <span className="text-xs text-muted-foreground">{getDateLabel(qr.created_at)}</span>
                          </div>
                          <p className="text-sm font-mono break-all text-muted-foreground line-clamp-2">{qr.content}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(qr.content)}><Copy className="h-4 w-4" /></Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            const link = document.createElement("a");
                            link.download = `${qr.title || "qr-code"}.png`;
                            link.href = qr.qr_image_url;
                            link.click();
                          }}><Download className="h-4 w-4" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteGenerated(qr.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </Card>
                  );
                }

                return (
                  <Collapsible key={batchKey} open={isOpen}>
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors" onClick={() => toggleBatch(batchKey)}>
                          <div className="flex items-center gap-3">
                            {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                            <Layers className="h-5 w-5 text-primary" />
                            <div className="text-left">
                              <h3 className="font-semibold">{batch.batchName}</h3>
                              <p className="text-sm text-muted-foreground">{batch.qrCodes.length} QR codes • {getDateLabel(batch.createdAt)}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch.batchId!); }}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Batch
                          </Button>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-border p-4">
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {batch.qrCodes.map((qr) => (
                              <Card key={qr.id} className="p-3 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="text-sm font-medium truncate">{qr.title || 'QR Code'}</div>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleDeleteGenerated(qr.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                                <img src={qr.qr_image_url} alt="QR Code" className="w-full rounded-lg border" />
                                <p className="text-xs text-muted-foreground break-all line-clamp-2">{qr.content}</p>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => copyToClipboard(qr.content)}>
                                    <Copy className="h-3 w-3 mr-1" /> Copy
                                  </Button>
                                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => {
                                    const link = document.createElement("a");
                                    link.download = `${qr.title || "qr-code"}.png`;
                                    link.href = qr.qr_image_url;
                                    link.click();
                                  }}>Download</Button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scanned" className="space-y-4">
          {filteredScanned.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No scanned QR codes yet</p></Card>
          ) : (
            <div className="grid gap-4">
              {filteredScanned.map((qr: any) => (
                <Card key={qr.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{qr.qr_type}</Badge>
                        <span className="text-xs text-muted-foreground">{getDateLabel(qr.created_at)}</span>
                      </div>
                      <p className="text-sm font-mono break-all mb-2">{qr.qr_data}</p>
                      <p className="text-xs text-muted-foreground">From: {qr.file_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(qr.qr_data)}><Copy className="h-4 w-4" /></Button>
                      {qr.is_url && <Button size="sm" variant="outline" onClick={() => window.open(qr.qr_data, "_blank")}><ExternalLink className="h-4 w-4" /></Button>}
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteScan(qr.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
