import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCampaign } from "@/hooks/useCampaigns";
import { useGyms } from "@/hooks/useGyms";
import { useCampaignAssets } from "@/hooks/useCampaignAssets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Download, FileImage, Shapes, Video, Edit, Link2, Share, Tag, Trash2, CheckSquare, Copy, ChevronDown, Code, FileText, Eye, ChevronRight, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import JSZip from "jszip";
import { CampaignAssetUpload } from "@/components/CampaignAssetUpload";
import { AssetPreview } from "@/components/AssetPreview";
import { AssetEditModal } from "@/components/AssetEditModal";
import { AssetShareModal } from "@/components/AssetShareModal";
import { AssetDetailModal } from "@/components/AssetDetailModal";
import { AssetSidebar } from "@/components/AssetSidebar";
import { AssetStatusCards } from "@/components/AssetStatusCards";
import { AssetFilterBar } from "@/components/AssetFilterBar";
import { BulkGymAssignmentDialog } from "@/components/BulkGymAssignmentDialog";
import { CampaignAsset } from "@/hooks/useCampaignAssets";

const CampaignDetail = () => {
  const { campaignName } = useParams<{ campaignName: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useCampaign(campaignName || "");
  const { data: gyms } = useGyms();
  const { data: campaignAssets, refetch: refetchAssets } = useCampaignAssets(data?.campaign.id || "");
  const [downloading, setDownloading] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CampaignAsset | null>(null);
  const [sharingAsset, setSharingAsset] = useState<CampaignAsset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<CampaignAsset | null>(null);
  const [detailAsset, setDetailAsset] = useState<CampaignAsset | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'video' | 'image' | 'document' | 'other'>('all');
  const [gymFilter, setGymFilter] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'gym' | 'type' | 'none'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Calculate asset counts - MUST be before any conditional returns
  const assetCounts = useMemo(() => {
    const all = campaignAssets?.length || 0;
    const videos = campaignAssets?.filter(a => a.file_type.startsWith('video/')).length || 0;
    const images = campaignAssets?.filter(a => a.file_type.startsWith('image/')).length || 0;
    const documents = campaignAssets?.filter(a => a.file_type.includes('pdf') || a.file_type.includes('document')).length || 0;
    const other = campaignAssets?.filter(a => {
      const ft = a.file_type;
      return !ft.startsWith('video/') && !ft.startsWith('image/') && !ft.includes('pdf') && !ft.includes('document');
    }).length || 0;
    
    return { all, videos, images, documents, other };
  }, [campaignAssets]);

  // Calculate gym counts
  const gymCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    campaignAssets?.forEach(asset => {
      if (asset.gym_id) {
        counts[asset.gym_id] = (counts[asset.gym_id] || 0) + 1;
      }
    });
    return counts;
  }, [campaignAssets]);

  const adminCount = useMemo(() => {
    return campaignAssets?.filter(a => !a.gym_id).length || 0;
  }, [campaignAssets]);

  // Filter assets
  const filteredAssets = useMemo(() => {
    let filtered = campaignAssets || [];
    
    // File type filter
    if (fileTypeFilter !== 'all') {
      filtered = filtered.filter(a => {
        const type = a.file_type.toLowerCase();
        switch (fileTypeFilter) {
          case 'video': return type.startsWith('video/');
          case 'image': return type.startsWith('image/');
          case 'document': return type.includes('pdf') || type.includes('document');
          case 'other': return !type.startsWith('video/') && !type.startsWith('image/') && !type.includes('pdf') && !type.includes('document');
          default: return true;
        }
      });
    }
    
    // Gym filter
    if (gymFilter) {
      if (gymFilter === 'admin') {
        filtered = filtered.filter(a => !a.gym_id);
      } else {
        filtered = filtered.filter(a => a.gym_id === gymFilter);
      }
    }
    
    // Search
    if (searchQuery) {
      filtered = filtered.filter(a =>
        a.filename.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [campaignAssets, fileTypeFilter, gymFilter, searchQuery]);

  // Group assets
  const groupedAssets = useMemo(() => {
    if (groupBy === 'none') return { 'All Assets': filteredAssets };
    
    if (groupBy === 'gym') {
      return filteredAssets.reduce((acc, asset) => {
        const key = asset.gym?.name || 'Admin Resources';
        if (!acc[key]) acc[key] = [];
        acc[key].push(asset);
        return acc;
      }, {} as Record<string, CampaignAsset[]>);
    }
    
    if (groupBy === 'type') {
      return filteredAssets.reduce((acc, asset) => {
        let key = 'Other';
        const type = asset.file_type.toLowerCase();
        if (type.startsWith('video/')) key = 'Videos';
        else if (type.startsWith('image/')) key = 'Images';
        else if (type.includes('pdf') || type.includes('document')) key = 'Documents';
        
        if (!acc[key]) acc[key] = [];
        acc[key].push(asset);
        return acc;
      }, {} as Record<string, CampaignAsset[]>);
    }
    
    return { 'All Assets': filteredAssets };
  }, [filteredAssets, groupBy]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'upcoming': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'archived': return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getFileTypeLabel = (mimeType: string): string => {
    if (mimeType.startsWith('video/')) return 'VIDEO';
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('document')) return 'DOC';
    return 'FILE';
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-xl font-semibold mb-4">Campaign not found</p>
            <Button onClick={() => navigate('/campaigns')}>Back to Campaigns</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { campaign, assets } = data;

  // Group tagged assets by gym (logos/elements)
  const taggedAssetsByGym = assets.reduce((acc, asset) => {
    if (!acc[asset.gym_code]) {
      acc[asset.gym_code] = {
        gym_id: asset.gym_id,
        gym_name: asset.gym_name,
        gym_code: asset.gym_code,
        logos: [],
        elements: [],
      };
    }
    if (asset.asset_type === 'logo') {
      acc[asset.gym_code].logos.push(asset);
    } else {
      acc[asset.gym_code].elements.push(asset);
    }
    return acc;
  }, {} as Record<string, any>);

  // Group campaign assets
  const adminAssets = campaignAssets?.filter(a => !a.gym_id) || [];

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const selectAllAssets = () => {
    const allAssetIds = new Set<string>();
    adminAssets.forEach(asset => allAssetIds.add(asset.id));
    Object.values(taggedAssetsByGym).forEach((gymData: any) => {
      gymData.campaignAssets.forEach((asset: any) => allAssetIds.add(asset.id));
    });
    setSelectedAssets(allAssetIds);
  };

  const clearSelection = () => {
    setSelectedAssets(new Set());
  };

  const bulkDeleteAssets = async () => {
    if (selectedAssets.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedAssets.size} assets? This cannot be undone.`)) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      // Get all assets to delete
      const assetsToDelete = campaignAssets?.filter(a => selectedAssets.has(a.id)) || [];
      
      // Delete from storage
      const filenames = assetsToDelete.map(asset => {
        const urlParts = asset.file_url.split('/');
        return urlParts[urlParts.length - 1];
      });

      if (filenames.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('campaign-assets')
          .remove(filenames);

        if (storageError) throw storageError;
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('campaign_assets')
        .delete()
        .in('id', Array.from(selectedAssets));

      if (dbError) throw dbError;

      toast.success(`${selectedAssets.size} assets deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ['campaign-assets'] });
      clearSelection();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Failed to delete assets');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const bulkCopyLinks = async (format: 'line' | 'markdown' | 'html-links' | 'html-video' | 'csv' = 'line') => {
    if (selectedAssets.size === 0) return;
    
    const selectedAssetObjects = campaignAssets?.filter(a => selectedAssets.has(a.id)) || [];
    
    let formattedLinks = '';
    
    switch (format) {
      case 'line':
        formattedLinks = selectedAssetObjects.map(a => a.file_url).join('\n');
        break;
      case 'markdown':
        formattedLinks = selectedAssetObjects.map(a => `[${a.filename}](${a.file_url})`).join('\n');
        break;
      case 'html-links':
        formattedLinks = selectedAssetObjects.map(a => `<a href="${a.file_url}">${a.filename}</a>`).join('\n');
        break;
      case 'html-video':
        formattedLinks = selectedAssetObjects.map(a => {
          const isVideo = a.file_type.startsWith('video/');
          if (isVideo) {
            return `<video controls width="600" style="max-width: 100%;">
  <source src="${a.file_url}" type="${a.file_type}">
  Your email client doesn't support embedded videos. <a href="${a.file_url}">Watch video</a>
</video>`;
          } else if (a.file_type.startsWith('image/')) {
            return `<img src="${a.file_url}" alt="${a.filename}" style="max-width: 600px; width: 100%;">`;
          } else {
            return `<a href="${a.file_url}">${a.filename}</a>`;
          }
        }).join('\n\n');
        break;
      case 'csv':
        formattedLinks = selectedAssetObjects.map(a => a.file_url).join(', ');
        break;
    }
    
    try {
      await navigator.clipboard.writeText(formattedLinks);
      const formatDescriptions = {
        'line': 'Plain URLs copied',
        'markdown': 'Markdown links copied',
        'html-links': 'HTML links copied',
        'html-video': 'HTML video embeds copied - paste into your email HTML editor',
        'csv': 'CSV format copied'
      };
      toast.success(`Copied ${selectedAssets.size} links!`, {
        description: formatDescriptions[format]
      });
    } catch (error) {
      toast.error('Failed to copy links');
    }
  };

  const downloadSelected = async () => {
    if (selectedAssets.size === 0) return;

    setDownloading(true);
    toast.info(`Preparing ${selectedAssets.size} files for download...`);

    try {
      const zip = new JSZip();
      const selectedAssetObjects = campaignAssets?.filter(a => selectedAssets.has(a.id)) || [];

      // Group by gym for organized ZIP structure
      const assetsByGym = selectedAssetObjects.reduce((acc, asset) => {
        const gymKey = asset.gym_id 
          ? `${gyms?.find(g => g.id === asset.gym_id)?.name || 'Unknown'}`
          : 'Admin_Resources';
        
        if (!acc[gymKey]) acc[gymKey] = [];
        acc[gymKey].push(asset);
        return acc;
      }, {} as Record<string, CampaignAsset[]>);

      // Add files to ZIP with folder structure
      for (const [gymName, gymAssets] of Object.entries(assetsByGym)) {
        for (const asset of gymAssets) {
          const response = await fetch(asset.file_url);
          const blob = await response.blob();
          zip.folder(gymName)?.file(asset.filename, blob);
        }
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${campaign.name}-selected-${selectedAssets.size}-assets.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Downloaded ${selectedAssets.size} assets!`);
      clearSelection();
    } catch (error) {
      console.error('Error downloading selected assets:', error);
      toast.error('Failed to download selected assets');
    } finally {
      setDownloading(false);
    }
  };

  const copyAssetUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const downloadAsset = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const downloadAllAssets = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      
      // Add admin resources
      if (adminAssets.length > 0) {
        const adminFolder = zip.folder('Admin_Resources');
        for (const asset of adminAssets) {
          const response = await fetch(asset.file_url);
          const blob = await response.blob();
          adminFolder?.file(asset.filename, blob);
        }
      }
      
      // Add per-gym folders
      for (const [gymCode, gymAssets] of Object.entries(taggedAssetsByGym)) {
        const gymFolder = zip.folder(gymCode);
        
        // Download logos
        for (const logo of gymAssets.logos) {
          if (logo.file_url) {
            const response = await fetch(logo.file_url);
            const blob = await response.blob();
            gymFolder?.file(logo.filename, blob);
          }
        }
        
        // Download elements (save as SVG)
        for (const element of gymAssets.elements) {
          if (element.svg_data) {
            const filename = `${element.element_type}_${element.id.slice(0, 8)}.svg`;
            gymFolder?.file(filename, element.svg_data);
          }
        }
        
        // Download campaign assets
        for (const asset of gymAssets.campaignAssets) {
          const response = await fetch(asset.file_url);
          const blob = await response.blob();
          gymFolder?.file(asset.filename, blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${campaign.name.replace(/\s+/g, '_')}_assets.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success('All assets downloaded!');
    } catch (error) {
      console.error('Bulk download error:', error);
      toast.error('Failed to download assets');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-slate-50 via-white to-rose-50/30">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <AssetSidebar
          fileTypeFilter={fileTypeFilter}
          setFileTypeFilter={setFileTypeFilter}
          gymFilter={gymFilter}
          setGymFilter={setGymFilter}
          assetCounts={assetCounts}
          gymCounts={gymCounts}
          adminCount={adminCount}
          gyms={gyms || []}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Hero Header */}
        <div 
          className="relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)) 0%, hsl(var(--brand-blue-gray)) 100%)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-5 right-20 w-32 h-32 bg-white/20 rounded-full blur-3xl" />
            <div className="absolute bottom-5 left-20 w-24 h-24 bg-white/15 rounded-full blur-2xl" />
          </div>
          
          <div className="container mx-auto px-6 py-6 relative z-10">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/campaigns')}
              className="mb-3 text-white/80 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
            
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">{campaign.name}</h1>
                {campaign.description && (
                  <p className="text-white/80 mb-3">{campaign.description}</p>
                )}
                <Badge 
                  className="bg-white/20 text-white border-white/30 backdrop-blur-sm"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                >
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </Badge>
              </div>
              <div className="flex gap-2">
                <CampaignAssetUpload
                  campaignId={campaign.id}
                  campaignName={campaign.name}
                  gyms={gyms || []}
                  onSuccess={refetchAssets}
                />
                <Button 
                  onClick={selectedAssets.size > 0 ? downloadSelected : downloadAllAssets} 
                  disabled={downloading || (!campaignAssets || campaignAssets.length === 0)}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
                  style={{
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)'
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloading ? "Downloading..." : selectedAssets.size > 0 ? `Download (${selectedAssets.size})` : "Download All"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          {/* Status Cards */}
          <AssetStatusCards
            total={assetCounts.all}
            videos={assetCounts.videos}
            images={assetCounts.images}
            documents={assetCounts.documents}
            onFilterClick={setFileTypeFilter}
          />

          {/* Filter Bar */}
          <AssetFilterBar
            groupBy={groupBy}
            setGroupBy={setGroupBy}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCount={selectedAssets.size}
            onSelectAll={selectAllAssets}
            onClearSelection={clearSelection}
          />

          {/* Asset Grid */}
          {Object.keys(groupedAssets).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileImage className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-foreground mb-2">No assets found</p>
                <p className="text-muted-foreground">Try adjusting your filters or upload new assets</p>
              </CardContent>
            </Card>
          ) : groupBy === 'none' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredAssets.map((asset) => (
                      <Card 
                        key={asset.id} 
                        className={`group shadow-md hover:shadow-lg transition-all relative cursor-pointer border-gray-200/80 ${
                          selectedAssets.has(asset.id) ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('[data-no-detail]')) return;
                          setDetailAsset(asset);
                        }}
                      >
                        <div className="absolute top-1 left-1 z-10" data-no-detail>
                          <Checkbox
                            checked={selectedAssets.has(asset.id)}
                            onCheckedChange={() => toggleAssetSelection(asset.id)}
                            className="h-3 w-3 bg-background"
                          />
                        </div>
                        
              <Badge 
                variant={asset.file_type.startsWith('video/') ? 'destructive' : 'default'}
                className="absolute top-1 right-1 text-xs h-5 px-1"
              >
                          {getFileTypeLabel(asset.file_type).slice(0, 3)}
                        </Badge>
                        
                        {asset.gym && (
                          <Badge variant="outline" className="absolute top-6 right-1 text-[10px] h-4 px-1">
                            {asset.gym.code}
                          </Badge>
                        )}
                        
              <CardContent className="p-3">
                          <div className="aspect-video bg-muted rounded mb-1.5 flex items-center justify-center overflow-hidden">
                            <AssetPreview asset={asset} />
                          </div>
                          
                          <p className="text-[10px] font-medium truncate mb-1" title={asset.filename}>
                            {asset.filename}
                          </p>
                          
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" data-no-detail>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewAsset(asset);
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadAsset(asset.file_url, asset.filename);
                  }}
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSharingAsset(asset);
                  }}
                >
                  <Share className="h-3 w-3" />
                </Button>
                          </div>
                        </CardContent>
                      </Card>
              ))}
            </div>
          ) : (
      <div className="space-y-3">
        {Object.entries(groupedAssets).map(([groupName, groupAssets]) => (
          <div key={groupName}>
            <div className="flex items-center gap-2 pb-2 mb-3 border-b">
              <h3 className="text-sm font-semibold">{groupName}</h3>
              <Badge variant="secondary" className="text-xs h-5">
                {groupAssets.length}
              </Badge>
            </div>

             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {groupAssets.map((asset) => (
                      <Card 
                        key={asset.id} 
                        className={`group shadow-md hover:shadow-lg transition-all relative cursor-pointer border-gray-200/80 ${
                          selectedAssets.has(asset.id) ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('[data-no-detail]')) return;
                          setDetailAsset(asset);
                        }}
                      >
                        <div className="absolute top-1 left-1 z-10" data-no-detail>
                          <Checkbox
                            checked={selectedAssets.has(asset.id)}
                            onCheckedChange={() => toggleAssetSelection(asset.id)}
                            className="h-3 w-3 bg-background"
                          />
                        </div>
                        
              <Badge 
                variant={asset.file_type.startsWith('video/') ? 'destructive' : 'default'}
                className="absolute top-1 right-1 text-xs h-5 px-1"
              >
                          {getFileTypeLabel(asset.file_type).slice(0, 3)}
                        </Badge>
                        
                        {asset.gym && (
                          <Badge variant="outline" className="absolute top-6 right-1 text-[10px] h-4 px-1">
                            {asset.gym.code}
                          </Badge>
                        )}
                        
              <CardContent className="p-4">
                          <div className="aspect-video bg-muted rounded mb-1.5 flex items-center justify-center overflow-hidden">
                            <AssetPreview asset={asset} />
                          </div>
                          
                          <p className="text-[10px] font-medium truncate mb-1" title={asset.filename}>
                            {asset.filename}
                          </p>
                          
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" data-no-detail>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewAsset(asset);
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadAsset(asset.file_url, asset.filename);
                  }}
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSharingAsset(asset);
                  }}
                >
                  <Share className="h-3 w-3" />
                </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                   </div>
                 </div>
               ))}
             </div>
          )}

          {/* Bulk Actions Toolbar */}
          {selectedAssets.size > 0 && (
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
              <Card className="shadow-2xl border-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{selectedAssets.size} selected</span>
                    </div>
                    
                    <div className="h-8 w-px bg-border" />
                    
                    <Button 
                      onClick={() => setShowBulkAssignDialog(true)}
                      disabled={selectedAssets.size === 0 || isBulkProcessing}
                      variant="default"
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      Assign to Gym ({selectedAssets.size})
                    </Button>
                    
                    <div className="h-8 w-px bg-border" />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" disabled={isBulkProcessing}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Links ({selectedAssets.size})
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => bulkCopyLinks('line')}>
                          <Link2 className="h-4 w-4 mr-2" />
                          Plain URLs (one per line)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkCopyLinks('html-links')}>
                          <Code className="h-4 w-4 mr-2" />
                          HTML Links (&lt;a&gt; tags)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkCopyLinks('html-video')}>
                          <Video className="h-4 w-4 mr-2" />
                          HTML Video Embeds (&lt;video&gt; tags)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkCopyLinks('markdown')}>
                          <FileText className="h-4 w-4 mr-2" />
                          Markdown Links
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <Button 
                      variant="outline"
                      onClick={downloadSelected}
                      disabled={isBulkProcessing || downloading}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    
                    <div className="h-8 w-px bg-border" />
                    
                    <Button 
                      variant="destructive"
                      onClick={bulkDeleteAssets}
                      disabled={isBulkProcessing}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    
                    <Button variant="ghost" onClick={clearSelection}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Legacy Assets Section */}
          {Object.entries(taggedAssetsByGym).some(([_, gymAssets]) => 
            gymAssets.logos.length > 0 || gymAssets.elements.length > 0
          ) && (
            <div className="mt-8 space-y-2">
              <h2 className="text-lg font-bold">Gym Logos & Elements</h2>
              
              {Object.entries(taggedAssetsByGym)
                .filter(([_, gymAssets]) => gymAssets.logos.length > 0 || gymAssets.elements.length > 0)
                .map(([gymCode, gymAssets]) => (
                <Collapsible key={gymCode} defaultOpen>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-2 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 transition-transform" />
                          <h3 className="text-sm font-semibold">{gymAssets.gym_name}</h3>
                          <Badge variant="outline" className="text-xs h-5">{gymCode}</Badge>
                          <Badge variant="secondary" className="text-xs h-5">
                            {gymAssets.logos.length + gymAssets.elements.length}
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/gym/${gymCode}`);
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    
              <CollapsibleContent>
                <CardContent className="p-2 pt-0">
                        <Tabs defaultValue="logos">
                          <TabsList className="h-8">
                            <TabsTrigger value="logos" className="text-xs py-1">
                              Logos ({gymAssets.logos.length})
                            </TabsTrigger>
                            <TabsTrigger value="elements" className="text-xs py-1">
                              Elements ({gymAssets.elements.length})
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="logos" className="mt-1">
                            {gymAssets.logos.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">No logos</p>
                            ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-6 gap-2">
                                {gymAssets.logos.map((logo: any) => (
                                  <Card key={logo.id} className="group hover:shadow-md transition-all cursor-pointer">
                                    <CardContent className="p-1.5">
                                      <div className="aspect-square bg-muted rounded mb-1 flex items-center justify-center overflow-hidden">
                                        <img 
                                          src={logo.file_url} 
                                          alt={logo.filename}
                                          className="max-w-full max-h-full object-contain"
                                        />
                                      </div>
                                      <p className="text-[10px] truncate" title={logo.filename}>
                                        {logo.filename}
                                      </p>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="elements" className="mt-1">
                            {gymAssets.elements.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">No elements</p>
                            ) : (
                              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-6 gap-2">
                                {gymAssets.elements.map((element: any) => (
                                  <Card key={element.id} className="group hover:shadow-md transition-all cursor-pointer">
                                    <CardContent className="p-1.5">
                                      <div 
                                        className="aspect-square rounded mb-1 flex items-center justify-center"
                                        style={{ backgroundColor: element.element_color }}
                                        dangerouslySetInnerHTML={{ __html: element.svg_data }}
                                      />
                                      <p className="text-[10px] truncate" title={element.element_type}>
                                        {element.element_type}
                                      </p>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}


          {/* Modals */}
          {editingAsset && (
            <AssetEditModal
              asset={editingAsset}
              gyms={gyms || []}
              open={!!editingAsset}
              onOpenChange={(open) => !open && setEditingAsset(null)}
            />
          )}

          {sharingAsset && (
            <AssetShareModal
              asset={sharingAsset}
              open={!!sharingAsset}
              onOpenChange={(open) => !open && setSharingAsset(null)}
            />
          )}

          {/* Eye Icon Preview Dialog */}
          {previewAsset && (
            <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
              <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>{previewAsset.filename}</DialogTitle>
                  <DialogDescription>
                    {previewAsset.file_type} • {formatFileSize(previewAsset.file_size)}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-auto bg-muted rounded-lg p-4 flex items-center justify-center">
                  <AssetPreview asset={previewAsset} className="max-h-full" />
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Detail Modal */}
          <AssetDetailModal
            asset={detailAsset}
            onClose={() => setDetailAsset(null)}
            onEdit={() => {
              setEditingAsset(detailAsset);
              setDetailAsset(null);
            }}
            onShare={() => {
              setSharingAsset(detailAsset);
              setDetailAsset(null);
            }}
            onDelete={() => {
              if (detailAsset) {
                // Delete logic
                const confirmDelete = confirm(`Are you sure you want to delete "${detailAsset.filename}"?`);
                if (confirmDelete) {
                  setIsBulkProcessing(true);
                  const urlParts = detailAsset.file_url.split('/');
                  const filename = urlParts[urlParts.length - 1];
                  
                  supabase.storage
                    .from('campaign-assets')
                    .remove([filename])
                    .then(({ error: storageError }) => {
                      if (storageError) throw storageError;
                      
                      return supabase
                        .from('campaign_assets')
                        .delete()
                        .eq('id', detailAsset.id);
                    })
                    .then(({ error: dbError }) => {
                      if (dbError) throw dbError;
                      toast.success('Asset deleted successfully');
                      queryClient.invalidateQueries({ queryKey: ['campaign-assets'] });
                      setDetailAsset(null);
                    })
                    .catch((error) => {
                      console.error('Error deleting asset:', error);
                      toast.error('Failed to delete asset');
                    })
                    .finally(() => {
                      setIsBulkProcessing(false);
                    });
                }
              }
            }}
          />

          {/* Bulk Gym Assignment Dialog */}
          <BulkGymAssignmentDialog
            open={showBulkAssignDialog}
            onOpenChange={setShowBulkAssignDialog}
            selectedAssets={selectedAssets}
            gyms={gyms}
            onSuccess={clearSelection}
          />
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
