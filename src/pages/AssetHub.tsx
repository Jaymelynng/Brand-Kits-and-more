import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGyms, GymWithColors } from "@/hooks/useGyms";
import { useThemeTags, useAllAssetThemeTags, useCreateThemeTag } from "@/hooks/useThemeTags";
import { useAllAssetsWithAssignments, GymAsset, GymAssetAssignment } from "@/hooks/useAssets";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Search, X, Check, ChevronRight,
  Download, Copy, LayoutGrid, List, PanelLeftClose, PanelLeft,
  Image as ImageIcon, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import JSZip from "jszip";

type ViewMode = "themes" | "gym" | "all";

const AssetHub = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const { data: gyms = [], isLoading: gymsLoading } = useGyms();
  const { data: themeTags = [], isLoading: tagsLoading } = useThemeTags();
  const { data: allAssetThemeTags = [] } = useAllAssetThemeTags();
  const { data: assetData } = useAllAssetsWithAssignments();
  const createTagMutation = useCreateThemeTag();

  const assets = assetData?.assets || [];
  const assignments = assetData?.assignments || [];

  // URL-driven state
  const activeThemeId = searchParams.get("theme");
  const activeGymId = searchParams.get("gym");

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>("themes");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewTheme, setShowNewTheme] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [detailThemeId, setDetailThemeId] = useState<string | null>(activeThemeId);
  const [viewStyle, setViewStyle] = useState<"grid" | "list">("grid");

  // Build gym -> asset count map
  const gymAssetCountMap = useMemo(() => {
    const map = new Map<string, number>();
    assignments.forEach(a => {
      map.set(a.gym_id, (map.get(a.gym_id) || 0) + 1);
    });
    return map;
  }, [assignments]);

  // Build theme -> stats
  const tagStats = useMemo(() => {
    const assetGyms = new Map<string, Set<string>>();
    assignments.forEach(a => {
      if (!assetGyms.has(a.asset_id)) assetGyms.set(a.asset_id, new Set());
      assetGyms.get(a.asset_id)!.add(a.gym_id);
    });

    return themeTags.map(tag => {
      const taggedAssetIds = allAssetThemeTags
        .filter(att => att.theme_tag_id === tag.id)
        .map(att => att.asset_id);

      const uniqueGymIds = new Set<string>();
      taggedAssetIds.forEach(aid => {
        assetGyms.get(aid)?.forEach(gid => uniqueGymIds.add(gid));
      });

      // Find a representative thumbnail
      const firstAssetId = taggedAssetIds[0];
      const firstAsset = firstAssetId ? assets.find(a => a.id === firstAssetId) : null;
      const firstAssignment = firstAssetId
        ? assignments.find(a => a.asset_id === firstAssetId && a.file_url)
        : null;
      const thumbnail = firstAssignment?.file_url || firstAsset?.file_url || null;

      return {
        ...tag,
        assetCount: taggedAssetIds.length,
        gymCount: uniqueGymIds.size,
        gymIds: uniqueGymIds,
        thumbnail,
      };
    });
  }, [themeTags, allAssetThemeTags, assignments, assets]);

  // Filter by search
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tagStats;
    const q = searchQuery.toLowerCase();
    return tagStats.filter(t => t.name.toLowerCase().includes(q));
  }, [tagStats, searchQuery]);

  // Filter by selected gym
  const displayTags = useMemo(() => {
    if (!activeGymId) return filteredTags;
    return filteredTags.filter(t => t.gymIds.has(activeGymId));
  }, [filteredTags, activeGymId]);

  // Detail drawer data
  const detailTag = detailThemeId ? tagStats.find(t => t.id === detailThemeId) : null;
  const detailAssets = useMemo(() => {
    if (!detailThemeId) return [];
    const taggedAssetIds = new Set(
      allAssetThemeTags
        .filter(att => att.theme_tag_id === detailThemeId)
        .map(att => att.asset_id)
    );
    
    // For each gym, find its version(s) of this theme's assets
    return gyms.map(gym => {
      const gymAssignments = assignments.filter(
        a => taggedAssetIds.has(a.asset_id) && a.gym_id === gym.id
      );
      const primaryColor = gym.colors[0]?.color_hex || '#667eea';
      const mainLogo = gym.logos.find(l => l.is_main_logo) || gym.logos[0];
      
      const assetUrls = gymAssignments
        .map(a => {
          const asset = assets.find(as => as.id === a.asset_id);
          return {
            url: a.file_url || asset?.file_url || '',
            filename: asset?.filename || '',
            assetId: a.asset_id,
          };
        })
        .filter(a => a.url);

      return {
        gym,
        primaryColor,
        logoUrl: mainLogo?.file_url || null,
        assets: assetUrls,
        hasAssets: assetUrls.length > 0,
      };
    });
  }, [detailThemeId, allAssetThemeTags, gyms, assignments, assets]);

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

  const selectGym = (gymId: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (gymId) {
      params.set("gym", gymId);
    } else {
      params.delete("gym");
    }
    setSearchParams(params);
  };

  const openThemeDetail = (themeId: string) => {
    setDetailThemeId(themeId);
    const params = new URLSearchParams(searchParams);
    params.set("theme", themeId);
    setSearchParams(params);
  };

  const closeThemeDetail = () => {
    setDetailThemeId(null);
    const params = new URLSearchParams(searchParams);
    params.delete("theme");
    setSearchParams(params);
  };

  const totalGyms = gyms.length;

  if (gymsLoading || tagsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <div className="text-xl" style={{ color: 'hsl(var(--brand-text-primary))' }}>Loading Asset Hub...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(var(--muted) / 0.4), hsl(var(--background)))' }}>
      {/* ─── HEADER ─── */}
      <div className="shrink-0 sticky top-0 z-40" style={{
        background: 'linear-gradient(135deg, hsl(var(--brand-navy)), hsl(var(--brand-navy) / 0.88))',
        boxShadow: '0 4px 20px hsl(var(--brand-navy) / 0.3)',
      }}>
        <div className="px-4 py-3 flex items-center justify-between gap-3">
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

        {/* ─── FILTER BAR ─── */}
        <div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
          {/* Sidebar toggle */}
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 p-1.5">
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </Button>

          {/* Active gym filter chip */}
          {activeGymId && (
            <button onClick={() => selectGym(null)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-primary-foreground"
              style={{ background: 'hsl(var(--brand-rose-gold))' }}>
              {gyms.find(g => g.id === activeGymId)?.code || 'Gym'}
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-foreground/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search themes..."
              className="pl-8 h-8 text-sm bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: 'hsl(var(--primary-foreground) / 0.2)' }}>
            <button onClick={() => setViewStyle("grid")}
              className={cn("p-1.5 transition-colors", viewStyle === "grid" ? "bg-primary-foreground/20 text-primary-foreground" : "text-primary-foreground/50 hover:text-primary-foreground/80")}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewStyle("list")}
              className={cn("p-1.5 transition-colors", viewStyle === "list" ? "bg-primary-foreground/20 text-primary-foreground" : "text-primary-foreground/50 hover:text-primary-foreground/80")}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── BODY ─── */}
      <div className="flex flex-1 min-h-0">
        {/* ─── LEFT SIDEBAR: Gym List ─── */}
        {sidebarOpen && (
          <div className="w-48 shrink-0 border-r overflow-y-auto" style={{
            background: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
          }}>
            {/* All Gyms option */}
            <button
              onClick={() => selectGym(null)}
              className={cn(
                "w-full text-left px-3 py-2.5 text-sm font-semibold border-b transition-colors",
                !activeGymId
                  ? "text-primary-foreground"
                  : "hover:bg-muted/50"
              )}
              style={{
                borderColor: 'hsl(var(--border))',
                ...(activeGymId ? {} : {
                  background: 'linear-gradient(135deg, hsl(var(--brand-navy)), hsl(var(--brand-navy) / 0.85))',
                  color: 'hsl(var(--primary-foreground))',
                }),
                ...(!activeGymId ? {} : { color: 'hsl(var(--brand-navy))' }),
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
                  onClick={() => selectGym(gym.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left border-b transition-all",
                    isActive ? "ring-2 ring-inset" : "hover:bg-muted/50"
                  )}
                  style={{
                    borderColor: 'hsl(var(--border))',
                    ...(isActive ? {
                      background: `${primaryColor}15`,
                      ringColor: primaryColor,
                    } : {}),
                  }}
                >
                  {/* Logo thumb */}
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ border: `2px solid ${isActive ? primaryColor : 'hsl(var(--border))'}` }}>
                    {mainLogo?.file_url ? (
                      <img src={mainLogo.file_url} alt={gym.code} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[9px] font-bold text-white" style={{ backgroundColor: primaryColor }}>
                        {gym.code}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate" style={{ color: isActive ? primaryColor : 'hsl(var(--brand-navy))' }}>
                      {gym.code}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {assetCount} asset{assetCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {isActive && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── MAIN GRID ─── */}
        <div className="flex-1 overflow-y-auto p-4">
          {displayTags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ImageIcon className="w-12 h-12 mb-3" style={{ color: 'hsl(var(--muted-foreground))' }} />
              <p className="text-lg font-medium" style={{ color: 'hsl(var(--brand-navy))' }}>
                {searchQuery ? "No themes match your search" : activeGymId ? "No themes for this gym yet" : "No themes yet"}
              </p>
              <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {isAdmin ? "Create a theme to get started" : "Themes will appear here once created"}
              </p>
            </div>
          ) : viewStyle === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayTags.map(tag => {
                const coverage = totalGyms > 0 ? Math.round((tag.gymCount / totalGyms) * 100) : 0;
                const isFull = tag.gymCount === totalGyms && totalGyms > 0;

                return (
                  <button
                    key={tag.id}
                    onClick={() => openThemeDetail(tag.id)}
                    className="group text-left rounded-xl border-2 overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
                    style={{
                      background: 'hsl(var(--card))',
                      borderColor: isFull ? 'hsl(var(--brand-gold))' : 'hsl(var(--border))',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video w-full overflow-hidden flex items-center justify-center"
                      style={{ background: 'hsl(var(--muted))' }}>
                      {tag.thumbnail ? (
                        <img src={tag.thumbnail} alt={tag.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <ImageIcon className="w-10 h-10" style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }} />
                      )}
                    </div>

                    {/* Card body */}
                    <div className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-bold truncate" style={{ color: 'hsl(var(--brand-navy))' }}>
                          {tag.name}
                        </h3>
                        <ChevronRight className="w-4 h-4 shrink-0 opacity-30 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                          style={{ color: 'hsl(var(--brand-navy))' }} />
                      </div>

                      <div className="flex items-center gap-2 text-xs font-medium mb-2">
                        <span className="px-2 py-0.5 rounded-full"
                          style={{ background: 'hsl(var(--brand-rose-gold) / 0.15)', color: 'hsl(var(--brand-navy))' }}>
                          {tag.assetCount} asset{tag.assetCount !== 1 ? 's' : ''}
                        </span>
                        <span className="px-2 py-0.5 rounded-full"
                          style={{
                            background: isFull ? 'hsl(var(--brand-gold) / 0.2)' : 'hsl(var(--brand-blue-gray) / 0.2)',
                            color: 'hsl(var(--brand-navy))',
                          }}>
                          {tag.gymCount}/{totalGyms}
                        </span>
                      </div>

                      {/* Coverage bar */}
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'hsl(var(--brand-blue-gray) / 0.2)' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${coverage}%`,
                            background: isFull ? 'hsl(var(--brand-gold))' : 'linear-gradient(90deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))',
                          }} />
                      </div>

                      {/* Gym dots */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {gyms.slice(0, 13).map(g => {
                          const hasIt = tag.gymIds.has(g.id);
                          const color = g.colors[0]?.color_hex || '#ccc';
                          return (
                            <div key={g.id} className="w-3 h-3 rounded-full border"
                              style={{
                                backgroundColor: hasIt ? color : 'transparent',
                                borderColor: color,
                                opacity: hasIt ? 1 : 0.3,
                              }}
                              title={`${g.code}: ${hasIt ? '✓' : '✗'}`} />
                          );
                        })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="space-y-2">
              {displayTags.map(tag => {
                const coverage = totalGyms > 0 ? Math.round((tag.gymCount / totalGyms) * 100) : 0;
                const isFull = tag.gymCount === totalGyms && totalGyms > 0;

                return (
                  <button
                    key={tag.id}
                    onClick={() => openThemeDetail(tag.id)}
                    className="w-full flex items-center gap-4 rounded-xl border-2 p-3 transition-all hover:shadow-md text-left"
                    style={{
                      background: 'hsl(var(--card))',
                      borderColor: isFull ? 'hsl(var(--brand-gold))' : 'hsl(var(--border))',
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                      style={{ background: 'hsl(var(--muted))' }}>
                      {tag.thumbnail ? (
                        <img src={tag.thumbnail} alt={tag.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6" style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate" style={{ color: 'hsl(var(--brand-navy))' }}>{tag.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span style={{ color: 'hsl(var(--muted-foreground))' }}>{tag.assetCount} assets</span>
                        <span>•</span>
                        <span style={{ color: isFull ? 'hsl(var(--brand-gold))' : 'hsl(var(--muted-foreground))' }}>
                          {tag.gymCount}/{totalGyms} gyms
                        </span>
                      </div>
                    </div>

                    {/* Gym dots */}
                    <div className="flex gap-1 shrink-0">
                      {gyms.slice(0, 13).map(g => {
                        const hasIt = tag.gymIds.has(g.id);
                        const color = g.colors[0]?.color_hex || '#ccc';
                        return (
                          <div key={g.id} className="w-2.5 h-2.5 rounded-full border"
                            style={{
                              backgroundColor: hasIt ? color : 'transparent',
                              borderColor: color,
                              opacity: hasIt ? 1 : 0.3,
                            }} />
                        );
                      })}
                    </div>

                    <ChevronRight className="w-4 h-4 shrink-0 opacity-40" style={{ color: 'hsl(var(--brand-navy))' }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── DETAIL DRAWER ─── */}
      <Sheet open={!!detailThemeId} onOpenChange={(open) => { if (!open) closeThemeDetail(); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b sticky top-0 z-10" style={{
            background: 'linear-gradient(135deg, hsl(var(--brand-navy)), hsl(var(--brand-navy) / 0.88))',
            borderColor: 'hsl(var(--brand-navy) / 0.5)',
          }}>
            <SheetTitle className="text-primary-foreground flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-sm font-semibold"
                style={{ background: 'hsl(var(--brand-rose-gold))' }}>
                {detailTag?.name}
              </span>
              <span className="text-sm font-normal text-primary-foreground/70">
                {detailTag?.gymCount}/{totalGyms} gyms
              </span>
            </SheetTitle>
          </SheetHeader>

          <div className="p-4 space-y-3">
            {detailAssets.map(({ gym, primaryColor, logoUrl, assets: gymAssets, hasAssets }) => (
              <div key={gym.id} className="rounded-xl border-2 overflow-hidden transition-all"
                style={{
                  borderColor: hasAssets ? `${primaryColor}60` : 'hsl(var(--destructive) / 0.3)',
                  background: hasAssets ? 'hsl(var(--card))' : 'hsl(var(--destructive) / 0.05)',
                }}>
                {/* Gym header row */}
                <div className="flex items-center gap-3 px-3 py-2 border-b"
                  style={{ borderColor: 'hsl(var(--border))', background: `${primaryColor}10` }}>
                  <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ border: `2px solid ${primaryColor}` }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt={gym.code} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[8px] font-bold text-white rounded"
                        style={{ backgroundColor: primaryColor, padding: '2px 3px' }}>
                        {gym.code}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold" style={{ color: primaryColor }}>{gym.code}</span>
                    <span className="text-[10px] ml-2" style={{ color: 'hsl(var(--muted-foreground))' }}>{gym.name}</span>
                  </div>
                  {hasAssets ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${primaryColor}20`, color: primaryColor }}>
                      <Check className="w-3 h-3" /> {gymAssets.length}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}>
                      <AlertTriangle className="w-3 h-3" /> MISSING
                    </span>
                  )}
                </div>

                {/* Asset thumbnails */}
                {hasAssets && (
                  <div className="flex gap-2 p-3 flex-wrap">
                    {gymAssets.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                        className="w-20 h-20 rounded-lg overflow-hidden border hover:ring-2 transition-all"
                        style={{ borderColor: 'hsl(var(--border))', ringColor: primaryColor }}>
                        <img src={a.url} alt={a.filename} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── NEW THEME DIALOG ─── */}
      <Dialog open={showNewTheme} onOpenChange={setShowNewTheme}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Theme</DialogTitle>
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
