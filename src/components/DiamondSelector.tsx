import { cn } from "@/lib/utils";

interface DiamondSelectorProps {
  gymCode: string;
  isSelected: boolean;
  onToggle: () => void;
  primaryColor?: string;
}

export const DiamondSelector = ({ gymCode, isSelected, onToggle, primaryColor = "#667eea" }: DiamondSelectorProps) => {
  return (
    <div className="relative group">
      <div
        className={cn(
          "w-6 h-6 transform rotate-45 cursor-pointer transition-all duration-300",
          "relative overflow-hidden",
          "hover:scale-110 hover:-rotate-12",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/40 before:via-transparent before:to-transparent",
          isSelected && "scale-110"
        )}
        style={{
          backgroundColor: primaryColor,
          boxShadow: isSelected 
            ? `0 6px 20px ${primaryColor}70, 0 3px 8px rgba(0,0,0,0.3), 0 0 30px ${primaryColor}40, inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.2)` 
            : `0 4px 12px ${primaryColor}50, 0 2px 6px rgba(0,0,0,0.25), inset 0 2px 3px rgba(255,255,255,0.4), inset 0 -2px 3px rgba(0,0,0,0.15)`,
          border: `1px solid ${primaryColor}`,
        }}
        onClick={onToggle}
        data-gym={gymCode}
        title={isSelected ? `Deselect ${gymCode}` : `Select ${gymCode}`}
      >
        {/* Subtle sparkles on hover only */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          "before:absolute before:top-1 before:left-1 before:w-1 before:h-1 before:bg-white before:rounded-full",
          "after:absolute after:bottom-1 after:right-1 after:w-0.5 after:h-0.5 after:bg-white after:rounded-full"
        )} />
        
        {/* Central highlight */}
        <div className="absolute inset-1 bg-gradient-to-br from-white/25 to-transparent rounded-sm" />
      </div>
    </div>
  );
};