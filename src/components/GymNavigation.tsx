import { useState, useEffect } from "react";
import { DiamondSelector } from "./DiamondSelector";
import { Button } from "./ui/button";
import { GymWithColors } from "@/hooks/useGyms";
import { cn } from "@/lib/utils";

interface GymNavigationProps {
  gyms: GymWithColors[];
  onScrollToGym: (gymCode: string) => void;
  onCopySelected: () => void;
}

export const GymNavigation = ({ gyms, onScrollToGym, onCopySelected }: GymNavigationProps) => {
  const [selectedGyms, setSelectedGyms] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Initialize with all gyms selected for perfect 10/10 state
    setSelectedGyms(new Set(gyms.map(gym => gym.code)));
  }, [gyms]);

  const toggleGymSelection = (gymCode: string) => {
    setSelectedGyms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gymCode)) {
        newSet.delete(gymCode);
      } else {
        newSet.add(gymCode);
      }
      return newSet;
    });
  };

  const selectAllGyms = () => {
    setSelectedGyms(new Set(gyms.map(gym => gym.code)));
  };

  const deselectAllGyms = () => {
    setSelectedGyms(new Set());
  };

  const handleCopySelected = () => {
    const selectedGymsList = gyms.filter(gym => selectedGyms.has(gym.code));
    if (selectedGymsList.length === 0) {
      alert('No gyms selected!');
      return;
    }

    let selectedText = 'SELECTED GYM BRAND COLORS\n\n';
    selectedGymsList.forEach(gym => {
      selectedText += `${gym.name} (${gym.code}):\n`;
      selectedText += gym.colors.map(color => color.color_hex).join('\n') + '\n\n';
    });

    navigator.clipboard.writeText(selectedText).then(() => {
      const count = selectedGymsList.length;
      const message = count === 1 ? '1 Gym Copied!' : `${count} Gyms Copied!`;
      // Show temporary feedback - could be enhanced with a toast
      console.log(message);
    });
  };

  const selectedCount = selectedGyms.size;
  const totalCount = gyms.length;
  const isPerfectState = selectedCount === totalCount;

  return (
    <div className="gym-dashboard-nav fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">
              Gym Brand Kit Dashboard
            </h1>
            <div className={cn(
              "selection-count text-sm font-medium px-3 py-1 rounded-full transition-all duration-300",
              isPerfectState 
                ? "bg-green-500/20 text-green-100 shadow-lg animate-pulse" 
                : "bg-white/20 text-white/80"
            )}>
              {selectedCount} of {totalCount} gyms selected
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={selectedCount === totalCount ? deselectAllGyms : selectAllGyms}
              className="control-btn bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySelected}
              className="control-btn bg-white/10 border-white/30 text-white hover:bg-white/20"
              disabled={selectedCount === 0}
            >
              Copy Selected
            </Button>
          </div>
        </div>

        <div className="gym-nav flex items-center gap-4 overflow-x-auto pb-2">
          {gyms.map((gym) => (
            <div key={gym.code} className="gym-nav-item flex items-center gap-2 flex-shrink-0">
              <DiamondSelector
                gymCode={gym.code}
                isSelected={selectedGyms.has(gym.code)}
                onToggle={() => toggleGymSelection(gym.code)}
                primaryColor={gym.colors[0]?.color_hex || '#667eea'}
              />
              <Button
                variant="ghost" 
                size="sm"
                onClick={() => onScrollToGym(gym.code)}
                className="nav-btn text-white hover:bg-white/20 font-medium px-3 py-1 rounded-full transition-all duration-200"
              >
                {gym.code}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};