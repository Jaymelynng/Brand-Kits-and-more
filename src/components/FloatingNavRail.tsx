import { Home, ChevronUp, ChevronDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const FloatingNavRail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on dashboard
  if (location.pathname === "/") return null;

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

  const buttonBase =
    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer";

  return (
    <div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 p-1.5 rounded-full"
      style={{
        background: "linear-gradient(180deg, hsl(var(--brand-white)), hsl(var(--brand-rose-gold) / 0.14))",
        boxShadow: "0 16px 34px -18px hsl(var(--brand-navy) / 0.4), 0 10px 18px -14px hsl(var(--brand-rose-gold) / 0.65)",
        border: "1px solid hsl(var(--brand-rose-gold) / 0.28)",
      }}
    >
      <button
        onClick={() => navigate("/")}
        className={buttonBase}
        style={{
          background: "linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold-dark)))",
          color: "hsl(var(--brand-white))",
          boxShadow: "0 10px 20px -14px hsl(var(--brand-rose-gold) / 0.9)",
        }}
        title="Back to Dashboard"
      >
        <Home className="w-4.5 h-4.5" />
      </button>

      <button
        onClick={scrollToTop}
        className={buttonBase}
        style={{
          background: "hsl(var(--brand-white))",
          color: "hsl(var(--brand-navy))",
          boxShadow: "inset 0 1px 0 hsl(var(--brand-white)), 0 8px 14px -12px hsl(var(--brand-navy) / 0.4)",
        }}
        title="Scroll to top"
      >
        <ChevronUp className="w-5 h-5" />
      </button>

      <button
        onClick={scrollToBottom}
        className={buttonBase}
        style={{
          background: "hsl(var(--brand-white))",
          color: "hsl(var(--brand-navy))",
          boxShadow: "inset 0 1px 0 hsl(var(--brand-white)), 0 8px 14px -12px hsl(var(--brand-navy) / 0.4)",
        }}
        title="Scroll to bottom"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
};
