import { useParams, Link } from "react-router-dom";
import { useGyms, useSetMainLogo, useUploadLogo, useDeleteLogo } from "@/hooks/useGyms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Copy, Star, Upload, X, Trash2, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const GymProfile = () => {
  const { gymCode } = useParams<{ gymCode: string }>();
  const { data: gyms = [], isLoading, error } = useGyms();
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const setMainLogoMutation = useSetMainLogo();
  const uploadLogoMutation = useUploadLogo();
  const deleteLogoMutation = useDeleteLogo();

  const gym = gyms.find(g => g.code === gymCode);

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

  const copyColor = (colorCode: string) => {
    navigator.clipboard.writeText(colorCode).then(() => {
      showCopyFeedback(colorCode, `Copied ${colorCode}!`);
    });
  };

  const copyAllColors = () => {
    if (!gym) return;
    const colorText = gym.colors.map(color => color.color_hex).join('\n');
    navigator.clipboard.writeText(colorText).then(() => {
      showCopyFeedback('all-colors', 'All colors copied!');
    });
  };

  const downloadLogo = (logoUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = logoUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      showCopyFeedback(url, 'URL copied to clipboard!');
    });
  };

  const setMainLogo = (logoId: string) => {
    if (!gym) return;
    setMainLogoMutation.mutate({ gymId: gym.id, logoId }, {
      onSuccess: () => {
        toast({
          description: 'Main logo updated successfully!',
          duration: 2000,
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          description: 'Failed to update main logo',
          duration: 2000,
        });
      }
    });
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
    handleFileUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileUpload(files);
  };

  const handleFileUpload = (files: File[]) => {
    if (!gym) return;
    
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          description: `${file.name} is not an image file`,
        });
        return;
      }

      const fileKey = `${file.name}-${Date.now()}`;
      setUploadingFiles(prev => ({ ...prev, [fileKey]: 0 }));

      uploadLogoMutation.mutate(
        { gymId: gym.id, file },
        {
          onSuccess: () => {
            setUploadingFiles(prev => {
              const { [fileKey]: _, ...rest } = prev;
              return rest;
            });
            toast({
              description: `${file.name} uploaded successfully!`,
            });
          },
          onError: () => {
            setUploadingFiles(prev => {
              const { [fileKey]: _, ...rest } = prev;
              return rest;
            });
            toast({
              variant: "destructive",
              description: `Failed to upload ${file.name}`,
            });
          }
        }
      );
    });
  };

  const handleDeleteLogo = (logoId: string, filename: string) => {
    deleteLogoMutation.mutate(logoId, {
      onSuccess: () => {
        toast({
          description: `${filename} deleted successfully!`,
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          description: `Failed to delete ${filename}`,
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-xl">Loading gym profile...</div>
      </div>
    );
  }

  if (error || !gym) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-destructive text-xl mb-4">
            {error ? 'Error loading gym data' : `Gym "${gymCode}" not found`}
          </div>
          <Link to="/">
            <Button className="bg-brand-warm hover:bg-brand-warm/80 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const mainLogo = gym.logos.find(logo => logo.is_main_logo);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-foreground flex items-center gap-2">
              {gym.name}
              <span className="px-3 py-1 rounded-full bg-brand-warm text-white text-lg font-medium">
                {gym.code}
              </span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Complete brand profile and asset collection
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Logo Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏆 Main Logo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mainLogo ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full max-w-md h-48 flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-border">
                    <img 
                      src={mainLogo.file_url} 
                      alt={`${gym.name} main logo`}
                      className="max-h-44 max-w-full object-contain"
                    />
                  </div>
                  <Button
                    onClick={() => downloadLogo(mainLogo.file_url, mainLogo.filename)}
                    className="bg-brand-cool hover:bg-brand-cool/80 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Main Logo
                  </Button>
                </div>
              ) : (
                <div className="w-full h-48 flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-border text-muted-foreground">
                  No main logo uploaded
                </div>
              )}
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                🎨 Brand Colors
                <Button
                  onClick={copyAllColors}
                  size="sm"
                  className="bg-brand-warm hover:bg-brand-warm/80 text-white"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gym.colors.map((color, index) => (
                  <div 
                    key={color.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => copyColor(color.color_hex)}
                  >
                    <div 
                      className="w-12 h-12 rounded-lg border-2 border-border flex-shrink-0"
                      style={{ backgroundColor: color.color_hex }}
                    />
                    <div className="flex-1">
                      <div className="font-mono text-sm font-medium">
                        {color.color_hex}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Color {index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upload Interface */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>📤 Upload New Logos</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                  isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <div className="text-lg font-medium mb-2">
                  {isDragOver ? "Drop files here" : "Click to upload or drag and drop"}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Support for PNG, JPG, SVG files
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Upload Progress */}
              {Object.keys(uploadingFiles).length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="text-sm font-medium">Uploading files...</div>
                  {Object.entries(uploadingFiles).map(([fileKey, progress]) => (
                    <div key={fileKey} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{fileKey.split('-')[0]}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logo Gallery Carousel */}
          {gym.logos.length > 0 && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>📁 Logo Gallery ({gym.logos.length} files)</CardTitle>
              </CardHeader>
              <CardContent>
                <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                  <CarouselContent>
                    {gym.logos.map((logo) => (
                      <CarouselItem key={logo.id} className="md:basis-1/2 lg:basis-1/3">
                        <div className="p-1">
                          <Card className="relative">
                            <CardContent className="p-6">
                              {/* Main Logo Badge */}
                              {logo.is_main_logo && (
                                <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                  <Star className="w-3 h-3" />
                                  Main
                                </div>
                              )}
                              
                              {/* Logo Display */}
                              <div className="aspect-square flex items-center justify-center mb-4 bg-muted/20 rounded-lg border-2 border-dashed border-border">
                                <img 
                                  src={logo.file_url} 
                                  alt={logo.filename}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                              
                              {/* Logo Info */}
                              <div className="text-sm font-medium text-foreground truncate mb-4">
                                {logo.filename}
                              </div>
                              
                               {/* Action Buttons */}
                               <div className="flex flex-col gap-2">
                                 <Button
                                   onClick={() => downloadLogo(logo.file_url, logo.filename)}
                                   size="sm"
                                   className="w-full bg-brand-cool hover:bg-brand-cool/80 text-white"
                                 >
                                   <Download className="w-4 h-4 mr-2" />
                                   Download
                                 </Button>
                                 
                                 <Button
                                   onClick={() => copyUrl(logo.file_url)}
                                   size="sm"
                                   variant="outline"
                                   className={cn(
                                     "w-full",
                                     copiedStates[logo.file_url] && "bg-green-100 border-green-300 text-green-700"
                                   )}
                                 >
                                   <Copy className="w-4 h-4 mr-2" />
                                   {copiedStates[logo.file_url] ? 'Copied!' : 'Copy URL'}
                                 </Button>
                                 
                                 {!logo.is_main_logo && (
                                   <Button
                                     onClick={() => setMainLogo(logo.id)}
                                     size="sm"
                                     variant="outline"
                                     className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                                     disabled={setMainLogoMutation.isPending}
                                   >
                                     <Star className="w-4 h-4 mr-2" />
                                     {setMainLogoMutation.isPending ? 'Setting...' : 'Set as Main'}
                                   </Button>
                                 )}

                                 <Button
                                   onClick={() => handleDeleteLogo(logo.id, logo.filename)}
                                   size="sm"
                                   variant="outline"
                                   className="w-full border-red-300 text-red-700 hover:bg-red-50"
                                   disabled={deleteLogoMutation.isPending}
                                 >
                                   <Trash2 className="w-4 h-4 mr-2" />
                                   {deleteLogoMutation.isPending ? 'Deleting...' : 'Delete'}
                                 </Button>
                               </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};

export default GymProfile;