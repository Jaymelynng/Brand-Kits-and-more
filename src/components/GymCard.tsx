import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GymWithColors, useUpdateGymColor, useUploadLogo, useSetMainLogo, useDeleteLogo } from "@/hooks/useGyms";
import { Upload, Star, X, Copy, Link2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface GymCardProps {
  gym: GymWithColors;
  editMode: boolean;
}

export const GymCard = ({ gym, editMode }: GymCardProps) => {
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

  return (
    <div 
      className="bg-white rounded-lg shadow-md p-6 max-w-sm mx-auto"
      id={`gym-${gym.code}`}
    >
      <div className="gym-header mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-700 mb-1">{gym.name}</h3>
        <span className="inline-block px-3 py-1 rounded-full bg-brand-warm text-white text-sm font-medium">
          {gym.code}
        </span>
      </div>

      {/* Main Logo Display */}
      <div className="main-logo-display mb-4">
        <div 
          className={cn(
            "main-logo-frame w-full h-24 border-2 border-dashed flex items-center justify-center cursor-pointer transition-all duration-200",
            isDragOver 
              ? "border-brand-warm bg-brand-warm/10" 
              : "border-gray-300 hover:border-gray-400"
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
              className="max-h-20 max-w-full object-contain"
            />
          ) : (
            <div className="text-gray-400 text-center text-sm">
              {isDragOver ? (
                <div className="text-brand-warm font-medium">Drop files here</div>
              ) : (
                <>Click or drag to add<br />main logo</>
              )}
            </div>
          )}
        </div>
        
        {/* Upload Progress */}
        {uploadProgress && (
          <div className="mt-2 text-center">
            <div className="text-sm text-gray-600 mb-1">
              Uploading {uploadProgress.completed} of {uploadProgress.total} files...
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-brand-warm h-2 rounded-full transition-all duration-300"
                style={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Color Swatches */}
      <div className="color-rows space-y-2 mb-4">
        {gym.colors.map((color) => (
          <div key={color.id} className="flex items-center justify-center gap-3">
            <div 
              className="w-8 h-8 rounded border cursor-pointer transition-transform hover:scale-105"
              style={{ backgroundColor: color.color_hex }}
              onClick={() => editColor(color.id, color.color_hex)}
            />
            <span className="text-sm font-mono text-gray-600 select-all">
              {color.color_hex}
            </span>
            <div className="flex gap-1 ml-auto">
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
      <div className="space-y-3 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => copyGymColors(true)}
            className="text-sm py-2 bg-brand-warm hover:bg-brand-warm/80 text-white"
          >
            Copy All Colors
          </Button>
          <Button
            onClick={() => copyGymColors(false)}
            className="text-sm py-2 bg-brand-cool hover:bg-brand-cool/80 text-white"
          >
            Copy Colors (No #)
          </Button>
        </div>

        <Link to={`/gym/${gym.code}`} className="w-full">
          <Button className="w-full text-sm py-2 bg-brand-soft hover:bg-brand-soft/80 text-white">
            View {gym.code} Profile
          </Button>
        </Link>
      </div>

      {/* Logo Grid Section */}
      {gym.logos.length > 0 && (
        <div className="space-y-3 mb-4">
          <h4 className="text-sm font-medium text-gray-700">All Logos</h4>
          <div className="space-y-3">
            {gym.logos.map((logo) => (
              <div key={logo.id} className="bg-gray-50 rounded p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <img 
                    src={logo.file_url} 
                    alt={logo.filename}
                    className="w-12 h-12 object-contain cursor-pointer rounded"
                    onClick={() => setMainLogo(logo.id)}
                    title="Click to set as main logo"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 truncate">
                      {logo.filename}
                    </div>
                    <div className="text-xs text-gray-500 break-all">
                      {logo.file_url}
                    </div>
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
                    <Copy className="w-3 h-3 mr-1" />
                    URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMainLogo(logo.id)}
                    className={cn(
                      "px-2 py-1 h-7 text-xs",
                      logo.is_main_logo && "bg-yellow-100 text-yellow-800"
                    )}
                    title="Set as main logo"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    {logo.is_main_logo ? "Main" : "Set"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteLogo(logo.id)}
                    className="px-2 py-1 h-7 text-xs text-red-500 hover:bg-red-50"
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
    </div>
  );
};