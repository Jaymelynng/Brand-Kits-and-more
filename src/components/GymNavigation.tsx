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
         style={{ 
           background: `
             radial-gradient(1px 1px at 15px 10px, rgba(255,255,255,0.6), transparent),
             radial-gradient(1px 1px at 35px 20px, rgba(255,255,255,0.4), transparent),
             radial-gradient(1px 1px at 55px 15px, rgba(255,255,255,0.7), transparent),
             linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.8) 0%, hsl(var(--brand-rose-gold-mid) / 0.9) 100%)
           `
         }}>
      {/* Gym Navigation Grid */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-wrap justify-center gap-4">
          {gyms.map((gym) => (
            <div key={gym.code} className="flex flex-col items-center gap-2">
              <Button
                onClick={() => onScrollToGym(gym.code)}
                className="px-4 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-white"
                style={{
                  background: `
                    radial-gradient(1px 1px at 8px 8px, rgba(255,255,255,0.9), transparent),
                    radial-gradient(1px 1px at 24px 15px, rgba(255,255,255,0.7), transparent),
                    linear-gradient(135deg, hsl(var(--brand-rose-gold)) 0%, hsl(var(--brand-rose-gold-mid)) 50%, hsl(var(--brand-rose-gold-dark)) 100%)
                  `,
                  boxShadow: '0 3px 10px hsl(var(--brand-rose-gold) / 0.4)'
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
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <Button
          onClick={selectedCount === totalCount ? onDeselectAllGyms : onSelectAllGyms}
          className="px-6 py-2 rounded-full text-white"
          style={{
            background: `
              linear-gradient(135deg, hsl(var(--brand-blue-gray)) 0%, hsl(var(--brand-blue-gray-mid)) 50%, hsl(var(--brand-blue-gray-dark)) 100%)
            `,
            boxShadow: '0 2px 8px hsl(var(--brand-blue-gray) / 0.3)'
          }}
        >
          {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
        </Button>
        <Button
          onClick={onCopySelected}
          disabled={selectedCount === 0}
          className="px-6 py-2 rounded-full text-white"
          style={{
            background: selectedCount === 0 
              ? 'hsl(var(--brand-blue-gray) / 0.5)'
              : `
                radial-gradient(1px 1px at 8px 8px, rgba(255,255,255,0.8), transparent),
                radial-gradient(1px 1px at 24px 15px, rgba(255,255,255,0.6), transparent),
                linear-gradient(135deg, hsl(var(--brand-blue-gray)) 0%, hsl(var(--brand-blue-gray-mid)) 50%, hsl(var(--brand-blue-gray-dark)) 100%)
              `,
            boxShadow: selectedCount === 0 
              ? 'none'
              : '0 2px 8px hsl(var(--brand-blue-gray) / 0.3)'
          }}
        >
          Copy Selected ({selectedCount})
        </Button>
        <div className="px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200 text-gray-900"
             style={{
               background: isPerfectState 
                 ? 'rgba(212, 175, 55, 0.15)' 
                 : 'rgba(255, 255, 255, 0.9)',
               borderColor: isPerfectState 
                 ? 'hsl(var(--brand-gold))' 
                 : 'hsl(var(--brand-rose-gold) / 0.3)',
               boxShadow: isPerfectState 
                 ? '0 2px 8px hsl(var(--brand-gold) / 0.2)' 
                 : 'none'
             }}>
          {selectedCount} of {totalCount} selected
        </div>
      </div>
    </div>
  );
};