import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GymWithColors, useUpdateGymColor, useUploadLogo, useSetMainLogo, useDeleteLogo } from "@/hooks/useGyms";
import { Upload, Star, X, Copy, Eye, Download } from "lucide-react";
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
        variant="compact"
        className="max-w-sm mx-auto transition-smooth hover:shadow-2xl group"
        style={{
          '--hover-shadow': `0 0 30px ${primaryColor}30, 0 0 60px ${primaryColor}15`
        } as React.CSSProperties}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 0 30px ${primaryColor}30, 0 0 60px ${primaryColor}15`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '';
        }}
        id={`gym-${gym.code}`}
      >
        <BrandCardHeader className="text-center pb-4">
          <div className="mb-3">
            <span className="inline-block px-4 py-2 rounded-full bg-gym-primary text-gym-primary-foreground text-sm font-bold tracking-wider">
              {gym.code}
            </span>
          </div>
          <BrandCardTitle className="text-lg text-foreground">
            {gym.name}
          </BrandCardTitle>
        </BrandCardHeader>

        <BrandCardContent>
          {/* Main Logo Display */}
          <div className="mb-6">
            <div 
              className={cn(
                "w-full h-32 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-smooth bg-gradient-primary",
                isDragOver 
                  ? "border-gym-primary/60 bg-gym-primary/20" 
                  : "border-gym-primary/30 hover:border-gym-primary/50"
              )}
              onClick={triggerFileUpload}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {mainLogo ? (
                <div className="relative group">
                  <img 
                    src={mainLogo.file_url} 
                    alt="Main logo" 
                    className="max-h-28 max-w-full object-contain drop-shadow-lg"
                  />
                  <div className="absolute inset-0 bg-gym-primary/10 opacity-0 group-hover:opacity-100 transition-smooth rounded-lg" />
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gym-primary" />
                  <div className="text-gym-primary font-medium text-sm">
                    {isDragOver ? "Drop files here" : "Click or drag to add logo"}
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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">🎨 Brand Colors</h4>
            </div>
            <div className="space-y-3">
              {gym.colors.map((color, index) => (
                <ColorSwatch
                  key={color.id}
                  color={color.color_hex}
                  label={`Primary Color ${index + 1}`}
                  size="md"
                  showControls={true}
                  editMode={editMode}
                  onEdit={() => editColor(color.id, color.color_hex)}
                  className="p-3 rounded-xl bg-card/30 border border-border/50 hover:bg-card/50 transition-smooth"
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => copyGymColors(true)}
                variant="outline"
                size="sm"
                className="text-xs bg-gym-primary/10 border-gym-primary/30 hover:bg-gym-primary/20 text-gym-primary"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy All
              </Button>
              <Button
                onClick={() => copyGymColors(false)}
                variant="outline"
                size="sm"
                className="text-xs bg-gym-secondary/10 border-gym-secondary/30 hover:bg-gym-secondary/20 text-gym-secondary"
              >
                <Copy className="w-3 h-3 mr-1" />
                No #
              </Button>
            </div>

            <Link to={`/gym/${gym.code}`} className="w-full">
              <Button className="w-full text-sm py-2 bg-gym-primary hover:bg-gym-primary/90 text-gym-primary-foreground shadow-lg hover:shadow-xl transition-smooth">
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