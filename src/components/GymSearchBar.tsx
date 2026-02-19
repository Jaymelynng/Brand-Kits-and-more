import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GymSearchBarProps {
  onSearch: (query: string) => void;
  resultCount: number;
  totalCount: number;
}

export const GymSearchBar = ({ onSearch, resultCount, totalCount }: GymSearchBarProps) => {
  const [query, setQuery] = useState("");

  const handleChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const isFiltered = query.length > 0;

  return (
    <div className="relative max-w-md mx-auto mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search gyms by name or code..."
          className="pl-10 pr-20 bg-white/90 backdrop-blur-sm border-2 shadow-lg font-medium"
          style={{ borderColor: 'hsl(var(--brand-rose-gold) / 0.3)' }}
        />
        {isFiltered && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ 
              backgroundColor: 'hsl(var(--brand-rose-gold) / 0.15)', 
              color: 'hsl(var(--brand-navy))' 
            }}>
              {resultCount}/{totalCount}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleChange("")}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
