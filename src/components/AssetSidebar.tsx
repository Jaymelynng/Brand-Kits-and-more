import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Video, FileImage, FileText, File, Shield, Layers } from "lucide-react";
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
  const filterButtonStyle = (isActive: boolean) => ({
    background: isActive 
      ? 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))' 
      : 'transparent',
    color: isActive ? 'white' : undefined,
    boxShadow: isActive 
      ? '0 4px 12px hsl(var(--brand-rose-gold) / 0.3), inset 0 1px 0 rgba(255,255,255,0.2)' 
      : undefined,
  });

  return (
    <div 
      className="h-full border-r-0 rounded-none"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--brand-rose-gold) / 0.15) 0%, hsl(var(--brand-blue-gray) / 0.1) 100%)',
        boxShadow: '4px 0 20px rgba(0,0,0,0.05)'
      }}
    >
      <ScrollArea className="h-full">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div 
            className="p-3 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.3), hsl(var(--brand-blue-gray) / 0.2))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-foreground/70" />
              <span className="font-semibold text-foreground">Asset Filters</span>
            </div>
          </div>

          {/* File Type Filters */}
          <div>
            <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide px-1">File Types</h3>
            <div className="space-y-1.5">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between h-10 rounded-lg transition-all",
                  fileTypeFilter === 'all' && "text-white hover:text-white"
                )}
                style={filterButtonStyle(fileTypeFilter === 'all')}
                onClick={() => setFileTypeFilter('all')}
              >
                <span className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  All Assets
                </span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    fileTypeFilter === 'all' && "border-white/30 text-white bg-white/10"
                  )}
                >
                  {assetCounts.all}
                </Badge>
              </Button>
              
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between h-10 rounded-lg transition-all",
                  fileTypeFilter === 'video' && "text-white hover:text-white"
                )}
                style={filterButtonStyle(fileTypeFilter === 'video')}
                onClick={() => setFileTypeFilter('video')}
              >
                <span className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Videos
                </span>
                <Badge 
                  variant="outline"
                  className={cn(
                    "text-xs",
                    fileTypeFilter === 'video' && "border-white/30 text-white bg-white/10"
                  )}
                >
                  {assetCounts.videos}
                </Badge>
              </Button>
              
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between h-10 rounded-lg transition-all",
                  fileTypeFilter === 'image' && "text-white hover:text-white"
                )}
                style={filterButtonStyle(fileTypeFilter === 'image')}
                onClick={() => setFileTypeFilter('image')}
              >
                <span className="flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  Images
                </span>
                <Badge 
                  variant="outline"
                  className={cn(
                    "text-xs",
                    fileTypeFilter === 'image' && "border-white/30 text-white bg-white/10"
                  )}
                >
                  {assetCounts.images}
                </Badge>
              </Button>
              
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between h-10 rounded-lg transition-all",
                  fileTypeFilter === 'document' && "text-white hover:text-white"
                )}
                style={filterButtonStyle(fileTypeFilter === 'document')}
                onClick={() => setFileTypeFilter('document')}
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </span>
                <Badge 
                  variant="outline"
                  className={cn(
                    "text-xs",
                    fileTypeFilter === 'document' && "border-white/30 text-white bg-white/10"
                  )}
                >
                  {assetCounts.documents}
                </Badge>
              </Button>
              
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between h-10 rounded-lg transition-all",
                  fileTypeFilter === 'other' && "text-white hover:text-white"
                )}
                style={filterButtonStyle(fileTypeFilter === 'other')}
                onClick={() => setFileTypeFilter('other')}
              >
                <span className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  Other
                </span>
                <Badge 
                  variant="outline"
                  className={cn(
                    "text-xs",
                    fileTypeFilter === 'other' && "border-white/30 text-white bg-white/10"
                  )}
                >
                  {assetCounts.other}
                </Badge>
              </Button>
            </div>
          </div>

          <div className="px-2">
            <Separator className="bg-border/50" />
          </div>

          {/* Gym Filters */}
          <div>
            <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide px-1">Gyms</h3>
            <div className="space-y-1.5">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between h-10 rounded-lg transition-all",
                  gymFilter === null && "text-white hover:text-white"
                )}
                style={filterButtonStyle(gymFilter === null)}
                onClick={() => setGymFilter(null)}
              >
                <span>All Gyms</span>
                <Badge 
                  variant="outline"
                  className={cn(
                    "text-xs",
                    gymFilter === null && "border-white/30 text-white bg-white/10"
                  )}
                >
                  {assetCounts.all}
                </Badge>
              </Button>
              
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between h-10 rounded-lg transition-all",
                  gymFilter === 'admin' && "text-white hover:text-white"
                )}
                style={filterButtonStyle(gymFilter === 'admin')}
                onClick={() => setGymFilter('admin')}
              >
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Unassigned
                </span>
                <Badge 
                  variant="outline"
                  className={cn(
                    "text-xs",
                    gymFilter === 'admin' && "border-white/30 text-white bg-white/10"
                  )}
                >
                  {adminCount}
                </Badge>
              </Button>
              
              {gyms.map((gym) => (
                <Button
                  key={gym.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-between h-10 rounded-lg transition-all text-left",
                    gymFilter === gym.id && "text-white hover:text-white"
                  )}
                  style={filterButtonStyle(gymFilter === gym.id)}
                  onClick={() => setGymFilter(gym.id)}
                >
                  <span className="truncate text-sm">{gym.name}</span>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "text-xs flex-shrink-0 ml-2",
                      gymFilter === gym.id && "border-white/30 text-white bg-white/10"
                    )}
                  >
                    {gymCounts[gym.id] || 0}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}