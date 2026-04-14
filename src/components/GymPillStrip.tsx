import { useGyms, GymWithColors } from "@/hooks/useGyms";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Check, ExternalLink, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface GymPillStripProps {
  // Dashboard mode props (only used on front page)
  selectedGyms?: Set<string>;
  onToggleGymSelection?: (gymCode: string) => void;
  onScrollToGym?: (gymCode: string) => void;
}

export const GymPillStrip = ({
  selectedGyms,
  onToggleGymSelection,
  onScrollToGym,
}: GymPillStripProps) => {
  const { data: gyms = [] } = useGyms();
  const location = useLocation();
  const navigate = useNavigate();
  const { gymCode: activeGymCode } = useParams<{ gymCode: string }>();

  const isDashboard = location.pathname === "/";

  const handlePillClick = (gymCode: string) => {
    if (isDashboard && onToggleGymSelection) {
      onToggleGymSelection(gymCode);
    } else {
      navigate(`/gym/${gymCode}`);
    }
  };

  const handleCodeClick = (e: React.MouseEvent, gymCode: string) => {
    e.stopPropagation();
    if (isDashboard && onScrollToGym) {
      onScrollToGym(gymCode);
    } else {
      navigate(`/gym/${gymCode}`);
    }
  };

  const handleProfileClick = (e: React.MouseEvent, gymCode: string) => {
    e.stopPropagation();
    navigate(`/gym/${gymCode}`);
  };

  if (gyms.length === 0) return null;

  return (
    <div
      className="flex flex-nowrap gap-5 px-6 py-3 justify-center overflow-x-auto rounded-none"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--brand-white)), hsl(var(--brand-rose-gold) / 0.12))',
        borderBottom: '1px solid hsl(var(--brand-rose-gold) / 0.22)',
        boxShadow: '0 10px 22px -18px hsl(var(--brand-navy) / 0.35), inset 0 -1px 0 hsl(var(--brand-rose-gold) / 0.14)',
      }}
    >
      {!isDashboard && (
        <div
          onClick={() => navigate('/')}
          className="flex flex-col items-center gap-1 px-2 py-2 cursor-pointer rounded-xl transition-all duration-300"
          style={{
            border: '2px solid hsl(var(--brand-rose-gold) / 0.35)',
            background: 'linear-gradient(180deg, hsl(var(--brand-white)), hsl(var(--brand-rose-gold) / 0.08))',
            boxShadow: '0 12px 20px -18px hsl(var(--brand-navy) / 0.35), 0 6px 14px -12px hsl(var(--brand-rose-gold) / 0.75)',
            minWidth: '56px',
          }}
          title="Back to Dashboard"
        >
          <div className="w-11 h-11 flex items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold-dark)))', boxShadow: '0 10px 18px -14px hsl(var(--brand-rose-gold) / 0.8)' }}>
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-bold tracking-wider" style={{ color: 'hsl(var(--brand-navy) / 0.72)' }}>
            HOME
          </span>
        </div>
      )}

      {gyms.map((gym) => {
        const isSelected = isDashboard
          ? selectedGyms?.has(gym.code) ?? false
          : gym.code === activeGymCode;
        const primaryColor = gym.colors[0]?.color_hex || '#667eea';
        const mainLogo = gym.logos.find(l => l.is_main_logo);
        const logoUrl = mainLogo?.file_url || gym.logos[0]?.file_url;

        return (
          <div
            key={gym.id}
            onClick={() => handlePillClick(gym.code)}
            className={cn(
              "group flex flex-col items-center gap-1 px-2 py-2 cursor-pointer",
              "rounded-xl transition-all duration-300 relative",
              isSelected ? "scale-105" : "hover:scale-102"
            )}
            style={{
              border: isSelected ? `3px solid ${primaryColor}` : '2px solid hsl(var(--brand-rose-gold) / 0.3)',
              background: '#ffffff',
              boxShadow: isSelected
                ? `0 4px 15px ${primaryColor}40, 0 2px 6px rgba(0,0,0,0.15)`
                : '0 2px 8px rgba(0,0,0,0.08)',
              minWidth: '60px',
            }}
            title={isDashboard
              ? `${isSelected ? 'Deselect' : 'Select'} ${gym.name}`
              : `Go to ${gym.name}`
            }
          >
            {/* Checkmark badge */}
            {isSelected && (
              <div
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center z-10"
                style={{ backgroundColor: primaryColor }}
              >
                <Check className="w-3 h-3 text-white" />
              </div>
            )}

            {/* Profile link overlay (dashboard only) */}
            {isDashboard && (
              <div
                className="absolute bottom-6 right-0.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 cursor-pointer"
                style={{ backgroundColor: primaryColor }}
                onClick={(e) => handleProfileClick(e, gym.code)}
                title={`Go to ${gym.name} profile`}
              >
                <ExternalLink className="w-3 h-3 text-white" />
              </div>
            )}

            {/* Logo thumbnail */}
            <div className="w-11 h-11 flex items-center justify-center rounded-lg overflow-hidden">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={gym.code}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {gym.code}
                </div>
              )}
            </div>

            {/* Gym code */}
            <span
              className="text-[10px] font-bold tracking-wider cursor-pointer hover:underline"
              style={{ color: isSelected ? primaryColor : 'hsl(var(--brand-navy) / 0.6)' }}
              onClick={(e) => handleCodeClick(e, gym.code)}
              title={isDashboard ? `Scroll to ${gym.code} card` : `Go to ${gym.code}`}
            >
              {gym.code}
            </span>
          </div>
        );
      })}
    </div>
  );
};
