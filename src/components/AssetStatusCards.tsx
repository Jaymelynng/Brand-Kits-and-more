import { Card, CardContent } from "@/components/ui/card";
import { Video, FileImage, FileText, File } from "lucide-react";

interface AssetStatusCardsProps {
  total: number;
  videos: number;
  images: number;
  documents: number;
  onFilterClick: (filter: 'all' | 'video' | 'image' | 'document') => void;
}

export function AssetStatusCards({
  total,
  videos,
  images,
  documents,
  onFilterClick,
}: AssetStatusCardsProps) {
  return (
    <div className="flex gap-2 mb-3 flex-wrap">
      <Card 
        className="cursor-pointer hover:shadow-md transition-all flex-1 min-w-[120px]"
        onClick={() => onFilterClick('all')}
      >
        <CardContent className="p-2 flex items-center gap-2">
          <div className="h-6 w-6 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
            <File className="h-3 w-3 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Total</p>
            <p className="text-lg font-bold">{total}</p>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-md transition-all flex-1 min-w-[120px]"
        onClick={() => onFilterClick('video')}
      >
        <CardContent className="p-2 flex items-center gap-2">
          <div className="h-6 w-6 bg-destructive/10 rounded flex items-center justify-center flex-shrink-0">
            <Video className="h-3 w-3 text-destructive" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Videos</p>
            <p className="text-lg font-bold">{videos}</p>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-md transition-all flex-1 min-w-[120px]"
        onClick={() => onFilterClick('image')}
      >
        <CardContent className="p-2 flex items-center gap-2">
          <div className="h-6 w-6 bg-blue-500/10 rounded flex items-center justify-center flex-shrink-0">
            <FileImage className="h-3 w-3 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Images</p>
            <p className="text-lg font-bold">{images}</p>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-md transition-all flex-1 min-w-[120px]"
        onClick={() => onFilterClick('document')}
      >
        <CardContent className="p-2 flex items-center gap-2">
          <div className="h-6 w-6 bg-green-500/10 rounded flex items-center justify-center flex-shrink-0">
            <FileText className="h-3 w-3 text-green-500" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Documents</p>
            <p className="text-lg font-bold">{documents}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
