import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAssetCategories } from "@/hooks/useAssets";
import { useGyms } from "@/hooks/useGyms";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Link2, AlertTriangle, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";

interface ThemeAsset {
  id: string;
  filename: string;
  file_url: string;
  category_id: string | null;
  gym_id: string;
}

const ThemeDetail = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const { data: categories = [] } = useAssetCategories();
  const { data: gyms = [], isLoading: gymsLoading } = useGyms();

  const category = categories.find(c => c.id === categoryId);

  // Fetch assets in this category with their gym assignments
  const { data: categoryAssets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['theme-detail-assets', categoryId],
    enabled: !!categoryId,
    queryFn: async (): Promise<ThemeAsset[]> => {
      const { data: assets, error } = await supabase
        .from('gym_assets')
        .select('id, filename, file_url, category_id')
        .eq('category_id', categoryId!);
      if (error) throw error;

      const assetIds = assets.map(a => a.id);
      if (assetIds.length === 0) return [];

      const { data: assignments, error: assErr } = await supabase
        .from('gym_asset_assignments')
        .select('asset_id, gym_id')
        .in('asset_id', assetIds);
      if (assErr) throw assErr;

      // Flatten: one entry per gym-asset pair
      const result: ThemeAsset[] = [];
      assignments.forEach(asgn => {
        const asset = assets.find(a => a.id === asgn.asset_id);
        if (asset) {
          result.push({ ...asset, gym_id: asgn.gym_id });
        }
      });
      return result;
    },
  });

  // Map gym_id -> assets
  const gymAssetMap = useMemo(() => {
    const map = new Map<string, ThemeAsset[]>();
    categoryAssets.forEach(a => {
      if (!map.has(a.gym_id)) map.set(a.gym_id, []);
      map.get(a.gym_id)!.push(a);
    });
    return map;
  }, [categoryAssets]);

  const allUrls = categoryAssets.map(a => a.file_url);

  const handleCopyAllUrls = () => {
    navigator.clipboard.writeText(allUrls.join('\n')).then(() => {
      toast({ description: `${allUrls.length} URL${allUrls.length !== 1 ? 's' : ''} copied!`, duration: 2000 });
    });
  };

  const handleDownloadAll = async () => {
    if (categoryAssets.length === 0) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(category?.name || 'theme');

      await Promise.all(
        categoryAssets.map(async (asset) => {
          const gym = gyms.find(g => g.id === asset.gym_id);
          const prefix = gym ? `${gym.code}_` : '';
          try {
            const res = await fetch(asset.file_url);
            const blob = await res.blob();
            folder!.file(`${prefix}${asset.filename}`, blob);
          } catch {
            // skip failed downloads
          }
        })
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${category?.name || 'theme'}_assets.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ description: 'ZIP downloaded!', duration: 2000 });
    } catch {
      toast({ description: 'Download failed', variant: 'destructive', duration: 2000 });
    } finally {
      setDownloading(false);
    }
  };

  const isLoading = gymsLoading || assetsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="text-xl" style={{ color: 'hsl(var(--brand-text-primary))' }}>Loading theme...</div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="text-xl text-destructive">Theme not found</div>
      </div>
    );
  }

  const gymsWithAssets = gyms.filter(g => gymAssetMap.has(g.id));
  const gymsMissing = gyms.filter(g => !gymAssetMap.has(g.id));

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e5e7eb 0%, #d6c5bf 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 shadow-sm" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="py-3 px-6" style={{
          background: 'linear-gradient(to bottom, hsl(var(--brand-white)), hsl(var(--brand-rose-gold) / 0.12))',
          borderBottom: '2px solid hsl(var(--brand-rose-gold) / 0.25)'
        }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/themes')}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Themes
              </Button>
              <div className="h-6 w-px" style={{ background: 'hsl(var(--brand-rose-gold) / 0.4)' }} />
              <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--brand-navy))' }}>
                {category.name}
              </h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: 'hsl(var(--brand-rose-gold) / 0.15)',
                  color: 'hsl(var(--brand-navy))',
                }}
              >
                {categoryAssets.length} asset{categoryAssets.length !== 1 ? 's' : ''} · {gymsWithAssets.length}/{gyms.length} gyms
              </span>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyAllUrls}
                disabled={allUrls.length === 0}
                className="text-xs"
              >
                <Link2 className="w-3.5 h-3.5 mr-1" />
                Copy All URLs
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadAll}
                disabled={categoryAssets.length === 0 || downloading}
                className="text-xs text-white"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))',
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                {downloading ? 'Zipping...' : 'Download All'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Gym Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {/* Gyms WITH assets first */}
          {gymsWithAssets.map(gym => {
            const assets = gymAssetMap.get(gym.id) || [];
            const primaryColor = gym.colors[0]?.color_hex || '#667eea';
            return (
              <div
                key={gym.id}
                className="rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:shadow-lg"
                style={{
                  background: 'hsl(var(--brand-white))',
                  borderColor: primaryColor + '40',
                }}
              >
                {/* Gym Header */}
                <div className="px-4 py-3 flex items-center justify-between"
                  style={{ borderBottom: `2px solid ${primaryColor}25` }}
                >
                  <button
                    onClick={() => navigate(`/gym/${gym.code}`)}
                    className="font-bold text-sm hover:underline"
                    style={{ color: primaryColor }}
                  >
                    {gym.code}
                  </button>
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--brand-text-primary))' }}>
                    {assets.length} logo{assets.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Asset Preview */}
                <div className="p-4 space-y-3">
                  {assets.map(asset => (
                    <div key={asset.id} className="rounded-xl overflow-hidden border"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    >
                      <div className="aspect-[16/10] flex items-center justify-center p-3"
                        style={{ background: 'hsl(var(--muted) / 0.5)' }}
                      >
                        <img
                          src={asset.file_url}
                          alt={asset.filename}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="px-3 py-2 text-xs truncate font-medium"
                        style={{ color: 'hsl(var(--brand-text-primary))' }}
                      >
                        {asset.filename}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Gyms MISSING assets */}
          {gymsMissing.map(gym => {
            const primaryColor = gym.colors[0]?.color_hex || '#667eea';
            return (
              <div
                key={gym.id}
                className="rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-300 opacity-70 hover:opacity-100"
                style={{
                  background: 'hsl(var(--brand-white) / 0.7)',
                  borderColor: 'hsl(var(--brand-rose-gold) / 0.3)',
                }}
              >
                {/* Gym Header */}
                <div className="px-4 py-3 flex items-center justify-between"
                  style={{ borderBottom: '2px solid hsl(var(--brand-rose-gold) / 0.15)' }}
                >
                  <button
                    onClick={() => navigate(`/gym/${gym.code}`)}
                    className="font-bold text-sm hover:underline"
                    style={{ color: primaryColor }}
                  >
                    {gym.code}
                  </button>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background: 'hsl(var(--destructive) / 0.1)',
                      color: 'hsl(var(--destructive))',
                    }}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Missing
                  </span>
                </div>

                {/* Placeholder */}
                <div className="p-6 flex flex-col items-center justify-center text-center min-h-[140px]">
                  <Image className="w-8 h-8 mb-2 opacity-30" style={{ color: 'hsl(var(--brand-text-primary))' }} />
                  <p className="text-xs mb-3" style={{ color: 'hsl(var(--brand-text-primary) / 0.6)' }}>
                    No {category.name} asset yet
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => navigate(`/gym/${gym.code}`)}
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Go to Profile
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ThemeDetail;
