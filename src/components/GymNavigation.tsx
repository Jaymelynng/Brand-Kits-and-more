import { Button } from "@/components/ui/button";
import { SecretAdminButton } from "./SecretAdminButton";
import { LogOut, Layers, Palette, Check, ExternalLink, QrCode } from "lucide-react";
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
      <div className="flex items-center justify-between py-2 px-6 shadow-sm" style={{ 
        background: 'linear-gradient(to bottom, hsl(var(--brand-white)), hsl(var(--brand-rose-gold) / 0.12))',
        borderBottom: '2px solid hsl(var(--brand-rose-gold) / 0.25)'
      }}>
        <div className="flex-1" />
        <div className="text-center">
          <h1 className="text-xl font-bold flex items-center justify-center gap-2" style={{ color: 'hsl(var(--brand-navy))' }}>
            <Palette className="w-5 h-5" />
            Bulk Brand Center
          </h1>
          <p className="text-xs" style={{ color: 'hsl(var(--brand-navy) / 0.7)' }}>
            Select gyms, copy colors, and manage your brand portfolio
          </p>
        </div>
        <div className="flex-1 flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/qr-studio')}
            className="text-xs px-2 py-1 h-7 opacity-60 hover:opacity-100"
            style={{ color: 'hsl(var(--brand-navy))' }}
          >
            <QrCode className="w-3.5 h-3.5 mr-1" />
            QR Studio
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/assets')}
            className="text-xs px-2 py-1 h-7 opacity-60 hover:opacity-100"
            style={{ color: 'hsl(var(--brand-navy))' }}
          >
            <Layers className="w-3.5 h-3.5 mr-1" />
            Assets
          </Button>
          <SecretAdminButton onClick={onAdminClick} isAdmin={isAdmin} />
          {user && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onSignOut}
              className="text-xs px-2 py-1 h-7 opacity-60 hover:opacity-100"
              style={{ color: 'hsl(var(--brand-navy))' }}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Selection Dashboard */}
      <div className="py-2 px-6 shadow-md" style={{
        background: `linear-gradient(to bottom, hsl(var(--brand-rose-gold) / 0.15), hsl(var(--brand-blue-gray) / 0.1))`,
        borderBottom: '2px solid hsl(var(--brand-rose-gold) / 0.35)'
      }}>
        {/* Action Bar */}
        <div className="flex items-center justify-center gap-4 flex-wrap py-3 px-6 rounded-xl mb-3" style={{ 
          background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.25), hsl(var(--brand-rose-gold) / 0.15))',
          border: '1px solid hsl(var(--brand-rose-gold) / 0.3)'
        }}>
          {/* Select All */}
          <Button
            onClick={onSelectAllGyms}
            size="sm"
            className="px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] border-2"
            style={{
              borderColor: '#94a3b8',
              color: '#1e3a5f',
              background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
            }}
          >
            Select All
          </Button>

          {/* Clear All */}
          <Button
            onClick={onDeselectAllGyms}
            size="sm"
            className="px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] border-2"
            style={{
              borderColor: '#94a3b8',
              color: '#1e3a5f',
              background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
            }}
          >
            Clear All
          </Button>

          {/* Separator */}
          <div className="h-8 w-px" style={{ background: 'hsl(var(--brand-rose-gold) / 0.4)' }} />

          {/* Smart Copy Button */}
          <Button
            onClick={selectedCount > 0 ? onCopySelected : onCopyAll}
            size="sm"
            className="px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] border-2"
            style={{
              borderColor: '#a07070',
              color: 'white',
              background: 'linear-gradient(135deg, #c9a88c, #b48f8f)',
              boxShadow: '0 4px 14px rgba(180,143,143,0.5), 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            {selectedCount > 0 ? `Copy Colors (${selectedCount})` : 'Copy All Colors'}
          </Button>
        </div>

        {/* Selection Counter - Small at Bottom */}
        <div className="flex justify-center">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold border-2 shadow-sm"
            style={{
              borderColor: 'hsl(var(--brand-rose-gold))',
              color: 'hsl(var(--brand-navy))',
              backgroundColor: 'hsl(var(--brand-rose-gold) / 0.18)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {selectedCount} of {totalCount} gyms selected
          </div>
        </div>
      </div>
    </>
  );
};
