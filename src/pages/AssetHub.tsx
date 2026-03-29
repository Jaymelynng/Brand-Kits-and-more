import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGyms, GymWithColors } from "@/hooks/useGyms";
import { useThemeTags, useAllAssetThemeTags, useCreateThemeTag } from "@/hooks/useThemeTags";
import { useAllAssetsWithAssignments, useAssetTypes, useAssetCategories, GymAsset, GymAssetAssignment, AssetType, AssetCategory } from "@/hooks/useAssets";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Search, X, Check, ChevronRight,
  Download, Copy, LayoutGrid, List, PanelLeftClose, PanelLeft,
  Image as ImageIcon, AlertTriangle, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const AssetHub = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  // Data hooks
  const { data: gyms = [], isLoading: gymsLoading } = useGyms();
  const { data: themeTags = [] } = useThemeTags();
  const { data: allAssetThemeTags = [] } = useAllAssetThemeTags();
  const { data: assetData, isLoading: assetsLoading } = useAllAssetsWithAssignments();
  const { data: assetTypes = [] } = useAssetTypes();
  const { data: assetCategories = [] } = useAssetCategories();
  const createTagMutation = useCreateThemeTag();

  const assets = assetData?.assets || [];
  const assignments = assetData?.assignments || [];

  // URL-driven state
  const activeGymId = searchParams.get("gym");
  const activeTypeSlug = searchParams.get("type") || (assetTypes[0]?.slug ?? "logo");
  const activeCategoryId = searchParams.get("category");
  const activeThemeTagId = searchParams.get("tag");

  // Local state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewTheme, setShowNewTheme] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Active asset type
  const activeType = useMemo(
    () => assetTypes.find(t => t.slug === activeTypeSlug) || assetTypes[0],
    [assetTypes, activeTypeSlug]
  );

  // Sub-categories scoped to active type
  const scopedCategories = useMemo(() => {
    if (!activeType) return [];
    return assetCategories.filter(c => c.asset_type_id === activeType.id);
  }, [assetCategories, activeType]);

  // Universal theme tags (cross-cutting filters)
  const universalTags = themeTags;

  // Asset count per type
  const typeCountMap = useMemo(() => {
    const map = new Map<string, number>();
    assets.forEach(a => {
      map.set(a.asset_type_id, (map.get(a.asset_type_id) || 0) + 1);
    });
    return map;
  }, [assets]);

  // Gym asset count
  const gymAssetCountMap = useMemo(() => {
    const map = new Map<string, number>();
    assignments.forEach(a => {
      map.set(a.gym_id, (map.get(a.gym_id) || 0) + 1);
    });
    return map;
  }, [assignments]);

  // Build asset-to-theme-tag mapping
  const assetTagMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allAssetThemeTags.forEach(att => {
      if (!map.has(att.asset_id)) map.set(att.asset_id, new Set());
      map.get(att.asset_id)!.add(att.theme_tag_id);
    });
    return map;
  }, [allAssetThemeTags]);

  // Build asset-to-gyms mapping
  const assetGymMap = useMemo(() => {
    const map = new Map<string, GymAssetAssignment[]>();
    assignments.forEach(a => {
      if (!map.has(a.asset_id)) map.set(a.asset_id, []);
      map.get(a.asset_id)!.push(a);
    });
    return map;
  }, [assignments]);

  // Filter assets
  const filteredAssets = useMemo(() => {
    let result = assets;

    // Filter by asset type
    if (activeType) {
      result = result.filter(a => a.asset_type_id === activeType.id);
    }

    // Filter by sub-category
    if (activeCategoryId) {
      result = result.filter(a => a.category_id === activeCategoryId);
    }

    // Filter by theme tag
    if (activeThemeTagId) {
      result = result.filter(a => assetTagMap.get(a.id)?.has(activeThemeTagId));
    }

    // Filter by gym
    if (activeGymId) {
      const gymAssetIds = new Set(
        assignments.filter(a => a.gym_id === activeGymId).map(a => a.asset_id)
      );
      // Include assets assigned to this gym OR marked as all_gyms/global
      result = result.filter(a => gymAssetIds.has(a.id) || a.is_all_gyms || a.is_global);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.filename.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [assets, activeType, activeCategoryId, activeThemeTagId, activeGymId, searchQuery, assetTagMap, assignments]);

  // Selected asset detail
  const selectedAsset = selectedAssetId ? assets.find(a => a.id === selectedAssetId) : null;
  const selectedAssetAssignments = selectedAssetId ? (assetGymMap.get(selectedAssetId) || []) : [];
  const selectedAssetType = selectedAsset ? assetTypes.find(t => t.id === selectedAsset.asset_type_id) : null;
  const selectedAssetCategory = selectedAsset?.category_id ? assetCategories.find(c => c.id === selectedAsset.category_id) : null;
  const selectedAssetTags = selectedAssetId ? (assetTagMap.get(selectedAssetId) || new Set<string>()) : new Set<string>();

  // URL helpers
  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const selectType = (slug: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("type", slug);
    params.delete("category"); // reset sub-category when switching types
    setSearchParams(params);
  };

  const handleCreateTheme = async () => {
    if (!newThemeName.trim()) return;
    try {
      await createTagMutation.mutateAsync(newThemeName.trim());
      toast({ description: `Theme "${newThemeName.trim()}" created!` });
      setNewThemeName("");
      setShowNewTheme(false);
    } catch {
      toast({ description: "Failed to create theme", variant: "destructive" });
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ description: "URL copied!" });
  };

  const totalGyms = gyms.length;

  if (gymsLoading || assetsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <div className="text-xl" style={{ color: 'hsl(var(--brand-text-primary))' }}>Loading Asset Hub...</div>
      </div>
    );
  }

  // Get the URL to display for an asset (prefer gym-specific assignment URL if gym is filtered)
  const getAssetDisplayUrl = (asset: GymAsset): string => {
    if (activeGymId) {
      const gymAssignment = assignments.find(a => a.asset_id === asset.id && a.gym_id === activeGymId);
      if (gymAssignment?.file_url) return gymAssignment.file_url;
    }
    // Otherwise use first assignment with a URL, or the asset's own URL
    const firstAssignment = assignments.find(a => a.asset_id === asset.id && a.file_url);
    return firstAssignment?.file_url || asset.file_url;
  };

  // Get gym code badge for an asset thumbnail
  const getAssetGymBadges = (asset: GymAsset): { code: string; color: string }[] => {
    const assetAssigns = assetGymMap.get(asset.id) || [];
    return assetAssigns.slice(0, 4).map(a => {
      const gym = gyms.find(g => g.id === a.gym_id);
      return {
        code: gym?.code || '?',
        color: gym?.colors[0]?.color_hex || '#667eea',
      };
    });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      {/* ─── HEADER ─── */}
      <div className="shrink-0 sticky top-0 z-40" style={{
        background: 'linear-gradient(135deg, hsl(var(--brand-navy)), hsl(var(--brand-navy) / 0.88))',
        boxShadow: '0 4px 20px hsl(var(--brand-navy) / 0.3)',
      }}>
        <div className="px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <div className="h-5 w-px bg-primary-foreground/20" />
            <h1 className="text-lg font-bold text-primary-foreground flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Asset Command Center
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button size="sm" onClick={() => setShowNewTheme(true)}
                className="text-primary-foreground text-sm"
                style={{ background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))' }}>
                <Plus className="w-4 h-4 mr-1" /> New Theme
              </Button>
            )}
          </div>
        </div>

        {/* ─── ASSET TYPE TABS ─── */}
        <div className="px-4 flex items-center gap-1 border-t border-primary-foreground/10">
          {assetTypes.map(type => {
            const isActive = activeType?.id === type.id;
            const count = typeCountMap.get(type.id) || 0;
            return (
              <button
                key={type.id}
                onClick={() => selectType(type.slug)}
                className={cn(
                  "px-4 py-2.5 text-sm font-semibold transition-all relative",
                  isActive
                    ? "text-primary-foreground"
                    : "text-primary-foreground/50 hover:text-primary-foreground/80"
                )}
              >
                {type.name}
                {count > 0 && (
                  <span className={cn(
                    "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                    isActive ? "bg-primary-foreground/20" : "bg-primary-foreground/10"
                  )}>
                    {count}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ background: 'hsl(var(--brand-rose-gold))' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── FILTER BAR ─── */}
      <div className="shrink-0 px-4 py-2 flex items-center gap-2 flex-wrap border-b"
        style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
        {/* Sidebar toggle */}
        <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 h-8 w-8">
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </Button>

        {/* Active gym chip */}
        {activeGymId && (
          <button onClick={() => setParam("gym", null)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: gyms.find(g => g.id === activeGymId)?.colors[0]?.color_hex || 'hsl(var(--brand-navy))' }}>
            {gyms.find(g => g.id === activeGymId)?.code || 'Gym'}
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Sub-category pills */}
        {scopedCategories.length > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <button
              onClick={() => setParam("category", null)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold transition-colors",
                !activeCategoryId
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground bg-muted"
              )}
              style={!activeCategoryId ? { background: 'hsl(var(--brand-navy))' } : {}}
            >
              All
            </button>
            {scopedCategories.map(cat => {
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setParam("category", isActive ? null : cat.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold transition-colors",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground bg-muted"
                  )}
                  style={isActive ? { background: 'hsl(var(--brand-navy))' } : {}}
                >
                  {cat.name}
                </button>
              );
            })}
          </>
        )}

        {/* Theme tag pills */}
        {universalTags.length > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            {universalTags.map(tag => {
              const isActive = activeThemeTagId === tag.id;
              return (
                <button
                  key={tag.id}
                  onClick={() => setParam("tag", isActive ? null : tag.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border",
                    isActive
                      ? "text-white border-transparent"
                      : "text-muted-foreground hover:text-foreground border-border bg-background"
                  )}
                  style={isActive ? { background: 'hsl(var(--brand-rose-gold))' } : {}}
                >
                  {tag.name}
                </button>
              );
            })}
          </>
        )}

        {/* Search */}
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Count */}
        <span className="text-xs font-medium text-muted-foreground">
          {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ─── BODY ─── */}
      <div className="flex flex-1 min-h-0">
        {/* ─── LEFT SIDEBAR: Gym List ─── */}
        {sidebarOpen && (
          <div className="w-44 shrink-0 border-r overflow-y-auto" style={{
            background: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
          }}>
            <button
              onClick={() => setParam("gym", null)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm font-semibold border-b transition-colors",
                !activeGymId ? "text-primary-foreground" : "hover:bg-muted/50"
              )}
              style={{
                borderColor: 'hsl(var(--border))',
                ...(!activeGymId ? {
                  background: 'hsl(var(--brand-navy))',
                  color: 'hsl(var(--primary-foreground))',
                } : { color: 'hsl(var(--brand-navy))' }),
              }}
            >
              All Gyms ({totalGyms})
            </button>

            {gyms.map(gym => {
              const isActive = activeGymId === gym.id;
              const primaryColor = gym.colors[0]?.color_hex || '#667eea';
              const mainLogo = gym.logos.find(l => l.is_main_logo) || gym.logos[0];
              const assetCount = gymAssetCountMap.get(gym.id) || 0;

              return (
                <button
                  key={gym.id}
                  onClick={() => setParam("gym", gym.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 text-left border-b transition-all",
                    isActive ? "ring-2 ring-inset" : "hover:bg-muted/50"
                  )}
                  style={{
                    borderColor: 'hsl(var(--border))',
                    ...(isActive ? { background: `${primaryColor}15`, ringColor: primaryColor } : {}),
                  }}
                >
                  <div className="w-7 h-7 rounded-md overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ border: `2px solid ${isActive ? primaryColor : 'hsl(var(--border))'}` }}>
                    {mainLogo?.file_url ? (
                      <img src={mainLogo.file_url} alt={gym.code} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[8px] font-bold text-white" style={{ backgroundColor: primaryColor }}>
                        {gym.code}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate" style={{ color: isActive ? primaryColor : 'hsl(var(--brand-navy))' }}>
                      {gym.code}
                    </div>
                    <div className="text-[10px] truncate text-muted-foreground">
                      {assetCount} asset{assetCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {isActive && <Check className="w-3 h-3 shrink-0" style={{ color: primaryColor }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── MAIN GRID ─── */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ImageIcon className="w-12 h-12 mb-3 text-muted-foreground" />
              <p className="text-lg font-medium" style={{ color: 'hsl(var(--brand-navy))' }}>
                {searchQuery ? "No assets match your search" : "No assets in this category yet"}
              </p>
              <p className="text-sm mt-1 text-muted-foreground">
                {activeType?.name} assets will appear here once uploaded
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {filteredAssets.map(asset => {
                const displayUrl = getAssetDisplayUrl(asset);
                const gymBadges = getAssetGymBadges(asset);
                const assignCount = (assetGymMap.get(asset.id) || []).length;

                return (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className="group text-left rounded-lg border overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] relative"
                    style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square w-full overflow-hidden flex items-center justify-center bg-muted">
                      {displayUrl ? (
                        <img
                          src={displayUrl}
                          alt={asset.filename}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                      )}
                    </div>

                    {/* Gym count badge */}
                    {assignCount > 0 && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                        style={{ background: 'hsl(var(--brand-navy) / 0.8)' }}>
                        {assignCount}/{totalGyms}
                      </div>
                    )}

                    {/* All gyms badge */}
                    {asset.is_all_gyms && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{ background: 'hsl(var(--brand-gold))', color: 'hsl(var(--brand-navy))' }}>
                        ALL
                      </div>
                    )}

                    {/* Footer: filename + gym dots */}
                    <div className="px-1.5 py-1">
                      <div className="text-[10px] font-medium truncate" style={{ color: 'hsl(var(--brand-navy))' }}>
                        {asset.filename}
                      </div>
                      {gymBadges.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {gymBadges.map((b, i) => (
                            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} title={b.code} />
                          ))}
                          {assignCount > 4 && (
                            <span className="text-[8px] text-muted-foreground ml-0.5">+{assignCount - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── DETAIL DRAWER ─── */}
      <Sheet open={!!selectedAssetId} onOpenChange={(open) => { if (!open) setSelectedAssetId(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          <SheetHeader className="px-5 py-3 border-b sticky top-0 z-10" style={{
            background: 'linear-gradient(135deg, hsl(var(--brand-navy)), hsl(var(--brand-navy) / 0.88))',
          }}>
            <SheetTitle className="text-primary-foreground text-sm flex items-center gap-2">
              <span className="truncate">{selectedAsset?.filename}</span>
              {selectedAssetType && (
                <Badge className="text-[10px] shrink-0" style={{ background: 'hsl(var(--brand-rose-gold))' }}>
                  {selectedAssetType.name}
                </Badge>
              )}
              {selectedAssetCategory && (
                <Badge variant="outline" className="text-[10px] shrink-0 text-primary-foreground/70 border-primary-foreground/30">
                  {selectedAssetCategory.name}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {selectedAsset && (
            <div className="p-4 space-y-4">
              {/* Full preview */}
              <div className="rounded-lg overflow-hidden border bg-muted flex items-center justify-center"
                style={{ borderColor: 'hsl(var(--border))' }}>
                <img
                  src={selectedAsset.file_url}
                  alt={selectedAsset.filename}
                  className="max-w-full max-h-64 object-contain"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copyUrl(selectedAsset.file_url)}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy URL
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={selectedAsset.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open
                  </a>
                </Button>
              </div>

              {/* Description */}
              {selectedAsset.description && (
                <p className="text-sm text-muted-foreground">{selectedAsset.description}</p>
              )}

              {/* Theme tags */}
              {selectedAssetTags.size > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {themeTags
                    .filter(t => selectedAssetTags.has(t.id))
                    .map(t => (
                      <Badge key={t.id} className="text-[10px]"
                        style={{ background: 'hsl(var(--brand-rose-gold) / 0.15)', color: 'hsl(var(--brand-navy))' }}>
                        {t.name}
                      </Badge>
                    ))}
                </div>
              )}

              {/* Coverage status */}
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'hsl(var(--brand-navy))' }}>
                <span>{selectedAssetAssignments.length}/{totalGyms} gyms</span>
                {selectedAsset.is_all_gyms && (
                  <Badge className="text-[10px]" style={{ background: 'hsl(var(--brand-gold))', color: 'hsl(var(--brand-navy))' }}>
                    ALL GYMS
                  </Badge>
                )}
              </div>

              {/* Per-gym versions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gym Versions</h4>
                {gyms.map(gym => {
                  const assignment = selectedAssetAssignments.find(a => a.gym_id === gym.id);
                  const hasIt = !!assignment || selectedAsset.is_all_gyms || selectedAsset.is_global;
                  const primaryColor = gym.colors[0]?.color_hex || '#667eea';
                  const mainLogo = gym.logos.find(l => l.is_main_logo) || gym.logos[0];
                  const fileUrl = assignment?.file_url || (hasIt ? selectedAsset.file_url : null);

                  return (
                    <div key={gym.id} className="flex items-center gap-2.5 p-2 rounded-lg border transition-all"
                      style={{
                        borderColor: hasIt ? `${primaryColor}40` : 'hsl(var(--destructive) / 0.2)',
                        background: hasIt ? 'hsl(var(--card))' : 'hsl(var(--destructive) / 0.03)',
                      }}>
                      {/* Logo */}
                      <div className="w-7 h-7 rounded-md overflow-hidden shrink-0 flex items-center justify-center"
                        style={{ border: `2px solid ${primaryColor}` }}>
                        {mainLogo?.file_url ? (
                          <img src={mainLogo.file_url} alt={gym.code} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[7px] font-bold text-white rounded" style={{ backgroundColor: primaryColor, padding: '1px 2px' }}>
                            {gym.code}
                          </span>
                        )}
                      </div>

                      {/* Code */}
                      <span className="text-xs font-bold w-8" style={{ color: primaryColor }}>{gym.code}</span>

                      {/* Thumbnail */}
                      {fileUrl ? (
                        <div className="w-10 h-10 rounded overflow-hidden border shrink-0"
                          style={{ borderColor: 'hsl(var(--border))' }}>
                          <img src={fileUrl} alt="" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded border flex items-center justify-center shrink-0"
                          style={{ borderColor: 'hsl(var(--destructive) / 0.2)' }}>
                          <X className="w-3 h-3 text-destructive/50" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0" />

                      {/* Status */}
                      {hasIt ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${primaryColor}15`, color: primaryColor }}>
                          <Check className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}>
                          <AlertTriangle className="w-3 h-3" /> MISSING
                        </span>
                      )}

                      {/* Copy URL */}
                      {fileUrl && (
                        <button onClick={() => copyUrl(fileUrl)} className="p-1 rounded hover:bg-muted transition-colors">
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── NEW THEME DIALOG ─── */}
      <Dialog open={showNewTheme} onOpenChange={setShowNewTheme}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Theme Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder="e.g. Halloween, Summer Camp, VIP..."
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTheme()}
            />
            <Button onClick={handleCreateTheme} disabled={!newThemeName.trim()} className="w-full text-white"
              style={{ background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))' }}>
              <Plus className="w-4 h-4 mr-1" /> Create Theme
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetHub;
