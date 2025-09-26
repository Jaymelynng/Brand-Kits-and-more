import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GymWithColors, useUpdateGymColor, useUploadLogo, useSetMainLogo, useDeleteLogo } from "@/hooks/useGyms";
import { Upload, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface GymCardProps {
  gym: GymWithColors;
  editMode: boolean;
}

export const GymCard = ({ gym, editMode }: GymCardProps) => {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const updateColorMutation = useUpdateGymColor();
  const uploadLogoMutation = useUploadLogo();
  const setMainLogoMutation = useSetMainLogo();
  const deleteLogoMutation = useDeleteLogo();

  const showCopyFeedback = (key: string, message: string) => {
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    toast({
      description: message,
      duration: 2000,
    });
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const copyColor = (colorCode: string, includeHash: boolean = true) => {
    const textToCopy = includeHash ? colorCode : colorCode.replace('#', '');
    navigator.clipboard.writeText(textToCopy).then(() => {
      const message = includeHash ? 'Copied with #!' : 'Copied HEX!';
      showCopyFeedback(`${colorCode}-${includeHash}`, message);
    });
  };

  const copyGymColors = (includeHash: boolean = true) => {
    const colors = gym.colors.map(color => 
      includeHash ? color.color_hex : color.color_hex.replace('#', '')
    );
    const colorText = `${gym.name} (${gym.code}):\n${colors.join('\n')}`;
    
    navigator.clipboard.writeText(colorText).then(() => {
      const message = includeHash ? `${gym.code} Colors Copied!` : `${gym.code} Colors Copied (No #)!`;
      showCopyFeedback(`gym-${gym.code}-${includeHash}`, message);
    });
  };

  const editColor = (colorId: string, currentColor: string) => {
    if (!editMode) return;
    
    const input = document.createElement('input');
    input.type = 'color';
    input.value = currentColor;
    input.style.display = 'none';
    
    input.onchange = function() {
      updateColorMutation.mutate({ 
        colorId, 
        newColor: input.value 
      });
      document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
    input.click();
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const mainLogo = gym.logos.find(logo => logo.is_main_logo);
    
    files.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        uploadLogoMutation.mutate({
          gymId: gym.id,
          file,
          isMain: !mainLogo && index === 0,
        });
      }
    });
  };

  const setMainLogo = (logoId: string) => {
    setMainLogoMutation.mutate({ gymId: gym.id, logoId });
  };

  const deleteLogo = (logoId: string) => {
    deleteLogoMutation.mutate(logoId);
  };

  const viewGymProfile = () => {
    alert(`Gym Profile for ${gym.code} - This will open a detailed profile with additional gym information, contact details, and brand guidelines.`);
  };

  const mainLogo = gym.logos.find(logo => logo.is_main_logo);

  return (
    <div 
      className="bg-white rounded-lg shadow-md p-6 max-w-sm mx-auto"
      id={`gym-${gym.code}`}
    >
      <div className="gym-header mb-4 text-left">
        <h3 className="text-lg font-semibold text-gray-700 mb-1">{gym.name}</h3>
        <span 
          className="inline-block px-3 py-1 rounded-full text-white text-sm font-medium"
          style={{ backgroundColor: '#A4968A' }}
        >
          {gym.code}
        </span>
      </div>

      {/* Main Logo Display */}
      <div className="main-logo-display mb-4">
        <div 
          className="main-logo-frame w-full h-24 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-gray-400"
          onClick={triggerFileUpload}
        >
          {mainLogo ? (
            <img 
              src={mainLogo.file_url} 
              alt="Main logo" 
              className="max-h-20 max-w-full object-contain"
            />
          ) : (
            <div className="text-gray-400 text-center text-sm">
              Click to add main<br />logo
            </div>
          )}
        </div>
      </div>

      {/* Color Swatches */}
      <div className="color-rows space-y-2 mb-4">
        {gym.colors.map((color) => (
          <div key={color.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded border cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: color.color_hex }}
                onClick={() => editColor(color.id, color.color_hex)}
              />
              <span className="text-sm font-mono text-gray-600 select-all">
                {color.color_hex}
              </span>
            </div>
            
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyColor(color.color_hex, true)}
                className="px-2 py-1 h-7 text-xs"
                title="Copy with #"
              >
                #
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyColor(color.color_hex, false)}
                className="px-2 py-1 h-7 text-xs"
                title="Copy without #"
              >
                HEX
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Copy Buttons */}
      <div className="space-y-2 mb-4">
        <Button
          onClick={() => copyGymColors(true)}
          className="w-full text-sm py-2"
          style={{ backgroundColor: '#A4968A', color: 'white' }}
        >
          Copy All {gym.code} Colors
        </Button>
        <Button
          onClick={() => copyGymColors(false)}
          className="w-full text-sm py-2"
          style={{ backgroundColor: '#7A9CB8', color: 'white' }}
        >
          Copy {gym.code} Colors (No #)
        </Button>

        <Button
          onClick={viewGymProfile}
          className="w-full text-sm py-2"
          style={{ backgroundColor: '#B5A7C4', color: 'white' }}
        >
          View {gym.code} Profile
        </Button>
      </div>

      {/* Logo Upload Section */}
      {gym.logos.length > 0 && (
        <div className="logo-grid grid grid-cols-3 gap-2 mb-4">
          {gym.logos.map((logo) => (
            <div key={logo.id} className="relative group bg-gray-50 rounded p-1">
              <img 
                src={logo.file_url} 
                alt={logo.filename}
                className="w-full h-12 object-contain cursor-pointer"
                onClick={() => setMainLogo(logo.id)}
                title="Click to set as main logo"
              />
              <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMainLogo(logo.id)}
                  className={cn(
                    "p-1 h-5 w-5 text-xs",
                    logo.is_main_logo && "bg-yellow-100"
                  )}
                  title="Set as main logo"
                >
                  <Star className="w-2 h-2" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteLogo(logo.id)}
                  className="p-1 h-5 w-5 text-xs text-red-500"
                  title="Delete logo"
                >
                  <X className="w-2 h-2" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};