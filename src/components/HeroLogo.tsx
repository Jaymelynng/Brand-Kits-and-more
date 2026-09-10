interface HeroLogoProps {
  logoUrl?: string;
  name: string;
  /** The gym's primary colour — drives the glow and the slash. */
  color: string;
  /** True over a video, where everything has to read white. */
  onDark?: boolean;
  /**
   * An animated version of the mark, rendered on pure black. It is composited
   * with mix-blend-mode:screen, which drops every black pixel to nothing — so
   * the animation plays over the gym footage with no box around it. When this
   * is present it replaces the still image and the CSS claw pass entirely.
   */
  animationUrl?: string;
  /** Tap target for the hidden admin gesture. */
  onTap?: () => void;
  /** Taps still needed, once the person is clearly doing it on purpose. */
  tapsLeft?: number | null;
}

/**
 * The mark arrives, gets clawed, and the name settles under it.
 *
 * The logo already says the gym's name, so the type underneath is deliberately
 * small and letterspaced — a caption, not a second headline competing with it.
 */
export const HeroLogo = ({ logoUrl, name, color, onDark = false, animationUrl, onTap, tapsLeft }: HeroLogoProps) => {
  const showStill = !animationUrl && logoUrl;
  return (
    <div
      className="relative flex flex-col items-center justify-center"
      onClick={onTap}
      style={{ cursor: onTap ? "default" : undefined }}
    >
      <style>{`
        @keyframes tigSlideIn {
          0%   { opacity: 0; transform: translateX(-90px) rotate(-4deg) scale(0.9); }
          70%  { opacity: 1; transform: translateX(6px) rotate(0.8deg) scale(1.02); }
          100% { opacity: 1; transform: translateX(0) rotate(0) scale(1); }
        }
        /* the hit: mark recoils when the claws land */
        @keyframes tigRecoil {
          0%, 100% { transform: translate(0,0); }
          20%      { transform: translate(7px,-4px) rotate(1.1deg); }
          45%      { transform: translate(-5px,3px) rotate(-0.7deg); }
          70%      { transform: translate(2px,-1px); }
        }
        @keyframes tigGlow {
          0%, 100% { opacity: 0.18; transform: scale(1); }
          50%      { opacity: 0.34; transform: scale(1.08); }
        }
        @keyframes tigNameUp {
          0%   { opacity: 0; transform: translateY(14px); letter-spacing: 0.5em; }
          100% { opacity: 1; transform: translateY(0);    letter-spacing: 0.26em; }
        }
        @keyframes tigRuleOut { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }

        @media (prefers-reduced-motion: reduce) {
          .tig-mark, .tig-glow, .tig-name, .tig-rule {
            animation: none !important; opacity: 1 !important; transform: none !important;
          }
        }
      `}</style>

      {animationUrl && (
        <div className="relative mb-6 flex items-center justify-center">
          <video
            src={animationUrl}
            autoPlay
            loop
            muted
            playsInline
            className="relative w-auto max-w-[86vw] object-contain"
            style={{
              maxHeight: "clamp(150px, 26vh, 300px)",
              mixBlendMode: "screen",
            }}
          />
        </div>
      )}

      {showStill && (
        <div className="relative mb-6 flex items-center justify-center">
          <div
            className="tig-glow pointer-events-none absolute h-[200px] w-[300px] rounded-full md:h-[260px] md:w-[440px]"
            style={{
              background: `radial-gradient(ellipse, ${color}99 0%, ${color}2E 45%, transparent 70%)`,
              filter: "blur(40px)",
              animation: "tigGlow 5.5s ease-in-out infinite",
            }}
          />

          {/* the mark — slides in, then takes the hit */}
          <img
            src={logoUrl}
            alt={name}
            className="tig-mark relative max-h-[108px] w-auto max-w-[56vw] object-contain md:max-h-[150px]"
            style={{
              animation:
                "tigSlideIn 0.65s cubic-bezier(0.16,1,0.3,1) both",
              filter: onDark
                ? "drop-shadow(0 16px 34px rgba(0,0,0,0.6))"
                : "drop-shadow(0 14px 28px rgba(22,28,36,0.25))",
            }}
          />

        </div>
      )}

      {/* A caption, not a second headline. The mark already said the name. */}
      <h1
        className={`tig-name text-center text-[13px] font-bold uppercase md:text-[17px] ${
          onDark ? "text-white/95" : ""
        }`}
        style={{
          letterSpacing: "0.26em",
          animation: "tigNameUp 0.6s cubic-bezier(0.16,1,0.3,1) both",
          animationDelay: animationUrl ? "0.9s" : logoUrl ? "1.25s" : "0.15s",
          textShadow: onDark ? "0 2px 14px rgba(0,0,0,0.7)" : "none",
          color: onDark ? undefined : "hsl(var(--foreground))",
        }}
      >
        {name}
      </h1>

      {typeof tapsLeft === "number" && tapsLeft > 0 && (
        <span
          className="mt-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-widest"
          style={{ background: "rgba(0,0,0,0.55)", color: "#FFFFFF" }}
        >
          {tapsLeft} more
        </span>
      )}

      <div
        className="tig-rule mt-4 h-[3px] w-24 rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          animation: "tigRuleOut 0.6s cubic-bezier(0.16,1,0.3,1) both",
          animationDelay: animationUrl ? "1.2s" : logoUrl ? "1.55s" : "0.5s",
        }}
      />
    </div>
  );
};
