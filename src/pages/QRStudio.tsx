import { useState } from "react";
import { QRStudioLayout } from "@/components/qr-studio/QRStudioLayout";
import { QRScanner } from "@/components/qr-studio/QRScanner";
import { QRGenerator } from "@/components/qr-studio/QRGenerator";
import { QRLibrary } from "@/components/qr-studio/QRLibrary";

const QRStudio = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'generate' | 'library'>('generate');

  return (
    <QRStudioLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'scan' && <QRScanner />}
      {activeTab === 'generate' && <QRGenerator />}
      {activeTab === 'library' && <QRLibrary />}
    </QRStudioLayout>
  );
};

export default QRStudio;
