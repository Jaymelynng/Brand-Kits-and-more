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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary"
        onClick={() => onFilterClick('all')}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Assets</p>
              <p className="text-3xl font-bold mt-2">{total}</p>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <File className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-destructive"
        onClick={() => onFilterClick('video')}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Videos</p>
              <p className="text-3xl font-bold mt-2">{videos}</p>
            </div>
            <div className="h-12 w-12 bg-destructive/10 rounded-lg flex items-center justify-center">
              <Video className="h-6 w-6 text-destructive" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-500"
        onClick={() => onFilterClick('image')}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Images</p>
              <p className="text-3xl font-bold mt-2">{images}</p>
            </div>
            <div className="h-12 w-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <FileImage className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-green-500"
        onClick={() => onFilterClick('document')}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Documents</p>
              <p className="text-3xl font-bold mt-2">{documents}</p>
            </div>
            <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
