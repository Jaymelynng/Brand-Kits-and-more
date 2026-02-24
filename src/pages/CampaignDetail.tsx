import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { useGyms } from "@/hooks/useGyms";
import { useCampaignAssets } from "@/hooks/useCampaignAssets";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileImage, Shapes, Video, Edit, Link2, Share, Tag, Trash2, Copy, Code, FileText, ChevronRight, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import JSZip from "jszip";
import { CampaignAssetUpload } from "@/components/CampaignAssetUpload";
import { AssetPreview } from "@/components/AssetPreview";
import { AssetEditModal } from "@/components/AssetEditModal";
import { AssetShareModal } from "@/components/AssetShareModal";
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
  const [rightPanelAsset, setRightPanelAsset] = useState<CampaignAsset | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'video' | 'image' | 'document' | 'other'>('all');
  const [gymFilter, setGymFilter] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'gym' | 'type' | 'none'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const updateCampaign = useUpdateCampaign();

  const handleSetAsThumbnail = (asset: CampaignAsset) => {
    if (!data?.campaign?.id) return;
    updateCampaign.mutate({
      id: data.campaign.id,
      updates: { thumbnail_url: asset.file_url }
    });
    setDetailAsset(null);
  };

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
        const key = asset.gym?.name || 'Unassigned';
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
    filteredAssets.forEach(asset => allAssetIds.add(asset.id));
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
      
      // Add unassigned assets
      if (adminAssets.length > 0) {
        const adminFolder = zip.folder('Unassigned');
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
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">

      {/* ═══ PANEL 1 – Gym / Topic List ═══ */}
      <div className="w-52 flex-shrink-0 flex flex-col border-r bg-white overflow-hidden">

        {/* Campaign header */}
        <div
          className="flex-shrink-0 p-3 border-b"
          style={{ background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.15), hsl(var(--brand-blue-gray) / 0.10))' }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/campaigns')}
            className="w-full justify-start h-7 mb-2 text-xs"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            All Campaigns
          </Button>
          <div className="px-1">
            <h2 className="text-sm font-bold leading-tight truncate" title={campaign.name}>
              {campaign.name}
            </h2>
            <Badge className="mt-1 text-[10px] h-4 px-1.5" variant="outline">
              {campaign.status}
            </Badge>
          </div>
        </div>

        {/* Gym nav list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 pt-1 pb-2">
            View by Gym
          </p>

          {/* All Assets */}
          <button
            onClick={() => { setGymFilter(null); setFileTypeFilter('all'); }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition-all text-left ${
              gymFilter === null
                ? 'font-semibold text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            style={gymFilter === null ? {
              background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))',
            } : {}}
          >
            <span className="flex items-center gap-1.5 truncate min-w-0">
              <Shapes className="h-3 w-3 flex-shrink-0" />
              All Assets
            </span>
            <span className={`text-[11px] font-medium ml-1 flex-shrink-0 px-1.5 py-0.5 rounded-full ${
              gymFilter === null ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {assetCounts.all}
            </span>
          </button>

          {/* Unassigned */}
          {adminCount > 0 && (
            <button
              onClick={() => { setGymFilter('admin'); setFileTypeFilter('all'); }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition-all text-left ${
                gymFilter === 'admin'
                  ? 'font-semibold text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              style={gymFilter === 'admin' ? {
                background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))',
              } : {}}
            >
              <span className="flex items-center gap-1.5 truncate min-w-0">
                <FileImage className="h-3 w-3 flex-shrink-0" />
                Unassigned
              </span>
              <span className={`text-[11px] font-medium ml-1 flex-shrink-0 px-1.5 py-0.5 rounded-full ${
                gymFilter === 'admin' ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {adminCount}
              </span>
            </button>
          )}

          {/* Gyms with assets */}
          {gyms?.filter(g => gymCounts[g.id] > 0).map(gym => (
            <button
              key={gym.id}
              onClick={() => { setGymFilter(gym.id); setFileTypeFilter('all'); }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition-all text-left ${
                gymFilter === gym.id
                  ? 'font-semibold text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              style={gymFilter === gym.id ? {
                background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))',
              } : {}}
            >
              <span className="truncate text-left min-w-0">{gym.name}</span>
              <span className={`text-[11px] font-medium ml-1 flex-shrink-0 px-1.5 py-0.5 rounded-full ${
                gymFilter === gym.id ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {gymCounts[gym.id]}
              </span>
            </button>
          ))}

          {/* Gyms with no assets yet */}
          {gyms?.some(g => !gymCounts[g.id]) && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 pt-3 pb-1">
                No Assets Yet
              </p>
              {gyms?.filter(g => !gymCounts[g.id]).map(gym => (
                <div
                  key={gym.id}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground/40"
                >
                  <span className="truncate">{gym.name}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground/30 flex-shrink-0 ml-1">
                    0
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Upload at bottom of Panel 1 */}
        <div className="flex-shrink-0 p-2 border-t">
          <CampaignAssetUpload
            campaignId={campaign.id}
            campaignName={campaign.name}
            gyms={gyms || []}
            onSuccess={refetchAssets}
          />
        </div>
      </div>

      {/* ═══ PANEL 2 – Asset Grid ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Compact toolbar */}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b bg-white/90 backdrop-blur-sm flex-wrap">

          {/* Select-all checkbox */}
          <Checkbox
            checked={filteredAssets.length > 0 && selectedAssets.size === filteredAssets.length}
            onCheckedChange={(checked) => {
              if (checked) { selectAllAssets(); setRightPanelAsset(null); }
              else clearSelection();
            }}
            title="Select all"
          />

          {/* Search */}
          <div className="relative flex-1 min-w-[130px] max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search filenames…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-sm bg-muted/40 border-0 focus-visible:ring-1"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* File-type pill filters */}
          <div className="flex gap-1 flex-wrap">
            {(['all', 'image', 'video', 'document', 'other'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFileTypeFilter(type)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  fileTypeFilter === type
                    ? 'text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                style={fileTypeFilter === type ? {
                  background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))',
                } : {}}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {selectedAssets.size > 0
                ? `${selectedAssets.size} of ${filteredAssets.length} selected`
                : `${filteredAssets.length} assets`}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={selectedAssets.size > 0 ? downloadSelected : downloadAllAssets}
              disabled={downloading || filteredAssets.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              {downloading ? '…' : selectedAssets.size > 0 ? `Download (${selectedAssets.size})` : 'Download All'}
            </Button>
          </div>
        </div>

        {/* Asset grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <FileImage className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No assets found</p>
              <p className="text-xs mt-1">
                {gymFilter !== null || searchQuery
                  ? 'Try a different filter or search term'
                  : 'Upload assets using the button in the left panel'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {filteredAssets.map((asset) => (
                <Card
                  key={asset.id}
                  className={`group relative cursor-pointer border transition-all hover:shadow-md ${
                    selectedAssets.has(asset.id)
                      ? 'ring-2 ring-primary border-primary'
                      : rightPanelAsset?.id === asset.id && selectedAssets.size === 0
                      ? 'ring-2 ring-blue-400 border-blue-300'
                      : 'border-gray-200/80'
                  }`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[data-no-detail]')) return;
                    setRightPanelAsset(asset);
                    setSelectedAssets(new Set());
                  }}
                >
                  {/* Checkbox */}
                  <div className="absolute top-1 left-1 z-10" data-no-detail>
                    <Checkbox
                      checked={selectedAssets.has(asset.id)}
                      onCheckedChange={() => {
                        toggleAssetSelection(asset.id);
                        setRightPanelAsset(null);
                      }}
                      className="h-3.5 w-3.5 bg-background/80"
                    />
                  </div>

                  {/* File-type badge */}
                  <Badge
                    variant={asset.file_type.startsWith('video/') ? 'destructive' : 'default'}
                    className="absolute top-1 right-1 text-[9px] h-4 px-1 z-10"
                  >
                    {getFileTypeLabel(asset.file_type).slice(0, 3)}
                  </Badge>

                  {/* Gym code badge */}
                  {asset.gym && (
                    <Badge
                      variant="outline"
                      className="absolute bottom-7 right-1 text-[9px] h-4 px-1 z-10 bg-white/80"
                    >
                      {asset.gym.code}
                    </Badge>
                  )}

                  <CardContent className="p-2">
                    <div className="aspect-video bg-muted rounded mb-1.5 flex items-center justify-center overflow-hidden">
                      <AssetPreview asset={asset} />
                    </div>
                    <p className="text-[10px] font-medium truncate" title={asset.filename}>
                      {asset.filename}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ PANEL 3 – Detail / Bulk Actions ═══ */}
      {(rightPanelAsset !== null || selectedAssets.size > 0) && (
        <div className="w-72 flex-shrink-0 flex flex-col border-l bg-white overflow-hidden">

          {selectedAssets.size > 0 ? (
            /* ── Bulk Actions Mode ── */
            <>
              <div
                className="flex-shrink-0 flex items-center justify-between p-3 border-b"
                style={{ background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.12), hsl(var(--brand-blue-gray) / 0.08))' }}
              >
                <div>
                  <p className="text-sm font-bold">{selectedAssets.size} Assets Selected</p>
                  <p className="text-xs text-muted-foreground">Choose an action below</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={clearSelection}
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">

                {/* Copy URLs */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Copy URLs ({selectedAssets.size})
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 text-xs justify-start" onClick={() => bulkCopyLinks('line')}>
                      <Link2 className="h-3 w-3 mr-1.5" />
                      Plain URLs
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs justify-start" onClick={() => bulkCopyLinks('html-links')}>
                      <Code className="h-3 w-3 mr-1.5" />
                      HTML Links
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs justify-start" onClick={() => bulkCopyLinks('html-video')}>
                      <Video className="h-3 w-3 mr-1.5" />
                      HTML Video
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs justify-start" onClick={() => bulkCopyLinks('markdown')}>
                      <FileText className="h-3 w-3 mr-1.5" />
                      Markdown
                    </Button>
                  </div>
                </div>

                <div className="border-t" />

                {/* Assign gym */}
                <Button
                  className="w-full h-9 text-sm justify-start"
                  onClick={() => setShowBulkAssignDialog(true)}
                  disabled={isBulkProcessing}
                >
                  <Tag className="h-3.5 w-3.5 mr-2" />
                  Assign / Unassign Gym
                </Button>

                {/* Download */}
                <Button
                  variant="outline"
                  className="w-full h-9 text-sm justify-start"
                  onClick={downloadSelected}
                  disabled={downloading || isBulkProcessing}
                >
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Download ({selectedAssets.size})
                </Button>

                <div className="border-t" />

                {/* Delete */}
                <Button
                  variant="destructive"
                  className="w-full h-9 text-sm justify-start"
                  onClick={bulkDeleteAssets}
                  disabled={isBulkProcessing}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete ({selectedAssets.size})
                </Button>

                <Button
                  variant="ghost"
                  className="w-full h-8 text-xs text-muted-foreground"
                  onClick={clearSelection}
                >
                  Cancel Selection
                </Button>
              </div>
            </>

          ) : rightPanelAsset ? (
            /* ── Single Asset Detail Mode ── */
            <>
              <div
                className="flex-shrink-0 flex items-center gap-2 p-3 border-b"
                style={{ background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.12), hsl(var(--brand-blue-gray) / 0.08))' }}
              >
                <p className="text-sm font-bold truncate flex-1 min-w-0" title={rightPanelAsset.filename}>
                  {rightPanelAsset.filename}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 flex-shrink-0"
                  onClick={() => setRightPanelAsset(null)}
                  title="Close"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Preview */}
                <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden border-b">
                  <AssetPreview asset={rightPanelAsset} className="max-h-full" />
                </div>

                <div className="p-3 space-y-3">
                  {/* Metadata */}
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Type: </span>
                      {rightPanelAsset.file_type}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Size: </span>
                      {formatFileSize(rightPanelAsset.file_size)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Gym: </span>
                      {rightPanelAsset.gym?.name ?? <span className="italic opacity-60">Unassigned</span>}
                    </p>
                  </div>

                  {/* Inline gym reassignment */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Assign / Unassign Gym
                    </p>
                    <Select
                      value={rightPanelAsset.gym_id ?? 'unassigned'}
                      onValueChange={async (val) => {
                        const newGymId = val === 'unassigned' ? null : val;
                        const { error } = await supabase
                          .from('campaign_assets')
                          .update({ gym_id: newGymId })
                          .eq('id', rightPanelAsset.id);
                        if (error) { toast.error('Failed to reassign'); return; }
                        queryClient.invalidateQueries({ queryKey: ['campaign-assets'] });
                        toast.success('Gym updated!');
                        setRightPanelAsset({
                          ...rightPanelAsset,
                          gym_id: newGymId,
                          gym: newGymId ? gyms?.find(g => g.id === newGymId) : undefined,
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {gyms?.map(g => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name} ({g.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* File URL + copy */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      File URL
                    </p>
                    <div className="flex gap-1">
                      <input
                        readOnly
                        value={rightPanelAsset.file_url}
                        className="flex-1 text-[11px] p-1.5 bg-muted rounded border min-w-0 truncate"
                        onClick={(e) => e.currentTarget.select()}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 flex-shrink-0"
                        onClick={() => copyAssetUrl(rightPanelAsset.file_url)}
                        title="Copy URL"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs justify-start"
                      onClick={() => downloadAsset(rightPanelAsset.file_url, rightPanelAsset.filename)}
                    >
                      <Download className="h-3 w-3 mr-1.5" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs justify-start"
                      onClick={() => { setSharingAsset(rightPanelAsset); setRightPanelAsset(null); }}
                    >
                      <Share className="h-3 w-3 mr-1.5" />
                      Share
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs justify-start"
                      onClick={() => { setEditingAsset(rightPanelAsset); setRightPanelAsset(null); }}
                    >
                      <Edit className="h-3 w-3 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs justify-start"
                      onClick={async () => {
                        if (!confirm(`Delete "${rightPanelAsset.filename}"?`)) return;
                        const urlParts = rightPanelAsset.file_url.split('/');
                        const filename = urlParts[urlParts.length - 1];
                        await supabase.storage.from('campaign-assets').remove([filename]);
                        await supabase.from('campaign_assets').delete().eq('id', rightPanelAsset.id);
                        queryClient.invalidateQueries({ queryKey: ['campaign-assets'] });
                        toast.success('Asset deleted');
                        setRightPanelAsset(null);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
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

      <BulkGymAssignmentDialog
        open={showBulkAssignDialog}
        onOpenChange={setShowBulkAssignDialog}
        selectedAssets={selectedAssets}
        gyms={gyms}
        onSuccess={clearSelection}
      />
    </div>
  );
};

export default CampaignDetail;
