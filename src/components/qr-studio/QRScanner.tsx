import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { scanQRCode, QRCode } from "@/utils/qrScanner";
import { saveScannedQR } from "@/services/qrService";
import { Upload, ScanLine, Copy, ExternalLink, FileImage } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface ImageResult {
  fileName: string;
  preview: string;
  qrCodes: QRCode[];
}

export const QRScanner = () => {
  const [results, setResults] = useState<ImageResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    setResults([]);

    try {
      const allResults: ImageResult[] = [];
      let totalQRCodes = 0;

      for (const file of files) {
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        try {
          const qrCodes = await scanQRCode(file);
          totalQRCodes += qrCodes.length;
          
          await Promise.all(
            qrCodes.map(async (qrCode) => {
              try {
                await saveScannedQR({
                  fileName: file.name,
                  qrData: qrCode.data,
                  isUrl: qrCode.data.startsWith('http://') || qrCode.data.startsWith('https://'),
                  previewImage: preview,
                });
              } catch (error) {
                console.error('Failed to save QR scan:', error);
              }
            })
          );

          allResults.push({ fileName: file.name, preview, qrCodes });
        } catch (error) {
          allResults.push({ fileName: file.name, preview, qrCodes: [] });
        }
      }

      setResults(allResults);
      if (totalQRCodes === 0) {
        toast({ title: "No QR codes found", description: "Try uploading a clearer image", variant: "destructive" });
      } else {
        toast({ title: "Success", description: `Found ${totalQRCodes} QR code${totalQRCodes > 1 ? 's' : ''}` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to process images", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) processFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Content copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card
        {...getRootProps()}
        className={`p-12 border-2 border-dashed cursor-pointer transition-colors text-center ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Processing images...</p>
            </>
          ) : (
            <>
              <div className="p-3 rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Drop images here or click to upload</p>
                <p className="text-sm text-muted-foreground mt-1">Supports multiple images with multiple QR codes each</p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Results */}
      {results.map((result, idx) => (
        <Card key={idx} className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileImage className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{result.fileName}</h3>
            <Badge variant="secondary">
              {result.qrCodes.length} QR{result.qrCodes.length !== 1 ? 's' : ''} found
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <img
                src={result.preview}
                alt={result.fileName}
                className="w-full rounded-lg border border-border"
              />
            </div>
            <div className="space-y-3">
              {result.qrCodes.length > 0 ? (
                result.qrCodes.map((code, codeIdx) => (
                  <div key={codeIdx} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <ScanLine className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">QR #{codeIdx + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        {code.data.startsWith('http') ? 'URL' : 'Text'}
                      </Badge>
                    </div>
                    <p className="text-sm font-mono break-all text-muted-foreground">{code.data}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(code.data)}>
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                      {code.data.startsWith('http') && (
                        <Button size="sm" variant="outline" onClick={() => window.open(code.data, '_blank')}>
                          <ExternalLink className="h-3 w-3 mr-1" /> Open
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                  No QR codes detected in this image
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* Empty State */}
      {results.length === 0 && !isProcessing && (
        <div className="text-center py-12 space-y-3">
          <div className="inline-block p-4 rounded-full bg-muted">
            <ScanLine className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No QR codes scanned yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            Upload images containing QR codes to detect and decode them automatically.
          </p>
        </div>
      )}
    </div>
  );
};
