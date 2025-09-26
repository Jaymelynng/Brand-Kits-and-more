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
    <div className="text-center py-8 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-700 mb-2 flex items-center justify-center gap-2">
          🏆 Gym Brand Kit Dashboard
        </h1>
      </div>

      {/* Gym Navigation Grid */}
      <div className="max-w-4xl mx-auto mb-8">
        {/* First Row */}
        <div className="flex justify-center gap-6 mb-6">
          {gyms.slice(0, 5).map((gym) => (
            <div key={gym.code} className="flex flex-col items-center gap-2">
              <Button
                onClick={() => onScrollToGym(gym.code)}
                className="px-4 py-2 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                style={{ 
                  backgroundColor: '#A4968A',
                  color: 'white'
                }}
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

        {/* Second Row */}
        <div className="flex justify-center gap-6">
          {gyms.slice(5, 10).map((gym) => (
            <div key={gym.code} className="flex flex-col items-center gap-2">
              <Button
                onClick={() => onScrollToGym(gym.code)}
                className="px-4 py-2 rounded-full text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                style={{ 
                  backgroundColor: '#A4968A',
                  color: 'white'
                }}
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
      <div className="flex justify-center gap-4 mb-8">
        <Button
          onClick={selectedCount === totalCount ? onDeselectAllGyms : onSelectAllGyms}
          className="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-full"
        >
          {selectedCount === totalCount ? 'All Selected' : 'All Selected'}
        </Button>
        <Button
          onClick={onDeselectAllGyms}
          className="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-full"
        >
          Deselect All
        </Button>
        <Button
          onClick={onCopySelected}
          className="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-full"
          disabled={selectedCount === 0}
        >
          Copy Selected
        </Button>
        <div className={cn(
          "px-4 py-2 rounded-full text-sm font-medium border-2",
          isPerfectState 
            ? "bg-green-100 text-green-800 border-green-300" 
            : "bg-gray-100 text-gray-700 border-gray-300"
        )}>
          {selectedCount} of {totalCount} gyms selected
        </div>
      </div>
    </div>
  );
};