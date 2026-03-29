import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGyms } from "@/hooks/useGyms";
import { useThemeTags, useAllAssetThemeTags, useCreateThemeTag } from "@/hooks/useThemeTags";
import { useAllAssetsWithAssignments, useAssetTypes, useAssetCategories, GymAsset, GymAssetAssignment } from "@/hooks/useAssets";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Search, X, Check, ChevronDown, ChevronRight,
  Download, Copy, Image as ImageIcon, AlertTriangle, ExternalLink,
  PanelLeftClose, PanelLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// ─── Rotating Asset Card Component ───
interface RotatingAssetCardProps {
  asset: GymAsset;
  imageUrls: { url: string; gymCode?: string }[];
  coverage: { count: number; total: number; complete: boolean };
  onSelect: () => void;
  onCopy: (url: string) => void;
}

const RotatingAssetCard = ({ asset, imageUrls, coverage, onSelect, onCopy }: RotatingAssetCardProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasMultiple = imageUrls.length > 1;

  useEffect(() => {
    if (!hasMultiple || isHovered) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % imageUrls.length);
    }, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [hasMultiple, isHovered, imageUrls.length]);

  const currentImage = imageUrls[currentIndex];
  const nextIndex = (currentIndex + 1) % imageUrls.length;
  const nextImage = imageUrls[nextIndex];

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group text-left rounded-xl border-2 overflow-hidden transition-all hover:shadow-xl hover:scale-[1.02] relative bg-card"
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      {/* ─ DOMINANT THUMBNAIL ─ */}
      <div className="aspect-square w-full overflow-hidden relative bg-slate-900/90">
        {/* Background (next) image for crossfade */}
        {hasMultiple && (
          <img
            src={nextImage.url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {/* Foreground (current) image */}
        <img
          src={currentImage.url}
          alt={asset.filename}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
            "group-hover:scale-105 transition-all"
          )}
          loading="lazy"
        />

        {/* Gym code badge (during rotation) */}
        {hasMultiple && currentImage.gymCode && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white backdrop-blur-sm transition-all"
            style={{ background: 'hsl(var(--brand-navy) / 0.75)' }}>
            {currentImage.gymCode}
          </div>
        )}

        {/* Rotation dots indicator */}
        {hasMultiple && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {imageUrls.map((_, i) => (
              <div key={i} className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                i === currentIndex ? "bg-white scale-125" : "bg-white/40"
              )} />
            ))}
          </div>
        )}

        {/* Coverage badge */}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold text-white backdrop-blur-sm"
          style={{
            background: coverage.complete
              ? 'hsl(var(--brand-gold) / 0.9)'
              : coverage.count > 0
                ? 'hsl(var(--brand-navy) / 0.8)'
                : 'hsl(var(--destructive) / 0.85)',
          }}>
          {coverage.count}/{coverage.total}
          {coverage.complete && ' ✓'}
          {!coverage.complete && coverage.count === 0 && ' ⚠️'}
        </div>

        {/* ALL badge */}
        {asset.is_all_gyms && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm"
            style={{ background: 'hsl(var(--brand-gold) / 0.9)', color: 'hsl(var(--brand-navy))' }}>
            ALL GYMS
          </div>
        )}

        {/* Hover overlay with actions */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent pt-10 pb-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1.5">
            <span
              onClick={(e) => { e.stopPropagation(); onCopy(currentImage.url); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors cursor-pointer"
            >
              <Copy className="w-3 h-3" /> Copy
            </span>
            <a
              href={currentImage.url}
              download
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
            >
              <Download className="w-3 h-3" /> Save
            </a>
          </div>
        </div>
      </div>

      {/* ─ MINIMAL FOOTER ─ */}
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold truncate" style={{ color: 'hsl(var(--brand-navy))' }}>
          {asset.filename}
        </span>
        {hasMultiple && (
          <span className="text-[9px] text-muted-foreground shrink-0">
            {imageUrls.length} versions
          </span>
        )}
      </div>
    </button>
  );
};

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
  const activeTypeFilter = searchParams.get("type"); // null = "All"
  const activeCategoryId = searchParams.get("category");

  // Local state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewTheme, setShowNewTheme] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Section refs for scroll-into-view
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const totalGyms = gyms.length;

  // Build maps
  const assetTagMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allAssetThemeTags.forEach(att => {
      if (!map.has(att.asset_id)) map.set(att.asset_id, new Set());
      map.get(att.asset_id)!.add(att.theme_tag_id);
    });
    return map;
  }, [allAssetThemeTags]);

  const assetGymMap = useMemo(() => {
    const map = new Map<string, GymAssetAssignment[]>();
    assignments.forEach(a => {
      if (!map.has(a.asset_id)) map.set(a.asset_id, []);
      map.get(a.asset_id)!.push(a);
    });
    return map;
  }, [assignments]);

  const gymAssetCountMap = useMemo(() => {
    const map = new Map<string, number>();
    assignments.forEach(a => {
      map.set(a.gym_id, (map.get(a.gym_id) || 0) + 1);
    });
    return map;
  }, [assignments]);

  // Filter assets based on gym + search
  const baseFilteredAssets = useMemo(() => {
    let result = assets;

    if (activeGymId) {
      const gymAssetIds = new Set(
        assignments.filter(a => a.gym_id === activeGymId).map(a => a.asset_id)
      );
      result = result.filter(a => gymAssetIds.has(a.id) || a.is_all_gyms || a.is_global);
    }

    if (activeCategoryId) {
      result = result.filter(a => a.category_id === activeCategoryId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.filename.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [assets, activeGymId, activeCategoryId, searchQuery, assignments]);

  // Group assets by type
  const assetsByType = useMemo(() => {
    const map = new Map<string, GymAsset[]>();
    assetTypes.forEach(t => map.set(t.id, []));
    baseFilteredAssets.forEach(a => {
      const list = map.get(a.asset_type_id);
      if (list) list.push(a);
    });
    return map;
  }, [baseFilteredAssets, assetTypes]);

  // Coverage calculation
  const getCoverage = (asset: GymAsset) => {
    if (asset.is_all_gyms) return { count: totalGyms, total: totalGyms, complete: true };
    const count = (assetGymMap.get(asset.id) || []).length;
    return { count, total: totalGyms, complete: count >= totalGyms };
  };

  // Section stats
  const getSectionStats = (typeId: string) => {
    const sectionAssets = assetsByType.get(typeId) || [];
    const total = sectionAssets.length;
    const missing = sectionAssets.filter(a => !getCoverage(a).complete).length;
    const complete = total - missing;
    return { total, missing, complete };
  };

  // Global stats
  const globalStats = useMemo(() => {
    let total = 0, missing = 0, complete = 0;
    assetTypes.forEach(t => {
      const s = getSectionStats(t.id);
      total += s.total;
      missing += s.missing;
      complete += s.complete;
    });
    return { total, missing, complete };
  }, [assetTypes, assetsByType]);

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

  const scrollToSection = (typeId: string) => {
    const el = sectionRefs.current.get(typeId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Expand it if collapsed
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.delete(typeId);
      return next;
    });
  };

  const toggleSection = (typeId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  };

  const getAssetDisplayUrl = (asset: GymAsset): string => {
    if (activeGymId) {
      const gymAssignment = assignments.find(a => a.asset_id === asset.id && a.gym_id === activeGymId);
      if (gymAssignment?.file_url) return gymAssignment.file_url;
    }
    const firstAssignment = assignments.find(a => a.asset_id === asset.id && a.file_url);
    return firstAssignment?.file_url || asset.file_url;
  };

  // Collect all image URLs for an asset (base + gym-specific versions)
  const getAssetImageUrls = useCallback((asset: GymAsset): { url: string; gymCode?: string }[] => {
    const urls: { url: string; gymCode?: string }[] = [];
    // Base URL first
    if (asset.file_url) urls.push({ url: asset.file_url, gymCode: 'BASE' });
    // Gym-specific versions
    const assetAssigns = assignments.filter(a => a.asset_id === asset.id && a.file_url);
    assetAssigns.forEach(a => {
      if (a.file_url && a.file_url !== asset.file_url) {
        const gym = gyms.find(g => g.id === a.gym_id);
        urls.push({ url: a.file_url, gymCode: gym?.code });
      }
    });
    return urls.length > 0 ? urls : [{ url: asset.file_url }];
  }, [assignments, gyms]);

  // Types to render
  const visibleTypes = activeTypeFilter
    ? assetTypes.filter(t => t.slug === activeTypeFilter)
    : assetTypes;

  if (gymsLoading || assetsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl text-muted-foreground">Loading Asset Hub...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
              Asset Management
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Global stats */}
            <div className="text-xs text-primary-foreground/70 hidden sm:flex items-center gap-1.5">
              <span className="font-semibold text-primary-foreground">{globalStats.total}</span> total
              {globalStats.missing > 0 && (
                <>
                  <span className="mx-1">·</span>
                  <span className="text-orange-300 font-semibold">{globalStats.missing}</span> missing
                </>
              )}
              <span className="mx-1">·</span>
              <span className="font-semibold" style={{ color: 'hsl(var(--brand-gold))' }}>{globalStats.complete}</span> complete
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowNewTheme(true)}
                className="text-primary-foreground text-sm"
                style={{ background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))' }}>
                <Plus className="w-4 h-4 mr-1" /> Add Asset
              </Button>
            )}
          </div>
        </div>

        {/* ─── TAB BAR (quick-jump + "All") ─── */}
        <div className="px-4 flex items-center gap-1 border-t border-primary-foreground/10">
          <button
            onClick={() => setParam("type", null)}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold transition-all relative",
              !activeTypeFilter
                ? "text-primary-foreground"
                : "text-primary-foreground/50 hover:text-primary-foreground/80"
            )}
          >
            All
            {!activeTypeFilter && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                style={{ background: 'hsl(var(--brand-rose-gold))' }} />
            )}
          </button>
          {assetTypes.map(type => {
            const isActive = activeTypeFilter === type.slug;
            const sectionAssets = assetsByType.get(type.id) || [];
            return (
              <button
                key={type.id}
                onClick={() => {
                  if (activeTypeFilter === type.slug) {
                    // Already filtered to this type, scroll to it
                    scrollToSection(type.id);
                  } else {
                    setParam("type", type.slug);
                  }
                }}
                className={cn(
                  "px-4 py-2.5 text-sm font-semibold transition-all relative",
                  isActive
                    ? "text-primary-foreground"
                    : "text-primary-foreground/50 hover:text-primary-foreground/80"
                )}
              >
                {type.name}
                {sectionAssets.length > 0 && (
                  <span className={cn(
                    "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                    isActive ? "bg-primary-foreground/20" : "bg-primary-foreground/10"
                  )}>
                    {sectionAssets.length}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ background: 'hsl(var(--brand-rose-gold))' }} />
                )}
              </button>
            );
          })}

          {/* Search */}
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-foreground/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="pl-8 h-8 text-sm bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40"
            />
          </div>
        </div>
      </div>

      {/* ─── BODY ─── */}
      <div className="flex flex-1 min-h-0">
        {/* ─── LEFT SIDEBAR ─── */}
        {sidebarOpen && (
          <div className="w-52 shrink-0 border-r overflow-y-auto flex flex-col"
            style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>

            {/* GYMS section */}
            <div className="px-3 pt-3 pb-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Gyms</div>
            </div>

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
              ● All Gyms
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
                      {gym.name}
                    </div>
                  </div>
                  {isActive && <Check className="w-3 h-3 shrink-0" style={{ color: primaryColor }} />}
                </button>
              );
            })}

            {/* CATEGORIES section */}
            <div className="px-3 pt-4 pb-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Categories</div>
            </div>

            {assetTypes.map(type => {
              const cats = assetCategories.filter(c => c.asset_type_id === type.id);
              const typeAssetCount = (assetsByType.get(type.id) || []).length;
              return (
                <Collapsible key={type.id} defaultOpen>
                  <CollapsibleTrigger className="w-full flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold hover:bg-muted/50 transition-colors"
                    style={{ color: 'hsl(var(--brand-navy))' }}>
                    <ChevronDown className="w-3 h-3 shrink-0" />
                    <span className="truncate">{type.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">({typeAssetCount})</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {/* Click type name to jump */}
                    <button
                      onClick={() => { setParam("type", type.slug); setParam("category", null); }}
                      className="w-full text-left pl-8 pr-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                    >
                      All {type.name}
                    </button>
                    {cats.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setParam("type", type.slug); setParam("category", cat.id); }}
                        className={cn(
                          "w-full text-left pl-8 pr-3 py-1 text-xs transition-colors",
                          activeCategoryId === cat.id
                            ? "font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                        style={activeCategoryId === cat.id ? { color: 'hsl(var(--brand-navy))' } : {}}
                      >
                        · {cat.name}
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* ─── MAIN CONTENT (scrollable sections) ─── */}
        <div className="flex-1 overflow-y-auto">
          {/* Sidebar toggle */}
          <div className="sticky top-0 z-10 px-3 py-1.5 flex items-center gap-2 bg-background border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 h-8 w-8">
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </Button>

            {activeGymId && (
              <button onClick={() => setParam("gym", null)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                style={{ background: gyms.find(g => g.id === activeGymId)?.colors[0]?.color_hex || 'hsl(var(--brand-navy))' }}>
                {gyms.find(g => g.id === activeGymId)?.code || 'Gym'}: {gyms.find(g => g.id === activeGymId)?.name}
                <X className="w-3 h-3" />
              </button>
            )}

            {activeCategoryId && (
              <button onClick={() => setParam("category", null)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-muted text-foreground">
                {assetCategories.find(c => c.id === activeCategoryId)?.name}
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="p-4 space-y-6">
            {visibleTypes.map(type => {
              const sectionAssets = assetsByType.get(type.id) || [];
              const stats = getSectionStats(type.id);
              const isCollapsed = collapsedSections.has(type.id);

              if (sectionAssets.length === 0 && !isAdmin) return null;

              return (
                <div
                  key={type.id}
                  ref={(el) => { if (el) sectionRefs.current.set(type.id, el); }}
                  className="rounded-xl border-2 overflow-hidden"
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(type.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                    style={{ background: 'hsl(var(--card))' }}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-base font-bold" style={{ color: 'hsl(var(--brand-navy))' }}>
                      {type.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stats.total} asset{stats.total !== 1 ? 's' : ''}
                    </span>

                    <div className="ml-auto flex items-center gap-2">
                      {stats.missing > 0 ? (
                        <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {stats.missing} missing
                        </Badge>
                      ) : stats.total > 0 ? (
                        <Badge className="text-[10px] gap-1" style={{ background: 'hsl(var(--brand-gold))', color: 'hsl(var(--brand-navy))' }}>
                          <Check className="w-3 h-3" />
                          all set
                        </Badge>
                      ) : null}
                    </div>
                  </button>

                  {/* Section Content */}
                  {!isCollapsed && (
                    <div className="p-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                      {sectionAssets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <ImageIcon className="w-8 h-8 mb-2 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">No {type.name.toLowerCase()} yet</p>
                        </div>
                      ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {sectionAssets.map(asset => {
                            const coverage = getCoverage(asset);
                            const imageUrls = getAssetImageUrls(asset);

                            return (
                              <RotatingAssetCard
                                key={asset.id}
                                asset={asset}
                                imageUrls={imageUrls}
                                coverage={coverage}
                                onSelect={() => setSelectedAssetId(asset.id)}
                                onCopy={(url) => copyUrl(url)}
                              />
                            );
                          })}

                          {/* + ADD card (admin only) */}
                          {isAdmin && (
                            <button
                              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center aspect-[3/4] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                              style={{ borderColor: 'hsl(var(--border))' }}
                              onClick={() => {
                                toast({ description: "Asset upload coming soon!" });
                              }}
                            >
                              <Plus className="w-10 h-10 mb-2" />
                              <span className="text-sm font-semibold">Add Asset</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
                  <a href={selectedAsset.file_url} download>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </a>
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
              <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'hsl(var(--brand-navy))' }}>
                GYM COVERAGE
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold",
                  selectedAssetAssignments.length >= totalGyms ? "text-white" : "text-orange-600"
                )} style={selectedAssetAssignments.length >= totalGyms ? { background: 'hsl(var(--brand-gold))' } : { background: 'hsl(var(--destructive) / 0.1)' }}>
                  {selectedAsset.is_all_gyms ? totalGyms : selectedAssetAssignments.length}/{totalGyms}
                </span>
              </div>

              {/* Per-gym versions */}
              <div className="space-y-1.5">
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
                      {/* Thumbnail */}
                      {fileUrl ? (
                        <div className="w-10 h-10 rounded overflow-hidden border shrink-0"
                          style={{ borderColor: `${primaryColor}40` }}>
                          <img src={fileUrl} alt="" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded border-2 border-dashed flex items-center justify-center shrink-0"
                          style={{ borderColor: 'hsl(var(--destructive) / 0.3)' }}>
                          <X className="w-3 h-3 text-destructive/50" />
                        </div>
                      )}

                      {/* Code */}
                      <span className="text-xs font-bold w-8" style={{ color: primaryColor }}>{gym.code}</span>

                      {/* URL preview (truncated) */}
                      {fileUrl && (
                        <span className="text-[10px] text-muted-foreground truncate flex-1 min-w-0">
                          {fileUrl.split('/').pop()}
                        </span>
                      )}
                      {!fileUrl && <span className="flex-1" />}

                      {/* Actions */}
                      {fileUrl && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => copyUrl(fileUrl)} className="p-1 rounded hover:bg-muted transition-colors" title="Copy URL">
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <a href={fileUrl} download className="p-1 rounded hover:bg-muted transition-colors" title="Download">
                            <Download className="w-3 h-3 text-muted-foreground" />
                          </a>
                          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-muted transition-colors" title="Open">
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          </a>
                        </div>
                      )}

                      {/* Status */}
                      {hasIt ? (
                        <Check className="w-4 h-4 shrink-0" style={{ color: primaryColor }} />
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}>
                          <AlertTriangle className="w-3 h-3" /> MISSING
                        </span>
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
