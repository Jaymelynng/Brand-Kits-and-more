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
  const cardStyle = (color: string, shadowColor: string) => ({
    background: `linear-gradient(135deg, ${color}15, ${color}08)`,
    boxShadow: `0 4px 15px ${shadowColor}, inset 0 1px 0 rgba(255,255,255,0.8)`,
    border: `1px solid ${color}20`,
  });

  return (
    <div className="flex gap-3 mb-4 flex-wrap">
      <Card 
        className="cursor-pointer hover:scale-105 transition-all flex-1 min-w-[140px] border-0"
        style={cardStyle('hsl(var(--brand-rose-gold))', 'hsl(var(--brand-rose-gold) / 0.15)')}
        onClick={() => onFilterClick('all')}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))',
              boxShadow: '0 4px 12px hsl(var(--brand-rose-gold) / 0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
            }}
          >
            <File className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Total</p>
            <p className="text-2xl font-bold">{total}</p>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:scale-105 transition-all flex-1 min-w-[140px] border-0"
        style={cardStyle('#ef4444', 'rgba(239, 68, 68, 0.15)')}
        onClick={() => onFilterClick('video')}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
            }}
          >
            <Video className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Videos</p>
            <p className="text-2xl font-bold">{videos}</p>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:scale-105 transition-all flex-1 min-w-[140px] border-0"
        style={cardStyle('#3b82f6', 'rgba(59, 130, 246, 0.15)')}
        onClick={() => onFilterClick('image')}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
            }}
          >
            <FileImage className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Images</p>
            <p className="text-2xl font-bold">{images}</p>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:scale-105 transition-all flex-1 min-w-[140px] border-0"
        style={cardStyle('#22c55e', 'rgba(34, 197, 94, 0.15)')}
        onClick={() => onFilterClick('document')}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
            }}
          >
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Documents</p>
            <p className="text-2xl font-bold">{documents}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}