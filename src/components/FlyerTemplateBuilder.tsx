import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface TemplateZone {
  x: number;
  y: number;
  width?: number;
  height?: number;
  size?: number;
  font?: string;
  color?: string;
  align?: string;
}

interface TemplateZones {
  logo?: TemplateZone;
  gymName?: TemplateZone;
  phone?: TemplateZone;
  email?: TemplateZone;
  website?: TemplateZone;
  address?: TemplateZone;
  qrCode?: TemplateZone;
}

interface FlyerTemplateBuilderProps {
  onSave: (zones: TemplateZones) => void;
}

export function FlyerTemplateBuilder({ onSave }: FlyerTemplateBuilderProps) {
  const [zones, setZones] = useState<TemplateZones>({
    logo: { x: 115, y: 245, width: 150, height: 150 },
    gymName: { x: 250, y: 350, font: 'bold 32px serif', color: '#000000', align: 'center' },
    phone: { x: 558, y: 1200, font: '20px sans-serif', color: '#000000' },
    email: { x: 198, y: 1200, font: '20px sans-serif', color: '#000000' },
    website: { x: 400, y: 1250, font: '18px sans-serif', color: '#333333' },
    address: { x: 400, y: 1280, font: '16px sans-serif', color: '#666666' },
    qrCode: { x: 665, y: 525, size: 120 },
  });

  const handleSave = () => {
    onSave(zones);
    toast.success('Template zones saved!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flyer Template Zone Editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(zones).map(([key, zone]) => (
            <div key={key} className="space-y-2 p-4 border rounded-lg">
              <h4 className="font-semibold capitalize">{key}</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">X</Label>
                  <Input
                    type="number"
                    value={zone.x}
                    onChange={(e) => setZones(prev => ({
                      ...prev,
                      [key]: { ...zone, x: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Y</Label>
                  <Input
                    type="number"
                    value={zone.y}
                    onChange={(e) => setZones(prev => ({
                      ...prev,
                      [key]: { ...zone, y: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                {'width' in zone && (
                  <div>
                    <Label className="text-xs">Width</Label>
                    <Input
                      type="number"
                      value={zone.width}
                      onChange={(e) => setZones(prev => ({
                        ...prev,
                        [key]: { ...zone, width: parseInt(e.target.value) }
                      }))}
                    />
                  </div>
                )}
                {'height' in zone && (
                  <div>
                    <Label className="text-xs">Height</Label>
                    <Input
                      type="number"
                      value={zone.height}
                      onChange={(e) => setZones(prev => ({
                        ...prev,
                        [key]: { ...zone, height: parseInt(e.target.value) }
                      }))}
                    />
                  </div>
                )}
                {'size' in zone && (
                  <div>
                    <Label className="text-xs">Size</Label>
                    <Input
                      type="number"
                      value={zone.size}
                      onChange={(e) => setZones(prev => ({
                        ...prev,
                        [key]: { ...zone, size: parseInt(e.target.value) }
                      }))}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <Button onClick={handleSave} className="w-full">
          Save Template Zones
        </Button>
      </CardContent>
    </Card>
  );
}
