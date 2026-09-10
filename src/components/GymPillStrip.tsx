import { useEffect, useRef } from "react";
import { useGyms } from "@/hooks/useGyms";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ExternalLink, Home } from "lucide-react";

interface GymPillStripProps {
  // Dashboard mode props (only used on front page)
  selectedGyms?: Set<string>;
  onToggleGymSelection?: (gymCode: string) => void;
  onScrollToGym?: (gymCode: string) => void;
}

const SHELL = "#161C24";
const ACCENT = "#16B8A0";

/**
 * The strip is near-black, so a dark brand colour glows invisibly against it.
 * Lift any colour to a fixed high lightness, keeping its hue, so every gym's
 * glow reads - navy gyms included - while still looking like their own colour.
 */
const glowOf = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#7FD8FF";
  const n = parseInt(m[1], 16);
  let [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const max = Math.max(r, g, b);
  if (max < 200) {
    const k = 200 / Math.max(max, 1);
    [r, g, b] = [r * k, g * k, b * k].map((v) => Math.min(255, Math.round(v))) as number[];
  }
  // pull it toward white a little so even a saturated hue stays luminous
  [r, g, b] = [r, g, b].map((v) => Math.round(v + (255 - v) * 0.25));
  // MUST be hex: callers append an alpha suffix like `${glow}55`, and
  // "rgb(...)55" is invalid CSS - the browser silently drops the whole
  // declaration and the glow never appears.
  const h = (v: number) => v.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
};

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

  // Publish this strip's real height so the bar below can pin directly under
  // it. A hardcoded offset breaks the moment the tiles change size.
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty("--strip-h", `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gyms.length]);

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
      ref={stripRef}
      className="sticky top-0 z-50 flex flex-nowrap items-center justify-center gap-x-2 px-4 py-3"
      style={{
        background: `linear-gradient(180deg, #1B222B 0%, ${SHELL} 60%, #10151B 100%)`,
        borderBottom: "1px solid #0A0E13",
        boxShadow:
          "0 14px 28px -12px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
    >
      {/* Say what this row IS, at a size that can actually be read. */}
      {isDashboard && (
        <div
          className="mr-2 flex shrink-0 flex-col justify-center pr-4"
          style={{ borderRight: "1px solid #2B3945" }}
        >
          <span
            className="text-[11px] font-extrabold leading-none tracking-[0.2em]"
            style={{ color: ACCENT }}
          >
            BULK
          </span>
          <span className="mt-1.5 flex items-baseline gap-1 leading-none">
            <span className="text-[26px] font-extrabold text-white">
              {selectedGyms?.size ?? 0}
            </span>
            <span className="text-[13px] font-bold text-slate-400">/ {gyms.length}</span>
          </span>
        </div>
      )}

      {!isDashboard && (
        <div
          onClick={() => navigate("/")}
          className="flex min-w-0 flex-1 cursor-pointer flex-col items-stretch gap-1"
          style={{ maxWidth: 76 }}
          title="Back to Dashboard"
        >
          <div
            className="flex items-center justify-center rounded-lg transition-all duration-150 active:translate-y-[2px]"
            style={{
              height: "clamp(40px, 4.2vw, 56px)",
              background: "#FFFFFF",
              border: "2.5px solid #FFFFFF",
              boxShadow: "0 3px 0 #0A0E13, 0 5px 12px rgba(0,0,0,0.5)",
            }}
          >
            <Home className="h-5 w-5" style={{ color: SHELL }} />
          </div>
          <span
            className="rounded-full py-1 text-center text-[9px] font-extrabold leading-none tracking-[0.1em] text-white"
            style={{ background: "#4A5A6A", boxShadow: "0 2px 6px rgba(0,0,0,0.5)" }}
          >
            HOME
          </span>
        </div>
      )}

      {gyms.map((gym) => {
        const isSelected = isDashboard
          ? selectedGyms?.has(gym.code) ?? false
          : gym.code === activeGymCode;
        const primaryColor = gym.colors[0]?.color_hex || "#334155";
        const glow = glowOf(primaryColor);
        const mainLogo = gym.logos.find((l) => l.is_main_logo);
        const logoUrl = mainLogo?.file_url || gym.logos[0]?.file_url;

        return (
          <div key={gym.id} className="group flex min-w-0 flex-1 flex-col items-stretch gap-1"
            style={{ maxWidth: 76 }}>
            {/* Logo tile — click to select */}
            <button
              onClick={() => handlePillClick(gym.code)}
              title={
                isDashboard
                  ? `${isSelected ? "Deselect" : "Select"} ${gym.name}`
                  : `Go to ${gym.name}`
              }
              className="relative flex items-center justify-center rounded-lg px-1.5 py-1 active:translate-y-[2px]"
              style={{
                height: "clamp(40px, 4.2vw, 56px)",
                // Picked = a ring plus a real halo in the gym's own colour,
                // lifted off the strip. The strip no longer scrolls, so nothing
                // clips the halo.
                background: "#FFFFFF",
                border: `3px solid ${isSelected ? glow : "#E3E8EE"}`,
                boxShadow: isSelected
                  ? `0 0 0 4px ${glow}55, 0 0 24px 4px ${glow}, 0 0 48px 12px ${glow}66, 0 5px 0 #0A0E13`
                  : "0 2px 0 #0A0E13",
                opacity: 1,
                transform: isSelected ? "translateY(-3px) scale(1.05)" : "none",
                transition: "box-shadow 220ms ease, transform 220ms ease, background 220ms ease, border-color 220ms ease",
              }}
            >
              {isDashboard && (
                <span
                  className="absolute -right-1 -top-1 z-10 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ backgroundColor: primaryColor }}
                  onClick={(e) => handleProfileClick(e, gym.code)}
                  title={`Go to ${gym.name} profile`}
                >
                  <ExternalLink className="h-2.5 w-2.5 text-white" />
                </span>
              )}

              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={gym.code}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-[9px] font-bold text-slate-400">{gym.code}</span>
              )}
            </button>

            {/* Code label — click to jump to that gym */}
            <button
              onClick={(e) => handleCodeClick(e, gym.code)}
              title={isDashboard ? `Scroll to ${gym.code}` : `Go to ${gym.code}`}
              className="rounded-full py-1 text-center text-[10px] font-extrabold leading-none tracking-[0.1em] transition-transform duration-150 hover:scale-105"
              style={{
                // Always filled. The halo on the tile above already says what is
                // picked, so the label does not need to carry state too - it
                // just names the gym in the gym's colour.
                background: glow,
                color: "#0A0E13",
                border: `1.5px solid ${glow}`,
              }}
            >
              {gym.code}
            </button>
          </div>
        );
      })}
    </div>
  );
};
