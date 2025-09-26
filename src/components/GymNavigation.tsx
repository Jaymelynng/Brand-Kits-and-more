import { useState, useEffect } from "react";
import { DiamondSelector } from "./DiamondSelector";
import { Button } from "./ui/button";
import { GymWithColors } from "@/hooks/useGyms";
import { cn } from "@/lib/utils";

interface GymNavigationProps {
  gyms: GymWithColors[];
  onScrollToGym: (gymCode: string) => void;
  onCopySelected: () => void;
  selectedGyms: Set<string>;
  onToggleGymSelection: (gymCode: string) => void;
  onSelectAllGyms: () => void;
  onDeselectAllGyms: () => void;
}

export const GymNavigation = ({ 
  gyms, 
  onScrollToGym, 
  onCopySelected,
  selectedGyms,
  onToggleGymSelection,
  onSelectAllGyms,
  onDeselectAllGyms
}: GymNavigationProps) => {
  const selectedCount = selectedGyms.size;
  const totalCount = gyms.length;
  const isPerfectState = selectedCount === totalCount;

  return (
    <div className="text-center py-8" 
         style={{ background: `linear-gradient(135deg, hsl(var(--brand-light) / 0.8) 0%, hsl(var(--brand-lighter) / 0.9) 100%)` }}>
      {/* Gym Navigation Grid */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-wrap justify-center gap-4">
          {gyms.map((gym) => (
            <div key={gym.code} className="flex flex-col items-center gap-2">
              <Button
                onClick={() => onScrollToGym(gym.code)}
                className="px-4 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-200 bg-brand-warm hover:bg-brand-warm/80 text-white"
              >
                {gym.code}
              </Button>
              <DiamondSelector
                gymCode={gym.code}
                isSelected={selectedGyms.has(gym.code)}
                onToggle={() => onToggleGymSelection(gym.code)}
                primaryColor={gym.colors[0]?.color_hex || '#667eea'}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <Button
          onClick={selectedCount === totalCount ? onDeselectAllGyms : onSelectAllGyms}
          className="px-6 py-2 bg-brand-neutral hover:bg-brand-neutral/80 text-white rounded-full"
        >
          {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
        </Button>
        <Button
          onClick={onCopySelected}
          className="px-6 py-2 bg-brand-cool hover:bg-brand-cool/80 text-white rounded-full"
          disabled={selectedCount === 0}
        >
          Copy Selected ({selectedCount})
        </Button>
        <div className={cn(
          "px-4 py-2 rounded-full text-sm font-medium border-2",
          isPerfectState 
            ? "bg-green-100 text-green-800 border-green-300" 
            : "bg-muted text-muted-foreground border-border"
        )}>
          {selectedCount} of {totalCount} selected
        </div>
      </div>
    </div>
  );
};