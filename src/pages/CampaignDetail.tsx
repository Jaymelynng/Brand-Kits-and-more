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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Download, FileImage, Shapes, Video, Edit, Link2, Share, Tag, Trash2, CheckSquare, Copy, ChevronDown, Code, FileText, Eye } from "lucide-react";
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
  const [bulkAssigningGym, setBulkAssigningGym] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'video' | 'image' | 'document' | 'other'>('all');
  const [gymFilter, setGymFilter] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'gym' | 'type' | 'none'>('gym');
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
        campaignAssets: [],
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
  
  // Add campaign assets to gym groups
  campaignAssets?.forEach(asset => {
    if (asset.gym_id && asset.gym) {
      const gymCode = asset.gym.code;
      if (!taggedAssetsByGym[gymCode]) {
        taggedAssetsByGym[gymCode] = {
          gym_id: asset.gym.id,
          gym_name: asset.gym.name,
          gym_code: gymCode,
          logos: [],
          elements: [],
          campaignAssets: [],
        };
      }
      taggedAssetsByGym[gymCode].campaignAssets.push(asset);
    }
  });

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

  const bulkAssignToGym = async () => {
    if (!bulkAssigningGym || selectedAssets.size === 0) return;

    setIsBulkProcessing(true);
    try {
      const gymId = bulkAssigningGym === 'admin' ? null : bulkAssigningGym;
      
      const { error } = await supabase
        .from('campaign_assets')
        .update({ gym_id: gymId })
        .in('id', Array.from(selectedAssets));

      if (error) throw error;

      toast.success(`${selectedAssets.size} assets reassigned successfully`);
      queryClient.invalidateQueries({ queryKey: ['campaign-assets'] });
      clearSelection();
      setBulkAssigningGym(null);
    } catch (error) {
      console.error('Error bulk assigning:', error);
      toast.error('Failed to reassign assets');
    } finally {
      setIsBulkProcessing(false);
    }
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
    <div className="flex h-screen w-full bg-gradient-to-br from-background via-background to-muted/20">
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
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/campaigns')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
            
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">{campaign.name}</h1>
                {campaign.description && (
                  <p className="text-muted-foreground mb-4">{campaign.description}</p>
                )}
                <Badge className={getStatusColor(campaign.status)}>
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
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloading ? "Downloading..." : selectedAssets.size > 0 ? `Download Selected (${selectedAssets.size})` : "Download All"}
                </Button>
              </div>
            </div>

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
          </div>

          {/* Asset Grid */}
          {Object.keys(groupedAssets).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileImage className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl font-semibold text-foreground mb-2">No assets found</p>
                <p className="text-muted-foreground">Try adjusting your filters or upload new assets</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedAssets).map(([groupName, groupAssets]) => (
                <Card key={groupName}>
                  <CardHeader>
                    <CardTitle>{groupName}</CardTitle>
                    <CardDescription>{groupAssets.length} asset{groupAssets.length !== 1 ? 's' : ''}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {groupAssets.map((asset) => (
                        <Card 
                          key={asset.id} 
                          className={`group hover:shadow-lg transition-all relative cursor-pointer ${selectedAssets.has(asset.id) ? 'ring-2 ring-primary' : ''}`}
                          onClick={(e) => {
                            // Don't open detail modal if clicking checkbox or action buttons
                            if ((e.target as HTMLElement).closest('[data-no-detail]')) return;
                            setDetailAsset(asset);
                          }}
                        >
                          <div className="absolute top-2 left-2 z-10" data-no-detail>
                            <Checkbox
                              checked={selectedAssets.has(asset.id)}
                              onCheckedChange={() => toggleAssetSelection(asset.id)}
                              className="bg-background"
                            />
                          </div>
                          <Badge 
                            variant={asset.file_type.startsWith('video/') ? 'destructive' : asset.file_type.startsWith('image/') ? 'default' : 'secondary'}
                            className="absolute top-2 right-2 text-xs"
                          >
                            {getFileTypeLabel(asset.file_type)}
                          </Badge>
                          {asset.gym && (
                            <Badge variant="outline" className="absolute top-10 right-2 text-xs">
                              {asset.gym.code}
                            </Badge>
                          )}
                          <CardContent className="p-4">
                            <HoverCard openDelay={200}>
                              <HoverCardTrigger asChild>
                                <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                  <AssetPreview asset={asset} />
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent side="right" className="w-96 h-96 p-2">
                                <AssetPreview asset={asset} className="w-full h-full" />
                                <p className="text-xs text-center mt-2 truncate">{asset.filename}</p>
                              </HoverCardContent>
                            </HoverCard>
                            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(asset.file_size)}</span>
                            </div>
                            <p className="text-sm font-medium truncate mb-3">{asset.filename}</p>
                            <div className="flex gap-1" data-no-detail>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewAsset(asset);
                                    }}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Preview</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingAsset(asset);
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyAssetUrl(asset.file_url);
                                    }}
                                  >
                                    <Link2 className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy Link</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSharingAsset(asset);
                                    }}
                                  >
                                    <Share className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Share</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadAsset(asset.file_url, asset.filename);
                                    }}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download</TooltipContent>
                              </Tooltip>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
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
                    
                    <div className="flex items-center gap-2">
                      <Select value={bulkAssigningGym || ''} onValueChange={setBulkAssigningGym}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Assign to gym..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin Resource (No Gym)</SelectItem>
                          {gyms?.map((gym) => (
                            <SelectItem key={gym.id} value={gym.id}>
                              {gym.name} ({gym.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        onClick={bulkAssignToGym}
                        disabled={!bulkAssigningGym || isBulkProcessing}
                      >
                        <Tag className="h-4 w-4 mr-2" />
                        {isBulkProcessing ? 'Assigning...' : 'Apply'}
                      </Button>
                    </div>
                    
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

          {/* Keep old gym-based view for logos/elements */}
          {Object.keys(taggedAssetsByGym).length > 0 && (
            <div className="mt-12 space-y-8">
              <h2 className="text-2xl font-bold">Legacy Assets (Logos & Elements)</h2>
              {Object.entries(taggedAssetsByGym).map(([gymCode, gymAssets]) => (
              <Card key={gymCode}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{gymAssets.gym_name} ({gymCode})</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/gym/${gymCode}`)}
                    >
                      View Gym
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    {gymAssets.logos.length} logo{gymAssets.logos.length !== 1 ? 's' : ''}, {' '}
                    {gymAssets.elements.length} element{gymAssets.elements.length !== 1 ? 's' : ''}, {' '}
                    {gymAssets.campaignAssets.length} campaign asset{gymAssets.campaignAssets.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="campaign-assets">
                    <TabsList>
                      <TabsTrigger value="campaign-assets">
                        <Video className="h-4 w-4 mr-2" />
                        Campaign Assets ({gymAssets.campaignAssets.length})
                      </TabsTrigger>
                      <TabsTrigger value="logos">
                        <FileImage className="h-4 w-4 mr-2" />
                        Logos ({gymAssets.logos.length})
                      </TabsTrigger>
                      <TabsTrigger value="elements">
                        <Shapes className="h-4 w-4 mr-2" />
                        Elements ({gymAssets.elements.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="campaign-assets" className="mt-4">
                      {gymAssets.campaignAssets.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No campaign assets</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {gymAssets.campaignAssets.map((asset: any) => (
                            <Card key={asset.id} className={`group hover:shadow-lg transition-all relative ${selectedAssets.has(asset.id) ? 'ring-2 ring-primary' : ''}`}>
                              <div className="absolute top-2 left-2 z-10">
                                <Checkbox
                                  checked={selectedAssets.has(asset.id)}
                                  onCheckedChange={() => toggleAssetSelection(asset.id)}
                                  className="bg-background"
                                />
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="default" className="absolute top-2 right-2">
                                    {gymAssets.gym_code}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>{gymAssets.gym_name}</TooltipContent>
                              </Tooltip>
                              <CardContent className="p-4">
                                <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                  <AssetPreview asset={asset} />
                                </div>
                                <p className="text-sm font-medium truncate mb-2">{asset.filename}</p>
                                <div className="flex gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setEditingAsset(asset)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => copyAssetUrl(asset.file_url)}
                                      >
                                        <Link2 className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy Link</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setSharingAsset(asset)}
                                      >
                                        <Share className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Share</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        className="flex-1"
                                        onClick={() => downloadAsset(asset.file_url, asset.filename)}
                                      >
                                        <Download className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Download</TooltipContent>
                                  </Tooltip>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="logos" className="mt-4">
                      {gymAssets.logos.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No logos</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {gymAssets.logos.map((logo: any) => (
                            <Card key={logo.id} className="group hover:shadow-lg transition-all">
                              <CardContent className="p-4">
                                <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                  <img 
                                    src={logo.file_url} 
                                    alt={logo.filename}
                                    className="max-w-full max-h-full object-contain"
                                  />
                                </div>
                                <p className="text-sm font-medium truncate mb-2">{logo.filename}</p>
                                <Button 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => downloadAsset(logo.file_url, logo.filename)}
                                >
                                  <Download className="h-3 w-3 mr-2" />
                                  Download
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="elements" className="mt-4">
                      {gymAssets.elements.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No elements</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {gymAssets.elements.map((element: any) => (
                            <Card key={element.id} className="group hover:shadow-lg transition-all">
                              <CardContent className="p-4">
                                <div 
                                  className="aspect-square rounded-lg mb-3 flex items-center justify-center"
                                  style={{ backgroundColor: element.element_color }}
                                  dangerouslySetInnerHTML={{ __html: element.svg_data }}
                                />
                                <p className="text-sm font-medium mb-2">
                                  {element.element_type}
                                </p>
                                <Button 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => {
                                    const blob = new Blob([element.svg_data], { type: 'image/svg+xml' });
                                    const url = window.URL.createObjectURL(blob);
                                    downloadAsset(url, `${element.element_type}_${element.id.slice(0, 8)}.svg`);
                                  }}
                                >
                                  <Download className="h-3 w-3 mr-2" />
                                  Download SVG
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
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
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
