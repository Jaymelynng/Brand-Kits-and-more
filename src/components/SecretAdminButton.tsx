import { cn } from "@/lib/utils";

interface SecretAdminButtonProps {
  onClick: () => void;
  isAdmin?: boolean;
}

export const SecretAdminButton = ({ onClick, isAdmin }: SecretAdminButtonProps) => {
  return (
    <div className="flex justify-center mt-2">
      <div
        className={cn(
          "transform rotate-45 cursor-pointer transition-all duration-300",
          "relative overflow-hidden",
          "hover:scale-110 hover:rotate-[50deg]",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/30 before:via-transparent before:to-transparent",
          isAdmin ? "w-7 h-7" : "w-5 h-5 opacity-60 hover:opacity-100"
        )}
        style={{
          background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold) / 0.8))',
          boxShadow: isAdmin
            ? '0 2px 12px hsl(var(--brand-rose-gold) / 0.5), inset 0 0 10px rgba(255,255,255,0.2)'
            : '0 1px 4px hsl(var(--brand-rose-gold) / 0.2)',
        }}
        onClick={onClick}
        title="Admin Toolkit"
      >
        <div className="absolute inset-0.5 bg-gradient-to-br from-white/25 to-transparent rounded-sm" />
      </div>
    </div>
  );
};
