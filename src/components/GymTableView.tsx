import { Link } from "react-router-dom";
import { GymWithColors } from "@/hooks/useGyms";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Copy, Eye, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface GymTableViewProps {
  gyms: GymWithColors[];
  selectedGyms: Set<string>;
  onToggleGymSelection: (gymCode: string) => void;
  onSelectAllGyms: () => void;
  onDeselectAllGyms: () => void;
  onCopySelected: () => void;
}

export const GymTableView = ({
  gyms,
  selectedGyms,
  onToggleGymSelection,
  onSelectAllGyms,
  onDeselectAllGyms,
  onCopySelected,
}: GymTableViewProps) => {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const allSelected = gyms.length > 0 && selectedGyms.size === gyms.length;

  const copyText = (text: string, key: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      toast({ description: message, duration: 1500 });
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  const copyGymColors = (gym: GymWithColors) => {
    const text = `${gym.name} (${gym.code}):\n${gym.colors.map(c => c.color_hex).join('\n')}`;
    copyText(text, `gym-${gym.code}`, `${gym.code} colors copied!`);
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border shadow-lg overflow-hidden" style={{ borderColor: 'hsl(var(--brand-rose-gold) / 0.2)' }}>
      {/* Table Header with Bulk Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{
        background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.12), hsl(var(--brand-blue-gray) / 0.08))',
        borderColor: 'hsl(var(--brand-rose-gold) / 0.2)'
      }}>
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => allSelected ? onDeselectAllGyms() : onSelectAllGyms()}
            className="h-4 w-4"
          />
          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--brand-navy))' }}>
            {selectedGyms.size > 0 ? `${selectedGyms.size} of ${gyms.length} selected` : `${gyms.length} gyms`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedGyms.size > 0 && (
            <>
              <Button
                size="sm"
                onClick={onCopySelected}
                className="text-xs text-white h-7 px-3"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold-mid)))',
                }}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy ({selectedGyms.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDeselectAllGyms}
                className="text-xs h-7 px-3"
              >
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table Rows */}
      <div className="divide-y" style={{ borderColor: 'hsl(var(--brand-rose-gold) / 0.1)' }}>
        {gyms.map((gym) => {
          const isSelected = selectedGyms.has(gym.code);
          const primaryColor = gym.colors[0]?.color_hex || '#6B7280';
          const mainLogo = gym.logos.find(l => l.is_main_logo);

          return (
            <div
              key={gym.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/60 transition-colors"
              style={{ backgroundColor: isSelected ? 'hsl(var(--brand-rose-gold) / 0.06)' : undefined }}
            >
              {/* Checkbox */}
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleGymSelection(gym.code)}
                className="h-4 w-4 flex-shrink-0"
              />

              {/* Logo thumbnail */}
              <div className="w-10 h-10 rounded-lg bg-gray-50 border flex items-center justify-center flex-shrink-0 overflow-hidden">
                {mainLogo ? (
                  <img src={mainLogo.file_url} alt="" className="max-w-full max-h-full object-contain p-0.5" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">No logo</span>
                )}
              </div>

              {/* Gym code badge */}
              <span
                className="text-xs font-bold tracking-wider text-white px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {gym.code}
              </span>

              {/* Gym name */}
              <span className="text-sm font-medium text-foreground truncate min-w-0 flex-shrink" style={{ minWidth: '80px' }}>
                {gym.name}
              </span>

              {/* Color dots */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {gym.colors.map((color) => (
                  <button
                    key={color.id}
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform cursor-pointer"
                    style={{ backgroundColor: color.color_hex }}
                    onClick={() => copyText(color.color_hex, color.id, `Copied ${color.color_hex}!`)}
                    title={`Click to copy ${color.color_hex}`}
                  />
                ))}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => copyGymColors(gym)}
                  title="Copy all colors"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                {mainLogo && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = mainLogo.file_url;
                      link.download = mainLogo.filename;
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    title="Download main logo"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                )}
                <Link to={`/gym/${gym.code}`}>
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs text-white"
                    style={{ backgroundColor: primaryColor }}
                    title="View profile"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
