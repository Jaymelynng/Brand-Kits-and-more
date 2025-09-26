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
      className="w-6 h-6 transform rotate-45 cursor-pointer transition-all duration-200 hover:scale-110"
      style={{
        backgroundColor: primaryColor,
        opacity: isSelected ? 1 : 0.7,
        boxShadow: isSelected ? `0 0 15px ${primaryColor}80` : 'none'
      }}
      onClick={onToggle}
      data-gym={gymCode}
      title={isSelected ? `Deselect ${gymCode}` : `Select ${gymCode}`}
    />
  );
};