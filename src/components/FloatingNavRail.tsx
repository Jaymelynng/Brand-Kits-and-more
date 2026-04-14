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
        background: "hsl(var(--brand-white))",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1)",
        border: "1px solid hsl(var(--brand-rose-gold) / 0.2)",
      }}
    >
      {/* Home / Dashboard */}
      <button
        onClick={() => navigate("/")}
        className={buttonBase}
        style={{
          background: "hsl(var(--brand-navy))",
          color: "hsl(var(--brand-white))",
        }}
        title="Back to Dashboard"
      >
        <Home className="w-4.5 h-4.5" />
      </button>

      {/* Scroll to top */}
      <button
        onClick={scrollToTop}
        className={buttonBase}
        style={{
          background: "hsl(var(--brand-rose-gold) / 0.12)",
          color: "hsl(var(--brand-navy))",
        }}
        title="Scroll to top"
      >
        <ChevronUp className="w-5 h-5" />
      </button>

      {/* Scroll to bottom */}
      <button
        onClick={scrollToBottom}
        className={buttonBase}
        style={{
          background: "hsl(var(--brand-rose-gold) / 0.12)",
          color: "hsl(var(--brand-navy))",
        }}
        title="Scroll to bottom"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
};
