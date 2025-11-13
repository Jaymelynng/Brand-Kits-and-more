import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CampaignAsset } from "@/hooks/useCampaignAssets";
import { Copy, Mail, QrCode } from "lucide-react";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface AssetShareModalProps {
  asset: CampaignAsset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetShareModal({ asset, open, onOpenChange }: AssetShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, asset.file_url, {
        width: 200,
        margin: 2,
      });
    }
  }, [open, asset.file_url]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(asset.file_url);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Asset: ${asset.filename}`);
    const body = encodeURIComponent(`Check out this asset:\n\n${asset.file_url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Asset</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Asset Preview */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="w-16 h-16 bg-background rounded flex items-center justify-center overflow-hidden flex-shrink-0">
              {asset.file_type.startsWith('image/') ? (
                <img src={asset.file_url} alt={asset.filename} className="w-full h-full object-cover" />
              ) : (
                <div className="text-2xl">📄</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{asset.filename}</p>
              {asset.gym && (
                <p className="text-sm text-muted-foreground">
                  {asset.gym.name} ({asset.gym.code})
                </p>
              )}
            </div>
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            <Label>Asset URL</Label>
            <div className="flex gap-2">
              <Input
                value={asset.file_url}
                readOnly
                className="font-mono text-xs"
              />
              <Button size="icon" variant="outline" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </Label>
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <canvas ref={canvasRef} />
            </div>
          </div>

          {/* Share Actions */}
          <div className="space-y-2">
            <Label>Share via</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={copyToClipboard} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" onClick={shareViaEmail} className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
