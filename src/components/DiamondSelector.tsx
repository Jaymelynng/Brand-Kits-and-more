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
          "w-8 h-8 transform rotate-45 cursor-pointer transition-all duration-300",
          "relative overflow-hidden",
          "hover:scale-110 hover:-rotate-12",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/40 before:via-transparent before:to-transparent",
          "after:absolute after:inset-0 after:bg-gradient-to-tl after:from-white/20 after:via-transparent after:to-transparent",
          isSelected && "animate-pulse shadow-2xl scale-110"
        )}
        style={{
          backgroundColor: primaryColor,
          boxShadow: isSelected 
            ? `0 0 20px ${primaryColor}60, 0 0 40px ${primaryColor}30, inset 0 0 20px rgba(255,255,255,0.3)` 
            : `0 4px 12px ${primaryColor}30, inset 0 0 10px rgba(255,255,255,0.2)`,
        }}
        onClick={onToggle}
        data-gym={gymCode}
        title={isSelected ? `Deselect ${gymCode}` : `Select ${gymCode}`}
      >
        {/* Sparkle animations */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          "before:absolute before:top-1 before:left-1 before:w-1 before:h-1 before:bg-white before:rounded-full before:animate-pulse",
          "after:absolute after:bottom-1 after:right-1 after:w-0.5 after:h-0.5 after:bg-white after:rounded-full after:animate-pulse after:animation-delay-150"
        )} />
        
        {/* Central highlight */}
        <div className="absolute inset-1 bg-gradient-to-br from-white/30 to-transparent rounded-sm" />
      </div>
    </div>
  );
};