import { ArrowLeft, QrCode, ScanLine, Layers, Library } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <QrCode className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold text-foreground">QR Studio</h1>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
};
