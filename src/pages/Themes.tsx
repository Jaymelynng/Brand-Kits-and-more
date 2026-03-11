import { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAssetCategories, useAssetTypes } from "@/hooks/useAssets";
import { useGyms } from "@/hooks/useGyms";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Layers, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Themes = () => {
  const navigate = useNavigate();
  const { data: categories = [], isLoading: catLoading } = useAssetCategories();
  const { data: assetTypes = [] } = useAssetTypes();
  const { data: gyms = [] } = useGyms();

  // Fetch all assets + assignments to compute counts
  const { data: allAssets = [] } = useQuery({
    queryKey: ['all-gym-assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_assets')
        .select('id, category_id, asset_type_id');
      if (error) throw error;
      return data;
    },
  });

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['all-gym-asset-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_asset_assignments')
        .select('asset_id, gym_id');
      if (error) throw error;
      return data;
    },
  });

  const categoryStats = useMemo(() => {
    // Build a map: asset_id -> Set<gym_id>
    const assetGyms = new Map<string, Set<string>>();
    allAssignments.forEach(a => {
      if (!assetGyms.has(a.asset_id)) assetGyms.set(a.asset_id, new Set());
      assetGyms.get(a.asset_id)!.add(a.gym_id);
    });

    return categories.map(cat => {
      const catAssets = allAssets.filter(a => a.category_id === cat.id);
      const gymIds = new Set<string>();
      catAssets.forEach(a => {
        assetGyms.get(a.id)?.forEach(gid => gymIds.add(gid));
      });
      return {
        ...cat,
        assetCount: catAssets.length,
        gymCount: gymIds.size,
      };
    });
  }, [categories, allAssets, allAssignments]);

  const totalGyms = gyms.length;
  const isLoading = catLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="text-xl" style={{ color: 'hsl(var(--brand-text-primary))' }}>Loading themes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e5e7eb 0%, #d6c5bf 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 shadow-sm" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="text-center py-2 px-6 shadow-sm" style={{
          background: 'linear-gradient(to bottom, hsl(var(--brand-white)), hsl(var(--brand-rose-gold) / 0.12))',
          borderBottom: '2px solid hsl(var(--brand-rose-gold) / 0.25)'
        }}>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="absolute left-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
            <Layers className="w-5 h-5" style={{ color: 'hsl(var(--brand-navy))' }} />
            <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--brand-navy))' }}>
              Theme Library
            </h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--brand-navy) / 0.7)' }}>
            Browse and manage assets by theme across all gyms
          </p>
        </div>
      </div>

      {/* Category Cards Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryStats.map(cat => {
            const coverage = totalGyms > 0 ? Math.round((cat.gymCount / totalGyms) * 100) : 0;
            const isFull = cat.gymCount === totalGyms && totalGyms > 0;

            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/themes/${cat.id}`)}
                className="group text-left rounded-2xl border-2 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                style={{
                  background: 'hsl(var(--brand-white))',
                  borderColor: isFull ? 'hsl(var(--brand-gold))' : 'hsl(var(--brand-rose-gold) / 0.3)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-lg font-bold" style={{ color: 'hsl(var(--brand-navy))' }}>
                    {cat.name}
                  </h2>
                  <ChevronRight
                    className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                    style={{ color: 'hsl(var(--brand-navy))' }}
                  />
                </div>

                {cat.description && (
                  <p className="text-sm mb-4" style={{ color: 'hsl(var(--brand-text-primary))' }}>
                    {cat.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-sm font-medium" style={{ color: 'hsl(var(--brand-text-primary))' }}>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: 'hsl(var(--brand-rose-gold) / 0.15)',
                      color: 'hsl(var(--brand-navy))',
                    }}
                  >
                    {cat.assetCount} asset{cat.assetCount !== 1 ? 's' : ''}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: isFull
                        ? 'hsl(var(--brand-gold) / 0.2)'
                        : 'hsl(var(--brand-blue-gray) / 0.2)',
                      color: 'hsl(var(--brand-navy))',
                    }}
                  >
                    {cat.gymCount}/{totalGyms} gyms
                  </span>
                </div>

                {/* Coverage bar */}
                <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--brand-blue-gray) / 0.2)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${coverage}%`,
                      background: isFull
                        ? 'hsl(var(--brand-gold))'
                        : 'linear-gradient(90deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))',
                    }}
                  />
                </div>
              </button>
            );
          })}

          {categoryStats.length === 0 && (
            <div className="col-span-full text-center py-16">
              <p className="text-lg font-medium" style={{ color: 'hsl(var(--brand-text-primary))' }}>
                No themes found. Add categories in the asset management system.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Themes;
