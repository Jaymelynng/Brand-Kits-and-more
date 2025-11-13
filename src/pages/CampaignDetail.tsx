import { useState } from "react";
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
import { ArrowLeft, Download, FileImage, Shapes, Video, Edit, Link2, Share } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { CampaignAssetUpload } from "@/components/CampaignAssetUpload";
import { AssetPreview } from "@/components/AssetPreview";
import { AssetEditModal } from "@/components/AssetEditModal";
import { AssetShareModal } from "@/components/AssetShareModal";
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'upcoming': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'archived': return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/campaigns')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          
          <div className="flex items-start justify-between">
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
              <Button onClick={downloadAllAssets} disabled={downloading || (assets.length === 0 && !campaignAssets?.length)}>
                <Download className="h-4 w-4 mr-2" />
                {downloading ? "Downloading..." : "Download All"}
              </Button>
            </div>
          </div>
        </div>

        {/* Admin Resources */}
        {adminAssets.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Admin Resources</CardTitle>
              <CardDescription>
                {adminAssets.length} shared resource{adminAssets.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {adminAssets.map((asset) => (
                  <Card key={asset.id} className="group hover:shadow-lg transition-all relative">
                    <Badge variant="outline" className="absolute top-2 right-2 bg-background">
                      Admin
                    </Badge>
                    <CardContent className="p-4">
                      <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        <AssetPreview asset={asset} />
                      </div>
                      <p className="text-xs font-medium truncate mb-2">{asset.filename}</p>
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
            </CardContent>
          </Card>
        )}

        {/* Assets by Gym */}
        {Object.keys(taggedAssetsByGym).length === 0 && adminAssets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileImage className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold text-foreground mb-2">No assets yet</p>
              <p className="text-muted-foreground">Upload assets and tag them with this campaign to see them here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
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
                            <Card key={asset.id} className="group hover:shadow-lg transition-all relative">
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
      </div>
    </div>
  );
};

export default CampaignDetail;
