import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { GymPillStrip } from "./GymPillStrip";

interface GlobalNavProps {
  children: ReactNode;
  selectedGyms?: Set<string>;
  onToggleGymSelection?: (gymCode: string) => void;
  onScrollToGym?: (gymCode: string) => void;
}

export const GlobalNav = ({
  children,
  selectedGyms,
  onToggleGymSelection,
  onScrollToGym,
}: GlobalNavProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-50" style={{ background: 'hsl(var(--brand-white))' }}>
        <GymPillStrip
          selectedGyms={selectedGyms}
          onToggleGymSelection={onToggleGymSelection}
          onScrollToGym={onScrollToGym}
        />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
};
