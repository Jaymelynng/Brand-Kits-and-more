import { useState, useEffect } from "react";
import { DiamondSelector } from "./DiamondSelector";
import { Button } from "./ui/button";
import { GymWithColors } from "@/hooks/useGyms";
import { cn } from "@/lib/utils";

interface GymNavigationProps {
  gyms: GymWithColors[];
  onScrollToGym: (gymCode: string) => void;
  onCopySelected: () => void;
  onCopyAll: () => void;
  selectedGyms: Set<string>;
  onToggleGymSelection: (gymCode: string) => void;
  onSelectAllGyms: () => void;
  onDeselectAllGyms: () => void;
}

export const GymNavigation = ({ 
  gyms, 
  onScrollToGym, 
  onCopySelected,
  onCopyAll,
  selectedGyms,
  onToggleGymSelection,
  onSelectAllGyms,
  onDeselectAllGyms
}: GymNavigationProps) => {
  const selectedCount = selectedGyms.size;
  const totalCount = gyms.length;
  const isPerfectState = selectedCount === totalCount;

  return (
    <div className="text-center py-8 bg-white border-b border-gray-200">
      {/* Gym Navigation Grid */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-wrap justify-center gap-4">
          {gyms.map((gym) => {
            const isSelected = selectedGyms.has(gym.code);
            const primaryColor = gym.colors[0]?.color_hex || '#667eea';
            
            return (
              <div key={gym.code} className="flex flex-col items-center gap-2">
                <Button
                  onClick={() => onScrollToGym(gym.code)}
                  className={cn(
                    "px-4 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-white relative",
                    isSelected && "ring-2 ring-offset-2"
                  )}
                  style={{
                    background: `linear-gradient(135deg, hsl(var(--brand-rose-gold)) 0%, hsl(var(--brand-rose-gold-dark)) 100%)`,
                    boxShadow: isSelected 
                      ? `0 3px 10px hsl(var(--brand-rose-gold) / 0.4), 0 0 0 3px ${primaryColor}40`
                      : '0 3px 10px hsl(var(--brand-rose-gold) / 0.4)'
                  }}
                >
                  {gym.code}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
                          style={{ backgroundColor: primaryColor }} />
                  )}
                </Button>
                <DiamondSelector
                  gymCode={gym.code}
                  isSelected={isSelected}
                  onToggle={() => onToggleGymSelection(gym.code)}
                  primaryColor={primaryColor}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Buttons - All in one place */}
      <div className="flex flex-wrap justify-center gap-3 items-center">
        <Button
          onClick={selectedCount === totalCount ? onDeselectAllGyms : onSelectAllGyms}
          className="px-5 py-2 rounded-full text-white font-medium"
          style={{
            background: `linear-gradient(135deg, hsl(var(--brand-blue-gray)) 0%, hsl(var(--brand-blue-gray-mid)) 50%, hsl(var(--brand-blue-gray-dark)) 100%)`,
            boxShadow: '0 2px 8px hsl(var(--brand-blue-gray) / 0.3)'
          }}
        >
          {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
        </Button>
        
        <Button
          onClick={onCopySelected}
          disabled={selectedCount === 0}
          className="px-5 py-2 rounded-full text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: selectedCount === 0 
              ? 'hsl(var(--brand-blue-gray) / 0.5)'
              : `linear-gradient(135deg, hsl(var(--brand-rose-gold)) 0%, hsl(var(--brand-rose-gold-mid)) 50%, hsl(var(--brand-rose-gold-dark)) 100%)`,
            boxShadow: selectedCount === 0 
              ? 'none'
              : '0 2px 8px hsl(var(--brand-rose-gold) / 0.3)'
          }}
        >
          Copy Selected ({selectedCount})
        </Button>

        <Button
          onClick={onCopyAll}
          variant="outline"
          className="px-5 py-2 rounded-full border-2 font-medium"
          style={{
            borderColor: 'hsl(var(--brand-blue-gray) / 0.4)',
            color: 'hsl(var(--brand-blue-gray-dark))'
          }}
        >
          Copy All
        </Button>
        
        <div className="px-5 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-200"
             style={{
               background: isPerfectState 
                 ? 'hsl(var(--brand-gold) / 0.15)' 
                 : 'rgba(255, 255, 255, 0.9)',
               borderColor: isPerfectState 
                 ? 'hsl(var(--brand-gold))' 
                 : 'hsl(var(--brand-rose-gold) / 0.3)',
               color: isPerfectState ? 'hsl(var(--brand-gold-dark))' : 'hsl(var(--brand-blue-gray-dark))',
               boxShadow: isPerfectState 
                 ? '0 2px 8px hsl(var(--brand-gold) / 0.3)' 
                 : 'none'
             }}>
          {isPerfectState ? '✨ ' : ''}{selectedCount} of {totalCount} selected
        </div>
      </div>
    </div>
  );
};