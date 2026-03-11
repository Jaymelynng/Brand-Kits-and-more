import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGyms, GymWithColors } from "@/hooks/useGyms";
import { useThemeTags, useAllAssetThemeTags } from "@/hooks/useThemeTags";
import { useAllAssetsWithAssignments, GymAsset, GymAssetAssignment } from "@/hooks/useAssets";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, Link2, AlertTriangle, Upload, Image, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import AssetModal from "@/components/AssetModal";

interface GymThemeAsset {
  asset: GymAsset;
  assignment: GymAssetAssignment;
}

const ThemeDetail = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const { data: themeTags = [] } = useThemeTags();
  const { data: allAssetThemeTags = [] } = useAllAssetThemeTags();
  const { data: assetData } = useAllAssetsWithAssignments();
  const { data: gyms = [], isLoading: gymsLoading } = useGyms();

  const tag = themeTags.find(t => t.id === categoryId);
  const assets = assetData?.assets || [];
  const assignments = assetData?.assignments || [];

  // Find assets tagged with this theme
  const taggedAssetIds = useMemo(() => {
    return new Set(
      allAssetThemeTags
        .filter(att => att.theme_tag_id === categoryId)
        .map(att => att.asset_id)
    );
  }, [allAssetThemeTags, categoryId]);

  // Map gym_id -> GymThemeAsset[]
  const gymAssetMap = useMemo(() => {
    const map = new Map<string, GymThemeAsset[]>();
    assignments.forEach(asgn => {
      if (!taggedAssetIds.has(asgn.asset_id)) return;
      const asset = assets.find(a => a.id === asgn.asset_id);
      if (!asset) return;
      if (!map.has(asgn.gym_id)) map.set(asgn.gym_id, []);
      map.get(asgn.gym_id)!.push({ asset, assignment: asgn });
    });
    return map;
  }, [taggedAssetIds, assets, assignments]);

  // Select first gym if none selected
  const effectiveSelectedGymId = selectedGymId || gyms[0]?.id || null;
  const selectedGym = gyms.find(g => g.id === effectiveSelectedGymId);
  const selectedGymAssets = effectiveSelectedGymId ? (gymAssetMap.get(effectiveSelectedGymId) || []) : [];
  const selectedAssetForPreview = selectedGymAssets[0];

  const gymsWithAssets = gyms.filter(g => gymAssetMap.has(g.id));
  const gymsMissing = gyms.filter(g => !gymAssetMap.has(g.id));

  // All URLs for bulk actions
  const allUrls = useMemo(() => {
    const urls: string[] = [];
    gymAssetMap.forEach(assets => {
      assets.forEach(a => {
        const url = a.assignment.file_url || a.asset.file_url;
        if (url) urls.push(url);
      });
    });
    return urls;
  }, [gymAssetMap]);

  const handleCopyAllUrls = () => {
    navigator.clipboard.writeText(allUrls.join('\n'));
    toast({ description: `${allUrls.length} URL(s) copied!`, duration: 2000 });
  };

  const handleDownloadAll = async () => {
    if (allUrls.length === 0) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(tag?.name || 'theme');

      const promises: Promise<void>[] = [];
      gymAssetMap.forEach((gymAssets, gymId) => {
        const gym = gyms.find(g => g.id === gymId);
        gymAssets.forEach(ga => {
          const url = ga.assignment.file_url || ga.asset.file_url;
          if (!url) return;
          promises.push(
            fetch(url).then(res => res.blob()).then(blob => {
              const ext = url.split('.').pop()?.split('?')[0] || 'png';
              folder!.file(`${gym?.code || 'unknown'}_${ga.asset.filename}.${ext}`, blob);
            }).catch(() => {})
          );
        });
      });

      await Promise.all(promises);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tag?.name || 'theme'}_assets.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ description: 'ZIP downloaded!', duration: 2000 });
    } catch {
      toast({ description: 'Download failed', variant: 'destructive', duration: 2000 });
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setAssetModalOpen(true);
  };

  if (gymsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="text-xl" style={{ color: 'hsl(var(--brand-text-primary))' }}>Loading theme...</div>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="text-xl text-destructive">Theme not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 shadow-sm" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="py-3 px-6" style={{
          background: 'linear-gradient(to bottom, hsl(var(--brand-white)), hsl(var(--brand-rose-gold) / 0.12))',
          borderBottom: '2px solid hsl(var(--brand-rose-gold) / 0.25)'
        }}>
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/themes')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Themes
              </Button>
              <div className="h-6 w-px" style={{ background: 'hsl(var(--brand-rose-gold) / 0.4)' }} />
              <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--brand-navy))' }}>{tag.name}</h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'hsl(var(--brand-rose-gold) / 0.15)', color: 'hsl(var(--brand-navy))' }}
              >
                {gymsWithAssets.length}/{gyms.length} gyms
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyAllUrls} disabled={allUrls.length === 0} className="text-xs">
                <Link2 className="w-3.5 h-3.5 mr-1" /> Copy All URLs
              </Button>
              <Button size="sm" onClick={handleDownloadAll} disabled={allUrls.length === 0 || downloading} className="text-xs text-white"
                style={{ background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))' }}
              >
                <Download className="w-3.5 h-3.5 mr-1" /> {downloading ? 'Zipping...' : 'Download All'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Three Panel Layout */}
      <div className="flex flex-1 overflow-hidden max-w-[1400px] mx-auto w-full">
        {/* Left Panel - Gym List */}
        <div className="w-[260px] border-r overflow-y-auto shrink-0" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / 0.3)' }}>
          <div className="px-3 py-2 border-b sticky top-0 z-10" style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}>
            <p className="text-xs font-semibold" style={{ color: 'hsl(var(--brand-navy))' }}>All Gyms ({gyms.length})</p>
          </div>
          {gyms.map(gym => {
            const hasAssets = gymAssetMap.has(gym.id);
            const gymAssets = gymAssetMap.get(gym.id) || [];
            const primaryColor = gym.colors[0]?.color_hex || '#6B7280';
            const firstUrl = gymAssets[0]?.assignment?.file_url || gymAssets[0]?.asset?.file_url;
            const isSelected = gym.id === effectiveSelectedGymId;

            return (
              <button
                key={gym.id}
                onClick={() => setSelectedGymId(gym.id)}
                className={cn(
                  "w-full px-3 py-2.5 flex items-center gap-3 text-left transition-all border-l-3",
                  isSelected ? "border-l-[3px]" : "border-l-[3px] border-transparent hover:bg-accent/50",
                  !hasAssets && "opacity-60"
                )}
                style={isSelected ? { borderLeftColor: primaryColor, background: `${primaryColor}10` } : {}}
              >
                {/* Thumbnail */}
                <div className="w-8 h-8 rounded border overflow-hidden shrink-0 flex items-center justify-center"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / 0.5)' }}
                >
                  {firstUrl ? (
                    <img src={firstUrl} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Image className="w-4 h-4 opacity-30" />
                  )}
                </div>

                {/* Gym Info */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold block truncate" style={{ color: primaryColor }}>{gym.code}</span>
                  <span className="text-[10px] truncate block" style={{ color: 'hsl(var(--muted-foreground))' }}>{gym.name}</span>
                </div>

                {/* Status */}
                {hasAssets ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0"
                    style={{ background: 'hsl(142 76% 36% / 0.15)', color: 'hsl(142 76% 36%)' }}
                  >
                    <Check className="w-2.5 h-2.5 inline" />
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0"
                    style={{ background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}
                  >
                    <AlertTriangle className="w-2.5 h-2.5 inline" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Center Panel - Preview */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {selectedGym && (
            <div className="flex-1 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1.5 rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: selectedGym.colors[0]?.color_hex || '#6B7280' }}
                >
                  {selectedGym.code}
                </span>
                <h2 className="text-lg font-bold" style={{ color: 'hsl(var(--brand-navy))' }}>{selectedGym.name}</h2>
              </div>

              {selectedGymAssets.length > 0 ? (
                <>
                  {/* Large Preview */}
                  <div className="flex-1 flex items-center justify-center rounded-2xl border-2 mb-4 min-h-[300px]"
                    style={{ background: 'hsl(var(--muted) / 0.3)', borderColor: 'hsl(var(--border))' }}
                  >
                    <img
                      src={selectedAssetForPreview?.assignment?.file_url || selectedAssetForPreview?.asset?.file_url}
                      alt={selectedAssetForPreview?.asset?.filename}
                      className="max-h-[400px] max-w-full object-contain p-6 cursor-pointer"
                      onClick={() => selectedAssetForPreview && handleOpenAsset(selectedAssetForPreview.asset.id)}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => {
                        const url = selectedAssetForPreview?.assignment?.file_url || selectedAssetForPreview?.asset?.file_url;
                        if (url) {
                          fetch(url).then(r => r.blob()).then(blob => {
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = selectedAssetForPreview?.asset?.filename || 'asset';
                            link.click();
                          });
                        }
                      }}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Download
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => {
                        const url = selectedAssetForPreview?.assignment?.file_url || selectedAssetForPreview?.asset?.file_url;
                        if (url) {
                          navigator.clipboard.writeText(url);
                          toast({ description: "URL copied!" });
                        }
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy URL
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => selectedAssetForPreview && handleOpenAsset(selectedAssetForPreview.asset.id)}
                    >
                      Edit Asset
                    </Button>
                  </div>

                  {/* Multiple assets in this theme for this gym */}
                  {selectedGymAssets.length > 1 && (
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {selectedGymAssets.map((ga, i) => (
                        <button key={i} className="rounded-lg border overflow-hidden p-2 hover:ring-2 ring-primary transition-all"
                          style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / 0.3)' }}
                          onClick={() => handleOpenAsset(ga.asset.id)}
                        >
                          <img src={ga.assignment.file_url || ga.asset.file_url} alt="" className="w-full h-16 object-contain" />
                          <p className="text-[10px] truncate mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{ga.asset.filename}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Upload Drop Zone for missing gyms */
                <div className="flex-1 flex items-center justify-center rounded-2xl border-2 border-dashed min-h-[300px]"
                  style={{ borderColor: 'hsl(var(--brand-rose-gold) / 0.4)', background: 'hsl(var(--muted) / 0.15)' }}
                >
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'hsl(var(--brand-text-primary))' }} />
                    <p className="text-sm font-medium mb-1" style={{ color: 'hsl(var(--brand-text-primary))' }}>
                      No {tag.name} asset for {selectedGym.code}
                    </p>
                    <p className="text-xs mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Upload from this gym's profile page
                    </p>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/gym/${selectedGym.code}`)}>
                      <Upload className="w-3.5 h-3.5 mr-1" /> Go to Profile
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Asset Details */}
        <div className="w-[280px] border-l overflow-y-auto shrink-0" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / 0.2)' }}>
          <div className="px-3 py-2 border-b sticky top-0 z-10" style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}>
            <p className="text-xs font-semibold" style={{ color: 'hsl(var(--brand-navy))' }}>Asset Details</p>
          </div>

          {selectedAssetForPreview ? (
            <div className="p-4 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Filename</p>
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{selectedAssetForPreview.asset.filename}</p>
              </div>

              {(selectedAssetForPreview.asset as any).description && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Description</p>
                  <p className="text-xs" style={{ color: 'hsl(var(--foreground))' }}>{(selectedAssetForPreview.asset as any).description}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Gyms with this asset</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(gymAssetMap.entries())
                    .filter(([_, ga]) => ga.some(a => a.asset.id === selectedAssetForPreview.asset.id))
                    .map(([gymId]) => {
                      const g = gyms.find(gg => gg.id === gymId);
                      return g ? (
                        <span key={gymId} className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white"
                          style={{ backgroundColor: g.colors[0]?.color_hex || '#6B7280' }}
                        >
                          {g.code}
                        </span>
                      ) : null;
                    })
                  }
                </div>
              </div>

              <Button size="sm" variant="outline" className="w-full text-xs"
                onClick={() => handleOpenAsset(selectedAssetForPreview.asset.id)}
              >
                Open Full Asset Manager
              </Button>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Select a gym with assets to see details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Asset Modal */}
      <AssetModal open={assetModalOpen} onOpenChange={setAssetModalOpen} assetId={selectedAssetId} />
    </div>
  );
};

export default ThemeDetail;
