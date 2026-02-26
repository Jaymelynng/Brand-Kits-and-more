import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GymWithColors, useUpdateGymColor, useUploadLogo, useSetMainLogo, useDeleteLogo, useAddGymColor, useDeleteGymColor } from "@/hooks/useGyms";
import { Upload, Star, X, Copy, Eye, Download, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { GymColorProvider } from "./shared/GymColorProvider";
import { BrandCard, BrandCardHeader, BrandCardContent, BrandCardTitle } from "./shared/BrandCard";
import { ColorSwatch } from "./shared/ColorSwatch";

interface GymCardProps {
  gym: GymWithColors;
  editMode: boolean;
  showAllLogos?: boolean;
}

export const GymCard = ({ gym, editMode, showAllLogos = false }: GymCardProps) => {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<{ total: number; completed: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const updateColorMutation = useUpdateGymColor();
  const uploadLogoMutation = useUploadLogo();
  const setMainLogoMutation = useSetMainLogo();
  const deleteLogoMutation = useDeleteLogo();
  const addColorMutation = useAddGymColor();
  const deleteColorMutation = useDeleteGymColor();

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

  const copyLogoUrl = (url: string, filename: string) => {
    navigator.clipboard.writeText(url).then(() => {
      showCopyFeedback(`url-${url}`, `URL copied for ${filename}!`);
    });
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const processFiles = (files: File[]) => {
    console.log('Files selected:', files.length, 'for gym:', gym.name);
    
    if (files.length === 0) return;
    
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    
    // Show error for invalid files
    invalidFiles.forEach(file => {
      toast({
        title: "Invalid File",
        description: `"${file.name}" is not a valid image file.`,
        variant: "destructive",
      });
    });
    
    if (imageFiles.length === 0) return;
    
    // Set up progress tracking for bulk uploads
    if (imageFiles.length > 1) {
      setUploadProgress({ total: imageFiles.length, completed: 0 });
    }
    
    const mainLogo = gym.logos.find(logo => logo.is_main_logo);
    
    imageFiles.forEach((file, index) => {
      console.log('Uploading file:', file.name, 'for gym:', gym.id);
      uploadLogoMutation.mutate(
        {
          gymId: gym.id,
          file,
          isMain: !mainLogo && index === 0,
        },
        {
          onSuccess: () => {
            if (imageFiles.length > 1) {
              setUploadProgress(prev => prev ? { ...prev, completed: prev.completed + 1 } : null);
              
              // Clear progress when all uploads complete
              if (uploadProgress?.completed === imageFiles.length - 1) {
                setTimeout(() => setUploadProgress(null), 2000);
              }
            }
            
            toast({
              title: "Success",
              description: `Logo "${file.name}" uploaded successfully!`,
            });
          },
          onError: (error: any) => {
            if (imageFiles.length > 1) {
              setUploadProgress(prev => prev ? { ...prev, completed: prev.completed + 1 } : null);
            }
            
            console.error('Upload error in component:', error);
            toast({
              title: "Upload Failed",
              description: error?.message || `Failed to upload "${file.name}". Please try again.`,
              variant: "destructive",
            });
          },
        }
      );
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
    
    // Clear the input so the same file can be selected again if needed
    event.target.value = '';
  };

  const setMainLogo = (logoId: string) => {
    setMainLogoMutation.mutate({ gymId: gym.id, logoId });
  };

  const deleteLogo = (logoId: string) => {
    deleteLogoMutation.mutate(logoId);
  };


  const mainLogo = gym.logos.find(logo => logo.is_main_logo);
  const primaryColor = gym.colors[0]?.color_hex || '#6B7280';
  const secondaryColor = gym.colors[1]?.color_hex || '#9CA3AF';

  return (
    <GymColorProvider primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <BrandCard 
        className="bg-white rounded-xl transition-all duration-300 hover:shadow-xl group border flex flex-col h-full"
        style={{
          borderColor: editMode 
            ? 'hsl(var(--brand-rose-gold))' 
            : 'hsl(var(--border))',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        }}
        id={`gym-${gym.code}`}
      >
        <div className="flex items-center justify-between py-2.5 px-4 border-b border-border/40"
             style={{
               background: 'linear-gradient(135deg, rgba(196, 164, 164, 0.08) 0%, rgba(182, 148, 148, 0.08) 100%)',
             }}>
          <h3 className="text-base font-bold" style={{ color: 'hsl(var(--brand-text-primary))' }}>
            {gym.name}
          </h3>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider text-white shadow-md flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor} 100%)`,
                }}>
            {gym.code}
          </span>
        </div>

        <BrandCardContent className="px-4 pb-4 pt-3">
          {/* Main Logo Display — compact */}
          <div className="mb-3">
            <div 
              className={cn(
                "w-full h-24 rounded-lg flex items-center justify-center cursor-pointer transition-all",
                isDragOver 
                  ? "border-2 border-dashed border-gym-primary/60 bg-gym-primary/10" 
                  : mainLogo ? "bg-muted/30" : "border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 bg-muted/20"
              )}
              onClick={triggerFileUpload}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {mainLogo ? (
                <img 
                  src={mainLogo.file_url} 
                  alt="Main logo" 
                  className="max-h-20 max-w-[80%] object-contain"
                />
              ) : (
                <div className="text-center">
                  <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-muted-foreground font-medium text-[10px]">
                    {isDragOver ? "Drop here" : "Add logo"}
                  </div>
                </div>
              )}
            </div>
            
            {/* Upload Progress */}
            {uploadProgress && (
              <div className="mt-3 text-center">
                <div className="text-sm text-muted-foreground mb-2">
                  Uploading {uploadProgress.completed} of {uploadProgress.total} files...
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gym-primary h-2 rounded-full transition-smooth"
                    style={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Brand Colors */}
          <div className="flex-1 flex flex-col mb-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-foreground">🎨 Brand Colors</h4>
              {editMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2 py-1 h-7 text-xs"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'color';
                    input.value = '#A4B4C4';
                    input.style.display = 'none';
                    input.onchange = () => {
                      addColorMutation.mutate({ gymId: gym.id, colorHex: input.value });
                      document.body.removeChild(input);
                    };
                    document.body.appendChild(input);
                    input.click();
                  }}
                  title="Add a new color"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {gym.colors.map((color, index) => (
                <ColorSwatch
                  key={color.id}
                  color={color.color_hex}
                  label={`Color ${index + 1}`}
                  layout="cell"
                  showControls={true}
                  editMode={editMode}
                  onEdit={() => editColor(color.id, color.color_hex)}
                  onDelete={() => deleteColorMutation.mutate(color.id)}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => copyGymColors(true)}
                variant="outline"
                size="sm"
                className="text-xs text-white font-semibold"
                style={{
                  background: `linear-gradient(to bottom, ${primaryColor}, color-mix(in srgb, ${primaryColor} 70%, black))`,
                  border: 'none',
                  boxShadow: `0 4px 8px ${primaryColor}66, 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)`
                }}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy #HEX
              </Button>
              <Button
                onClick={() => copyGymColors(false)}
                variant="outline"
                size="sm"
                className="text-xs font-semibold"
                style={{
                  background: `linear-gradient(to bottom, #ffffff, #e8e8e8)`,
                  border: `2px solid ${primaryColor}`,
                  color: primaryColor,
                  boxShadow: `0 4px 8px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.05)`
                }}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy HEX
              </Button>
            </div>

            {/* Quick Download Main Logo */}
            {mainLogo && (
              <Button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = mainLogo.file_url;
                  link.download = mainLogo.filename;
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                variant="outline"
                size="sm"
                className="w-full text-xs text-white font-semibold"
                style={{
                  background: `linear-gradient(to bottom, ${secondaryColor}, color-mix(in srgb, ${secondaryColor} 65%, black))`,
                  border: 'none',
                  boxShadow: `0 4px 8px ${secondaryColor}55, 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2)`
                }}
              >
                <Download className="w-3 h-3 mr-1" />
                Download Logo
              </Button>
            )}

            <Link to={`/gym/${gym.code}`} className="block w-full">
              <Button className="w-full text-sm py-2 text-white font-bold transition-smooth"
                      style={{
                        background: `linear-gradient(to bottom, color-mix(in srgb, ${primaryColor} 90%, white), ${primaryColor}, color-mix(in srgb, ${primaryColor} 75%, black))`,
                        boxShadow: `0 6px 14px ${primaryColor}55, 0 3px 6px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.15)`
                      }}>
                <Eye className="w-4 h-4 mr-2" />
                View {gym.code} Profile
              </Button>
            </Link>
          </div>

          {/* Logo Gallery */}
          {showAllLogos && gym.logos.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center">
                🖼️ All Logos
                <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {gym.logos.length}
                </span>
              </h4>
              <div className="space-y-3">
                {gym.logos.map((logo) => (
                  <div key={logo.id} className="bg-card/30 backdrop-blur-sm rounded-xl p-3 border border-border/50 transition-smooth hover:bg-card/50">
                    <div className="flex items-center gap-3 mb-2">
                      <img 
                        src={logo.file_url} 
                        alt={logo.filename}
                        className="w-10 h-10 object-contain cursor-pointer rounded-lg bg-background/50 p-1"
                        onClick={() => setMainLogo(logo.id)}
                        title="Click to set as main logo"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">
                          {logo.filename}
                        </div>
                        {logo.is_main_logo && (
                          <span className="text-xs text-gym-primary font-medium">Main Logo</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLogoUrl(logo.file_url, logo.filename)}
                        className="px-2 py-1 h-7 text-xs"
                        title="Copy URL"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMainLogo(logo.id)}
                        className={cn(
                          "px-2 py-1 h-7 text-xs",
                          logo.is_main_logo && "bg-gym-primary/20 text-gym-primary border-gym-primary/30"
                        )}
                        title="Set as main logo"
                      >
                        <Star className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteLogo(logo.id)}
                        className="px-2 py-1 h-7 text-xs text-destructive hover:bg-destructive/10"
                        title="Delete logo"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
        </BrandCardContent>
      </BrandCard>
    </GymColorProvider>
  );
};