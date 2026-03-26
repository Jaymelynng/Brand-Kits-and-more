import { ArrowLeft, QrCode, ScanLine, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface QRStudioLayoutProps {
  children: React.ReactNode;
  activeTab: 'scan' | 'generate' | 'library';
  onTabChange: (tab: 'scan' | 'generate' | 'library') => void;
}

export const QRStudioLayout = ({ children, activeTab, onTabChange }: QRStudioLayoutProps) => {
  const navigate = useNavigate();

  const tabs = [
    { id: 'scan' as const, label: 'Scan', icon: ScanLine },
    { id: 'generate' as const, label: 'Generate', icon: QrCode },
    { id: 'library' as const, label: 'Library', icon: Library },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, hsl(var(--brand-white)), hsl(var(--brand-rose-gold) / 0.06))' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(to bottom, hsl(var(--brand-white)), hsl(var(--brand-rose-gold) / 0.12))',
        borderBottom: '2px solid hsl(var(--brand-rose-gold) / 0.25)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-8 text-xs"
              style={{ color: 'hsl(var(--brand-navy) / 0.7)' }}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <div className="h-5 w-px" style={{ background: 'hsl(var(--brand-rose-gold) / 0.3)' }} />
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md" style={{ background: 'hsl(var(--brand-rose-gold) / 0.15)' }}>
                <QrCode className="h-4 w-4" style={{ color: 'hsl(var(--brand-rose-gold))' }} />
              </div>
              <h1 className="text-base font-bold" style={{ color: 'hsl(var(--brand-navy))' }}>QR Studio</h1>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 transition-all duration-200"
                style={{
                  borderColor: activeTab === tab.id ? 'hsl(var(--brand-rose-gold))' : 'transparent',
                  color: activeTab === tab.id ? 'hsl(var(--brand-navy))' : 'hsl(var(--brand-navy) / 0.45)',
                }}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {children}
      </div>
    </div>
  );
};
