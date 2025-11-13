import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FlyerGeneratorProps {
  templateUrl: string;
  templateZones: any;
  gymData: {
    name: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    logoUrl: string;
    primaryColor: string;
  };
  onGenerated?: (blob: Blob) => void;
}

export function FlyerGenerator({ 
  templateUrl, 
  templateZones, 
  gymData, 
  onGenerated 
}: FlyerGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const generateFlyer = async () => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    setGenerating(true);

    try {
      // Load template
      const templateImg = await loadImage(templateUrl);
      canvas.width = templateImg.width;
      canvas.height = templateImg.height;
      ctx.drawImage(templateImg, 0, 0);

      // Draw logo
      if (templateZones.logo && gymData.logoUrl) {
        const logoImg = await loadImage(gymData.logoUrl);
        const logoZone = templateZones.logo;
        ctx.drawImage(logoImg, logoZone.x, logoZone.y, logoZone.width, logoZone.height);
      }

      // Draw gym name
      if (templateZones.gymName) {
        const nameZone = templateZones.gymName;
        ctx.font = nameZone.font;
        ctx.fillStyle = gymData.primaryColor || nameZone.color;
        ctx.textAlign = nameZone.align as CanvasTextAlign;
        ctx.fillText(gymData.name, nameZone.x, nameZone.y);
      }

      // Draw contact info
      if (templateZones.phone && gymData.phone) {
        const phoneZone = templateZones.phone;
        ctx.font = phoneZone.font;
        ctx.fillStyle = phoneZone.color;
        ctx.textAlign = 'left';
        ctx.fillText(gymData.phone, phoneZone.x, phoneZone.y);
      }

      if (templateZones.email && gymData.email) {
        const emailZone = templateZones.email;
        ctx.font = emailZone.font;
        ctx.fillStyle = emailZone.color;
        ctx.textAlign = 'left';
        ctx.fillText(gymData.email, emailZone.x, emailZone.y);
      }

      if (templateZones.website && gymData.website) {
        const websiteZone = templateZones.website;
        ctx.font = websiteZone.font;
        ctx.fillStyle = websiteZone.color;
        ctx.textAlign = 'left';
        ctx.fillText(gymData.website, websiteZone.x, websiteZone.y);
      }

      if (templateZones.address && gymData.address) {
        const addressZone = templateZones.address;
        ctx.font = addressZone.font;
        ctx.fillStyle = addressZone.color;
        ctx.textAlign = 'left';
        ctx.fillText(gymData.address, addressZone.x, addressZone.y);
      }

      // Generate and draw QR code
      if (templateZones.qrCode && gymData.website) {
        const qrCodeDataUrl = await QRCode.toDataURL(gymData.website);
        const qrImg = await loadImage(qrCodeDataUrl);
        const qrZone = templateZones.qrCode;
        ctx.drawImage(qrImg, qrZone.x, qrZone.y, qrZone.size, qrZone.size);
      }

      // Generate preview
      const previewDataUrl = canvas.toDataURL('image/png');
      setPreviewUrl(previewDataUrl);

      // Generate blob
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    } catch (error) {
      console.error('Error generating flyer:', error);
      toast.error('Failed to generate flyer');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    generateFlyer().then(blob => {
      if (blob && onGenerated) {
        onGenerated(blob);
      }
    });
  }, [templateUrl, gymData]);

  const downloadFlyer = async () => {
    const blob = await generateFlyer();
    if (!blob) return;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${gymData.name.replace(/\s+/g, '_')}_flyer.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Flyer downloaded!');
  };

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />
      
      {previewUrl && (
        <div className="border rounded-lg overflow-hidden">
          <img src={previewUrl} alt="Flyer Preview" className="w-full" />
        </div>
      )}

      <Button 
        onClick={downloadFlyer} 
        disabled={generating}
        className="w-full"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Download Flyer
          </>
        )}
      </Button>
    </div>
  );
}
