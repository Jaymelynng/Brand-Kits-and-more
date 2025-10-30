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
    <div className="text-center py-8 relative overflow-hidden" style={{ 
      background: `
        radial-gradient(circle at 20% 30%, hsl(var(--brand-gold) / 0.15), transparent 40%),
        radial-gradient(circle at 80% 70%, hsl(var(--brand-rose-gold) / 0.1), transparent 40%),
        linear-gradient(135deg, hsl(var(--brand-cream)) 0%, hsl(var(--brand-white)) 50%, hsl(var(--brand-gold) / 0.05) 100%)
      `,
      borderBottom: '2px solid',
      borderImage: 'linear-gradient(90deg, transparent, hsl(var(--brand-gold)), transparent) 1'
    }}>
      {/* Decorative floating elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-4 left-[10%] text-2xl opacity-30 animate-pulse">⭐</div>
        <div className="absolute top-6 right-[15%] text-xl opacity-20 animate-bounce" style={{ animationDelay: '0.5s' }}>💪</div>
        <div className="absolute bottom-4 left-[20%] text-lg opacity-25 animate-pulse" style={{ animationDelay: '1s' }}>✨</div>
        <div className="absolute bottom-6 right-[25%] text-2xl opacity-20 animate-pulse" style={{ animationDelay: '1.5s' }}>🏋️</div>
      </div>
      {/* Selection Counter - Prominent at top */}
      <div className="mb-6 relative z-10">
        <div className="inline-block px-8 py-3 rounded-full text-lg font-bold border-[3px] transition-all duration-200 shadow-xl"
             style={{
               background: isPerfectState 
                 ? `
                   radial-gradient(1.5px 1.5px at 15px 8px, rgba(255,255,255,1), transparent),
                   radial-gradient(1px 1px at 35px 12px, rgba(255,255,255,0.9), transparent),
                   radial-gradient(1.5px 1.5px at 55px 6px, rgba(255,255,255,0.95), transparent),
                   radial-gradient(1px 1px at 75px 14px, rgba(255,255,255,0.85), transparent),
                   radial-gradient(1.5px 1.5px at 25px 16px, rgba(255,255,255,0.8), transparent),
                   linear-gradient(135deg, hsl(var(--brand-gold)) 0%, hsl(var(--brand-gold-dark)) 100%)
                 `
                 : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(250, 250, 250, 0.9))',
               borderColor: isPerfectState 
                 ? 'hsl(var(--brand-gold))' 
                 : 'hsl(var(--brand-rose-gold) / 0.4)',
               color: isPerfectState ? 'white' : 'hsl(var(--brand-blue-gray-dark))',
               boxShadow: isPerfectState 
                 ? '0 4px 20px hsl(var(--brand-gold) / 0.5), 0 0 40px hsl(var(--brand-gold) / 0.3)' 
                 : '0 2px 8px rgba(0, 0, 0, 0.08)',
               animation: isPerfectState ? 'pulse 2s ease-in-out infinite' : 'none'
             }}>
          {isPerfectState ? '✨ ' : '⭐ '}{selectedCount} of {totalCount} selected
        </div>
      </div>

      {/* Action Buttons - Single row */}
      <div className="flex flex-wrap justify-center gap-3 items-center mb-8">
        <Button
          onClick={selectedCount === totalCount ? () => {} : onSelectAllGyms}
          className="px-5 py-2 rounded-full text-white font-medium transition-all"
          style={{
            background: selectedCount === totalCount
              ? `linear-gradient(135deg, hsl(var(--brand-gold)) 0%, hsl(var(--brand-gold-dark)) 100%)`
              : `linear-gradient(135deg, hsl(var(--brand-blue-gray)) 0%, hsl(var(--brand-blue-gray-mid)) 50%, hsl(var(--brand-blue-gray-dark)) 100%)`,
            boxShadow: selectedCount === totalCount
              ? '0 3px 12px hsl(var(--brand-gold) / 0.4)'
              : '0 2px 8px hsl(var(--brand-blue-gray) / 0.3)',
            cursor: selectedCount === totalCount ? 'default' : 'pointer'
          }}
        >
          {selectedCount === totalCount ? '✓ All Selected' : 'Select All'}
        </Button>

        <Button
          onClick={onDeselectAllGyms}
          disabled={selectedCount === 0}
          className="px-5 py-2 rounded-full text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: selectedCount === 0 
              ? 'hsl(var(--brand-blue-gray) / 0.5)'
              : `linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.7) 0%, hsl(var(--brand-rose-gold-mid) / 0.8) 50%, hsl(var(--brand-rose-gold-dark) / 0.8) 100%)`,
            boxShadow: selectedCount === 0 
              ? 'none'
              : '0 2px 8px hsl(var(--brand-rose-gold) / 0.25)'
          }}
        >
          Clear All
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
      </div>

      {/* Gym Navigation Grid */}
      <div className="max-w-6xl mx-auto">
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
    </div>
  );
};