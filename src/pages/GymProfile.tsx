import { useParams, Link } from "react-router-dom";
import { useGyms, useSetMainLogo, useUploadLogo, useDeleteLogo } from "@/hooks/useGyms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Copy, Star, Upload, X, Trash2, Loader2, Grid3X3, LayoutGrid, List, Columns, ChevronUp, Maximize, Plus } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const GymProfile = () => {
  const { gymCode } = useParams<{ gymCode: string }>();
  const { data: gyms = [], isLoading, error } = useGyms();
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'carousel' | 'grid' | 'list' | 'masonry'>('carousel');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const setMainLogoMutation = useSetMainLogo();
  const uploadLogoMutation = useUploadLogo();
  const deleteLogoMutation = useDeleteLogo();

  // Scroll to top on page load and back to top functionality
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [gymCode]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
  const primaryColor = gym.colors[0]?.color_hex || '#6B7280';
  const secondaryColor = gym.colors[1]?.color_hex || '#9CA3AF';

  // Convert hex to HSL for better manipulation
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const primaryHsl = hexToHsl(primaryColor);
  const secondaryHsl = hexToHsl(secondaryColor);

  return (
    <div 
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}10 50%, ${primaryColor}08 100%)`,
        '--gym-primary': primaryHsl,
        '--gym-secondary': secondaryHsl,
      } as React.CSSProperties}
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(45deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          }}
        />
        <div className="relative container mx-auto px-6 py-12">
          {/* Navigation */}
          <div className="flex items-center gap-4 mb-12">
            <Link to="/">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>

          {/* Hero Content */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-6">
              <span 
                className="px-4 py-2 rounded-full text-white font-bold text-lg tracking-wider"
                style={{ backgroundColor: primaryColor }}
              >
                {gym.code}
              </span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {gym.name}
            </h1>
            
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Official brand hub with complete asset library, color palette, and logo collection
            </p>

            {/* Main Logo Showcase */}
            {mainLogo && (
              <div className="mb-12">
                <div 
                  className="inline-flex items-center justify-center w-80 h-48 rounded-2xl shadow-2xl border-4 border-white/20 backdrop-blur-sm"
                  style={{ 
                    background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)` 
                  }}
                >
                  <img 
                    src={mainLogo.file_url} 
                    alt={`${gym.name} main logo`}
                    className="max-h-40 max-w-72 object-contain drop-shadow-lg"
                  />
                </div>
                <Button
                  onClick={() => downloadLogo(mainLogo.file_url, mainLogo.filename)}
                  className="mt-6 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                  style={{ 
                    backgroundColor: primaryColor,
                  }}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Main Logo
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Colors - Now First */}
          <Card className="lg:col-span-2 bg-white/50 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-2xl">
                🎨 Brand Colors
                <Button
                  onClick={copyAllColors}
                  size="sm"
                  className="text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {gym.colors.map((color, index) => (
                  <div 
                    key={color.id}
                    className="group flex items-center gap-4 p-4 rounded-xl hover:bg-white/60 transition-all duration-300 cursor-pointer border border-white/20 hover:border-white/40 hover:shadow-lg"
                    onClick={() => copyColor(color.color_hex)}
                  >
                    <div 
                      className="w-16 h-16 rounded-xl shadow-lg border-2 border-white/30 flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
                      style={{ backgroundColor: color.color_hex }}
                    />
                    <div className="flex-1">
                      <div className="font-mono text-lg font-bold text-foreground">
                        {color.color_hex}
                      </div>
                      <div className="text-sm text-muted-foreground font-medium">
                        Primary Color {index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Brand Stats */}
          <Card className="lg:col-span-2 bg-white/50 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">📊 Brand Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-6 rounded-xl" style={{ backgroundColor: `${primaryColor}15` }}>
                  <div 
                    className="text-4xl font-bold mb-2"
                    style={{ color: primaryColor }}
                  >
                    {gym.logos.length}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">Logo Variations</div>
                </div>
                <div className="text-center p-6 rounded-xl" style={{ backgroundColor: `${secondaryColor}15` }}>
                  <div 
                    className="text-4xl font-bold mb-2"
                    style={{ color: secondaryColor }}
                  >
                    {gym.colors.length}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">Brand Colors</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Interface - Conditional */}
        {showUpload && (
          <Card className="lg:col-span-4 bg-white/50 backdrop-blur-sm border-white/20 shadow-xl mb-8 animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">📤 Upload New Logos</CardTitle>
                <Button
                  onClick={() => setShowUpload(false)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer",
                  isDragOver 
                    ? "border-white/60 shadow-2xl" 
                    : "border-white/30 hover:border-white/50 hover:shadow-lg"
                )}
                style={{
                  backgroundColor: isDragOver ? `${primaryColor}20` : `${primaryColor}10`,
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload 
                  className="w-16 h-16 mx-auto mb-6" 
                  style={{ color: primaryColor }}
                />
                <div className="text-2xl font-bold mb-3 text-foreground">
                  {isDragOver ? "Drop files here" : "Upload Brand Assets"}
                </div>
                <div className="text-lg text-muted-foreground mb-6">
                  Drag and drop or click to upload PNG, JPG, SVG files
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
        )}

        {/* Logo Gallery */}
        {gym.logos.length > 0 && (
          <Card className="lg:col-span-4 bg-white/50 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">📁 Logo Gallery ({gym.logos.length} files)</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowUpload(!showUpload)}
                    variant="outline"
                    size="sm"
                    className="text-white border-white/30 hover:bg-white/20 font-semibold shadow-lg"
                    style={{ 
                      backgroundColor: showUpload ? `${primaryColor}40` : `${primaryColor}20`,
                      borderColor: `${primaryColor}40`
                    }}
                  >
                    {showUpload ? (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Hide Upload
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Logos
                      </>
                    )}
                  </Button>
                  <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                    <SelectTrigger className="w-48 bg-white/80 border-white/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-sm">
                      <SelectItem value="carousel">
                        <div className="flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4" />
                          Carousel View
                        </div>
                      </SelectItem>
                      <SelectItem value="grid">
                        <div className="flex items-center gap-2">
                          <Grid3X3 className="w-4 h-4" />
                          Grid View
                        </div>
                      </SelectItem>
                      <SelectItem value="list">
                        <div className="flex items-center gap-2">
                          <List className="w-4 h-4" />
                          List View
                        </div>
                      </SelectItem>
                      <SelectItem value="masonry">
                        <div className="flex items-center gap-2">
                          <Columns className="w-4 h-4" />
                          Masonry View
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'carousel' ? (
                <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                  <CarouselContent>
                    {gym.logos.map((logo) => (
                      <CarouselItem key={logo.id} className="md:basis-1/2 lg:basis-1/3">
                        <div className="p-1">
                          <Card className="relative bg-white/70 backdrop-blur-sm border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
                            <CardContent className="p-6">
                              {/* Main Logo Badge */}
                              {logo.is_main_logo && (
                                <div 
                                  className="absolute top-3 right-3 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1 shadow-lg"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  <Star className="w-3 h-3" />
                                  Main Logo
                                </div>
                              )}
                              
                              {/* Logo Display */}
                              <div 
                                className="aspect-square flex items-center justify-center mb-4 rounded-xl border-2 border-white/40 shadow-inner"
                                style={{ backgroundColor: `${primaryColor}08` }}
                              >
                                <img 
                                  src={logo.file_url} 
                                  alt={logo.filename}
                                  className="max-w-full max-h-full object-contain p-4"
                                />
                              </div>
                              
                              {/* Logo Info */}
                              <div className="text-sm font-bold text-foreground truncate mb-4">
                                {logo.filename}
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex flex-col gap-2">
                                <Button
                                  onClick={() => downloadLogo(logo.file_url, logo.filename)}
                                  size="sm"
                                  className="w-full text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                                
                                <Button
                                  onClick={() => copyUrl(logo.file_url)}
                                  size="sm"
                                  variant="outline"
                                  className={cn(
                                    "w-full bg-white/80 border-white/40 hover:bg-white/90",
                                    copiedStates[logo.file_url] && "bg-green-100 border-green-300 text-green-700"
                                  )}
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  {copiedStates[logo.file_url] ? "Copied!" : "Copy URL"}
                                </Button>
                                
                                {!logo.is_main_logo && (
                                  <Button
                                    onClick={() => setMainLogo(logo.id)}
                                    size="sm"
                                    variant="outline"
                                    className="w-full bg-white/80 border-white/40 hover:bg-white/90 text-yellow-700 hover:text-yellow-800"
                                  >
                                    <Star className="w-4 h-4 mr-2" />
                                    Set as Main
                                  </Button>
                                )}
                                
                                <Button
                                  onClick={() => handleDeleteLogo(logo.id, logo.filename)}
                                  size="sm"
                                  variant="outline"
                                  className="w-full bg-white/80 border-white/40 hover:bg-white/90 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
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
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {gym.logos.map((logo) => (
                    <Card key={logo.id} className="relative bg-white/70 backdrop-blur-sm border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-6">
                        {/* Main Logo Badge */}
                        {logo.is_main_logo && (
                          <div 
                            className="absolute top-3 right-3 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1 shadow-lg"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Star className="w-3 h-3" />
                            Main
                          </div>
                        )}
                        
                        {/* Logo Display */}
                        <div 
                          className="aspect-square flex items-center justify-center mb-4 rounded-xl border-2 border-white/40 shadow-inner"
                          style={{ backgroundColor: `${primaryColor}08` }}
                        >
                          <img 
                            src={logo.file_url} 
                            alt={logo.filename}
                            className="max-w-full max-h-full object-contain p-4"
                          />
                        </div>
                        
                        {/* Logo Info */}
                        <div className="text-sm font-bold text-foreground truncate mb-4">
                          {logo.filename}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => downloadLogo(logo.file_url, logo.filename)}
                            size="sm"
                            className="w-full text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                          
                          <Button
                            onClick={() => copyUrl(logo.file_url)}
                            size="sm"
                            variant="outline"
                            className={cn(
                              "w-full bg-white/80 border-white/40 hover:bg-white/90",
                              copiedStates[logo.file_url] && "bg-green-100 border-green-300 text-green-700"
                            )}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            {copiedStates[logo.file_url] ? "Copied!" : "Copy URL"}
                          </Button>
                          
                          {!logo.is_main_logo && (
                            <Button
                              onClick={() => setMainLogo(logo.id)}
                              size="sm"
                              variant="outline"
                              className="w-full bg-white/80 border-white/40 hover:bg-white/90 text-yellow-700 hover:text-yellow-800"
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Set as Main
                            </Button>
                          )}
                          
                          <Button
                            onClick={() => handleDeleteLogo(logo.id, logo.filename)}
                            size="sm"
                            variant="outline"
                            className="w-full bg-white/80 border-white/40 hover:bg-white/90 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-4">
                  {gym.logos.map((logo) => (
                    <Card key={logo.id} className="relative bg-white/70 backdrop-blur-sm border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Logo Thumbnail */}
                          <div 
                            className="w-20 h-20 flex items-center justify-center rounded-lg border-2 border-white/40 flex-shrink-0"
                            style={{ backgroundColor: `${primaryColor}08` }}
                          >
                            <img 
                              src={logo.file_url} 
                              alt={logo.filename}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          
                          {/* Logo Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-lg font-bold text-foreground truncate">
                                {logo.filename}
                              </div>
                              {logo.is_main_logo && (
                                <div 
                                  className="text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  <Star className="w-3 h-3" />
                                  Main
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => downloadLogo(logo.file_url, logo.filename)}
                              size="sm"
                              className="text-white font-semibold"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                            
                            <Button
                              onClick={() => copyUrl(logo.file_url)}
                              size="sm"
                              variant="outline"
                              className="bg-white/80 border-white/40 hover:bg-white/90"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            
                            {!logo.is_main_logo && (
                              <Button
                                onClick={() => setMainLogo(logo.id)}
                                size="sm"
                                variant="outline"
                                className="bg-white/80 border-white/40 hover:bg-white/90 text-yellow-700"
                              >
                                <Star className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <Button
                              onClick={() => handleDeleteLogo(logo.id, logo.filename)}
                              size="sm"
                              variant="outline"
                              className="bg-white/80 border-white/40 hover:bg-white/90 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                  {gym.logos.map((logo) => (
                    <Card key={logo.id} className="relative break-inside-avoid bg-white/70 backdrop-blur-sm border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-4">
                        {/* Main Logo Badge */}
                        {logo.is_main_logo && (
                          <div 
                            className="absolute top-3 right-3 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Star className="w-3 h-3" />
                            Main
                          </div>
                        )}
                        
                        {/* Logo Display */}
                        <div 
                          className="w-full flex items-center justify-center mb-4 rounded-lg border-2 border-white/40 p-4"
                          style={{ backgroundColor: `${primaryColor}08` }}
                        >
                          <img 
                            src={logo.file_url} 
                            alt={logo.filename}
                            className="w-full h-auto object-contain"
                          />
                        </div>
                        
                        {/* Logo Info */}
                        <div className="text-sm font-bold text-foreground truncate mb-3">
                          {logo.filename}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => downloadLogo(logo.file_url, logo.filename)}
                            size="sm"
                            className="flex-1 text-white font-semibold"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            onClick={() => copyUrl(logo.file_url)}
                            size="sm"
                            variant="outline"
                            className="bg-white/80 border-white/40 hover:bg-white/90"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          
                          {!logo.is_main_logo && (
                            <Button
                              onClick={() => setMainLogo(logo.id)}
                              size="sm"
                              variant="outline"
                              className="bg-white/80 border-white/40 hover:bg-white/90 text-yellow-700"
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            onClick={() => handleDeleteLogo(logo.id, logo.filename)}
                            size="sm"
                            variant="outline"
                            className="bg-white/80 border-white/40 hover:bg-white/90 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-2xl text-white hover:shadow-3xl transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: primaryColor }}
          size="icon"
        >
          <ChevronUp className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
};

export default GymProfile;