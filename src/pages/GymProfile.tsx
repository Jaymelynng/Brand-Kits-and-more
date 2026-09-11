import { useParams, Link, useNavigate } from "react-router-dom";
import { GymPillStrip } from "@/components/GymPillStrip";
import { KitActivityTracker } from "@/components/KitActivityTracker";
import type { GymLogo } from "@/hooks/useGyms";
import { useGyms, useSetMainLogo, useUploadLogo, useDeleteLogo, useUploadElement, useDeleteElement, useUpdateElementType, useUpdateGymColor, useAddGymColor, useUpdateGymInfo, useRenameLogo, useRenameElement } from "@/hooks/useGyms";
import { InlineRename } from "@/components/shared/InlineRename";
import { useGymAssets, useAssetCategories } from "@/hooks/useAssets";
import { useAuth } from "@/hooks/useAuth";
import { Settings, MapPin, Phone, Mail, Globe, ExternalLink, ClipboardList, Facebook, Instagram } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { LogoCarouselFrame } from "@/components/LogoCarouselFrame";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Copy, Star, Upload, X, Trash2, Loader2, Grid3X3, LayoutGrid, List, Columns, ChevronUp, Plus, Sparkles, CheckSquare, Link as LinkIcon, Code, Moon, Sun, FileArchive, Eraser, Check, FolderInput, Rows3, Tag as TagIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { copyText } from "@/lib/copyText";
import { LogoMedia } from "@/components/LogoMedia";
import { FontSpecimen } from "@/components/FontSpecimen";
import { BrandElements } from '@/components/BrandElements';
import { elementCollectionName } from '@/lib/brandElements';
import { BrandKitDownload } from "@/components/BrandKitDownload";
import { isActiveLogo } from "@/lib/logoOrder";
import { contrast, describeColor, luminance, shade } from "@/lib/shade";
import { logoUsage } from "@/lib/brandExamples";
import { FilingTray } from "@/components/FilingTray";
import { CategoryRail } from "@/components/CategoryRail";
import { lazy, Suspense, useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn, scrollToSection } from "@/lib/utils";
import { GymColorProvider } from "@/components/shared/GymColorProvider";
import { BrandCard, BrandCardHeader, BrandCardContent, BrandCardTitle } from "@/components/shared/BrandCard";
import { ColorSwatch } from "@/components/shared/ColorSwatch";
import { Checkbox } from "@/components/ui/checkbox";
import { HeroVideoBackground } from "@/components/HeroVideoBackground";
import { assetFilename, downloadLogoArchive, fetchAssetFile, saveDownload } from '@/lib/assetFiles';
import { LogoPreview } from '@/components/LogoPreview';
import { Search, Eye } from 'lucide-react';
import { HeroLogo } from "@/components/HeroLogo";
import { VariationBrowser } from "@/components/VariationBrowser";
import { useSecretTap } from "@/hooks/useSecretTap";
import { useBackgroundRemoval } from "@/hooks/useBackgroundRemoval";
import { Pencil } from "lucide-react";
import { useLogoCategories, useBulkSetLogoCategory } from "@/hooks/useLogoCategories";
import { useLogoTags, useToggleLogoTag, useBulkToggleLogoTag } from "@/hooks/useLogoTags";

const AssetModal = lazy(() => import('@/components/AssetModal'));
const AssetRenamer = lazy(() => import('@/components/AssetRenamer').then(module => ({ default: module.AssetRenamer })));
const HeroVideoManager = lazy(() => import('@/components/HeroVideoManager').then(module => ({ default: module.HeroVideoManager })));
const LogoOrderEditor = lazy(() => import('@/components/LogoOrderEditor').then(module => ({ default: module.LogoOrderEditor })));

interface GymProfileProps {
  /** Solo mode: a shareable single-gym page with no way into the rest of the app. */
  solo?: boolean;
}

/** What each view is called, for the label over the icon row. */
const VIEW_LABELS: Record<string, string> = {
  carousel: "Carousel",
  grid: "Grid",
  masonry: "Masonry",
  list: "List",
  variations: "Variations",
};

