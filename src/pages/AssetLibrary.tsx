import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAllAssets } from "@/hooks/useAllAssets";
import { useAssetTypes } from "@/hooks/useAssetTypes";
import { useAssetChannels } from "@/hooks/useAssetChannels";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useGyms } from "@/hooks/useGyms";
import { AssetPreview } from "@/components/AssetPreview";
import { AssetDetailModal } from "@/components/AssetDetailModal";
import { AssetEditModal } from "@/components/AssetEditModal";
import { AssetShareModal } from "@/components/AssetShareModal";
import { useDeleteCampaignAsset, CampaignAsset } from "@/hooks/useCampaignAssets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowLeft, Library, Copy, Grid3X3, List } from "lucide-react";
import { toast } from "sonner";

const AssetLibrary = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [assetTypeId, setAssetTypeId] = useState<string>("");
  const [channelId, setChannelId] = useState<string>("");
  const [campaignId, setCampaignId] = useState<string>("");
  const [gymId, setGymId] = useState<string>("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [selectedAsset, setSelectedAsset] = useState<CampaignAsset | null>(null);
  const [editingAsset, setEditingAsset] = useState<CampaignAsset | null>(null);
  const [sharingAsset, setSharingAsset] = useState<CampaignAsset | null>(null);
  const deleteAsset = useDeleteCampaignAsset();

  const { data: assets, isLoading } = useAllAssets({
    search: search || undefined,
    assetTypeId: assetTypeId || undefined,
    channelId: channelId || undefined,
    campaignId: campaignId || undefined,
    gymId: gymId || undefined,
  });

  const { data: types } = useAssetTypes();
  const { data: channels } = useAssetChannels();
  const { data: campaigns } = useCampaigns();
  const { data: gyms } = useGyms();

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied!");
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;
    if (!confirm(`Delete "${selectedAsset.filename}"?`)) return;
    await deleteAsset.mutateAsync({ assetId: selectedAsset.id, fileUrl: selectedAsset.file_url });
    setSelectedAsset(null);
    toast.success("Asset deleted");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30">
      {/* Header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)) 0%, hsl(var(--brand-blue-gray)) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        <div className="container mx-auto px-6 py-8 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Library className="h-8 w-8 text-white" />
              <div>
                <h1 className="text-4xl font-bold text-white mb-1 drop-shadow-lg">Asset Library</h1>
                <p className="text-white/80">Find any asset across all campaigns and gyms</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/campaigns')} className="bg-white text-gray-800 hover:bg-white/90 shadow-md">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Campaigns
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                Back to Gyms
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Filters */}
        <div
          className="flex flex-wrap gap-3 mb-6 p-4 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.1), hsl(var(--brand-blue-gray) / 0.1))',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search filenames..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/80 border-white/50 shadow-sm"
            />
          </div>
          <Select value={assetTypeId || "all"} onValueChange={(v) => setAssetTypeId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] bg-white/80 border-white/50 shadow-sm">
              <SelectValue placeholder="Asset Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={channelId || "all"} onValueChange={(v) => setChannelId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] bg-white/80 border-white/50 shadow-sm">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {channels?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={campaignId || "all"} onValueChange={(v) => setCampaignId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] bg-white/80 border-white/50 shadow-sm">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={gymId || "all"} onValueChange={(v) => setGymId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] bg-white/80 border-white/50 shadow-sm">
              <SelectValue placeholder="Gym" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Gyms</SelectItem>
              {gyms?.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-1 ml-auto">
            <Button size="icon" variant={viewMode === 'grid' ? 'default' : 'outline'} onClick={() => setViewMode('grid')}>
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">{assets?.length ?? 0} assets found</p>

        {/* Asset Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {assets?.map(asset => (
              <Card
                key={asset.id}
                className="cursor-pointer group overflow-hidden border-0 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all"
                onClick={() => setSelectedAsset(asset)}
              >
                <div className="aspect-square relative overflow-hidden bg-muted">
                  {asset.file_type.startsWith('image/') ? (
                    <img src={asset.file_url} alt={asset.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <AssetPreview asset={asset} />
                    </div>
                  )}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); copyUrl(asset.file_url); }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <CardContent className="p-2">
                  <p className="text-xs truncate font-medium">{asset.filename}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {(asset as any).campaign && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{(asset as any).campaign.name}</Badge>
                    )}
                    {asset.gym && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">{asset.gym.code}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {assets?.map(asset => (
              <div
                key={asset.id}
                className="flex items-center gap-4 p-3 bg-white/80 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                onClick={() => setSelectedAsset(asset)}
              >
                <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                  {asset.file_type.startsWith('image/') ? (
                    <img src={asset.file_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      {asset.file_type.split('/')[1]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {(asset as any).campaign?.name} • {asset.gym?.name || 'Admin Resource'}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); copyUrl(asset.file_url); }}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy URL
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AssetDetailModal
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onEdit={() => { setEditingAsset(selectedAsset); setSelectedAsset(null); }}
        onShare={() => { setSharingAsset(selectedAsset); setSelectedAsset(null); }}
        onDelete={handleDelete}
      />
      {editingAsset && (
        <AssetEditModal
          asset={editingAsset}
          gyms={gyms || []}
          open={!!editingAsset}
          onOpenChange={(open) => { if (!open) setEditingAsset(null); }}
        />
      )}
      {sharingAsset && (
        <AssetShareModal
          asset={sharingAsset}
          open={!!sharingAsset}
          onOpenChange={(open) => { if (!open) setSharingAsset(null); }}
        />
      )}
    </div>
  );
};

export default AssetLibrary;
