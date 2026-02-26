import { useParams, Link, useNavigate } from "react-router-dom";
import { useGyms, useSetMainLogo, useUploadLogo, useDeleteLogo, useUploadElement, useDeleteElement, useUpdateElementType, useUpdateGymColor, useAddGymColor } from "@/hooks/useGyms";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Copy, Star, Upload, X, Trash2, Loader2, Grid3X3, LayoutGrid, List, Columns, ChevronUp, Plus, Sparkles, CheckSquare, Link as LinkIcon, Code, Moon, Sun, FileArchive, Eraser } from "lucide-react";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { GymColorProvider } from "@/components/shared/GymColorProvider";
import { BrandCard, BrandCardHeader, BrandCardContent, BrandCardTitle } from "@/components/shared/BrandCard";
import { ColorSwatch } from "@/components/shared/ColorSwatch";
import { AssetRenamer } from "@/components/AssetRenamer";
import { Checkbox } from "@/components/ui/checkbox";
import { HeroVideoBackground } from "@/components/HeroVideoBackground";
import JSZip from "jszip";
import { useBackgroundRemoval } from "@/hooks/useBackgroundRemoval";

const GymProfile = () => {
  const { gymCode } = useParams<{ gymCode: string }>();
  const { data: gyms = [], isLoading, error } = useGyms();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Find gym
  const gym = gyms.find(g => g.code === gymCode || g.id === gymCode);
  
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'carousel' | 'grid' | 'list' | 'masonry'>('carousel');
  const [elementViewMode, setElementViewMode] = useState<'carousel' | 'grid' | 'list' | 'masonry'>('grid');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showElementUpload, setShowElementUpload] = useState(false);
  const [elementType, setElementType] = useState<string>('banner');
  const [isDragOverElement, setIsDragOverElement] = useState(false);
  const [uploadingElements, setUploadingElements] = useState<Record<string, number>>({});
  const [isEditingColors, setIsEditingColors] = useState(false);
  const [showAddColor, setShowAddColor] = useState(false);
  const [newColorValue, setNewColorValue] = useState('#000000');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLogos, setSelectedLogos] = useState<Set<string>>(new Set());
  const [showRenamer, setShowRenamer] = useState(false);
  const [logoBgMode, setLogoBgMode] = useState<'light' | 'dark'>('light');
  const [downloadingZip, setDownloadingZip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const elementFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const setMainLogoMutation = useSetMainLogo();
  const uploadLogoMutation = useUploadLogo();
  const deleteLogoMutation = useDeleteLogo();
  const uploadElementMutation = useUploadElement();
  const deleteElementMutation = useDeleteElement();
  const updateElementTypeMutation = useUpdateElementType();
  const updateColorMutation = useUpdateGymColor();
  const addColorMutation = useAddGymColor();
  const { removeBg, isProcessing: isRemovingBg, progress: bgRemovalProgress, statusMessage: bgRemovalStatus } = useBackgroundRemoval();
  const [removingBgLogoId, setRemovingBgLogoId] = useState<string | null>(null);

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

  const toggleLogoSelection = (logoId: string) => {
    setSelectedLogos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logoId)) {
        newSet.delete(logoId);
      } else {
        newSet.add(logoId);
      }
      return newSet;
    });
  };

  const selectAllLogos = () => {
    if (!gym) return;
    setSelectedLogos(new Set(gym.logos.map(logo => logo.id)));
  };

  const clearSelection = () => {
    setSelectedLogos(new Set());
    setSelectionMode(false);
  };

  const handleOpenRenamer = () => {
    if (selectedLogos.size === 0) {
      toast({
        title: "No assets selected",
        description: "Please select at least one asset to rename",
        variant: "destructive",
      });
      return;
    }
    setShowRenamer(true);
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

  const handleEditColor = (colorId: string, currentColor: string) => {
    if (!user || !isAdmin) {
      toast({
        title: "Admin Access Required",
        description: "You need admin privileges to edit colors",
        variant: "destructive",
      });
      return;
    }

    // Create native color picker input
    const input = document.createElement('input');
    input.type = 'color';
    input.value = currentColor;
    input.style.display = 'none';
    document.body.appendChild(input);
    
    input.onchange = function() {
      const newColor = input.value;
      
      updateColorMutation.mutate(
        { colorId, newColor },
        {
          onSuccess: () => {
            toast({
              description: `Color updated to ${newColor}!`,
              duration: 2000,
            });
          },
          onError: (error) => {
            console.error('Failed to update color:', error);
            toast({
              variant: "destructive",
              description: 'Failed to update color. Please try again.',
              duration: 3000,
            });
          }
        }
      );
      
      document.body.removeChild(input);
    };
    
    // Trigger the color picker
    input.click();
  };

  const handleAddColor = () => {
    if (!gym || !user || !isAdmin) {
      toast({
        title: "Admin Access Required",
        description: "You need admin privileges to add colors",
        variant: "destructive",
      });
      return;
    }

    addColorMutation.mutate(
      { gymId: gym.id, colorHex: newColorValue },
      {
        onSuccess: () => {
          toast({
            description: `Color ${newColorValue} added successfully!`,
            duration: 2000,
          });
          setShowAddColor(false);
          setNewColorValue('#000000');
        },
        onError: (error) => {
          console.error('Failed to add color:', error);
          toast({
            variant: "destructive",
            description: 'Failed to add color. Please try again.',
            duration: 3000,
          });
        }
      }
    );
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
    
    if (!user || !isAdmin) {
      toast({
        title: "Admin Access Required",
        description: "You need admin privileges to set main logo",
        variant: "destructive",
      });
      return;
    }

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
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload logos",
        variant: "destructive",
        action: (
          <Button 
            size="sm" 
            onClick={() => navigate('/auth')}
            style={{ 
              background: 'hsl(var(--brand-rose-gold))',
              color: 'white'
            }}
          >
            Sign In
          </Button>
        ),
      });
      return;
    }

    if (!isAdmin) {
      toast({
        title: "Admin Access Required",
        description: "You need admin privileges to upload logos. Click the diamond button and grant yourself admin access.",
        variant: "destructive",
      });
      return;
    }
    
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
    if (!user || !isAdmin) {
      toast({
        title: "Admin Access Required",
        description: "You need admin privileges to delete logos",
        variant: "destructive",
      });
      return;
    }

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

  const handleRemoveBackground = async (logo: { id: string; file_url: string; filename: string }) => {
    if (!gym) return;
    if (!user || !isAdmin) {
      toast({ title: "Admin Access Required", description: "You need admin privileges", variant: "destructive" });
      return;
    }

    setRemovingBgLogoId(logo.id);
    toast({ description: `${bgRemovalStatus || 'Processing...'} This may take a moment on first use.`, duration: 10000 });

    const result = await removeBg(logo.file_url);
    if (!result) {
      setRemovingBgLogoId(null);
      toast({ variant: "destructive", description: "Background removal failed. Try again." });
      return;
    }

    const cleanName = logo.filename.replace(/\.[^/.]+$/, '') + '-nobg.png';
    const file = new File([result], cleanName, { type: 'image/png' });

    uploadLogoMutation.mutate(
      { gymId: gym.id, file },
      {
        onSuccess: () => {
          setRemovingBgLogoId(null);
          toast({ description: `✨ Background removed! Saved as ${cleanName}` });
        },
        onError: () => {
          setRemovingBgLogoId(null);
          toast({ variant: "destructive", description: "Failed to upload the processed logo." });
        },
      }
    );
  };

  const handleElementDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverElement(true);
  };

  const handleElementDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverElement(false);
  };

  const handleElementDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverElement(false);
    const files = Array.from(e.dataTransfer.files);
    handleElementUpload(files);
  };

  const handleElementFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleElementUpload(files);
  };

  const handleElementUpload = (files: File[]) => {
    if (!gym) return;
    
    if (!user || !isAdmin) {
      toast({
        title: "Admin Access Required",
        description: "You need admin privileges to upload elements",
        variant: "destructive",
      });
      return;
    }
    
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          description: `${file.name} is not an image file`,
        });
        return;
      }

      const fileKey = `${file.name}-${Date.now()}`;
      setUploadingElements(prev => ({ ...prev, [fileKey]: 0 }));

      uploadElementMutation.mutate(
        { gymId: gym.id, file, elementType },
        {
          onSuccess: () => {
            setUploadingElements(prev => {
              const { [fileKey]: _, ...rest } = prev;
              return rest;
            });
            toast({
              description: `${file.name} uploaded successfully as ${elementType}!`,
            });
          },
          onError: () => {
            setUploadingElements(prev => {
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

  const handleDeleteElement = (elementId: string, elementType: string) => {
    if (!user || !isAdmin) {
      toast({
        title: "Admin Access Required",
        description: "You need admin privileges to delete elements",
        variant: "destructive",
      });
      return;
    }

    deleteElementMutation.mutate(elementId, {
      onSuccess: () => {
        toast({
          description: `Element deleted successfully!`,
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          description: `Failed to delete element`,
        });
      }
    });
  };

  const handleUpdateElementType = (elementId: string, newType: string) => {
    if (!user || !isAdmin) {
      toast({
        title: "Admin Access Required",
        description: "You need admin privileges to update elements",
        variant: "destructive",
      });
      return;
    }

    updateElementTypeMutation.mutate(
      { elementId, elementType: newType },
      {
        onSuccess: () => {
          toast({
            description: `Element type updated to ${newType}!`,
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            description: `Failed to update element type`,
          });
        }
      }
    );
  };

  const copyElementData = (data: string) => {
    navigator.clipboard.writeText(data).then(() => {
      showCopyFeedback('element-data', 'Element data copied!');
    });
  };

  const isUrl = (data: string): boolean => {
    return data.startsWith('http://') || data.startsWith('https://');
  };

  const copyElementUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      showCopyFeedback('element-url', 'Element URL copied! Ready to paste in emails 📧');
    });
  };

  const copyElementSvgCode = (svgCode: string) => {
    navigator.clipboard.writeText(svgCode).then(() => {
      showCopyFeedback('element-svg', 'SVG code copied! Ready to paste in design tools 🎨');
    });
  };

  const handleDownloadAllAsZip = useCallback(async () => {
    if (!gym) return;
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${gym.code}-brand-assets`);
      
      // Add logos
      for (const logo of gym.logos) {
        try {
          const response = await fetch(logo.file_url);
          const blob = await response.blob();
          folder?.file(`logos/${logo.filename}`, blob);
        } catch (e) {
          console.warn(`Failed to fetch ${logo.filename}`);
        }
      }
      
      // Add color palette as text
      const colorText = gym.colors.map((c, i) => `Color ${i + 1}: ${c.color_hex}`).join('\n');
      folder?.file('brand-colors.txt', `${gym.name} (${gym.code}) Brand Colors\n\n${colorText}`);
      
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${gym.code}-brand-assets.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast({ description: `${gym.code} brand kit downloaded!` });
    } catch (err) {
      toast({ variant: "destructive", description: "Failed to create ZIP" });
    } finally {
      setDownloadingZip(false);
    }
  }, [gym, toast]);

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
  const logoBgColor = logoBgMode === 'dark' ? '#1a1a2e' : `${primaryColor}08`;

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
    <GymColorProvider primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <div 
        className="min-h-screen"
        style={{
          background: `
            linear-gradient(165deg, ${primaryColor}18 0%, ${secondaryColor}12 30%, ${primaryColor}08 60%, ${secondaryColor}15 100%),
            radial-gradient(ellipse at top left, ${primaryColor}20, transparent 50%),
            radial-gradient(ellipse at bottom right, ${secondaryColor}20, transparent 50%),
            hsl(var(--background))
          `,
        }}
      >
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative container mx-auto px-6 py-8">
          {/* Navigation */}
          <div className="flex items-center gap-4 mb-8">
            <Link to="/">
              <Button 
                variant="outline" 
                size="sm" 
                className="backdrop-blur-sm hover:opacity-90 font-semibold"
                style={{ 
                  backgroundColor: `${primaryColor}15`,
                  borderColor: `${primaryColor}30`,
                  color: primaryColor 
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>

          {/* Hero Video or Compact Hero Header */}
          {gym.hero_video_url ? (
            <HeroVideoBackground videoUrl={gym.hero_video_url} overlayOpacity={0.5}>
              <div className="inline-flex items-center gap-3 mb-4">
                <span 
                  className="px-4 py-2 rounded-full text-white font-bold text-lg tracking-wider"
                  style={{ backgroundColor: primaryColor }}
                >
                  {gym.code}
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
                {gym.name}
              </h1>
              <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                Official brand hub with complete asset library, color palette, and logo collection
              </p>
            </HeroVideoBackground>
          ) : (
            <>
              {/* Interactive Sparkles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute animate-pulse"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${2 + Math.random() * 2}s`
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: `radial-gradient(circle, ${i % 2 === 0 ? primaryColor : secondaryColor}80, transparent)`,
                        boxShadow: `0 0 6px ${i % 2 === 0 ? primaryColor : secondaryColor}60`
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-3 mb-4">
                  <span 
                    className="px-4 py-2 rounded-full text-white font-bold text-lg tracking-wider"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {gym.code}
                  </span>
                </div>
                
                <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  {gym.name}
                </h1>
                
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Official brand hub with complete asset library, color palette, and logo collection
                </p>
              </div>
            </>
          )}

          {/* Two Column Layout: Logo + Stats on Left, Colors on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Left Column: Logo + Brand Assets Stats */}
            <div className="flex flex-col gap-6">
              {/* Main Logo Showcase */}
              {mainLogo && (
                <div className="flex flex-col items-center">
                  <div 
                    className="flex items-center justify-center w-full h-48 mb-6"
                  >
                    <img 
                      src={mainLogo.file_url} 
                      alt={`${gym.name} main logo`}
                      className="max-h-40 max-w-72 object-contain drop-shadow-lg"
                    />
                  </div>
                  <Button
                    onClick={() => downloadLogo(mainLogo.file_url, mainLogo.filename)}
                    className="text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                    style={{ 
                      backgroundColor: primaryColor,
                    }}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Main Logo
                  </Button>
                </div>
              )}

              {/* Brand Assets Stats */}
              <BrandCard variant="hero" style={{ borderColor: `${primaryColor}25` }}>
                <BrandCardHeader className="pb-4">
                  <BrandCardTitle className="text-xl">📊 Brand Assets</BrandCardTitle>
                </BrandCardHeader>
                <BrandCardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-4 rounded-xl bg-gym-primary/10">
                      <div className="text-3xl font-bold mb-1 text-gym-primary">
                        {gym.logos.length}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">Logo Variations</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-gym-secondary/10">
                      <div className="text-3xl font-bold mb-1 text-gym-secondary">
                        {gym.colors.length}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">Brand Colors</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-accent/10">
                      <div className="text-3xl font-bold mb-1 text-accent">
                        {gym.elements?.length || 0}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">Brand Elements</div>
                    </div>
                  </div>
                </BrandCardContent>
              </BrandCard>
            </div>

            {/* Right Column: Brand Colors */}
            <div>
              <BrandCard variant="hero" className="h-full" style={{ borderColor: `${primaryColor}25` }}>
                <BrandCardHeader className="pb-4">
                  <BrandCardTitle className="flex items-center justify-between text-xl">
                    🎨 Brand Colors
                    <div className="flex gap-2">
                      {isAdmin && (
                        <Button
                          onClick={() => setIsEditingColors(!isEditingColors)}
                          size="sm"
                          variant={isEditingColors ? "default" : "outline"}
                          className={isEditingColors 
                            ? "bg-gym-primary hover:bg-gym-primary/90 text-gym-primary-foreground shadow-lg"
                            : ""}
                        >
                          {isEditingColors ? '✓ Done Editing' : '✏️ Edit Colors'}
                        </Button>
                      )}
                      <Button
                        onClick={copyAllColors}
                        size="sm"
                        className="bg-gym-primary hover:bg-gym-primary/90 text-gym-primary-foreground shadow-lg hover:shadow-xl transition-smooth"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy All
                      </Button>
                    </div>
                  </BrandCardTitle>
                </BrandCardHeader>
                <BrandCardContent className="pt-0">
                  <div className="space-y-3">
                    {gym.colors.map((color, index) => (
                      <ColorSwatch
                        key={color.id}
                        color={color.color_hex}
                        label={`Primary Color ${index + 1}`}
                        size="lg"
                        showControls={true}
                        editMode={isEditingColors}
                        onEdit={() => handleEditColor(color.id, color.color_hex)}
                        className="group p-3 rounded-xl hover:bg-card/60 transition-smooth cursor-pointer border border-border/20 hover:border-border/40 hover:shadow-lg"
                      />
                    ))}
                    
                    {/* Add Color Section */}
                    {isEditingColors && isAdmin && (
                      <div className="pt-2">
                        {!showAddColor ? (
                          <Button
                            onClick={() => setShowAddColor(true)}
                            variant="outline"
                            className="w-full border-dashed border-2 hover:bg-gym-primary/10 hover:border-gym-primary transition-smooth"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Color
                          </Button>
                        ) : (
                          <div className="p-4 rounded-xl border-2 border-dashed border-gym-primary/50 bg-gym-primary/5 space-y-3">
                            <div className="flex gap-3 items-center">
                              <input
                                type="color"
                                value={newColorValue}
                                onChange={(e) => setNewColorValue(e.target.value)}
                                className="w-16 h-16 rounded-lg cursor-pointer border-2 border-border"
                              />
                              <input
                                type="text"
                                value={newColorValue}
                                onChange={(e) => setNewColorValue(e.target.value)}
                                placeholder="#000000"
                                className="flex-1 px-4 py-2 rounded-lg border-2 border-border bg-background font-mono text-sm"
                                maxLength={7}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleAddColor}
                                className="flex-1 bg-gym-primary hover:bg-gym-primary/90 text-gym-primary-foreground"
                                disabled={addColorMutation.isPending}
                              >
                                {addColorMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Plus className="w-4 h-4 mr-2" />
                                )}
                                Add Color
                              </Button>
                              <Button
                                onClick={() => {
                                  setShowAddColor(false);
                                  setNewColorValue('#000000');
                                }}
                                variant="outline"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </BrandCardContent>
              </BrandCard>
            </div>
          </div>

        </div>
      </div>


      {/* Content Section */}
      <div className="container mx-auto px-6 pb-12">
        {/* Upload Interface - Always visible for admins when no logos exist */}
        {(gym.logos.length === 0 || showUpload) && isAdmin && (
          <Card className="lg:col-span-4 backdrop-blur-sm shadow-xl mb-8 animate-fade-in" style={{ backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}35` }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {gym.logos.length === 0 ? '📤 Upload Your First Logo' : '📤 Upload New Logos'}
                  </CardTitle>
                  {gym.logos.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Start building your brand asset library
                    </p>
                  )}
                </div>
                {gym.logos.length > 0 && (
                  <Button
                    onClick={() => setShowUpload(false)}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer",
                  isDragOver 
                    ? "border-gym-primary/60 shadow-2xl" 
                    : "border-gym-primary/35 hover:border-gym-primary/55 hover:shadow-lg"
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
          <Card className="lg:col-span-4 backdrop-blur-sm shadow-xl" style={{ backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}35` }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">📁 Logo Gallery ({gym.logos.length} files)</CardTitle>
                <div className="flex items-center gap-2">
                  {/* Dark/Light Preview Toggle */}
                  <Button
                    onClick={() => setLogoBgMode(logoBgMode === 'light' ? 'dark' : 'light')}
                    variant="outline"
                    size="sm"
                    className="font-semibold shadow-lg"
                    style={{ 
                      backgroundColor: logoBgMode === 'dark' ? '#1a1a2e' : 'white',
                      color: logoBgMode === 'dark' ? 'white' : '#1a1a2e',
                      borderColor: `${primaryColor}40`
                    }}
                    title={`Switch to ${logoBgMode === 'light' ? 'dark' : 'light'} background`}
                  >
                    {logoBgMode === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                    {logoBgMode === 'dark' ? 'Light' : 'Dark'}
                  </Button>

                  {/* Download All as ZIP */}
                  <Button
                    onClick={handleDownloadAllAsZip}
                    variant="outline"
                    size="sm"
                    disabled={downloadingZip}
                    className="text-white font-semibold shadow-lg"
                    style={{ backgroundColor: primaryColor, borderColor: `${primaryColor}40` }}
                  >
                    {downloadingZip ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileArchive className="w-4 h-4 mr-2" />}
                    {downloadingZip ? 'Zipping...' : 'Download All'}
                  </Button>

                  <Button
                    onClick={() => setShowUpload(!showUpload)}
                    variant="outline"
                    size="sm"
                    className="text-foreground border-gym-primary/35 hover:bg-gym-primary/12 font-semibold shadow-lg"
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
                    <SelectTrigger className="w-48 bg-background/85 border-gym-primary/35 text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 border-gym-primary/30 backdrop-blur-sm">
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
                <div style={{ perspective: "3000px" }} className="w-full overflow-hidden py-8">
                  <Carousel 
                    className="w-full max-w-5xl mx-auto px-16" 
                    opts={{ align: "center", loop: true }}
                    plugins={[
                      Autoplay({
                        delay: 4000,
                      }),
                    ]}
                    setApi={(api) => {
                      if (!api) return;
                      
                      const updateSlides = () => {
                        const selectedIndex = api.selectedScrollSnap();
                        const slides = api.slideNodes();
                        
                        slides.forEach((slide, index) => {
                          const distance = index - selectedIndex;
                          const card = slide.querySelector('[data-card]');
                          
                          if (card) {
                            let rotateY = 0;
                            let scale = 1;
                            let opacity = 1;
                            
                            if (distance === 0) {
                              // Center slide
                              rotateY = 0;
                              scale = 1;
                              opacity = 1;
                            } else if (distance < 0) {
                              // Left slides
                              rotateY = Math.max(-55, distance * 45);
                              scale = Math.max(0.75, 1 - Math.abs(distance) * 0.15);
                              opacity = Math.max(0.5, 1 - Math.abs(distance) * 0.25);
                            } else {
                              // Right slides
                              rotateY = Math.min(55, distance * 45);
                              scale = Math.max(0.75, 1 - Math.abs(distance) * 0.15);
                              opacity = Math.max(0.5, 1 - Math.abs(distance) * 0.25);
                            }
                            
                            (card as HTMLElement).style.transform = `rotateY(${rotateY}deg) scale(${scale})`;
                            (card as HTMLElement).style.opacity = opacity.toString();
                          }
                        });
                      };
                      
                      // Make cards clickable to navigate
                      const slides = api.slideNodes();
                      slides.forEach((slide, index) => {
                        slide.style.cursor = 'pointer';
                        slide.addEventListener('click', () => {
                          api.scrollTo(index);
                        });
                      });
                      
                      api.on('select', updateSlides);
                      api.on('reInit', updateSlides);
                      updateSlides();
                    }}
                  >
                    <CarouselContent>
                      {gym.logos.map((logo, index) => (
                        <CarouselItem 
                          key={logo.id} 
                          className="md:basis-1/2 lg:basis-1/3"
                          style={{
                            transformStyle: "preserve-3d",
                          }}
                        >
                          <div 
                            className="p-1"
                            style={{
                              transformStyle: "preserve-3d",
                            }}
                          >
                             <Card 
                              data-card
                              className={cn(
                                "relative backdrop-blur-sm shadow-2xl transition-all duration-700",
                                selectionMode && selectedLogos.has(logo.id) && "ring-4 ring-gym-primary"
                              )}
                              style={{
                                transformStyle: "preserve-3d",
                                transform: "rotateY(0deg)",
                                backgroundColor: `${primaryColor}08`,
                                borderColor: `${primaryColor}20`,
                                boxShadow: `
                                  0 20px 60px -10px ${primaryColor}30,
                                  0 10px 30px -5px ${primaryColor}40,
                                  inset 0 1px 0 rgba(255,255,255,0.6)
                                `,
                              }}
                            >
                              <CardContent className="p-6">
                                {/* Selection Checkbox */}
                                {selectionMode && (
                                  <div className="absolute top-3 left-3 z-10">
                                    <Checkbox
                                      checked={selectedLogos.has(logo.id)}
                                      onCheckedChange={() => toggleLogoSelection(logo.id)}
                                      className="h-5 w-5 border-2"
                                    />
                                  </div>
                                )}
                                
                                {/* Main Logo Badge */}
                                {logo.is_main_logo && (
                                  <div 
                                    className="absolute top-3 right-3 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1 shadow-lg z-10"
                                    style={{ backgroundColor: primaryColor }}
                                  >
                                    <Star className="w-3 h-3" />
                                    Main Logo
                                  </div>
                                )}
                                
                                {/* Logo Display with 3D effect */}
                                <div 
                                  className="aspect-[4/3] flex items-center justify-center mb-4 rounded-xl border-2 border-gym-primary/35 shadow-inner"
                                  style={{ 
                                    backgroundColor: logoBgColor,
                                  }}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadLogo(logo.file_url, logo.filename);
                                    }}
                                    size="sm"
                                    className="w-full text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                                    style={{ backgroundColor: primaryColor }}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </Button>
                                  
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyUrl(logo.file_url);
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className={cn(
                                      "w-full bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 hover:scale-105 transition-all",
                                      copiedStates[logo.file_url] && "bg-gym-primary/20 border-gym-primary/50 text-foreground"
                                    )}
                                  >
                                    <Copy className="w-4 h-4 mr-2" />
                                    {copiedStates[logo.file_url] ? "Copied!" : "Copy URL"}
                                  </Button>
                                  
                                  {!logo.is_main_logo && (
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMainLogo(logo.id);
                                      }}
                                      size="sm"
                                      variant="outline"
                                      className="w-full bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-foreground hover:scale-105 transition-all"
                                    >
                                      <Star className="w-4 h-4 mr-2" />
                                      Set as Main
                                    </Button>
                                  )}
                                  
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveBackground(logo);
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="w-full bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-foreground hover:scale-105 transition-all"
                                    disabled={removingBgLogoId === logo.id}
                                  >
                                    {removingBgLogoId === logo.id ? (
                                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{bgRemovalStatus || 'Processing...'}</>
                                    ) : (
                                      <><Eraser className="w-4 h-4 mr-2" />Remove BG</>
                                    )}
                                  </Button>

                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteLogo(logo.id, logo.filename);
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="w-full bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-destructive hover:text-destructive hover:scale-105 transition-all"
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
                    <CarouselPrevious 
                      className="left-4 bg-background/95 border-gym-primary/40 text-foreground hover:bg-gym-primary/10 shadow-lg"
                      style={{ 
                        boxShadow: `0 4px 12px ${primaryColor}50`
                      }}
                    />
                    <CarouselNext 
                      className="right-4 bg-background/95 border-gym-primary/40 text-foreground hover:bg-gym-primary/10 shadow-lg"
                      style={{ 
                        boxShadow: `0 4px 12px ${primaryColor}40`
                      }}
                    />
                  </Carousel>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {gym.logos.map((logo) => (
                    <Card 
                      key={logo.id} 
                      className={cn(
                        "relative bg-background/88 border border-gym-primary/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300",
                        selectionMode && selectedLogos.has(logo.id) && "ring-4 ring-gym-primary"
                      )}
                    >
                      <CardContent className="p-6">
                        {/* Selection Checkbox */}
                        {selectionMode && (
                          <div className="absolute top-3 left-3 z-10">
                            <Checkbox
                              checked={selectedLogos.has(logo.id)}
                              onCheckedChange={() => toggleLogoSelection(logo.id)}
                              className="h-5 w-5 border-2"
                            />
                          </div>
                        )}
                        
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
                          className="aspect-square flex items-center justify-center mb-4 rounded-xl border-2 border-gym-primary/35 shadow-inner"
                          style={{ backgroundColor: logoBgColor }}
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
                              "w-full bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12",
                              copiedStates[logo.file_url] && "bg-gym-primary/20 border-gym-primary/50 text-foreground"
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
                              className="w-full bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-foreground"
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Set as Main
                            </Button>
                          )}
                          
                          <Button
                            onClick={() => handleRemoveBackground(logo)}
                            size="sm"
                            variant="outline"
                            className="w-full bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-foreground"
                            disabled={removingBgLogoId === logo.id}
                          >
                            {removingBgLogoId === logo.id ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{bgRemovalStatus || 'Processing...'}</>
                            ) : (
                              <><Eraser className="w-4 h-4 mr-2" />Remove BG</>
                            )}
                          </Button>

                          <Button
                            onClick={() => handleDeleteLogo(logo.id, logo.filename)}
                            size="sm"
                            variant="outline"
                            className="w-full bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-destructive hover:text-destructive"
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
                    <Card 
                      key={logo.id} 
                      className={cn(
                        "relative bg-background/88 border border-gym-primary/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300",
                        selectionMode && selectedLogos.has(logo.id) && "ring-4 ring-gym-primary"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Selection Checkbox */}
                          {selectionMode && (
                            <Checkbox
                              checked={selectedLogos.has(logo.id)}
                              onCheckedChange={() => toggleLogoSelection(logo.id)}
                              className="h-5 w-5 border-2"
                            />
                          )}
                          
                          {/* Logo Thumbnail */}
                          <div 
                            className="w-20 h-20 flex items-center justify-center rounded-lg border-2 border-gym-primary/35 flex-shrink-0"
                            style={{ backgroundColor: logoBgColor }}
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
                              className="bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            
                            {!logo.is_main_logo && (
                              <Button
                                onClick={() => setMainLogo(logo.id)}
                                size="sm"
                                variant="outline"
                                className="bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-foreground"
                              >
                                <Star className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <Button
                              onClick={() => handleRemoveBackground(logo)}
                              size="sm"
                              variant="outline"
                              className="bg-white/80 border-white/40 hover:bg-purple-50 text-purple-600"
                              disabled={removingBgLogoId === logo.id}
                              title="Remove Background"
                            >
                              {removingBgLogoId === logo.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
                            </Button>

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
                    <Card 
                      key={logo.id} 
                      className={cn(
                        "relative break-inside-avoid bg-white/70 backdrop-blur-sm border-white/30 shadow-lg hover:shadow-xl transition-all duration-300",
                        selectionMode && selectedLogos.has(logo.id) && "ring-4 ring-gym-primary"
                      )}
                    >
                      <CardContent className="p-4">
                        {/* Selection Checkbox */}
                        {selectionMode && (
                          <div className="absolute top-3 left-3 z-10">
                            <Checkbox
                              checked={selectedLogos.has(logo.id)}
                              onCheckedChange={() => toggleLogoSelection(logo.id)}
                              className="h-5 w-5 border-2"
                            />
                          </div>
                        )}
                        
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
                          style={{ backgroundColor: logoBgColor }}
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
                            onClick={() => handleRemoveBackground(logo)}
                            size="sm"
                            variant="outline"
                            className="bg-white/80 border-white/40 hover:bg-purple-50 text-purple-600"
                            disabled={removingBgLogoId === logo.id}
                            title="Remove Background"
                          >
                            {removingBgLogoId === logo.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
                          </Button>

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

        {/* Brand Elements Section */}
        {gym.elements && gym.elements.length > 0 ? (
          <Card className="backdrop-blur-sm shadow-xl mb-8" style={{ backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}35` }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">📦 Brand Elements ({gym.elements.length} files)</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowElementUpload(!showElementUpload)}
                    variant="outline"
                    size="sm"
                    className="bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {showElementUpload ? "Hide Upload" : "Add Elements"}
                  </Button>
                  <Select value={elementViewMode} onValueChange={(value: any) => setElementViewMode(value)}>
                    <SelectTrigger className="w-[140px] bg-background/85 border-gym-primary/35">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carousel">
                        <div className="flex items-center gap-2">
                          <Carousel className="w-4 h-4" />
                          Carousel
                        </div>
                      </SelectItem>
                      <SelectItem value="grid">
                        <div className="flex items-center gap-2">
                          <Grid3X3 className="w-4 h-4" />
                          Grid
                        </div>
                      </SelectItem>
                      <SelectItem value="list">
                        <div className="flex items-center gap-2">
                          <List className="w-4 h-4" />
                          List
                        </div>
                      </SelectItem>
                      <SelectItem value="masonry">
                        <div className="flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4" />
                          Masonry
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {elementViewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {gym.elements.map((element) => (
                    <Card key={element.id} className="relative bg-background/88 border border-gym-primary/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-6">
                        <div 
                          className="absolute top-3 right-3 text-white text-xs px-3 py-1.5 rounded-full font-bold capitalize"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {element.element_type}
                        </div>
                        
                        <div 
                          className="aspect-square flex items-center justify-center mb-4 rounded-xl border-2 border-gym-primary/35 shadow-inner bg-background/80"
                        >
                          {element.svg_data.startsWith('http') ? (
                            <img 
                              src={element.svg_data} 
                              alt={element.element_type}
                              className="max-w-full max-h-full object-contain p-4"
                            />
                          ) : (
                            <div 
                              className="w-full h-full p-4"
                              dangerouslySetInnerHTML={{ __html: element.svg_data }}
                            />
                          )}
                        </div>
                        
                        <div className="text-sm font-bold text-foreground truncate mb-4">
                          {element.element_type}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Select 
                            value={element.element_type} 
                            onValueChange={(value) => handleUpdateElementType(element.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="banner">Banner</SelectItem>
                              <SelectItem value="shape">Shape</SelectItem>
                              <SelectItem value="background">Background</SelectItem>
                              <SelectItem value="icon">Icon</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {isUrl(element.svg_data) && (
                            <Button
                              onClick={() => copyElementUrl(element.svg_data)}
                              size="sm"
                              variant="outline"
                              className="w-full bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12"
                            >
                              <LinkIcon className="w-4 h-4 mr-2" />
                              Copy URL
                            </Button>
                          )}
                          
                          <Button
                            onClick={() => copyElementSvgCode(element.svg_data)}
                            size="sm"
                            variant="outline"
                            className="w-full bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12"
                          >
                            <Code className="w-4 h-4 mr-2" />
                            Copy SVG Code
                          </Button>
                          
                          <Button
                            onClick={() => handleDeleteElement(element.id, element.element_type)}
                            size="sm"
                            variant="outline"
                            className="w-full bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="backdrop-blur-sm shadow-xl mb-8" style={{ backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}35` }}>
            <CardHeader>
              <CardTitle className="text-2xl">📦 Brand Elements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-4">
                  No brand elements uploaded yet
                </div>
                <Button
                  onClick={() => setShowElementUpload(true)}
                  className="text-white font-semibold shadow-lg hover:shadow-xl"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload First Element
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Element Upload Interface */}
        {showElementUpload && (
          <Card className="backdrop-blur-sm shadow-xl mb-8 animate-fade-in" style={{ backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}35` }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">📤 Upload Brand Elements</CardTitle>
                <Button
                  onClick={() => setShowElementUpload(false)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Element Category</label>
                <Select value={elementType} onValueChange={setElementType}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="shape">Shape</SelectItem>
                    <SelectItem value="background">Background</SelectItem>
                    <SelectItem value="icon">Icon</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer",
                  isDragOverElement 
                    ? "border-white/60 shadow-2xl" 
                    : "border-white/30 hover:border-white/50 hover:shadow-lg"
                )}
                style={{
                  backgroundColor: isDragOverElement ? `${primaryColor}20` : `${primaryColor}10`,
                }}
                onDragOver={handleElementDragOver}
                onDragLeave={handleElementDragLeave}
                onDrop={handleElementDrop}
                onClick={() => elementFileInputRef.current?.click()}
              >
                <Upload 
                  className="w-16 h-16 mx-auto mb-4 transition-transform duration-300"
                  style={{ 
                    color: primaryColor,
                    transform: isDragOverElement ? 'scale(1.1)' : 'scale(1)'
                  }}
                />
                <p className="text-lg font-semibold mb-2" style={{ color: primaryColor }}>
                  Drop element files here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  SVG, PNG, JPG files supported
                </p>
                <input
                  ref={elementFileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleElementFileSelect}
                  className="hidden"
                />
              </div>

              {Object.keys(uploadingElements).length > 0 && (
                <div className="mt-4 space-y-2">
                  {Object.entries(uploadingElements).map(([key, progress]) => (
                    <div key={key} className="bg-white/60 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium truncate">{key.split('-')[0]}</span>
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Batch Actions Bar */}
      {selectionMode && selectedLogos.size > 0 && gym && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <Card className="bg-white shadow-2xl border-2 border-gym-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-gym-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-gym-primary">{selectedLogos.size}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {selectedLogos.size} selected
                  </span>
                </div>
                
                <div className="h-8 w-px bg-border" />
                
                <Button
                  onClick={selectAllLogos}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Select All
                </Button>
                
                <Button
                  onClick={handleOpenRenamer}
                  size="sm"
                  className="gap-2 bg-gym-primary hover:bg-gym-primary/90 text-gym-primary-foreground"
                >
                  <Sparkles className="w-4 h-4" />
                  Smart Rename
                </Button>
                
                <Button
                  onClick={clearSelection}
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}



      {/* Asset Renamer Modal */}
      {gym && (
        <AssetRenamer
          open={showRenamer}
          onClose={() => setShowRenamer(false)}
          assets={gym.logos.filter(logo => selectedLogos.has(logo.id))}
          gymCode={gym.code}
          gymName={gym.name}
          onRenameComplete={() => {
            setShowRenamer(false);
            clearSelection();
            toast({
              title: "Assets renamed",
              description: "Your assets have been successfully renamed",
            });
          }}
        />
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-2xl bg-gym-primary text-gym-primary-foreground hover:bg-gym-primary/90 hover:shadow-glow transition-smooth hover:scale-110"
          size="icon"
        >
          <ChevronUp className="w-6 h-6" />
        </Button>
      )}
    </div>
    </GymColorProvider>
  );
};

export default GymProfile;