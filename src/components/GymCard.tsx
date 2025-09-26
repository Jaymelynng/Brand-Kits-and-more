import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GymWithColors, useUpdateGymColor, useUploadLogo, useSetMainLogo, useDeleteLogo } from "@/hooks/useGyms";
import { Upload, Star, X, Copy, Hash } from "lucide-react";
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
          isMain: !mainLogo && index === 0, // Set first uploaded logo as main if no main logo exists
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
      className={cn(
        "gym-card bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-xl transition-all duration-300",
        "hover:shadow-2xl hover:bg-white/95",
        editMode && "ring-2 ring-blue-400/50"
      )}
      id={`gym-${gym.code}`}
      style={{
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      }}
    >
      {editMode && (
        <Button
          variant="outline"
          size="sm"
          className="edit-btn absolute top-4 right-4 bg-blue-500/20 border-blue-300 text-blue-700 hover:bg-blue-500/30"
        >
          Edit
        </Button>
      )}

      <div className="gym-header mb-6">
        <h2 className="gym-name text-2xl font-bold text-gray-800 mb-1">{gym.name}</h2>
        <span className="gym-code text-lg font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          {gym.code}
        </span>
      </div>

      <div className="colors-panel space-y-6">
        {/* Main Logo Display */}
        <div className="main-logo-display">
          <div 
            className={cn(
              "main-logo-frame w-full h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer transition-all duration-200",
              !mainLogo && "hover:border-gray-400 hover:bg-gray-50",
              mainLogo && "border-solid border-gray-200 bg-gray-50"
            )}
            onClick={triggerFileUpload}
          >
            {mainLogo ? (
              <img 
                src={mainLogo.file_url} 
                alt="Main logo" 
                className="max-h-20 max-w-full object-contain"
              />
            ) : (
              <div className="text-gray-500 text-center">
                <Upload className="w-6 h-6 mx-auto mb-1" />
                <span className="text-sm">Click to add main logo</span>
              </div>
            )}
          </div>
        </div>

        {/* Color Swatches */}
        <div className="color-rows space-y-3">
          {gym.colors.map((color) => (
            <div key={color.id} className="color-row flex items-center justify-between bg-white/50 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div 
                  className="color-swatch w-8 h-8 rounded-lg border-2 border-white shadow-sm cursor-pointer transition-transform hover:scale-110"
                  style={{ backgroundColor: color.color_hex }}
                  onClick={() => editColor(color.id, color.color_hex)}
                />
                <span className="color-code font-mono text-gray-700 select-all cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                  {color.color_hex}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyColor(color.color_hex, true)}
                  className={cn(
                    "copy-btn with-hash px-2 py-1 h-8 transition-all duration-200",
                    copiedStates[`${color.color_hex}-true`] && "bg-green-100 text-green-700"
                  )}
                  title="Copy with #"
                >
                  <Hash className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyColor(color.color_hex, false)}
                  className={cn(
                    "copy-btn px-2 py-1 h-8 transition-all duration-200",
                    copiedStates[`${color.color_hex}-false`] && "bg-green-100 text-green-700"
                  )}
                  title="Copy without #"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Copy Buttons Row */}
        <div className="copy-buttons-row flex gap-3">
          <Button
            variant="outline"
            onClick={() => copyGymColors(true)}
            className={cn(
              "gym-copy-btn flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200",
              copiedStates[`gym-${gym.code}-true`] && "bg-green-100 text-green-700"
            )}
          >
            Copy All {gym.code} Colors
          </Button>
          <Button
            variant="outline"
            onClick={() => copyGymColors(false)}
            className={cn(
              "gym-copy-btn-no-hash flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200",
              copiedStates[`gym-${gym.code}-false`] && "bg-green-100 text-green-700"
            )}
          >
            Copy {gym.code} Colors (No #)
          </Button>
        </div>

        {/* Gym Profile Button */}
        <Button
          variant="default"
          onClick={viewGymProfile}
          className="gym-profile-btn w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
        >
          View {gym.code} Profile
        </Button>

        {/* Logo Upload Section */}
        <div className="logo-upload-section space-y-4">
          <div 
            className="logo-upload-area border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
            onClick={triggerFileUpload}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="text-gray-600">Upload additional logos or click to browse</div>
              <small className="text-gray-500">Supports JPG, PNG, SVG files</small>
            </div>
          </div>

          {/* Logo Grid */}
          {gym.logos.length > 0 && (
            <div className="logo-grid grid grid-cols-3 gap-3">
              {gym.logos.map((logo) => (
                <div key={logo.id} className="logo-item relative group bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-all duration-200">
                  <img 
                    src={logo.file_url} 
                    alt={logo.filename}
                    className="w-full h-16 object-contain cursor-pointer"
                    onClick={() => setMainLogo(logo.id)}
                    title="Click to set as main logo"
                  />
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMainLogo(logo.id)}
                      className={cn(
                        "set-main-logo p-1 h-6 w-6",
                        logo.is_main_logo && "bg-yellow-100 text-yellow-700"
                      )}
                      title="Set as main logo"
                    >
                      <Star className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteLogo(logo.id)}
                      className="delete-logo p-1 h-6 w-6 text-red-500 hover:bg-red-50"
                      title="Delete logo"
                    >
                      <X className="w-3 h-3" />
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
            className="file-input hidden"
          />
        </div>
      </div>
    </div>
  );
};