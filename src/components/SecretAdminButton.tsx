import { cn } from "@/lib/utils";

interface SecretAdminButtonProps {
  onClick: () => void;
}

export const SecretAdminButton = ({ onClick }: SecretAdminButtonProps) => {
  return (
    <div className="flex justify-center mt-2">
      <div
        className={cn(
          "w-6 h-6 transform rotate-45 cursor-pointer transition-all duration-300",
          "relative overflow-hidden",
          "hover:scale-110 hover:rotate-[50deg]",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/30 before:via-transparent before:to-transparent"
        )}
        style={{
          background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-rose-gold) / 0.8))',
          boxShadow: '0 2px 8px hsl(var(--brand-rose-gold) / 0.3), inset 0 0 10px rgba(255,255,255,0.2)',
        }}
        onClick={onClick}
        title="Admin Toolkit"
      >
        {/* Central highlight */}
        <div className="absolute inset-0.5 bg-gradient-to-br from-white/25 to-transparent rounded-sm" />
      </div>
    </div>
  );
};
