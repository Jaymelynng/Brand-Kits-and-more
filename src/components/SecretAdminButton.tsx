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
          "transform rotate-45 cursor-pointer transition-all duration-300 shrink-0",
          "relative overflow-hidden border",
          "hover:scale-110 hover:rotate-[50deg]",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/30 before:via-transparent before:to-transparent",
          isAdmin ? "w-7 h-7 opacity-100" : "w-6 h-6 opacity-95 hover:opacity-100"
        )}
        style={{
          background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold) / 0.82))',
          borderColor: 'hsl(var(--brand-navy) / 0.22)',
          boxShadow: isAdmin
            ? '0 4px 14px hsl(var(--brand-rose-gold) / 0.55), 0 1px 0 hsl(var(--brand-white) / 0.8) inset'
            : '0 3px 10px hsl(var(--brand-rose-gold) / 0.35), 0 1px 0 hsl(var(--brand-white) / 0.75) inset',
        }}
        onClick={onClick}
        title="Admin Toolkit"
      >
        <div className="absolute inset-0.5 bg-gradient-to-br from-white/25 to-transparent rounded-sm" />
      </div>
    </div>
  );
};