const GymProfile = ({ solo = false }: GymProfileProps) => {
  const { gymCode } = useParams<{ gymCode: string }>();
  const { data: gyms = [], isLoading, error, refetch, isFetching } = useGyms();
  const { user, session, isAdmin: isAdminUser, loading: authLoading } = useAuth();
  /**
   * A /kit/CODE share link is read-only for everyone, the owner included.
   * Gating the edit controls on isAdmin alone meant opening her own share
   * link showed Add Logos, Select and a Delete button on all 80 cards - and
   * "the vendor isn't an admin so they won't see it" is a promise resting on
   * the vendor never signing in. This makes the URL itself decide.
   */
  const isAdmin = isAdminUser && !solo;
  const navigate = useNavigate();
  
  // Find gym
  const gym = gyms.find(g => g.code === gymCode || g.id === gymCode);
  const elementCollection = elementCollectionName(gym?.elements || []);
  const activeLogos = useMemo(() => gym?.logos.filter(isActiveLogo) || [], [gym]);
  const [orderEditor, setOrderEditor] = useState<{ logos: GymLogo[]; label: string } | null>(null);
  
  // Asset system hooks
  const { data: gymAssets = [] } = useGymAssets(gym?.id);
  const { data: categories = [] } = useAssetCategories();
  const { data: logoCategories = [] } = useLogoCategories();
  const { data: logoTags = [] } = useLogoTags();
  const toggleTag = useToggleLogoTag();
  const bulkSetCategory = useBulkSetLogoCategory();
  const bulkToggleTag = useBulkToggleLogoTag();
  // Which category the next drop gets. Chosen before the files land, so
  // uploading and filing are one action instead of two.
  const [uploadCategory, setUploadCategory] = useState('Uncategorized');
  // Tags narrow whatever category is showing. A logo lives in one category
  // but wears many tags, so these stack: Circle + Transparent means both.
  const [activeTags, setActiveTags] = useState<string[]>([]);
  // Categories are multi-select too. Picking Variations AND Themed means
  // either of them (OR), because a logo lives in exactly one category so
  // AND across two would always return nothing. Tags stay AND.
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'variations' | 'carousel' | 'grid' | 'list' | 'masonry'>('grid');

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showElementUpload, setShowElementUpload] = useState(false);
  const [elementType, setElementType] = useState<string>('banner');
  const [isDragOverElement, setIsDragOverElement] = useState(false);
  const [uploadingElements, setUploadingElements] = useState<Record<string, number>>({});
  const [isEditingColors, setIsEditingColors] = useState(false);
  const [showAddColor, setShowAddColor] = useState(false);
  const [newColorValue, setNewColorValue] = useState('#000000');
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [editingColorValue, setEditingColorValue] = useState('#000000');
  const [selectionMode, setSelectionMode] = useState(false);
  // Clicking a card opens it large. The arrows are for moving.
  const [expandedLogo, setExpandedLogo] = useState<typeof gym.logos[0] | null>(null);
  const [logoSearch, setLogoSearch] = useState('');
  const [downloadStatus, setDownloadStatus] = useState('');
  const [darkPreviewUrls, setDarkPreviewUrls] = useState<Set<string>>(new Set());
  const rememberLogoContrast = useCallback((url: string, preferDark: boolean) => {
    setDarkPreviewUrls(previous => {
      if (previous.has(url) === preferDark) return previous;
      const next = new Set(previous);
      if (preferDark) next.add(url);
      else next.delete(url);
      return next;
    });
  }, []);
  const [selectedLogos, setSelectedLogos] = useState<Set<string>>(new Set());
  const [downloadingSelected, setDownloadingSelected] = useState(false);
  const [copyFallbackText, setCopyFallbackText] = useState<string | null>(null);
  // Dragging a logo carries it, or the whole ticked set if it is one of them.
  const [dragIds, setDragIds] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [showRenamer, setShowRenamer] = useState(false);
  const [logoBgMode, setLogoBgMode] = useState<'light' | 'dark'>('light');
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [showVideoManager, setShowVideoManager] = useState(false);
  // Five taps on the hero mark is the way back in. Signed in as admin it opens
  // the video manager; otherwise it goes to sign-in and returns you here.
  const { onTap: onSecretTap, remaining: tapsLeft } = useSecretTap({
    taps: 5,
    onUnlock: () => {
      if (isAdmin) setShowVideoManager(true);
      else if (!solo) navigate(`/auth?next=/gym/${gymCode}`);
    },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const elementFileInputRef = useRef<HTMLInputElement>(null);
  const uploadCardRef = useRef<HTMLDivElement>(null);

  const handleToggleUpload = () => {
    const next = !showUpload;
    setShowUpload(next);
    if (next) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          uploadCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          fileInputRef.current?.focus();
        }, 50);
      });
    }
  };
  const { toast } = useToast();
  const setMainLogoMutation = useSetMainLogo();
  const uploadLogoMutation = useUploadLogo();
  const deleteLogoMutation = useDeleteLogo();
  const uploadElementMutation = useUploadElement();
  const deleteElementMutation = useDeleteElement();
  const updateElementTypeMutation = useUpdateElementType();
  const renameLogoMutation = useRenameLogo();
  const renameElementMutation = useRenameElement();
  const handleRenameLogo = (logoId: string, filename: string) => {
    if (!isAdmin) return;
    renameLogoMutation.mutate({ logoId, filename }, {
      onSuccess: () => toast({ description: `Renamed to ${filename}` }),
      onError: () => toast({ variant: "destructive", description: "Rename failed" }),
    });
  };
  const handleRenameElement = (elementId: string, displayName: string) => {
    if (!isAdmin) return;
    renameElementMutation.mutate({ elementId, displayName }, {
      onSuccess: () => toast({ description: `Renamed to ${displayName}` }),
      onError: () => toast({ variant: "destructive", description: "Rename failed" }),
    });
  };
  const updateColorMutation = useUpdateGymColor();
  const addColorMutation = useAddGymColor();
  const { removeBg, isProcessing: isRemovingBg, progress: bgRemovalProgress, statusMessage: bgRemovalStatus } = useBackgroundRemoval();
  const [removingBgLogoId, setRemovingBgLogoId] = useState<string | null>(null);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingFieldValue, setEditingFieldValue] = useState('');
  const updateGymInfoMutation = useUpdateGymInfo();

  // Find the gym_asset id for a gym_logo by matching file_url
  const openAssetModal = (logoFileUrl: string) => {
    const matchingAsset = gymAssets.find(a => a.file_url === logoFileUrl);
    if (matchingAsset) {
      setSelectedAssetId(matchingAsset.id);
      setAssetModalOpen(true);
    }
  };

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
    setSelectedLogos(new Set(filteredLogos.map(logo => logo.id)));
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

  const normalizeHexInput = (rawValue: string) => {
    let value = rawValue.trim();
    if (!value.startsWith('#')) value = `#${value}`;
    value = value.slice(0, 7);
    return value.toUpperCase();
  };

  const isValidHexColor = (value: string) => /^#[0-9A-F]{6}$/.test(value);

  const handleEditColor = (colorId: string, currentColor: string) => {
    if (!user || !isAdmin) {
      toast({
        title: "Admin Access Required",
        description: "You need admin privileges to edit colors",
        variant: "destructive",
      });
      return;
    }

    setEditingColorId(colorId);
    setEditingColorValue(currentColor.toUpperCase());
  };

  const handleSaveEditedColor = () => {
    if (!editingColorId) return;

    if (!isValidHexColor(editingColorValue)) {
      toast({
        variant: "destructive",
        description: "Please enter a valid HEX color like #1A1A1A",
        duration: 2500,
      });
      return;
    }

    updateColorMutation.mutate(
      { colorId: editingColorId, newColor: editingColorValue },
      {
        onSuccess: () => {
          toast({
            description: `Color updated to ${editingColorValue}!`,
            duration: 2000,
          });
          setEditingColorId(null);
          setEditingColorValue('#000000');
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

  const downloadLogo = async (logoUrl: string, filename: string) => {
    try {
      const blob = await fetchAssetFile(logoUrl, filename);
      saveDownload(blob, assetFilename(filename, blob));
    } catch (err) {
      toast({ title: 'Download could not finish', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    }
  };

  const copyUrl = (url: string) => {
    copyText(url).then(ok => {
      if (ok) toast({ description: "Link copied" });
      else setCopyFallbackText(url);
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
        { gymId: gym.id, file, variant: uploadCategory },
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

  const handleDownloadSelected = useCallback(async () => {
    if (!gym || selectedLogos.size === 0 || downloadingSelected) return;
    const chosen = gym.logos.filter(l => selectedLogos.has(l.id));
    setDownloadingSelected(true); setDownloadStatus('Checking selected files…');
    try {
      await downloadLogoArchive(chosen, `${gym.code}-Selected-Logos.zip`, setDownloadStatus);
      setDownloadStatus(`${chosen.length} selected logos downloaded.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not build the ZIP.';
      setDownloadStatus(message); toast({ variant: 'destructive', description: message });
    } finally { setDownloadingSelected(false); }
  }, [gym, selectedLogos, downloadingSelected, toast]);

  /** Every selected logo's link, one per line, ready to paste. */
  const handleCopySelectedLinks = useCallback((withNames: boolean) => {
    if (!gym || selectedLogos.size === 0) return;
    const chosen = gym.logos.filter(l => selectedLogos.has(l.id));
    const text = chosen
      .map(l => withNames ? `${l.filename}\t${l.file_url}` : l.file_url)
      .join('\n');
    copyText(text).then(ok => {
      if (ok) {
        toast({ description: `${chosen.length} link${chosen.length === 1 ? '' : 's'} copied` });
      } else {
        // Never a dead end: if the browser will not take it, put the text
        // on screen so the links can still be lifted out by hand.
        setCopyFallbackText(text);
      }
    });
  }, [gym, selectedLogos, toast]);

  /**
   * Make a logo card draggable. Spread onto every card in every view so the
   * gesture works the same whichever way she is looking at the library.
   */
  // The purpose in a curated name also selects the intended preview surface.
  const prefersDarkLogoBackground = (logo: GymLogo) =>
    darkPreviewUrls.has(logo.file_url) || /\bdark backgrounds\b/i.test(logo.filename);

  const dragPropsFor = (logo: GymLogo) => ({
    'data-activity-asset': logo.filename,
    draggable: isAdmin,
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (selectionMode) toggleLogoSelection(logo.id);
        else setExpandedLogo(logo);
      }
    },
    // Hitting Select turns the whole card into the target. Requiring a small
    // checkbox meant aiming at a few pixels on a big picture, which took
    // several attempts per file; the card is the thing you are looking at,
    // so the card is what you click.
    onClick: (e: React.MouseEvent) => {
      // Let the card's own buttons - Download, Copy URL, Delete - do their job.
      if ((e.target as HTMLElement).closest('button,a,input,[role="checkbox"]')) return;
      if (selectionMode) toggleLogoSelection(logo.id);
      else {
        setExpandedLogo(logo);
      }
    },
    style: { cursor: selectionMode ? 'pointer' : 'zoom-in' } as React.CSSProperties,
    onDragStart: (e: React.DragEvent) => {
      // Grabbing a ticked card takes the whole selection; grabbing an
      // unticked one takes just that file. Either way the tray gets a list.
      const ids = selectedLogos.has(logo.id) ? [...selectedLogos] : [logo.id];
      setDragIds(ids);
      setDragging(true);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", ids.join(","));
    },
    onDragEnd: () => { setDragging(false); setDragIds([]); },
  });

  const fileIntoCategory = (ids: string[], name: string) => {
    bulkSetCategory.mutate({ logoIds: ids, name }, {
      onSuccess: () => {
        toast({ description: `${ids.length} filed under ${name}` });
        setSelectedLogos(new Set());
      },
      onError: () => toast({ variant: "destructive", description: "Could not move those" }),
    });
  };

  const applyTag = (ids: string[], tag: { id: string; name: string }) => {
    // A tag every one of them already carries comes off instead, so the same
    // bucket both adds and removes without a second control.
    const chosen = (gym?.logos || []).filter(l => ids.includes(l.id));
    const all = chosen.length > 0 && chosen.every(l => (l.tags || []).includes(tag.name));
    bulkToggleTag.mutate({ logoIds: ids, tagId: tag.id, on: !all }, {
      onSuccess: () => toast({
        description: all
          ? `${tag.name} removed from ${ids.length}`
          : `${tag.name} added to ${ids.length}`,
      }),
      onError: () => toast({ variant: "destructive", description: "Tagging failed" }),
    });
  };

  // Build asset-to-category map for filtering (file_url -> category name)
  const assetCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    gymAssets.forEach(asset => {
      if (asset.category) {
        map.set(asset.file_url, asset.category.name);
      }
    });
    return map;
  }, [gymAssets]);

  // Get categories that have logo-type assets in this gym (derived from gymAssets directly)
  const availableCategories = useMemo(() => {
    const catNames = new Set<string>();
    gymAssets.forEach(asset => {
      if (asset.asset_type?.slug === 'logo' && asset.category) {
        catNames.add(asset.category.name);
      }
    });
    return categories
      .filter(c => catNames.has(c.name))
      .sort((a, b) => a.order_index - b.order_index);
  }, [gymAssets, categories]);

  // The reading order comes from the logo_categories table, never a hardcoded
  // array. A literal list here is what silently swallowed six real uploads:
  // the categories were renamed and the array kept naming ones that were gone.
  const VARIANT_ORDER = useMemo(
    () => logoCategories.map(c => c.name),
    [logoCategories]
  );
  // Retired and review files are only available through explicit admin categories.
  const visibleLogos = useMemo(() => {
    if (!gym) return [];
    if (isAdmin) return gym.logos;
    return activeLogos;
  }, [gym, isAdmin, activeLogos]);

  const availableVariants = useMemo(() => {
    const seen = new Set(visibleLogos.map(l => l.variant || 'Uncategorized'));
    // Uncategorized is the inbox, not a category, so it shows even when it is
    // empty. Hiding it at zero means there is no way to tell "nothing is
    // waiting" from "the chip is missing" - and no way to find the pile when
    // an upload does land there.
    seen.add('Uncategorized');
    return VARIANT_ORDER.filter(v => seen.has(v))
      .concat([...seen].filter(v => !VARIANT_ORDER.includes(v)).sort());
  }, [visibleLogos, VARIANT_ORDER]);

  // Category first, then tags narrow it. Tags are AND, not OR - picking
  // Circle and Transparent means files that are both, which is how someone
  // actually hunts for a file.
  const inCategory = useMemo(() => (
    activeCategories.length === 0
      ? activeLogos
      : visibleLogos.filter(l => activeCategories.includes(l.variant || 'Uncategorized'))
  ), [visibleLogos, activeLogos, activeCategories]);

  const filteredLogos = useMemo(() => {
    const terms = logoSearch.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return inCategory.filter(l => activeTags.every(t => (l.tags || []).includes(t)) && terms.every(term =>
      [l.filename, l.variant, l.treatment, ...(l.tags || [])].filter(Boolean).join(' ').toLocaleLowerCase().includes(term)));
  }, [inCategory, activeTags, logoSearch]);

  const handleDownloadShown = async () => {
    if (!gym || downloadingZip) return;
    setDownloadingZip(true); setDownloadStatus('Checking files…');
    try {
      await downloadLogoArchive(filteredLogos, `${gym.code}-Logos.zip`, setDownloadStatus);
      setDownloadStatus(`${filteredLogos.length} logos downloaded.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not build the ZIP.';
      setDownloadStatus(message); toast({ variant: 'destructive', description: message });
    } finally { setDownloadingZip(false); }
  };

  // Only offer tags that would actually return something, with the count of
  // what is left after the tags already picked - never a chip leading to zero.
  const tagFacets = useMemo(() => {
    const byKind = new Map<string, { name: string; count: number }[]>();
    logoTags.forEach(t => {
      const others = activeTags.filter(x => x !== t.name);
      const pool = inCategory.filter(l => others.every(x => (l.tags || []).includes(x)));
      const count = pool.filter(l => (l.tags || []).includes(t.name)).length;
      if (count === 0) return;
      const list = byKind.get(t.kind) || [];
      list.push({ name: t.name, count });
      byKind.set(t.kind, list);
    });
    return [...byKind.entries()];
  }, [inCategory, activeTags, logoTags]);

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
            {error ? 'The brand library could not be loaded.' : `Gym "${gymCode}" not found`}
          </div>
          {error && <Button disabled={isFetching} onClick={() => refetch()} className="mb-3 cursor-pointer bg-slate-900 text-white hover:bg-slate-700">{isFetching ? 'Retrying…' : 'Retry loading'}</Button>}
          {!solo && (
            <Link to="/">
              <Button className="bg-brand-warm hover:bg-brand-warm/80 text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const mainLogo = activeLogos.find(logo => logo.is_main_logo);
  // An animated mark, if this gym has one. It is video on pure black and gets
  // screen-blended over the hero footage, so the gym is never covered up.
  const logoAnimation = gym.logos.find(l => l.variant === 'Animation');

  const primaryColor = gym.colors[0]?.color_hex || '#6B7280';
  // The darkest colour a gym owns, for the showcase ground behind its marks.
  const showcaseInk = (() => {
    const hexes = gym.colors.map(c => c.color_hex).filter(Boolean);
    const darkest = [...hexes].sort((a, b) => luminance(a) - luminance(b))[0];
    return darkest && luminance(darkest) < 0.5 ? darkest : shade(primaryColor, 0.55);
  })();
  const secondaryColor = gym.colors[1]?.color_hex || '#9CA3AF';
  const logoBgColor = logoBgMode === 'dark' ? '#1a1a2e' : `${primaryColor}08`;
  const logoPreviewBackground = (logo: GymLogo) =>
    prefersDarkLogoBackground(logo) ? showcaseInk : logoBgColor;

  // Convert hex to HSL for better manipulation
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    
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

  const actionStyle = { backgroundColor: primaryColor, color: contrast(primaryColor, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#111111' };
  const primaryHsl = hexToHsl(primaryColor);
  const secondaryHsl = hexToHsl(secondaryColor);

  /**
   * The carousel, defined once and used twice: the primary logos above
   * the library, and the library's own carousel view. Rewriting it a
   * second time is what made the showcase look nothing like this one.
   * It closes over the handlers, so there is no second copy to drift.
   */
  const renderCarousel = (
    items: typeof filteredLogos,
    basis = "md:basis-1/2 lg:basis-1/3",
    contained = false,
  ) => (
                <div style={{ perspective: "3000px" }} className={cn("relative isolate w-full min-w-0 overflow-hidden", contained ? "primary-logo-stage flex flex-1 flex-col" : "gallery-logo-stage")}>
                  <LogoCarouselFrame
                    key={items.map(logo => logo.id).join(':')}
                    contained={contained}
                    suspended={!!expandedLogo}
                    navigation={contained ? Array.from(new Map(items.map(logo => [logo.id, logo])).values()).map(logo => ({
                      id: logo.id, label: logo.filename,
                      preview: <span className="flex h-full w-full items-center justify-center rounded-md" style={{ background: logoPreviewBackground(logo) }}><LogoMedia url={logo.file_url} alt="" className="h-full w-full object-contain p-1" /></span>,
                    })) : undefined}
                    className={cn("w-full max-w-5xl mx-auto", contained ? "primary-logo-track flex flex-1 flex-col" : "gallery-logo-track")}
                  >
                    <CarouselContent viewportClassName={contained ? "flex min-w-0 flex-1" : undefined} className={contained ? "min-w-0 flex-1" : undefined}>
                      {items.map((logo, index) => (
                        <CarouselItem 
                          key={`${logo.id}-${index}`} 
                          className={cn(contained ? basis : "gallery-logo-slide", "flex")}
                          style={{
                            transformStyle: contained ? "flat" : "preserve-3d",
                          }}
                        >
                          <div 
                            className="flex w-full min-w-0 p-1"
                            style={{
                              transformStyle: contained ? "flat" : "preserve-3d",
                            }}
                          >
                             <Card 
                              data-card
                              {...dragPropsFor(logo)}
                              className={cn(
                                "relative flex h-full w-full min-w-0 flex-col shadow-2xl transition-all duration-700 border-2",
                                contained && "primary-logo-card",
                                !selectionMode && "cursor-zoom-in",
                                selectionMode && selectedLogos.has(logo.id) && "ring-4 ring-gym-primary"
                              )}
                              style={{
                                transformStyle: contained ? "flat" : "preserve-3d",
                                transform: "rotateY(0deg)",
                                borderColor: `${primaryColor}35`,
                                backgroundColor: '#ffffff',
                                boxShadow: contained ? undefined : `
                                  0 20px 60px -10px ${primaryColor}40,
                                  0 10px 30px -5px ${primaryColor}50
                                `,
                              }}
                            >
                              <CardContent className={cn("flex h-full min-w-0 flex-col", contained ? "p-[clamp(12px,2cqi,20px)]" : "gallery-logo-card-content")}>
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
                                    style={actionStyle}
                                  >
                                    <Star className="w-3 h-3" />
                                    On display
                                  </div>
                                )}
                                
                                {/* Theme Tag Badge */}
                                {(() => {
                                  const assetMatch = gymAssets.find(a => a.file_url === logo.file_url);
                                  const catName = assetMatch?.category?.name;
                                  return catName ? (
                                    <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-full text-[10px] font-bold"
                                      style={{ background: 'hsl(var(--brand-rose-gold) / 0.2)', color: 'hsl(var(--brand-navy))' }}
                                    >{catName}</div>
                                  ) : null;
                                })()}
                                
                                {/* Edit Pencil */}
                                {!selectionMode && (
                                  <button
                                    aria-label={`${isAdmin ? 'Edit' : 'Preview'} ${logo.filename}`}
                                    onClick={(e) => { e.stopPropagation(); if (isAdmin && gymAssets.some(a => a.file_url === logo.file_url)) openAssetModal(logo.file_url); else setExpandedLogo(logo); }}
                                    className={cn("absolute z-10 rounded-full flex items-center justify-center bg-white text-slate-950 hover:bg-slate-100 shadow-md transition-all hover:scale-110", contained ? "top-4 left-4 w-9 h-9" : "bottom-3 right-3 w-7 h-7")}
                                  >
                                    {isAdmin ? <Pencil className="w-3.5 h-3.5 text-slate-950" /> : <Eye className="w-3.5 h-3.5 text-slate-950" />}
                                  </button>
                                )}
                                
                                {/* Logo Display with 3D effect */}
                                <div 
                                  className="aspect-[4/3] w-full min-h-0 shrink-0 overflow-hidden flex items-center justify-center mb-4 rounded-xl border-2 border-gym-primary/35 shadow-inner"
                                  style={{ 
                                    backgroundColor: logoPreviewBackground(logo),
                                  }}
                                >
                                  <LogoMedia
                                    url={logo.file_url}
                                    onContrast={(preferDark) => rememberLogoContrast(logo.file_url, preferDark)}
                                    alt={logo.filename}
                                    className={cn("h-full w-full object-contain", contained ? "p-2" : "p-4")}
                                  />
                                </div>
                                
                                {/* Logo Info */}
                                <div className="text-sm font-bold text-foreground mb-4">
                                  {isAdmin ? <InlineRename value={logo.filename} onSave={(v) => handleRenameLogo(logo.id, v)} /> : <button onClick={() => setExpandedLogo(logo)} className="block w-full cursor-zoom-in break-words text-left text-[15px] leading-snug hover:underline">{logo.filename.replace(/\.(png|jpe?g|webp|gif|svg|mp4|webm)$/i, '')}</button>}
                                  {contained && logoUsage(gym.code, logo.file_url) && <p className="mt-2 text-[15px] font-normal leading-snug text-slate-700" data-logo-usage>{logoUsage(gym.code, logo.file_url)}</p>}
                                </div>
                                
                                {/* Action Buttons */}
                                <div className={cn("mt-auto gap-2", contained && !isAdmin ? "primary-logo-actions grid grid-cols-2" : "flex flex-col")}>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadLogo(logo.file_url, logo.filename);
                                    }}
                                    size="sm"
                                    className="w-full text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                                    style={actionStyle}
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
                                  
                                  {isAdmin && !logo.is_main_logo && (
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
                                      Use as display
                                    </Button>
                                  )}
                                  
                                  {isAdmin && (<>
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
                                  </>)}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {!contained && <><CarouselPrevious
                      className="gallery-logo-previous bg-background/95 border-gym-primary/40 text-foreground hover:bg-gym-primary/10 shadow-lg"
                      style={{ 
                        boxShadow: `0 4px 12px ${primaryColor}50`
                      }}
                    />
                    <CarouselNext 
                      className="gallery-logo-next bg-background/95 border-gym-primary/40 text-foreground hover:bg-gym-primary/10 shadow-lg"
                      style={{ 
                        boxShadow: `0 4px 12px ${primaryColor}40`
                      }}
                    /></>}
                  </LogoCarouselFrame>
                </div>
  );

  return (
    <GymColorProvider primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <div className="gym-profile-navigation sticky top-0 z-50">
        <GymPillStrip readOnly={solo} />
        <nav className="kit-mobile-navigation" aria-label="Jump to kit section" style={{ background: showcaseInk }}>
          {[
            ...(activeLogos.length ? [{ id: 'logo-gallery', label: 'Logos' }] : []),
            ...(gym.elements.length ? [{ id: 'brand-elements', label: elementCollection }] : []),
            { id: 'brand-colors', label: 'Colors' },
            ...(activeLogos.some(logo => logo.variant === 'Primary logos') ? [{ id: 'brand-fonts', label: 'Fonts' }] : []),
          ].map(section => <button key={section.id} type="button" onClick={() => scrollToSection(section.id)}>{section.label}</button>)}
        </nav>
      </div>
      <div 
        className="gym-profile min-h-screen"
        data-public-kit={!isAdmin}
        style={{
          background: `
            linear-gradient(165deg, 
              color-mix(in srgb, ${primaryColor} 45%, #d4d4d8) 0%, 
              color-mix(in srgb, ${primaryColor} 35%, #d4d4d8) 40%, 
              color-mix(in srgb, ${secondaryColor} 30%, #d4d4d8) 70%, 
              color-mix(in srgb, ${primaryColor} 40%, #d4d4d8) 100%)
          `,
        }}
      >
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="kit-intro relative container mx-auto px-6 py-8">
          {/* Navigation */}
          {!solo && (
            <div className="flex items-center gap-4 mb-8">
              <Link to="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="backdrop-blur-sm font-semibold bg-white/90 hover:bg-white border shadow-md"
                  style={{
                    borderColor: `${primaryColor}50`,
                    color: primaryColor
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
          )}

          {/* Hero Video or Compact Hero Header */}
          {gym.hero_video_url ? (
            <HeroVideoBackground videoUrl={gym.hero_video_url} title={gym.name} accent={primaryColor} posterUrl={mainLogo?.file_url} overlayOpacity={gym.hero_includes_logo ? 0.12 : 0.5}>
              {/* If the mark is already composited into the video, painting
                  another one over it just doubles the logo. */}
              {gym.hero_includes_logo ? (
                <div className="h-full w-full" onClick={onSecretTap} />
              ) : (
                <HeroLogo
                  logoUrl={mainLogo?.file_url || activeLogos[0]?.file_url}
                  animationUrl={logoAnimation?.file_url}
                  onTap={onSecretTap}
                  tapsLeft={tapsLeft}
                  name={gym.name}
                  color={primaryColor}
                  onDark
                />
              )}
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
                
                <HeroLogo
                  logoUrl={mainLogo?.file_url || activeLogos[0]?.file_url}
                  animationUrl={logoAnimation?.file_url}
                onTap={onSecretTap}
                tapsLeft={tapsLeft}
                  name={gym.name}
                  color={primaryColor}
                />
                
              </div>
            </>
          )}

          {/* Admin Hero Video Settings Button */}
          {isAdmin && gym.hero_video_url && (
            <div className="absolute top-4 right-4 z-20">
              <Button
                size="sm"
                variant="outline"
                className="bg-black/50 border-white/20 text-white hover:bg-black/70 backdrop-blur-sm"
                onClick={() => setShowVideoManager(true)}
              >
                <Settings className="w-4 h-4 mr-1" /> Manage Video
              </Button>
            </div>
          )}
          {isAdmin && !gym.hero_video_url && (
            <div className="flex justify-center mb-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowVideoManager(true)}
                style={{ borderColor: `${primaryColor}50`, color: primaryColor }}
              >
                <Settings className="w-4 h-4 mr-1" /> Set Hero Video
              </Button>
            </div>
          )}

          {/* Hero Video Manager Sheet */}
          <Sheet open={showVideoManager} onOpenChange={setShowVideoManager}>
            <SheetContent className="w-[400px] sm:w-[480px]">
              <SheetHeader>
                <SheetTitle className="text-lg font-bold">Hero Video — {gym.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <Suspense fallback={<p role="status">Loading editor…</p>}>
                <HeroVideoManager
                  gymId={gym.id}
                  gymName={gym.name}
                  gymCode={gym.code}
                  currentVideoUrl={gym.hero_video_url || null}
                  primaryColor={primaryColor}
                />
                </Suspense>
              </div>
            </SheetContent>
          </Sheet>

          {/* Two Column Layout: Logo + Stats on Left, Colors on Right */}
          <div className="grid grid-cols-1 items-stretch md:grid-cols-2 gap-[clamp(16px,2vw,32px)] max-w-6xl mx-auto" data-brand-overview>
            {/* Left Column: Logo + Brand Assets Stats */}
            <BrandCard variant="hero" className="flex flex-col" style={{ borderColor: `${primaryColor}35`, boxShadow: `0 12px 40px -8px ${primaryColor}35, 0 4px 16px rgba(0,0,0,0.08)` }}>
              <BrandCardContent className="flex flex-1 flex-col p-[clamp(12px,1.5vw,24px)]">
                {/* Main Logo Showcase */}
                {mainLogo && (
                  <div className="flex grow flex-col items-center">
                    <div 
                      className="kit-display-logo flex grow items-center justify-center w-full rounded-2xl border-2 shadow-inner"
                      style={{
                        height: 'clamp(200px, 18vw, 300px)',
                        background: 'linear-gradient(145deg, #fafafa 0%, #f0f0f0 100%)',
                        borderColor: `${primaryColor}25`,
                      }}
                    >
                      <img 
                        src={mainLogo.file_url} 
                        alt={`${gym.name} main logo`}
                        className="h-[90%] w-[95%] object-contain p-2"
                      />
                    </div>
                  </div>
                )}

                <BrandKitDownload gym={gym} />

                {/* Brand Assets Stats */}
                <div className="kit-asset-stats border-t-2 pt-5" style={{ borderColor: `${primaryColor}15` }}>
                  <div className="text-lg font-semibold text-foreground mb-3">Browse the kit</div>
                  <div className="grid grid-cols-3 gap-3">
                    <button type="button" aria-label="Go to logo gallery" onClick={() => document.getElementById('logo-gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="cursor-pointer hover:brightness-110 text-center p-2 lg:p-4 rounded-2xl border-2 shadow-lg bg-gym-primary text-gym-primary-foreground border-gym-primary-foreground/25">
                      <div className="text-3xl font-bold mb-1">
                        {activeLogos.length}
                      </div>
                      <div className="text-sm font-semibold text-gym-primary-foreground/90">Logos</div>
                    </button>
                    <button type="button" aria-label="Go to brand colors" onClick={() => document.getElementById('brand-colors')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="cursor-pointer hover:brightness-110 text-center p-2 lg:p-4 rounded-2xl border-2 shadow-lg bg-gym-secondary text-gym-secondary-foreground border-gym-secondary-foreground/25">
                      <div className="text-3xl font-bold mb-1">
                        {gym.colors.length}
                      </div>
                      <div className="text-sm font-semibold text-gym-secondary-foreground/90">Brand Colors</div>
                    </button>
                    <button type="button" aria-label={`Go to ${elementCollection.toLowerCase()}`} disabled={!gym.elements?.length && !isAdmin}
                      onClick={() => document.getElementById('brand-elements')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="cursor-pointer text-center p-2 lg:p-4 rounded-2xl border-2 shadow-lg bg-primary text-primary-foreground border-primary-foreground/25 transition-[filter] hover:brightness-125 disabled:cursor-default">
                      <div className="text-3xl font-bold mb-1">
                        {gym.elements?.length || 0}
                      </div>
                      <div className="text-sm font-semibold text-primary-foreground">{elementCollection}</div>
                    </button>
                  </div>
                </div>
              </BrandCardContent>
            </BrandCard>

            {/* Right Column: Brand Colors */}
            <div>
              <BrandCard id="brand-colors" variant="hero" className="flex h-full flex-col scroll-mt-28" style={{ borderColor: `${primaryColor}25` }}>
                <BrandCardHeader className="pb-4">
                  <BrandCardTitle className="flex items-center justify-between text-xl">
                    🎨 Brand Colors
                    <div className="flex gap-2">
                      {isAdmin && (
                        <Button
                          onClick={() => {
                            if (isEditingColors) {
                              setEditingColorId(null);
                              setEditingColorValue('#000000');
                              setShowAddColor(false);
                            }
                            setIsEditingColors(!isEditingColors);
                          }}
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
                <BrandCardContent className="flex flex-1 flex-col pt-0">
                  <div className={cn("kit-color-list space-y-3", isEditingColors && "is-editing")}>
                    {gym.colors.map((color) => (
                      <ColorSwatch
                        key={color.id}
                        color={color.color_hex}
                        label={describeColor(color.color_hex)}
                        size="lg"
                        showControls={true}
                        editMode={isEditingColors}
                        onEdit={() => handleEditColor(color.id, color.color_hex)}
                        className="group p-3 rounded-xl bg-muted transition-smooth cursor-pointer border border-border hover:border-border/80 hover:shadow-lg"
                      />
                    ))}

                    {isEditingColors && isAdmin && editingColorId && (
                      <div className="p-4 rounded-xl border-2 border-gym-primary bg-card space-y-3">
                        <p className="text-sm font-semibold text-foreground">Edit selected color (paste HEX allowed):</p>
                        <div className="flex gap-3 items-center">
                          <input
                            type="color"
                            value={isValidHexColor(editingColorValue) ? editingColorValue : '#000000'}
                            onChange={(e) => setEditingColorValue(e.target.value.toUpperCase())}
                            className="w-16 h-16 rounded-lg cursor-pointer border-2 border-border"
                          />
                          <Input
                            type="text"
                            value={editingColorValue}
                            onChange={(e) => setEditingColorValue(normalizeHexInput(e.target.value))}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pasted = e.clipboardData.getData('text');
                              setEditingColorValue(normalizeHexInput(pasted));
                            }}
                            placeholder="#6B6B6B"
                            className="font-mono text-base font-bold"
                            maxLength={7}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleSaveEditedColor}
                            className="flex-1 bg-gym-primary hover:bg-gym-primary/90 text-gym-primary-foreground"
                            disabled={updateColorMutation.isPending || !isValidHexColor(editingColorValue)}
                          >
                            {updateColorMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            Save Color
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingColorId(null);
                              setEditingColorValue('#000000');
                            }}
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    
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
                          <div className="p-4 rounded-xl border-2 border-gym-primary bg-foreground/90 space-y-3">
                            <p className="text-sm font-semibold text-background">Add a new brand color:</p>
                            <div className="flex gap-3 items-center">
                              <input
                                type="color"
                                value={isValidHexColor(newColorValue) ? newColorValue : '#000000'}
                                onChange={(e) => setNewColorValue(e.target.value.toUpperCase())}
                                className="w-16 h-16 rounded-lg cursor-pointer border-2 border-background/30"
                              />
                              <Input
                                type="text"
                                value={newColorValue}
                                onChange={(e) => setNewColorValue(normalizeHexInput(e.target.value))}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pasted = e.clipboardData.getData('text');
                                  setNewColorValue(normalizeHexInput(pasted));
                                }}
                                placeholder="#6B6B6B"
                                className="font-mono text-base font-bold"
                                maxLength={7}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleAddColor}
                                className="flex-1 bg-gym-primary hover:bg-gym-primary/90 text-gym-primary-foreground"
                                disabled={addColorMutation.isPending || !isValidHexColor(newColorValue)}
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
      <div className="kit-library container mx-auto px-6 pb-12">


          {/* Its own area. The primaries are the brand; the gallery below is
              the library. Sharing one card squeezed the carousel into the
              column beside the rail and its cards lost a quarter of their
              width. */}
          {(() => {
            const primaries = activeLogos.filter(l => l.variant === 'Primary logos');
            if (primaries.length === 0) return null;
            // Small sets need extra physical slides for Embla's loop.
            // The thumbnail selector still shows each actual logo only once.
            const reel = primaries.length === 1 || primaries.length >= 5
              ? primaries
              : Array.from({ length: Math.ceil(5 / primaries.length) }, () => primaries).flat();
            return (
              <Card
                className="mb-6 shadow-xl border-2"
                style={{
                  // White cards on a white panel read as one flat sheet. The
                  // gym's own dark tone behind them - navy for TIG - makes the
                  // marks sit forward instead of dissolving into the page.
                  background: showcaseInk,
                  borderColor: showcaseInk,
                }}
              >
                <CardContent className="p-[clamp(12px,2vw,24px)]">
                  {/* 60 / 40. Fonts used to be their own full-width slab, which
                      pushed the logos below the fold - the thing she opens the
                      kit for sat behind a wall of type. */}
                  <div className="grid grid-cols-1 gap-[clamp(12px,1.5vw,24px)] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-stretch" data-brand-showcase>
                    <div className="flex min-w-0 flex-col">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <CardTitle className="flex-1 text-center text-2xl text-white">Primary logos</CardTitle>
                        {!solo && (isAdmin ? <Button className="h-10 cursor-pointer whitespace-nowrap px-3 text-[15px] font-semibold hover:brightness-110"
                          style={{ background: primaryColor, color: contrast(primaryColor, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#111111' }}
                          onClick={() => setOrderEditor({ logos: primaries, label: 'Primary logos' })}>Change order</Button>
                          : <Button asChild className="h-10 cursor-pointer bg-slate-900 px-3 text-[15px] text-white hover:bg-slate-700">
                            <Link to={`/auth?returnTo=${encodeURIComponent(`/gym/${gym.code}`)}`}>Edit kit</Link>
                          </Button>)}
                      </div>
                      {/* A continuous width avoids the old 80% to 50% jump. */}
                      {renderCarousel(reel, "primary-logo-slide", true)}
                    </div>
                    <div id="brand-fonts" className="flex min-w-0 scroll-mt-28 flex-col">
                      {/* The carousel was titled and the type was not, so
                          nothing on screen said the panel beside it was the
                          brand's fonts. */}
                      <CardTitle className={cn("mb-2 text-center text-2xl text-white", !solo && "flex h-10 items-center justify-center")}>Fonts</CardTitle>
                      <FontSpecimen
                        gymId={gym.id}
                        gymName={gym.name}
                        palette={gym.colors.map(c => c.color_hex)}
                        canEdit={isAdmin}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}



        {/* Upload Interface - Always visible for admins when no logos exist */}
        {(gym.logos.length === 0 || showUpload) && isAdmin && (
          <Card ref={uploadCardRef} className="lg:col-span-4 bg-white shadow-xl mb-4 animate-fade-in border-2 scroll-mt-24" style={{ borderColor: `${primaryColor}40` }}>
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
              {/* Pick the category first, then drop. One step, not two. */}
              <div className="mb-4">
                <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2">
                  File these as
                </div>
                <div className="flex flex-wrap gap-2">
                  {logoCategories.map(c => {
                    const on = uploadCategory === c.name;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setUploadCategory(c.name)}
                        className="rounded-full px-4 py-2 text-xs font-extrabold transition-all duration-150"
                        style={{
                          background: on ? primaryColor : '#F1F4F8',
                          color: on ? '#FFFFFF' : '#41505F',
                          boxShadow: on ? `0 0 0 3px ${primaryColor}44` : 'none',
                        }}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
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
                <div className="text-sm font-bold mb-6" style={{ color: primaryColor }}>
                  Filed as {uploadCategory}
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
        {visibleLogos.length > 0 && (
          <Card
            className={cn(
              "lg:col-span-4 scroll-mt-28 shadow-2xl border-2 transition-all",
              isDragOver && "ring-4 ring-white/60 scale-[1.005]"
            )}
            style={{ backgroundColor: `color-mix(in srgb, ${primaryColor} 85%, #1a1a1a)`, borderColor: isDragOver ? '#ffffff' : `${primaryColor}50`, boxShadow: `0 12px 40px -8px ${primaryColor}35, 0 4px 16px rgba(0,0,0,0.08)` }}
            id="logo-gallery"
            onDragOver={isAdmin ? handleDragOver : undefined}
            onDragLeave={isAdmin ? handleDragLeave : undefined}
            onDrop={isAdmin ? handleDrop : undefined}
          >
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-2xl text-white">
                  {isDragOver ? '⬇️ Drop files to upload' : `📁 Logo Gallery (${filteredLogos.length} files)`}
                </CardTitle>
                <div className="kit-gallery-tools flex flex-wrap items-center gap-2">
                  {isAdmin && <Button disabled={filteredLogos.length < 2} className="h-10 cursor-pointer bg-slate-900 text-[15px] font-semibold text-white hover:bg-slate-700"
                    onClick={() => setOrderEditor({ logos: filteredLogos, label: activeCategories.length ? activeCategories.join(' + ') : 'All active logos' })}>Change order</Button>}
                  {/* Download the active library, excluding retired and review files. */}
                  <Button
                    onClick={handleDownloadShown}
                    variant="outline"
                    size="sm"
                    disabled={downloadingZip || !filteredLogos.length}
                    className="font-semibold shadow-lg bg-white text-foreground border-white/50 hover:bg-white/90"
                  >
                    {downloadingZip ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileArchive className="w-4 h-4 mr-2" />}
                    {downloadingZip ? 'Preparing…' : (activeCategories.length || activeTags.length || logoSearch.trim() ? 'Download shown' : 'Download active')}
                  </Button>

                  {tagFacets.length > 0 && (
                    <Button
                      onClick={() => setTagSheetOpen(true)}
                      variant="outline"
                      size="sm"
                      className="font-semibold shadow-lg bg-white text-foreground border-white/50 hover:bg-white/90"
                    >
                      <TagIcon className="w-4 h-4 mr-2" />
                      Tags
                      {activeTags.length > 0 && (
                        <span
                          className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-black text-white"
                          style={{ background: primaryColor }}
                        >
                          {activeTags.length}
                        </span>
                      )}
                    </Button>
                  )}

                  {/* One icon per view. A dropdown hid a browseable set of
                      five behind a click; these are the same five, visible -
                      with a label, because a bare row of icons does not say
                      that it is a choice you can make. */}
                  <div className="kit-gallery-views flex flex-col items-center gap-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/90">
                      View · {VIEW_LABELS[viewMode] ?? viewMode}
                    </span>
                    <div className="flex items-center gap-0.5 rounded-md bg-white/95 p-0.5 shadow-lg">
                    {([
                      ['carousel', LayoutGrid, 'Carousel'],
                      ['grid', Grid3X3, 'Grid'],
                      ['masonry', Columns, 'Masonry'],
                      ['list', List, 'List'],
                      ['variations', Rows3, 'Variations'],
                    ] as const).map(([key, Icon, label]) => (
                      <button
                        key={key}
                        onClick={() => setViewMode(key)}
                        title={label}
                        aria-label={label}
                        aria-pressed={viewMode === key}
                        className="rounded p-1.5 transition-colors"
                        style={viewMode === key
                          ? actionStyle
                          : { background: 'transparent', color: '#41505F' }}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    ))}
                    </div>
                  </div>

                  {isAdmin && (
                    <Button
                      onClick={() => {
                        setSelectionMode(v => !v);
                        if (selectionMode) setSelectedLogos(new Set());
                      }}
                      variant="outline"
                      size="sm"
                      className="font-semibold shadow-lg border-white/50"
                      style={selectionMode
                        ? { background: primaryColor, color: '#fff', borderColor: primaryColor }
                        : { background: '#fff', color: 'hsl(var(--foreground))' }}
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      {selectionMode ? 'Done' : 'Select'}
                    </Button>
                  )}

                  {/* Never gated at all, so a share link offered Add Logos to
                      anyone who opened it. */}
                  {isAdmin && (
                    <Button
                      onClick={handleToggleUpload}
                      variant="outline"
                      size="sm"
                      className="font-semibold shadow-lg bg-white text-foreground border-white/50 hover:bg-white/90"
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
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="relative min-w-0 flex-1 basis-60">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-600" />
                  <Input aria-label="Search logos" value={logoSearch} onChange={e => setLogoSearch(e.target.value)} placeholder="Search logos, colors, styles…" className="h-10 bg-white pl-9 text-[15px] text-slate-950 placeholder:text-slate-600" />
                </label>
                {(logoSearch || activeTags.length > 0 || activeCategories.length > 0) && <Button className="h-10 cursor-pointer bg-slate-900 text-[15px] text-white hover:bg-slate-700" onClick={() => { setLogoSearch(''); setActiveTags([]); setActiveCategories([]); clearSelection(); }}>Clear filters</Button>}
              </div>
              <p className="mt-2 text-[15px] text-white md:hidden">Tap a logo to open the full preview.</p>
              <p role="status" className={downloadStatus ? 'mt-2 text-[15px] text-white' : 'sr-only'}>{downloadStatus}</p>
              {/* The tag drawer, now opened from the panel above. */}
              <Sheet open={tagSheetOpen} onOpenChange={setTagSheetOpen}>
                <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <TagIcon className="h-5 w-5" style={{ color: primaryColor }} />
                      Filter tags
                    </SheetTitle>
                    <p className="text-left text-xs text-muted-foreground">
                      Tags stack: picking two means files that are both. A tag that
                      would leave you nothing is not shown.
                    </p>
                  </SheetHeader>

                  <div className="mt-4 space-y-4 pb-20">
                    {tagFacets.map(([kind, tags]) => (
                      <div key={kind}>
                        <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          {kind}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map(t => {
                            const on = activeTags.includes(t.name);
                            return (
                              <button
                                key={t.name}
                                onClick={() => setActiveTags(prev =>
                                  on ? prev.filter(x => x !== t.name) : [...prev, t.name])}
                                className="rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-all duration-150"
                                style={on
                                  ? { background: primaryColor, color: '#FFFFFF', borderColor: primaryColor }
                                  : { background: '#FFFFFF', color: '#41505F', borderColor: '#DCE3EB' }}
                              >
                                {t.name} ({t.count})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t bg-background px-6 py-3">
                    <span className="text-sm font-bold">
                      {filteredLogos.length} file{filteredLogos.length === 1 ? '' : 's'}
                    </span>
                    {activeTags.length > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setActiveTags([])}>
                        Clear {activeTags.length}
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row">
                {/* Categories live down the side now - a column stays beside
                    the logos where a row of pills wrapped and scrolled away. */}
                {logoCategories.length > 0 && (
                  <CategoryRail
                    // Every category from the table, empty ones included. It
                    // used to list only categories that already had files,
                    // so the moment a gym was cleared down to Uncategorized
                    // the rail vanished and there was nothing to file into.
                    categories={logoCategories.filter(c => isAdmin || !['Retired', 'Needs review'].includes(c.name)).map(c => ({
                      name: c.name,
                      count: visibleLogos.filter(l => (l.variant || 'Uncategorized') === c.name).length,
                    }))}
                    activeCategories={activeCategories}
                    onToggleCategory={(name) => {
                      clearSelection();
                      setActiveCategories(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
                    }}
                    onClearCategories={() => { clearSelection(); setActiveCategories([]); setActiveTags([]); setLogoSearch(''); }}
                    total={activeLogos.length}
                    palette={gym.colors.map(c => c.color_hex)}
                    isAdmin={isAdmin}
                    selectionMode={selectionMode}
                    onToggleSelection={() => {
                      setSelectionMode(v => !v);
                      if (selectionMode) setSelectedLogos(new Set());
                    }}
                    solo={solo}
                    sections={[
                      ...(gym.elements.length || isAdmin ? [{ id: 'brand-elements', label: elementCollection, count: gym.elements.length }] : []),
                      { id: 'brand-colors', label: 'Colors' },
                      ...(activeLogos.some(l => l.variant === 'Primary logos') ? [{ id: 'brand-fonts', label: 'Fonts' }] : []),
                    ]}
                  />
                )}

                <div data-logo-results className="min-w-0 flex-1">
              {!filteredLogos.length && <div className="rounded-xl bg-white p-8 text-center text-slate-950"><p className="text-lg font-bold">No logos match these filters.</p><Button className="mt-3 cursor-pointer bg-slate-900 text-white hover:bg-slate-700" onClick={() => { setLogoSearch(''); setActiveCategories([]); setActiveTags([]); }}>Show active logos</Button></div>}
              {viewMode === 'variations' ? (
                <VariationBrowser
                  logos={filteredLogos}
                  gymCode={gym.code}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                  onDownload={downloadLogo} onCopy={copyUrl} onPreview={setExpandedLogo}
                />
              ) : viewMode === 'carousel' ? (
                renderCarousel(filteredLogos)
              ) : viewMode === 'grid' ? (
                <div className="grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-[clamp(12px,1.5vw,24px)]" data-logo-grid>
                  {filteredLogos.map((logo) => (
                    <Card 
                      key={logo.id} 
                      {...dragPropsFor(logo)}
                      className={cn(
                        "relative h-full min-w-0 border-2 shadow-lg hover:shadow-xl transition-all duration-300",
                        selectionMode && selectedLogos.has(logo.id) && "ring-4 ring-gym-primary"
                      )}
                      style={{ borderColor: `${primaryColor}35`, backgroundColor: '#ffffff' }}
                    >
                      <CardContent className="flex h-full min-w-0 flex-col p-[clamp(12px,1.5vw,24px)]">
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
                            style={actionStyle}
                          >
                            <Star className="w-3 h-3" />
                            On display
                          </div>
                        )}

                        {/* Theme Tag Badge */}
                        {(() => {
                          const assetMatch = gymAssets.find(a => a.file_url === logo.file_url);
                          const catName = assetMatch?.category?.name;
                          return catName && !selectionMode ? (
                            <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-full text-[10px] font-bold"
                              style={{ background: 'hsl(var(--brand-rose-gold) / 0.2)', color: 'hsl(var(--brand-navy))' }}
                            >{catName}</div>
                          ) : null;
                        })()}

                        {/* Edit Pencil */}
                        {!selectionMode && (
                          <button
                            aria-label={`${isAdmin ? 'Edit' : 'Preview'} ${logo.filename}`}
                                    onClick={(e) => { e.stopPropagation(); if (isAdmin && gymAssets.some(a => a.file_url === logo.file_url)) openAssetModal(logo.file_url); else setExpandedLogo(logo); }}
                            className="absolute bottom-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center bg-white/90 hover:bg-white shadow-md transition-all hover:scale-110"
                          >
                            {isAdmin ? <Pencil className="w-3.5 h-3.5 text-slate-950" /> : <Eye className="w-3.5 h-3.5 text-slate-950" />}
                          </button>
                        )}
                        
                        {/* Logo Display */}
                        <div 
                          className="aspect-square w-full min-h-0 shrink-0 overflow-hidden flex items-center justify-center mb-4 rounded-xl border-2 border-gym-primary/35 shadow-inner"
                          style={{ backgroundColor: logoPreviewBackground(logo) }}
                        >
                          <LogoMedia
                                    url={logo.file_url}
                                    onContrast={(preferDark) => rememberLogoContrast(logo.file_url, preferDark)}
                                    alt={logo.filename}
                                    className="h-full w-full object-contain p-4"
                                  />
                        </div>
                        
                        {/* Logo Info */}
                        <div className="text-sm font-bold text-foreground mb-4">
                          {isAdmin ? <InlineRename value={logo.filename} onSave={(v) => handleRenameLogo(logo.id, v)} /> : <button onClick={() => setExpandedLogo(logo)} className="block w-full cursor-zoom-in break-words text-left text-[15px] leading-snug hover:underline">{logo.filename.replace(/\.(png|jpe?g|webp|gif|svg|mp4|webm)$/i, '')}</button>}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="mt-auto flex flex-col gap-2">
                          <Button
                            onClick={() => downloadLogo(logo.file_url, logo.filename)}
                            size="sm"
                            className="w-full text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                            style={actionStyle}
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
                          
                          {isAdmin && !logo.is_main_logo && (
                            <Button
                              onClick={() => setMainLogo(logo.id)}
                              title="Use as this gym's display logo"
                              aria-label="Use as this gym's display logo"
                              size="sm"
                              variant="outline"
                              className="w-full bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-foreground"
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Use as display
                            </Button>
                          )}
                          
                          {isAdmin && (<>
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
                          </>)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : viewMode === 'list' ? (
                <div data-logo-list className="space-y-4">
                  {filteredLogos.map((logo) => (
                    <Card 
                      key={logo.id} 
                      {...dragPropsFor(logo)}
                      className={cn(
                        "relative border-2 shadow-lg hover:shadow-xl transition-all duration-300",
                        selectionMode && selectedLogos.has(logo.id) && "ring-4 ring-gym-primary"
                      )}
                      style={{ borderColor: `${primaryColor}35`, backgroundColor: '#ffffff' }}
                    >
                      <CardContent className="p-4">
                        <div className="logo-list-row flex items-center gap-4">
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
                            className="logo-list-image w-20 h-20 flex items-center justify-center rounded-lg border-2 border-gym-primary/35 flex-shrink-0"
                            style={{ backgroundColor: logoPreviewBackground(logo) }}
                          >
                            <LogoMedia
                                    url={logo.file_url}
                                    onContrast={(preferDark) => rememberLogoContrast(logo.file_url, preferDark)}
                                    alt={logo.filename}
                                    className="max-w-full max-h-full object-contain"
                                  />
                          </div>
                          
                          {/* Logo Info */}
                          <div className="logo-list-info flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-lg font-bold text-foreground flex-1 min-w-0">
                                {isAdmin ? <InlineRename value={logo.filename} onSave={(v) => handleRenameLogo(logo.id, v)} /> : <button onClick={() => setExpandedLogo(logo)} className="block w-full cursor-zoom-in break-words text-left text-[15px] leading-snug hover:underline">{logo.filename.replace(/\.(png|jpe?g|webp|gif|svg|mp4|webm)$/i, '')}</button>}
                              </div>
                              {logo.is_main_logo && (
                                <div 
                                  className="text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"
                                  style={actionStyle}
                                >
                                  <Star className="w-3 h-3" />
                                  On display
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="logo-list-actions flex flex-wrap gap-2">
                            <Button
                              onClick={() => downloadLogo(logo.file_url, logo.filename)}
                              size="sm"
                              className="text-white font-semibold"
                              style={actionStyle}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                            
                            <Button
                              onClick={() => copyUrl(logo.file_url)}
                              aria-label={`Copy URL for ${logo.filename}`}
                              size="sm"
                              variant="outline"
                              className="bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            
                            {isAdmin && !logo.is_main_logo && (
                              <Button
                                onClick={() => setMainLogo(logo.id)}
                                title="Use as this gym's display logo"
                                aria-label="Use as this gym's display logo"
                                size="sm"
                                variant="outline"
                                className="bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-foreground"
                              >
                                <Star className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {isAdmin && (<>
                            <Button
                              onClick={() => handleRemoveBackground(logo)}
                              size="sm"
                              variant="outline"
                              className="bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-foreground"
                              disabled={removingBgLogoId === logo.id}
                              title="Remove Background"
                            >
                              {removingBgLogoId === logo.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
                            </Button>

                            <Button
                              onClick={() => handleDeleteLogo(logo.id, logo.filename)}
                              size="sm"
                              variant="outline"
                              className="bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            </>)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div data-logo-masonry className="gap-6 space-y-6">
                  {filteredLogos.map((logo) => (
                    <Card 
                      key={logo.id} 
                      {...dragPropsFor(logo)}
                      className={cn(
                        "relative break-inside-avoid border-2 shadow-lg hover:shadow-xl transition-all duration-300",
                        selectionMode && selectedLogos.has(logo.id) && "ring-4 ring-gym-primary"
                      )}
                      style={{ borderColor: `${primaryColor}35`, backgroundColor: '#ffffff' }}
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
                            style={actionStyle}
                          >
                            <Star className="w-3 h-3" />
                            On display
                          </div>
                        )}
                        
                        {/* Logo Display */}
                        <div 
                          className="w-full flex items-center justify-center mb-4 rounded-lg border-2 border-gym-primary/35 p-4"
                          style={{ backgroundColor: logoPreviewBackground(logo) }}
                        >
                          <LogoMedia
                                    url={logo.file_url}
                                    onContrast={(preferDark) => rememberLogoContrast(logo.file_url, preferDark)}
                                    alt={logo.filename}
                                    className="w-full h-auto object-contain"
                                  />
                        </div>
                        
                        {/* Logo Info */}
                        <div className="text-sm font-bold text-foreground mb-3">
                          {isAdmin ? <InlineRename value={logo.filename} onSave={(v) => handleRenameLogo(logo.id, v)} /> : <button onClick={() => setExpandedLogo(logo)} className="block w-full cursor-zoom-in break-words text-left text-[15px] leading-snug hover:underline">{logo.filename.replace(/\.(png|jpe?g|webp|gif|svg|mp4|webm)$/i, '')}</button>}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => downloadLogo(logo.file_url, logo.filename)}
                            size="sm"
                            className="flex-1 text-white font-semibold"
                            style={actionStyle}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            onClick={() => copyUrl(logo.file_url)}
                            size="sm"
                            variant="outline"
                            className="bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          
                          {isAdmin && !logo.is_main_logo && (
                            <Button
                              onClick={() => setMainLogo(logo.id)}
                              title="Use as this gym's display logo"
                              aria-label="Use as this gym's display logo"
                              size="sm"
                              variant="outline"
                              className="bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-foreground"
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {isAdmin && (<>
                          <Button
                            onClick={() => handleRemoveBackground(logo)}
                            size="sm"
                            variant="outline"
                            className="bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-foreground"
                            disabled={removingBgLogoId === logo.id}
                            title="Remove Background"
                          >
                            {removingBgLogoId === logo.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
                          </Button>

                          <Button
                            onClick={() => handleDeleteLogo(logo.id, logo.filename)}
                            size="sm"
                            variant="outline"
                            className="bg-background/85 border-gym-primary/35 hover:bg-gym-primary/12 text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          </>)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <BrandElements gym={gym} isAdmin={isAdmin}
          onUpload={() => setShowElementUpload(value => !value)}
          onRename={handleRenameElement} onTypeChange={handleUpdateElementType}
          onDelete={handleDeleteElement} />
        {/* Element Upload Interface */}
        {isAdmin && showElementUpload && (
          <Card className="bg-white shadow-2xl mb-8 animate-fade-in border-2" style={{ borderColor: `${primaryColor}50`, boxShadow: `0 12px 40px -8px ${primaryColor}35, 0 4px 16px rgba(0,0,0,0.08)` }}>
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
                    <SelectItem value="divider">Divider</SelectItem><SelectItem value="banner">Banner</SelectItem>
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
                    ? "border-gym-primary/60 shadow-2xl" 
                    : "border-gym-primary/35 hover:border-gym-primary/55 hover:shadow-lg"
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
                
                {/* Bulk file. The selection already exists here - this is
                    where a person is standing when they decide 40 files are
                    all Themed. */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
                      <FolderInput className="w-4 h-4" />
                      Move to
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="center">
                    <div className="mb-1 px-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Category
                    </div>
                    {logoCategories.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          const ids = [...selectedLogos];
                          bulkSetCategory.mutate({ logoIds: ids, name: c.name }, {
                            onSuccess: () => toast({ description: `${ids.length} moved to ${c.name}` }),
                            onError: () => toast({ variant: "destructive", description: "Move failed" }),
                          });
                        }}
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm font-semibold hover:bg-muted"
                      >
                        {c.name}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
                      <TagIcon className="w-4 h-4" />
                      Tag
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="max-h-80 w-64 overflow-y-auto p-2" align="center">
                    <div className="mb-1 px-1 text-[11px] text-muted-foreground">
                      Click adds to all {selectedLogos.size}. A tag every one already
                      has is removed instead.
                    </div>
                    {logoTags.map(t => {
                      const chosen = gym.logos.filter(l => selectedLogos.has(l.id));
                      const hasIt = chosen.filter(l => (l.tags || []).includes(t.name)).length;
                      const all = hasIt === chosen.length && chosen.length > 0;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            const ids = [...selectedLogos];
                            bulkToggleTag.mutate({ logoIds: ids, tagId: t.id, on: !all }, {
                              onSuccess: () => toast({
                                description: all
                                  ? `${t.name} removed from ${ids.length}`
                                  : `${t.name} added to ${ids.length}`,
                              }),
                              onError: () => toast({ variant: "destructive", description: "Tagging failed" }),
                            });
                          }}
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm font-semibold hover:bg-muted"
                        >
                          <span className={all ? "text-gym-primary" : ""}>{t.name}</span>
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {hasIt}/{chosen.length}
                          </span>
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>

                <Button
                  onClick={handleDownloadSelected}
                  size="sm"
                  variant="outline"
                  disabled={downloadingSelected}
                  className="gap-2"
                >
                  {downloadingSelected
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Download className="w-4 h-4" />}
                  {downloadingSelected ? 'Zipping...' : 'Download'}
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Copy className="w-4 h-4" />
                      Copy links
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-2" align="center">
                    <button
                      onClick={() => handleCopySelectedLinks(false)}
                      className="w-full rounded px-2 py-1.5 text-left text-sm font-semibold hover:bg-muted"
                    >
                      Just the links
                    </button>
                    <button
                      onClick={() => handleCopySelectedLinks(true)}
                      className="w-full rounded px-2 py-1.5 text-left text-sm font-semibold hover:bg-muted"
                    >
                      Filename + link
                    </button>
                  </PopoverContent>
                </Popover>

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
      {isAdmin && showRenamer && (
        <Suspense fallback={<p role="status">Loading editor…</p>}>
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
        </Suspense>
      )}

      {expandedLogo && <LogoPreview logo={gym.logos.find(l => l.id === expandedLogo.id) || expandedLogo}
        usageNote={logoUsage(gym.code, expandedLogo.file_url)}
        logos={filteredLogos.some(l => l.id === expandedLogo.id) ? filteredLogos : activeLogos}
        palette={gym.colors.map(c => c.color_hex)} onChoose={asset => setExpandedLogo(gym.logos.find(logo => logo.id === asset.id) || null)} onClose={() => setExpandedLogo(null)}>
        {isAdmin && <div className="flex flex-wrap gap-2 border-t pt-3" aria-label="Edit logo tags">
          {logoTags.map(tag => {
            const live = gym.logos.find(l => l.id === expandedLogo.id) || expandedLogo;
            const on = (live.tags || []).includes(tag.name);
            return <button key={tag.id} aria-pressed={on} disabled={toggleTag.isPending}
              onClick={() => toggleTag.mutate({ logoId: live.id, tagId: tag.id, on: !on })}
              className="cursor-pointer rounded-full border px-3 py-2 text-[15px] font-semibold hover:brightness-90"
              style={on ? actionStyle : { background: '#E8EDF2', color: '#111827' }}>{tag.name}</button>;
          })}
        </div>}
      </LogoPreview>}

      {/* The clipboard can refuse for reasons that have nothing to do with
          this app - an unfocused page, an insecure origin. Losing 40 asset
          links to that is not acceptable, so show them instead. */}
      {copyFallbackText && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ background: "rgba(6,10,16,0.72)" }}
          onClick={() => setCopyFallbackText(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-1 text-sm font-bold">Your browser blocked the clipboard</div>
            <p className="mb-3 text-xs text-muted-foreground">
              Nothing is lost — select the text below and copy it yourself.
            </p>
            <textarea
              readOnly
              autoFocus
              onFocus={e => e.currentTarget.select()}
              value={copyFallbackText}
              className="h-56 w-full resize-none rounded-lg border p-3 font-mono text-xs"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setCopyFallbackText(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filing happens by dragging onto a big target, not by hunting a
          checkbox. Shown whenever an admin is filing or dragging. */}
      {isAdmin && !solo && (dragging || selectionMode) && gym && (
        <FilingTray
          categories={logoCategories}
          tags={logoTags}
          logos={gym.logos}
          selectedIds={selectedLogos}
          dragging={dragging}
          getDragIds={() => dragIds}
          onDropCategory={fileIntoCategory}
          onDropTag={applyTag}
          primaryColor={primaryColor}
        />
      )}


      {/* Asset Modal */}
      <Suspense fallback={<p role="status">Loading editor…</p>}>
        {isAdmin && orderEditor && <LogoOrderEditor gymId={gym.id} gymCode={gym.code} allLogos={gym.logos} logos={orderEditor.logos}
          label={orderEditor.label} ink={showcaseInk} accent={primaryColor} onClose={() => setOrderEditor(null)} />}
        {isAdmin && assetModalOpen && <AssetModal open={assetModalOpen} onOpenChange={setAssetModalOpen} assetId={selectedAssetId} />}
      </Suspense>
      <KitActivityTracker gymId={gym.id} enabled={!authLoading && !isAdminUser} token={session?.access_token} />
    </div>
    </GymColorProvider>
  );
};

export default GymProfile;
