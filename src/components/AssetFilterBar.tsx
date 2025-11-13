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
    <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by filename..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
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
        <span className="text-sm text-muted-foreground whitespace-nowrap">Group by:</span>
        <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
          <SelectTrigger className="w-[160px]">
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
        {selectedCount === 0 ? (
          <Button variant="outline" onClick={onSelectAll}>
            <CheckSquare className="h-4 w-4 mr-2" />
            Select All
          </Button>
        ) : (
          <Button variant="outline" onClick={onClearSelection}>
            <X className="h-4 w-4 mr-2" />
            Clear ({selectedCount})
          </Button>
        )}
      </div>
    </div>
  );
}
