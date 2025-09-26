import { cn } from "@/lib/utils";

interface DiamondSelectorProps {
  gymCode: string;
  isSelected: boolean;
  onToggle: () => void;
  primaryColor?: string;
}

export const DiamondSelector = ({ gymCode, isSelected, onToggle, primaryColor = "#667eea" }: DiamondSelectorProps) => {
  return (
    <div
      className={cn(
        "diamond-selector w-5 h-5 transform rotate-45 cursor-pointer transition-all duration-300 border-2 border-white/50",
        isSelected 
          ? "bg-white/90 shadow-lg scale-110" 
          : "bg-white/20 hover:bg-white/40 hover:scale-105"
      )}
      style={{
        background: isSelected 
          ? 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)'
          : `linear-gradient(135deg, ${primaryColor}40 0%, ${primaryColor}20 100%)`,
        boxShadow: isSelected 
          ? `0 0 20px ${primaryColor}60, 0 4px 15px rgba(0,0,0,0.2)`
          : '0 2px 8px rgba(0,0,0,0.1)'
      }}
      onClick={onToggle}
      data-gym={gymCode}
      title={isSelected ? `Deselect ${gymCode}` : `Select ${gymCode}`}
    >
      {isSelected && (
        <div 
          className="absolute inset-1 bg-gradient-to-br from-white/50 to-transparent rounded-sm animate-pulse"
          style={{
            animation: 'sparkle 2s ease-in-out infinite'
          }}
        />
      )}
    </div>
  );
};