import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Grid3x3, List, CheckSquare, X } from "lucide-react";

interface AssetFilterBarProps {
  groupBy: 'gym' | 'type' | 'none';
  setGroupBy: (groupBy: 'gym' | 'type' | 'none') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

export function AssetFilterBar({
  groupBy,
  setGroupBy,
  searchQuery,
  setSearchQuery,
  selectedCount,
  onSelectAll,
  onClearSelection,
}: AssetFilterBarProps) {
  return (
    <div 
      className="flex items-center justify-between gap-4 mb-6 flex-wrap p-3 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.08), hsl(var(--brand-blue-gray) / 0.08))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 8px rgba(0,0,0,0.04)'
      }}
    >
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by filename..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white/80 border-white/50 shadow-sm"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Group By */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap font-medium">Group by:</span>
        <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
          <SelectTrigger className="w-[160px] bg-white/80 border-white/50 shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gym">
              <div className="flex items-center gap-2">
                <Grid3x3 className="h-4 w-4" />
                Gym
              </div>
            </SelectItem>
            <SelectItem value="type">
              <div className="flex items-center gap-2">
                <Grid3x3 className="h-4 w-4" />
                File Type
              </div>
            </SelectItem>
            <SelectItem value="none">
              <div className="flex items-center gap-2">
                <List className="h-4 w-4" />
                No Grouping
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Selection Actions */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          onClick={onSelectAll}
          className="bg-white/80 border-white/50 shadow-sm hover:bg-white"
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          Select All
        </Button>
        
        {selectedCount > 0 && (
          <Button 
            onClick={onClearSelection}
            style={{
              background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))',
              boxShadow: '0 4px 12px hsl(var(--brand-rose-gold) / 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
            className="text-white"
          >
            <X className="h-4 w-4 mr-2" />
            Clear ({selectedCount})
          </Button>
        )}
      </div>
    </div>
  );
}