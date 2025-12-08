import { Button } from "@/components/ui/button";
import { DiamondSelector } from "./DiamondSelector";
import { SecretAdminButton } from "./SecretAdminButton";
import { LogOut, Folder } from "lucide-react";
import { GymWithColors } from "@/hooks/useGyms";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface GymNavigationProps {
  gyms: GymWithColors[];
  onScrollToGym: (gymCode: string) => void;
  onCopySelected: () => void;
  onCopyAll: () => void;
  selectedGyms: Set<string>;
  onToggleGymSelection: (gymCode: string) => void;
  onSelectAllGyms: () => void;
  onDeselectAllGyms: () => void;
  user?: any;
  isAdmin?: boolean;
  onAdminClick: () => void;
  onSignOut: () => void;
}

export const GymNavigation = ({
  gyms,
  onScrollToGym,
  onCopySelected,
  onCopyAll,
  selectedGyms,
  onToggleGymSelection,
  onSelectAllGyms,
  onDeselectAllGyms,
  user,
  isAdmin,
  onAdminClick,
  onSignOut
}: GymNavigationProps) => {
  const navigate = useNavigate();
  const totalCount = gyms.length;
  const selectedCount = selectedGyms.size;
  const isPerfectState = selectedCount === totalCount;

  return (
    <>
      {/* Main Title Section */}
      <div className="text-center py-2 px-6 shadow-sm" style={{ 
        background: 'linear-gradient(to bottom, hsl(var(--brand-white)), hsl(var(--brand-rose-gold) / 0.12))',
        borderBottom: '2px solid hsl(var(--brand-rose-gold) / 0.25)'
      }}>
        <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--brand-navy))' }}>
          🏆 Gym Brand Kit Database
        </h1>
        <p className="text-xs" style={{ color: 'hsl(var(--brand-navy) / 0.7)' }}>
          Select gyms to copy their info or view campaigns
        </p>
      </div>

      {/* Selection Dashboard */}
      <div className="py-2 px-6 shadow-md" style={{
        background: `linear-gradient(to bottom, hsl(var(--brand-rose-gold) / 0.15), hsl(var(--brand-blue-gray) / 0.1))`,
        borderBottom: '2px solid hsl(var(--brand-rose-gold) / 0.35)'
      }}>
        {/* Action Bar */}
        <div className="flex items-center justify-center gap-4 flex-wrap py-3 px-6 rounded-xl mb-3" style={{ 
          background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.25), hsl(var(--brand-rose-gold) / 0.15))',
          border: '1px solid hsl(var(--brand-rose-gold) / 0.3)'
        }}>
          {/* Selection Group */}
          <div className="flex items-center gap-3">
            <Button
              onClick={onSelectAllGyms}
              size="sm"
              variant="outline"
              disabled={isPerfectState}
              className="px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
              style={{
                borderColor: isPerfectState ? 'hsl(142 76% 36%)' : 'hsl(var(--brand-navy) / 0.3)',
                color: isPerfectState ? 'white' : 'hsl(var(--brand-navy))',
                background: isPerfectState 
                  ? 'linear-gradient(135deg, hsl(142 76% 46%), hsl(142 76% 36%))' 
                  : 'linear-gradient(135deg, white, hsl(var(--brand-blue-gray) / 0.1))',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              {isPerfectState ? '✓ All Selected' : 'Select All'}
            </Button>

            <Button
              onClick={onDeselectAllGyms}
              size="sm"
              variant="outline"
              disabled={selectedCount === 0}
              className="px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
              style={{
                borderColor: 'hsl(var(--brand-navy) / 0.2)',
                color: 'hsl(var(--brand-navy) / 0.8)',
                background: 'linear-gradient(135deg, white, hsl(var(--brand-blue-gray) / 0.08))',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              Clear All
            </Button>
          </div>

          {/* Separator */}
          <div className="h-8 w-px" style={{ background: 'hsl(var(--brand-rose-gold) / 0.4)' }} />

          {/* Copy Group */}
          <div className="flex items-center gap-3">
            <Button
              onClick={onCopySelected}
              size="sm"
              variant="outline"
              disabled={selectedCount === 0}
              className="px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
              style={{
                borderColor: 'hsl(var(--brand-rose-gold) / 0.5)',
                color: 'hsl(var(--brand-navy))',
                background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.15), hsl(var(--brand-rose-gold) / 0.25))',
                boxShadow: '0 4px 12px hsl(var(--brand-rose-gold) / 0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              Copy Selected ({selectedCount})
            </Button>

            <Button
              onClick={onCopyAll}
              size="sm"
              variant="outline"
              className="px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
              style={{
                borderColor: 'hsl(var(--brand-rose-gold))',
                color: 'white',
                background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(10 30% 55%))',
                boxShadow: '0 4px 14px hsl(var(--brand-rose-gold) / 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              Copy All
            </Button>
          </div>

          {/* Separator */}
          <div className="h-8 w-px" style={{ background: 'hsl(var(--brand-rose-gold) / 0.4)' }} />

          {/* Navigation Group */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/campaigns')}
              className="px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
              style={{ 
                borderColor: 'hsl(var(--brand-navy))',
                color: 'white',
                background: 'linear-gradient(135deg, hsl(var(--brand-navy) / 0.85), hsl(var(--brand-navy)))',
                boxShadow: '0 4px 14px hsl(var(--brand-navy) / 0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <Folder className="w-4 h-4 mr-2" />
              Campaigns
            </Button>
            
            {isAdmin && <SecretAdminButton onClick={onAdminClick} />}
            
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSignOut}
                className="px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                style={{
                  borderColor: 'hsl(var(--brand-navy) / 0.25)',
                  color: 'hsl(var(--brand-navy))',
                  background: 'linear-gradient(135deg, white, hsl(var(--brand-blue-gray) / 0.1))',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            )}
          </div>
        </div>

        {/* Gym Navigation Grid */}
        <div className="flex flex-nowrap gap-5 px-6 py-3 justify-center overflow-x-auto rounded-xl" style={{ 
          background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.12), hsl(var(--brand-rose-gold) / 0.08))',
          border: '1px solid hsl(var(--brand-rose-gold) / 0.2)'
        }}>
          {gyms.map((gym) => {
            const isSelected = selectedGyms.has(gym.code);
            const primaryColor = gym.colors[0]?.color_hex || '#667eea';

            return (
              <button
                key={gym.id}
                onClick={() => navigate(`/gym/${gym.id}`)}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-4 py-2",
                  "rounded-xl border-2 transition-all duration-300",
                  "hover:scale-105 group",
                  "backdrop-blur-sm"
                )}
                style={{
                  borderColor: isSelected ? primaryColor : 'hsl(var(--brand-rose-gold) / 0.4)',
                  background: '#ffffff',
                  boxShadow: isSelected 
                    ? `0 4px 15px ${primaryColor}35, 0 2px 6px rgba(0,0,0,0.12)` 
                    : '0 3px 10px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.08)'
                }}
              >
                <span className="text-xs font-bold tracking-wider" style={{ color: primaryColor }}>
                  {gym.code}
                </span>

                <DiamondSelector
                  gymCode={gym.code}
                  isSelected={isSelected}
                  primaryColor={primaryColor}
                  onToggle={() => onToggleGymSelection(gym.code)}
                />
              </button>
            );
          })}
        </div>

        {/* Selection Counter - Small at Bottom */}
        <div className="flex justify-center">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold border-2 shadow-sm"
            style={{
              borderColor: 'hsl(var(--brand-rose-gold))',
              color: 'hsl(var(--brand-navy))',
              backgroundColor: 'hsl(var(--brand-rose-gold) / 0.18)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {selectedCount} of {totalCount} gyms selected
          </div>
        </div>
      </div>
    </>
  );
};
