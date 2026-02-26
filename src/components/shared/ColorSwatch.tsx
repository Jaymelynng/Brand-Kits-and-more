import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface ColorSwatchProps {
  color: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'row' | 'cell';
  showControls?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  editMode?: boolean;
  className?: string;
}

export const ColorSwatch = ({ 
  color, 
  label, 
  size = 'md', 
  layout = 'row',
  showControls = false, 
  onEdit, 
  onDelete,
  editMode = false,
  className 
}: ColorSwatchProps) => {
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14', 
    lg: 'w-20 h-20'
  };

  const copyColor = (colorCode: string, includeHash: boolean = true) => {
    const textToCopy = includeHash ? colorCode : colorCode.replace('#', '');
    navigator.clipboard.writeText(textToCopy).then(() => {
      const message = includeHash ? 'Copied with #!' : 'Copied HEX!';
      setCopied(includeHash ? 'hash' : 'hex');
      toast({ description: message, duration: 2000 });
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // Helper to detect light colors
  const isLightColor = (hex: string) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 200;
  };

  if (layout === 'cell') {
    const light = isLightColor(color);
    const SWATCH = 88; // px — single source of truth for tile geometry
    return (
      <div className={cn(
        "flex flex-col items-center gap-1.5 p-2.5 rounded-lg border bg-card/50 relative",
        "border-border/60",
        className
      )}>
        {/* Color swatch */}
        <div 
          className={cn(
            "rounded-md cursor-pointer transition-all hover:scale-[1.03]",
            editMode && "hover:ring-2 hover:ring-gym-primary"
          )}
          style={{ 
            width: SWATCH, height: SWATCH,
            backgroundColor: color,
            boxShadow: `0 3px 8px ${color}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
            border: light ? '1.5px solid rgba(0,0,0,0.18)' : '1.5px solid rgba(255,255,255,0.3)'
          }}
          onClick={editMode ? onEdit : () => copyColor(color)}
          title={editMode ? "Click to edit color" : "Click to copy color"}
        />
        
        {/* Hex code */}
        <div className="font-mono text-[11px] font-bold text-foreground select-all leading-none">
          {color}
        </div>
        
        {/* Label */}
        {label && (
          <div className="text-[10px] text-muted-foreground font-medium leading-none text-center">
            {label}
          </div>
        )}

        {/* Copy buttons */}
        {showControls && (
          <div className="grid grid-cols-2 gap-1 mx-auto" style={{ width: SWATCH }}>
            <button
              onClick={() => copyColor(color, true)}
              className={cn(
                "h-7 px-0 text-[11px] font-bold rounded transition-all duration-150 active:translate-y-[1px] leading-none cursor-pointer",
                copied === 'hash' ? "text-white" : "text-foreground"
              )}
              style={{
                background: copied === 'hash' 
                  ? `linear-gradient(to bottom, ${color}, color-mix(in srgb, ${color} 70%, black))` 
                  : 'linear-gradient(to bottom, #f5f5f5, #ddd)',
                border: '1px solid rgba(0,0,0,0.12)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
              title="Copy with #"
            >
              #
            </button>
            <button
              onClick={() => copyColor(color, false)}
              className={cn(
                "h-7 px-0 text-[11px] font-bold rounded transition-all duration-150 active:translate-y-[1px] leading-none cursor-pointer",
                copied === 'hex' ? "text-white" : "text-foreground"
              )}
              style={{
                background: copied === 'hex' 
                  ? `linear-gradient(to bottom, ${color}, color-mix(in srgb, ${color} 70%, black))` 
                  : 'linear-gradient(to bottom, #f5f5f5, #ddd)',
                border: '1px solid rgba(0,0,0,0.12)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
              title="Copy without #"
            >
              HEX
            </button>
          </div>
        )}

        {/* Delete button in edit mode */}
        {editMode && onDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute -top-1.5 -right-1.5 p-0 h-5 w-5 text-destructive hover:bg-destructive/10 border-destructive/30 rounded-full"
            title="Remove color"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  // Original row layout
  return (
    <div className={cn("flex items-center gap-2 relative", className)}>
      <div 
        className={cn(
          "rounded-xl flex-shrink-0 cursor-pointer transition-smooth hover:scale-105",
          sizes[size],
          editMode && "cursor-pointer hover:ring-2 hover:ring-gym-primary"
        )}
        style={{ 
          backgroundColor: color,
          boxShadow: `0 3px 8px ${color}55, 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.15)`,
          border: color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff' || color.toLowerCase() === '#fefefe'
            ? '2px solid rgba(0,0,0,0.15)'
            : '2px solid rgba(255,255,255,0.4)'
        }}
        onClick={editMode ? onEdit : () => copyColor(color)}
        title={editMode ? "Click to edit color" : "Click to copy color"}
      />
      
      {(label || showControls) && (
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm font-bold text-foreground select-all">
            {color}
          </div>
          {label && (
            <div className="text-xs text-muted-foreground font-medium">
              {label}
            </div>
          )}
        </div>
      )}

      {showControls && (
        <div className="flex gap-1.5">
          <button
            onClick={() => copyColor(color, true)}
            className={cn(
              "px-3 py-1.5 h-9 text-xs font-bold rounded-lg transition-all duration-150 active:translate-y-[1px]",
              copied === 'hash' 
                ? "text-white" 
                : "text-foreground"
            )}
            style={{
              background: copied === 'hash' 
                ? `linear-gradient(to bottom, ${color}, color-mix(in srgb, ${color} 70%, black))` 
                : 'linear-gradient(to bottom, #ffffff, #e0e0e0)',
              border: copied === 'hash' ? 'none' : '1.5px solid rgba(0,0,0,0.2)',
              boxShadow: copied === 'hash'
                ? `0 3px 6px ${color}55, inset 0 1px 0 rgba(255,255,255,0.3)`
                : '0 3px 6px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(0,0,0,0.08)',
            }}
            title="Copy with #"
          >
            #
          </button>
          <button
            onClick={() => copyColor(color, false)}
            className={cn(
              "px-3 py-1.5 h-9 text-xs font-bold rounded-lg transition-all duration-150 active:translate-y-[1px]",
              copied === 'hex' 
                ? "text-white" 
                : "text-foreground"
            )}
            style={{
              background: copied === 'hex' 
                ? `linear-gradient(to bottom, ${color}, color-mix(in srgb, ${color} 70%, black))` 
                : 'linear-gradient(to bottom, #ffffff, #e0e0e0)',
              border: copied === 'hex' ? 'none' : '1.5px solid rgba(0,0,0,0.2)',
              boxShadow: copied === 'hex'
                ? `0 3px 6px ${color}55, inset 0 1px 0 rgba(255,255,255,0.3)`
                : '0 3px 6px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(0,0,0,0.08)',
            }}
            title="Copy without #"
          >
            HEX
          </button>
        </div>
      )}

      {editMode && onDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="px-1.5 py-1 h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/30 flex-shrink-0"
          title="Remove color"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};
