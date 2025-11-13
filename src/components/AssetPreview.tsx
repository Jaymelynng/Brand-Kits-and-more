import { FileText, File } from "lucide-react";
import { CampaignAsset } from "@/hooks/useCampaignAssets";

interface AssetPreviewProps {
  asset: CampaignAsset;
  className?: string;
}

export function AssetPreview({ asset, className = "" }: AssetPreviewProps) {
  if (asset.file_type.startsWith('video/')) {
    return (
      <video controls className={`w-full h-full object-contain ${className}`}>
        <source src={asset.file_url} type={asset.file_type} />
        Your browser does not support the video tag.
      </video>
    );
  }

  if (asset.file_type.startsWith('image/')) {
    return (
      <img 
        src={asset.file_url} 
        alt={asset.filename} 
        className={`w-full h-full object-contain ${className}`}
      />
    );
  }

  if (asset.file_type === 'application/pdf') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <FileText className="w-12 h-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">PDF Document</p>
        <p className="text-xs text-muted-foreground truncate max-w-full px-4">
          {asset.filename}
        </p>
      </div>
    );
  }

  // Generic file preview
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <File className="w-12 h-12 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{asset.file_type}</p>
      <p className="text-xs text-muted-foreground truncate max-w-full px-4">
        {asset.filename}
      </p>
    </div>
  );
}
