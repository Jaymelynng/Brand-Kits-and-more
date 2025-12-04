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
      <div className="text-center py-1 px-6" style={{ background: 'hsl(var(--brand-white))' }}>
        <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--brand-text-primary))' }}>
          🏆 Gym Brand Kit Database
        </h1>
        <p className="text-xs" style={{ color: 'hsl(var(--brand-text-primary) / 0.7)' }}>
          Select gyms to copy their info or view campaigns
        </p>
      </div>

      {/* Selection Dashboard */}
      <div className="py-1 px-6" style={{
        background: `linear-gradient(to bottom, hsl(var(--brand-navy) / 0.02), transparent)`,
        borderBottom: '1px solid hsl(var(--brand-rose-gold) / 0.1)'
      }}>
        {/* Single Action Bar with All Buttons */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-1">
          {/* Selection Actions */}
          <Button
            onClick={onSelectAllGyms}
            size="sm"
            variant="outline"
            disabled={isPerfectState}
            className="px-4 py-1.5 transition-all duration-300 hover:scale-105"
            style={{
              borderColor: isPerfectState ? 'hsl(var(--brand-rose-gold))' : 'hsl(var(--brand-navy) / 0.2)',
              color: isPerfectState ? 'hsl(var(--brand-rose-gold))' : 'hsl(var(--brand-navy))',
              background: isPerfectState ? 'hsl(var(--brand-rose-gold) / 0.1)' : 'transparent',
            }}
          >
            {isPerfectState ? '✓ All Selected' : 'Select All'}
          </Button>

          <Button
            onClick={onDeselectAllGyms}
            size="sm"
            variant="outline"
            disabled={selectedCount === 0}
            className="px-4 py-1.5 transition-all duration-300 hover:scale-105"
            style={{
              borderColor: 'hsl(var(--brand-navy) / 0.2)',
              color: 'hsl(var(--brand-navy))',
            }}
          >
            Clear All
          </Button>

          <Button
            onClick={onCopySelected}
            size="sm"
            variant="outline"
            disabled={selectedCount === 0}
            className="px-4 py-1.5 transition-all duration-300 hover:scale-105"
            style={{
              borderColor: 'hsl(var(--brand-rose-gold) / 0.3)',
              color: 'hsl(var(--brand-rose-gold))',
            }}
          >
            Copy Selected ({selectedCount})
          </Button>

          <Button
            onClick={onCopyAll}
            size="sm"
            variant="outline"
            className="px-4 py-1.5 transition-all duration-300 hover:scale-105"
            style={{
              borderColor: 'hsl(var(--brand-rose-gold))',
              color: 'hsl(var(--brand-rose-gold))',
            }}
          >
            Copy All
          </Button>

          {/* Separator */}
          <div className="h-6 w-px bg-border mx-1" />

          {/* Navigation Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/campaigns')}
            className="px-4 py-1.5 transition-all duration-300 hover:scale-105"
            style={{ borderColor: 'hsl(var(--brand-rose-gold))' }}
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
              className="px-4 py-1.5 transition-all duration-300 hover:scale-105"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          )}
        </div>

        {/* Gym Navigation Grid */}
        <div className="flex flex-nowrap gap-3 px-4 pb-2 justify-center overflow-x-auto">
          {gyms.map((gym) => {
            const isSelected = selectedGyms.has(gym.code);
            const primaryColor = gym.colors[0]?.color_hex || '#667eea';

            return (
              <button
                key={gym.id}
                onClick={() => navigate(`/gym/${gym.id}`)}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-3 py-1.5",
                  "rounded-lg border transition-all duration-300",
                  "hover:scale-105 hover:shadow-lg group"
                )}
                style={{
                  borderColor: isSelected ? 'hsl(var(--brand-rose-gold))' : 'hsl(var(--brand-navy) / 0.1)',
                  background: isSelected ? 'hsl(var(--brand-rose-gold) / 0.05)' : 'hsl(var(--brand-navy) / 0.02)',
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
            className="inline-block px-3 py-1 rounded-md text-sm font-medium border-2"
            style={{
              borderColor: 'hsl(var(--brand-rose-gold))',
              color: 'hsl(var(--brand-text-primary))',
              backgroundColor: 'transparent',
            }}
          >
            {selectedCount} of {totalCount} gyms selected
          </div>
        </div>
      </div>
    </>
  );
};
