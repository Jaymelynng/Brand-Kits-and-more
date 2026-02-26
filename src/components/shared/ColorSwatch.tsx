import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface ColorSwatchProps {
  color: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'row' | 'tile';
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
    lg: 'w-16 h-16'
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

  return (
    <div className={cn("flex items-center gap-2 relative", className)}>
      <div 
        className={cn(
          "rounded-xl shadow-md border-2 border-white/30 flex-shrink-0 cursor-pointer transition-smooth hover:scale-105",
          sizes[size],
          editMode && "cursor-pointer hover:ring-2 hover:ring-gym-primary"
        )}
        style={{ backgroundColor: color }}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyColor(color, true)}
            className={cn(
              "px-3 py-1 h-8 text-xs font-bold transition-smooth border-0",
              copied === 'hash' && "!bg-gym-primary !text-white"
            )}
            style={{
              background: copied === 'hash' ? undefined : 'linear-gradient(to bottom, #ffffff, #ececec)',
              border: '1.5px solid rgba(0,0,0,0.18)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.08)',
            }}
            title="Copy with #"
          >
            #
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyColor(color, false)}
            className={cn(
              "px-3 py-1 h-8 text-xs font-bold transition-smooth border-0",
              copied === 'hex' && "!bg-gym-primary !text-white"
            )}
            style={{
              background: copied === 'hex' ? undefined : 'linear-gradient(to bottom, #ffffff, #ececec)',
              border: '1.5px solid rgba(0,0,0,0.18)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.08)',
            }}
            title="Copy without #"
          >
            HEX
          </Button>
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