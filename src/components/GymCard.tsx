import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GymWithColors, useUpdateGymColor, useUploadLogo, useSetMainLogo, useDeleteLogo, useAddGymColor, useDeleteGymColor } from "@/hooks/useGyms";
import { Upload, Star, X, Copy, Eye, Download, Plus, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { GymColorProvider } from "./shared/GymColorProvider";
import { BrandCard, BrandCardHeader, BrandCardContent, BrandCardTitle } from "./shared/BrandCard";
import { ColorSwatch } from "./shared/ColorSwatch";
import { contrast, readableOn as readableText, shade } from "@/lib/shade";
import { assetFilename, downloadLogoArchive, fetchAssetFile, saveDownload } from "@/lib/assetFiles";

interface GymCardProps {
  gym: GymWithColors;
  editMode: boolean;
  showAllLogos?: boolean;
  selected?: boolean;
  onToggleSelect?: (code: string) => void;
}

export const GymCard = ({ gym, editMode, showAllLogos = false, selected = false, onToggleSelect }: GymCardProps) => {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<{ total: number; completed: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const updateColorMutation = useUpdateGymColor();
  const uploadLogoMutation = useUploadLogo();
  const setMainLogoMutation = useSetMainLogo();
  const deleteLogoMutation = useDeleteLogo();
  const addColorMutation = useAddGymColor();
  const deleteColorMutation = useDeleteGymColor();

  // A gym's second colour is sometimes near-white, which made the Download
  // button look disabled. Fall back to the primary when it can't carry text.
  const readableOn = (hex: string, fallback: string) => {
    const c = hex.replace('#', '');
    if (c.length < 6) return fallback;
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const luminance = (r * 299 + g * 587 + b * 114) / 1000;
    return luminance > 120 ? fallback : hex;
  };

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

  const copyColorsWithName = () => {
    const colors = gym.colors.map(color => color.color_hex);
    const colorText = `${gym.name} (${gym.code}):\n${colors.join('\n')}`;
    navigator.clipboard.writeText(colorText).then(() => {
      showCopyFeedback(`gym-${gym.code}-name`, `${gym.code} colors copied with name!`);
    });
  };

  const copyColorsHexOnly = () => {
    const colors = gym.colors.map(color => color.color_hex);
    const colorText = colors.join('\n');
    navigator.clipboard.writeText(colorText).then(() => {
      showCopyFeedback(`gym-${gym.code}-hex`, `${gym.code} hex codes copied!`);
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

  const downloadLogo = async (url: string, filename: string) => {
    try {
      const blob = await fetchAssetFile(url, filename);
      saveDownload(blob, assetFilename(filename, blob));
      toast({ description: `Downloaded ${filename}!`, duration: 2000 });
    } catch (err) {
      console.error('Download failed:', err);
      toast({ title: "Download Failed", description: "Could not download the logo.", variant: "destructive" });
    }
  };

  const downloadAllLogos = async () => {
    if (downloadProgress) return;
    setDownloadProgress('Preparing logos…');
    try {
      await downloadLogoArchive(activeLogos, `${gym.code}-Logos.zip`, setDownloadProgress);
      toast({ description: `${gym.code} logo ZIP downloaded.` });
    } catch (error) {
      toast({ title: 'Download failed', description: error instanceof Error ? error.message : 'Could not prepare the logos.', variant: 'destructive' });
    } finally {
      setDownloadProgress(null);
    }
  };

  const copyLogoUrl = (url: string, filename: string) => {
    navigator.clipboard.writeText(url).then(() => {
      showCopyFeedback(`url-${url}`, `URL copied for ${filename}!`);
    });
  };

  const triggerFileUpload = () => {
    if (!editMode) return;
    // If a main logo exists, use the replace input (which will swap the logo)
    if (mainLogo) {
      replaceInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleReplaceMainLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    const file = files[0]; // Only take first file for replacement
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid File", description: `"${file.name}" is not a valid image file.`, variant: "destructive" });
      event.target.value = '';
      return;
    }

    if (!mainLogo) return;

    // Save the replacement before changing the display. Preserve the old file.
    uploadLogoMutation.mutate(
          { gymId: gym.id, file, isMain: true },
          {
            onSuccess: () => {
              toast({ description: `Logo replaced with "${file.name}"!`, duration: 2000 });
            },
            onError: (error: any) => {
              toast({ title: "Upload Failed", description: error?.message || "Failed to upload replacement logo.", variant: "destructive" });
            },
          }
    );

    event.target.value = '';
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
    if (!editMode) return;
    
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
  const activeLogos = gym.logos.filter(logo => logo.variant?.toLowerCase() !== 'retired');
  const primaryColor = gym.colors[0]?.color_hex || '#6B7280';
  const secondaryColor = gym.colors[1]?.color_hex || '#9CA3AF';
  const buttonFill = primaryColor;
  const buttonText = contrast(buttonFill, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#111111';
  const buttonStyle = { background: buttonFill, color: buttonText, border: `1px solid ${shade(buttonFill, 0.24)}`, boxShadow: `0 3px 0 ${shade(buttonFill, 0.3)}, 0 5px 12px ${primaryColor}44` };

  return (
    <GymColorProvider primaryColor={primaryColor} secondaryColor={secondaryColor}>
        <BrandCard 
        className="rounded-xl transition-all duration-300 hover:shadow-xl group border flex flex-col h-full w-full max-w-full mx-auto"
        style={{
          background: '#737373',
          // Never dim an unpicked card. Picked adds light: a ring and a glow in
          // the gym's own colour, lifted slightly. Unpicked is simply normal.
          opacity: 1,
          borderColor: editMode
            ? 'hsl(var(--brand-rose-gold))'
            : selected
              ? primaryColor
              : 'rgba(0,0,0,0.12)',
          boxShadow: selected
            ? `0 0 0 3px ${primaryColor}55, 0 10px 34px ${primaryColor}88, 0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.6)`
            : '0 2px 8px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6)',
          transform: selected ? 'translateY(-3px)' : 'none',
        }}
        id={`gym-${gym.code}`}
      >
        <div
          onClick={() => onToggleSelect?.(gym.code)}
          className="flex items-center justify-between py-2.5 px-4 border-b border-border/40 cursor-pointer select-none"
          title={selected ? 'Click to unselect' : 'Click to select'}
          style={{
            background: selected ? primaryColor : '#505050',
            transition: 'background 260ms ease',
          }}>
          <h3 className="text-base font-bold" style={{ color: selected ? buttonText : '#ffffff' }}>
            {gym.name}
          </h3>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider text-white shadow-md flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor} 100%)`,
                  color: buttonText,
                }}>
            {gym.code}
          </span>
        </div>

        <BrandCardContent className="px-3 pb-3 pt-2">
          {/* Main Logo Display — compact */}
          <div className="mb-2">
            <div 
              className={cn(
                "w-full rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300",
                isDragOver 
                  ? "border-2 border-dashed border-gym-primary/60 bg-gym-primary/10" 
                  : mainLogo
                    ? "bg-card border border-border/80"
                    : "border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 bg-muted/20"
              )}
              style={{
                height: 'clamp(164px, 12.4vw, 220px)',
                ...(mainLogo ? {
                  background: 'linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%)',
                  boxShadow: `0 1px 2px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.08), 0 12px 28px rgba(0,0,0,0.12), 0 0 32px ${primaryColor}35, inset 0 1px 0 rgba(255,255,255,0.95)`
                } : {})
              }}
              onClick={triggerFileUpload}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {mainLogo ? (
                <img 
                  src={mainLogo.file_url} 
                  alt="Main logo" 
                  className="max-h-[clamp(132px,10.2vw,176px)] max-w-[85%] object-contain transition-transform duration-300 group-hover:-translate-y-1"
                  style={{ filter: `drop-shadow(0 3px 4px rgba(0,0,0,0.25)) drop-shadow(0 12px 18px ${primaryColor}40)` }}
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

          {/* Profile Button — directly under logo */}
          <Link to={`/gym/${gym.code}`} className="block w-full mb-2">
            <Button className="w-full h-14 cursor-pointer text-base font-extrabold tracking-wide uppercase hover:brightness-110 active:translate-y-px"
                    style={{
                      ...buttonStyle,
                      letterSpacing: '0.08em',
                    }}>
              <Eye className="w-5 h-5 mr-2" />
              Profile
            </Button>
          </Link>

          {/* Brand Colors */}
          <div className="flex-1 flex flex-col mb-1.5">
            <div className="flex items-center justify-end mb-2">
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
            <div className="grid grid-cols-2 min-[390px]:grid-cols-4 gap-1.5">
              {gym.colors.map((color, index) => (
                <ColorSwatch
                  key={color.id}
                  color={color.color_hex}
                  label={`Color ${index + 1}`}
                  layout="cell"
                  compact
                  showControls={true}
                  editMode={editMode}
                  onEdit={() => editColor(color.id, color.color_hex)}
                  onDelete={() => deleteColorMutation.mutate(color.id)}
                />
              ))}
            </div>
          </div>

          {/* Two verbs. Each opens its own short list. */}
          <div className="w-full grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 cursor-pointer text-[15px] font-semibold hover:brightness-110"
                  style={{
                    ...buttonStyle,
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                  <ChevronDown className="w-3 h-3 ml-1 opacity-80" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-52 p-1.5">
                <button onClick={copyColorsHexOnly} className="w-full rounded px-2 py-2 text-left text-xs font-semibold hover:bg-muted">
                  Hex codes
                </button>
                <button onClick={copyColorsWithName} className="w-full rounded px-2 py-2 text-left text-xs font-semibold hover:bg-muted">
                  Hex codes + gym name
                </button>
                {mainLogo && (
                  <button
                    onClick={() => copyLogoUrl(mainLogo.file_url, mainLogo.filename)}
                    className="w-full rounded px-2 py-2 text-left text-xs font-semibold hover:bg-muted"
                  >
                    Main logo link
                  </button>
                )}
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 cursor-pointer text-[15px] font-semibold hover:brightness-95"
                  style={{
                    background: `linear-gradient(to bottom, #ffffff, #e8e8e8)`,
                    border: `1.5px solid ${readableOn(secondaryColor, primaryColor)}`,
                    color: readableText('#e8e8e8', readableOn(secondaryColor, primaryColor)),
                    boxShadow: `0 3px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)`
                  }}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                  <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-1.5">
                {mainLogo ? (
                  <button
                    onClick={() => downloadLogo(mainLogo.file_url, mainLogo.filename)}
                    className="w-full rounded px-2 py-2 text-left text-xs font-semibold hover:bg-muted"
                  >
                    Main logo
                  </button>
                ) : (
                  <p className="px-2 py-2 text-xs text-muted-foreground">No logo yet</p>
                )}
                {activeLogos.length > 1 && (
                  <button onClick={downloadAllLogos} disabled={!!downloadProgress} className="w-full cursor-pointer rounded px-2 py-2 text-left text-[15px] font-semibold hover:bg-muted disabled:cursor-wait" aria-live="polite">
                    {downloadProgress || `All ${activeLogos.length} logos · ZIP`}
                  </button>
                )}
              </PopoverContent>
            </Popover>
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
          <Input
            ref={replaceInputRef}
            type="file"
            accept="image/*"
            onChange={handleReplaceMainLogo}
            className="hidden"
          />
        </BrandCardContent>
      </BrandCard>
    </GymColorProvider>
  );
};
