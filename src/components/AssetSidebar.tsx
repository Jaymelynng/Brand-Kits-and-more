import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Video, FileImage, FileText, File, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetSidebarProps {
  fileTypeFilter: 'all' | 'video' | 'image' | 'document' | 'other';
  setFileTypeFilter: (filter: 'all' | 'video' | 'image' | 'document' | 'other') => void;
  gymFilter: string | null;
  setGymFilter: (gymId: string | null) => void;
  assetCounts: {
    all: number;
    videos: number;
    images: number;
    documents: number;
    other: number;
  };
  gymCounts: Record<string, number>;
  adminCount: number;
  gyms: Array<{ id: string; name: string; code: string }>;
}

export function AssetSidebar({
  fileTypeFilter,
  setFileTypeFilter,
  gymFilter,
  setGymFilter,
  assetCounts,
  gymCounts,
  adminCount,
  gyms,
}: AssetSidebarProps) {
  return (
    <Card className="h-full border-r rounded-none">
      <ScrollArea className="h-full">
        <CardContent className="p-4 space-y-6">
          {/* File Type Filters */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">File Types</h3>
            <div className="space-y-1">
              <Button
                variant={fileTypeFilter === 'all' ? 'secondary' : 'ghost'}
                className="w-full justify-between"
                onClick={() => setFileTypeFilter('all')}
              >
                <span className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  All Assets
                </span>
                <Badge variant="outline">{assetCounts.all}</Badge>
              </Button>
              <Button
                variant={fileTypeFilter === 'video' ? 'secondary' : 'ghost'}
                className="w-full justify-between"
                onClick={() => setFileTypeFilter('video')}
              >
                <span className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Videos
                </span>
                <Badge variant="outline">{assetCounts.videos}</Badge>
              </Button>
              <Button
                variant={fileTypeFilter === 'image' ? 'secondary' : 'ghost'}
                className="w-full justify-between"
                onClick={() => setFileTypeFilter('image')}
              >
                <span className="flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  Images
                </span>
                <Badge variant="outline">{assetCounts.images}</Badge>
              </Button>
              <Button
                variant={fileTypeFilter === 'document' ? 'secondary' : 'ghost'}
                className="w-full justify-between"
                onClick={() => setFileTypeFilter('document')}
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </span>
                <Badge variant="outline">{assetCounts.documents}</Badge>
              </Button>
              <Button
                variant={fileTypeFilter === 'other' ? 'secondary' : 'ghost'}
                className="w-full justify-between"
                onClick={() => setFileTypeFilter('other')}
              >
                <span className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  Other
                </span>
                <Badge variant="outline">{assetCounts.other}</Badge>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Gym Filters */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Gyms</h3>
            <div className="space-y-1">
              <Button
                variant={gymFilter === null ? 'secondary' : 'ghost'}
                className="w-full justify-between"
                onClick={() => setGymFilter(null)}
              >
                <span>All Gyms</span>
                <Badge variant="outline">{assetCounts.all}</Badge>
              </Button>
              <Button
                variant={gymFilter === 'admin' ? 'secondary' : 'ghost'}
                className="w-full justify-between"
                onClick={() => setGymFilter('admin')}
              >
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin Resources
                </span>
                <Badge variant="outline">{adminCount}</Badge>
              </Button>
              {gyms.map((gym) => (
                <Button
                  key={gym.id}
                  variant={gymFilter === gym.id ? 'secondary' : 'ghost'}
                  className={cn(
                    "w-full justify-between text-left",
                    gymFilter === gym.id && "bg-secondary"
                  )}
                  onClick={() => setGymFilter(gym.id)}
                >
                  <span className="truncate">{gym.name}</span>
                  <Badge variant="outline">{gymCounts[gym.id] || 0}</Badge>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
