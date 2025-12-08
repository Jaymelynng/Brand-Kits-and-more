import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssetPreview } from "@/components/AssetPreview";
import { CampaignAsset } from "@/hooks/useCampaignAssets";
import { Download, Link2, Share2, Edit, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface AssetDetailModalProps {
  asset: CampaignAsset | null;
  onClose: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  campaignId?: string;
  onSetAsThumbnail?: () => void;
  isCurrentThumbnail?: boolean;
}

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export function AssetDetailModal({ 
  asset, 
  onClose, 
  onEdit, 
  onShare, 
  onDelete,
  campaignId,
  onSetAsThumbnail,
  isCurrentThumbnail
}: AssetDetailModalProps) {
  if (!asset) return null;

  const copyUrl = () => {
    navigator.clipboard.writeText(asset.file_url);
    toast.success("URL copied to clipboard!");
  };

  const isImage = asset.file_type.startsWith('image/');

  return (
    <Dialog open={!!asset} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl truncate">{asset.filename}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Left: Preview */}
          <div className="flex-1 bg-muted rounded-lg p-4 flex items-center justify-center overflow-auto">
            <AssetPreview asset={asset} />
          </div>
          
          {/* Right: Metadata & Actions */}
          <div className="w-80 flex flex-col gap-4 overflow-auto">
            <div className="space-y-2">
              <h3 className="font-semibold">Details</h3>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Type:</span> {asset.file_type}</p>
                <p><span className="text-muted-foreground">Size:</span> {formatFileSize(asset.file_size)}</p>
                <p><span className="text-muted-foreground">Gym:</span> {asset.gym?.name || 'Admin Resource'}</p>
                <p><span className="text-muted-foreground">Category:</span> {asset.asset_category}</p>
                <p><span className="text-muted-foreground">Uploaded:</span> {new Date(asset.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">File URL</h3>
              <input 
                readOnly 
                value={asset.file_url} 
                className="w-full text-xs p-2 bg-muted rounded border"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button size="sm" variant="outline" className="w-full" onClick={copyUrl}>
                <Link2 className="h-4 w-4 mr-2" />
                Copy URL
              </Button>
            </div>
            
            <div className="flex flex-col gap-2 mt-auto">
              {/* Set as Thumbnail button - only for images */}
              {isImage && campaignId && onSetAsThumbnail && (
                <Button 
                  onClick={onSetAsThumbnail} 
                  variant={isCurrentThumbnail ? "secondary" : "outline"}
                  disabled={isCurrentThumbnail}
                  className={isCurrentThumbnail ? "bg-green-100 border-green-300 text-green-700" : ""}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {isCurrentThumbnail ? "Current Thumbnail" : "Set as Thumbnail"}
                </Button>
              )}
              <Button onClick={onEdit} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
              <Button onClick={onShare} variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button asChild variant="outline">
                <a href={asset.file_url} download={asset.filename}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
              <Button onClick={onDelete} variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
