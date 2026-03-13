import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGyms } from "@/hooks/useGyms";
import { useThemeTags, useAllAssetThemeTags } from "@/hooks/useThemeTags";
import { useAllAssetsWithAssignments, GymAsset, GymAssetAssignment } from "@/hooks/useAssets";
import { useAssetComments, useAddAssetComment } from "@/hooks/useAssetComments";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, Copy, Trash2, Check, AlertTriangle, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import JSZip from "jszip";

interface GymThemeAsset {
  asset: GymAsset;
  assignment: GymAssetAssignment;
}

const ThemeDetail = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState<"copy" | "download" | null>(null);
  const [rowMutationGymId, setRowMutationGymId] = useState<string | null>(null);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [excludedGymIds, setExcludedGymIds] = useState<Set<string>>(new Set());

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

  const gymsWithAssets = gyms.filter(g => gymAssetMap.has(g.id));

  const selectedGymIds = useMemo(() => {
    return new Set(
      gyms
        .filter(g => gymAssetMap.has(g.id) && !excludedGymIds.has(g.id))
        .map(g => g.id)
    );
  }, [gyms, gymAssetMap, excludedGymIds]);

  // Selected URLs for bulk actions
  const allUrls = useMemo(() => {
    const urls: string[] = [];
    gymAssetMap.forEach((gAssets, gymId) => {
      if (!selectedGymIds.has(gymId)) return;

      gAssets.forEach(a => {
        const url = a.assignment.file_url || a.asset.file_url;
        if (url) urls.push(url);
      });
    });
    return urls;
  }, [gymAssetMap, selectedGymIds]);

  const copyTextToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    }
  };

  const parseStoragePathFromUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const marker = "/storage/v1/object/public/";
      const markerIndex = parsed.pathname.indexOf(marker);
      if (markerIndex === -1) return null;

      const storagePath = parsed.pathname.slice(markerIndex + marker.length);
      const [bucket, ...rest] = storagePath.split("/");
      if (!bucket || rest.length === 0) return null;

      return { bucket, filePath: rest.join("/") };
    } catch {
      return null;
    }
  };

  const getFileExtension = (url: string, fallbackName: string) => {
    const fromUrl = url.split(".").pop()?.split("?")[0]?.trim();
    if (fromUrl && fromUrl.length <= 5) return fromUrl;

    const fromName = fallbackName.split(".").pop()?.trim();
    return fromName || "png";
  };

  const getAssetBlob = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network fetch failed");
      return await response.blob();
    } catch {
      const parsed = parseStoragePathFromUrl(url);
      if (!parsed) throw new Error("Unable to parse storage path");

      const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.filePath);
      if (error || !data) throw error || new Error("Storage download failed");
      return data;
    }
  };

  const refreshAssetAssignments = async () => {
    await queryClient.invalidateQueries({ queryKey: ["all-assets-with-assignments"] });
  };

  const handleCopyAllUrls = async () => {
    if (allUrls.length === 0) return;

    setBulkActionLoading("copy");
    const copied = await copyTextToClipboard(allUrls.join("\n"));
    setBulkActionLoading(null);

    toast({
      description: copied ? `${allUrls.length} URL(s) copied!` : "Copy failed",
      variant: copied ? "default" : "destructive",
      duration: 2000,
    });
  };

  const handleDownloadAll = async () => {
    if (allUrls.length === 0) return;
    setDownloading(true);
    setBulkActionLoading("download");

    try {
      const zip = new JSZip();
      const folder = zip.folder(tag?.name || "theme");
      const promises: Promise<void>[] = [];

      gymAssetMap.forEach((gymAssets, gymId) => {
        const gym = gyms.find(g => g.id === gymId);

        gymAssets.forEach((ga, index) => {
          const url = ga.assignment.file_url || ga.asset.file_url;
          if (!url) return;

          promises.push(
            getAssetBlob(url)
              .then(blob => {
                const ext = getFileExtension(url, ga.asset.filename);
                const safeName = `${gym?.code || "unknown"}_${ga.asset.filename}`.replace(/[^a-zA-Z0-9._-]/g, "_");
                folder!.file(`${safeName}_${index + 1}.${ext}`, blob);
              })
              .catch(() => {
                // Continue zipping other assets even if one fails
              })
          );
        });
      });

      await Promise.all(promises);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tag?.name || "theme"}_assets.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ description: "ZIP downloaded!" });
    } catch {
      toast({ description: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
      setBulkActionLoading(null);
    }
  };

  const handleRemoveGymFromTheme = async (gymId: string) => {
    if (!isAdmin || !categoryId) return;

    const assetIds = Array.from(taggedAssetIds);
    if (assetIds.length === 0) return;

    setRowMutationGymId(gymId);

    try {
      const { error } = await supabase
        .from("gym_asset_assignments")
        .delete()
        .eq("gym_id", gymId)
        .in("asset_id", assetIds);

      if (error) throw error;

      await refreshAssetAssignments();
      const gym = gyms.find(g => g.id === gymId);
      toast({ description: `Removed ${gym?.code || "gym"} assignment(s)` });
    } catch {
      toast({ description: "Failed to remove gym assignments", variant: "destructive" });
    } finally {
      setRowMutationGymId(null);
    }
  };

  // Communication — use first tagged asset for comments (theme-level)
  const firstTaggedAssetId = useMemo(() => {
    const ids = Array.from(taggedAssetIds);
    return ids[0] || null;
  }, [taggedAssetIds]);

  const { data: comments = [] } = useAssetComments(firstTaggedAssetId || undefined);
  const addCommentMutation = useAddAssetComment();
  const [commentText, setCommentText] = useState("");

  const handleAddComment = async () => {
    if (!firstTaggedAssetId || !user || !commentText.trim()) return;
    try {
      await addCommentMutation.mutateAsync({
        assetId: firstTaggedAssetId,
        userId: user.id,
        content: commentText.trim(),
      });
      setCommentText("");
    } catch {
      toast({ description: "Failed to post comment", variant: "destructive" });
    }
  };

  if (gymsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <div className="text-xl" style={{ color: 'hsl(var(--brand-text-primary))' }}>Loading theme...</div>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <div className="text-xl text-destructive">Theme not found</div>
      </div>
    );
  }

  const completedCount = gymsWithAssets.length;
  const totalCount = gyms.length;

  return (
    <div className="min-h-screen flex flex-col p-3 gap-3" style={{ background: 'hsl(var(--background))' }}>
      {/* Header Bar */}
      <div className="shrink-0 rounded-xl border overflow-hidden" style={{
        background: 'linear-gradient(135deg, hsl(var(--brand-navy)), hsl(var(--brand-navy) / 0.85))',
        borderColor: 'hsl(var(--brand-navy) / 0.5)',
        boxShadow: '0 14px 32px -14px hsl(var(--brand-navy) / 0.65)',
      }}>
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate('/themes')}
              className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Themes
            </Button>
            <div className="h-5 w-px bg-primary-foreground/30" />
            <span className="px-3 py-1.5 rounded-lg text-sm font-semibold text-primary-foreground"
              style={{ background: 'hsl(var(--brand-rose-gold))' }}
            >
              {tag.name}
            </span>
            <span className="text-sm font-medium text-primary-foreground/80 truncate">
              {completedCount}/{totalCount} gyms complete
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline"
              className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20 text-sm"
              onClick={handleCopyAllUrls} disabled={allUrls.length === 0 || bulkActionLoading === "copy"}
            >
              <Copy className="w-4 h-4 mr-1" /> {bulkActionLoading === "copy" ? "Copying..." : "Copy All"}
            </Button>
            <Button size="sm" onClick={handleDownloadAll}
              disabled={allUrls.length === 0 || downloading}
              className="text-sm text-primary-foreground"
              style={{ background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))' }}
            >
              <Download className="w-4 h-4 mr-1" /> {downloading ? 'Zipping...' : 'Download All'}
            </Button>
          </div>
        </div>
      </div>

      {/* Three-Column Layout */}
      <div className="flex flex-1 overflow-hidden rounded-xl border" style={{ borderColor: 'hsl(var(--border))', boxShadow: '0 18px 42px -20px hsl(var(--brand-navy) / 0.45)' }}>

        {/* LEFT — Gym Asset Rows (Variable Info style) */}
        <div className="flex-1 flex flex-col border-r overflow-hidden" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
          <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between" style={{
            background: 'hsl(var(--muted) / 0.5)',
            borderColor: 'hsl(var(--border))',
          }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--brand-navy))' }}>
                📋 Asset Info
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: 'hsl(var(--brand-rose-gold) / 0.15)', color: 'hsl(var(--brand-navy))' }}
              >
                {completedCount}/{totalCount}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {gyms.map(gym => {
              const gymAssets = gymAssetMap.get(gym.id) || [];
              const hasAsset = gymAssets.length > 0;
              const primaryColor = gym.colors[0]?.color_hex || '#6B7280';
              const firstAsset = gymAssets[0];
              const fileUrl = firstAsset?.assignment?.file_url || firstAsset?.asset?.file_url || '';

              return (
                <div key={gym.id} className={cn(
                  "px-4 py-4 border-b flex flex-col gap-2 transition-all",
                  !hasAsset && "opacity-60"
                )} style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
                  {/* Top row: checkbox, badge, URL input, status, actions */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={hasAsset && !excludedGymIds.has(gym.id)}
                      disabled={!hasAsset}
                      onCheckedChange={(checked) => {
                        setExcludedGymIds(prev => {
                          const next = new Set(prev);
                          if (checked === false) {
                            next.add(gym.id);
                          } else {
                            next.delete(gym.id);
                          }
                          return next;
                        });
                      }}
                      className="shrink-0"
                    />

                    {/* Gym Badge */}
                    <span className="px-2.5 py-1 rounded-md text-sm font-semibold text-primary-foreground shrink-0 min-w-[50px] text-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {gym.code}
                    </span>

                    {/* URL Input */}
                    <Input
                      value={fileUrl}
                      readOnly
                      placeholder="No asset URL..."
                      className="flex-1 text-sm h-9 font-mono"
                      style={{ background: hasAsset ? 'hsl(var(--background))' : 'hsl(var(--muted) / 0.3)' }}
                    />

                    {/* Status Badge */}
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1",
                    )} style={{
                      background: hasAsset ? 'hsl(142 76% 36% / 0.12)' : 'hsl(32 95% 44% / 0.12)',
                      color: hasAsset ? 'hsl(142 76% 36%)' : 'hsl(32 95% 44%)',
                    }}>
                      {hasAsset ? (
                        <><Check className="w-3.5 h-3.5" />COMPLETE</>
                      ) : (
                        <><AlertTriangle className="w-3.5 h-3.5" />MISSING</>
                      )}
                    </span>

                    {/* Copy URL */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                      disabled={!fileUrl}
                      onClick={async () => {
                        const copied = await copyTextToClipboard(fileUrl);
                        toast({
                          description: copied ? "URL copied!" : "Copy failed",
                          variant: copied ? "default" : "destructive",
                        });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>

                    {/* Delete */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive"
                      disabled={!isAdmin || !hasAsset || rowMutationGymId === gym.id}
                      onClick={() => void handleRemoveGymFromTheme(gym.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {hasAsset && fileUrl && (
                    <div className="ml-[80px] flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg border-2 overflow-hidden shrink-0 flex items-center justify-center"
                        style={{ borderColor: `${primaryColor}30`, background: 'hsl(var(--muted) / 0.3)' }}
                      >
                        <img src={fileUrl} alt={`${gym.name} asset preview`} className="max-w-full max-h-full object-contain" loading="lazy" />
                      </div>
                      <span className="text-xs truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {firstAsset?.asset?.filename}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Bulk Actions */}
          <div className="shrink-0 border-t flex" style={{ borderColor: 'hsl(var(--border))' }}>
            <button className="flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors hover:bg-accent disabled:opacity-50"
              style={{ color: 'hsl(var(--brand-navy))' }}
              onClick={() => void handleCopyAllUrls()}
              disabled={allUrls.length === 0 || bulkActionLoading === "copy"}
            >
              <Copy className="w-4 h-4" /> {bulkActionLoading === "copy" ? "Copying..." : "Copy All"}
            </button>
            <div className="w-px" style={{ background: 'hsl(var(--border))' }} />
            <button className="flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors hover:bg-accent disabled:opacity-50"
              style={{ color: 'hsl(var(--brand-navy))' }}
              onClick={() => void handleDownloadAll()}
              disabled={allUrls.length === 0 || downloading}
            >
              <Download className="w-4 h-4" /> {downloading ? 'Zipping...' : 'Download All'}
            </button>
            <div className="w-px" style={{ background: 'hsl(var(--border))' }} />
            <button className="flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors hover:bg-destructive/10 disabled:opacity-50"
              style={{ color: 'hsl(var(--destructive))' }}
              disabled={!isAdmin || deleteAllLoading}
              onClick={async () => {
                if (!categoryId) return;
                const assetIds = Array.from(taggedAssetIds);
                if (assetIds.length === 0) return;

                setDeleteAllLoading(true);

                try {
                  const { error } = await supabase
                    .from("gym_asset_assignments")
                    .delete()
                    .in("asset_id", assetIds);

                  if (error) throw error;

                  await refreshAssetAssignments();
                  setExcludedGymIds(new Set());
                  toast({ description: "All gym assignments removed" });
                } catch {
                  toast({ description: "Failed to remove all gym assignments", variant: "destructive" });
                } finally {
                  setDeleteAllLoading(false);
                }
              }}
            >
              <Trash2 className="w-4 h-4" /> {deleteAllLoading ? "Deleting..." : "Delete All Gyms"}
            </button>
          </div>
        </div>

        {/* CENTER — Details & Actions */}
        <div className="w-[360px] shrink-0 border-r overflow-y-auto" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="px-4 py-3 border-b shrink-0" style={{
            background: 'hsl(var(--muted) / 0.5)',
            borderColor: 'hsl(var(--border))',
          }}>
            <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--brand-navy))' }}>
              ⚙️ Details & Actions
            </span>
          </div>

          <div className="p-4 space-y-5">
            {/* Description */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                style={{ color: 'hsl(var(--brand-navy))' }}
              >
                📝 Description
              </label>
              <Textarea
                placeholder="Describe what this theme is used for..."
                className="text-sm min-h-[80px] resize-none"
                readOnly
                style={{ background: 'hsl(var(--muted) / 0.3)' }}
              />
            </div>

            {/* Settings */}
            <div className="space-y-3">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                style={{ color: 'hsl(var(--brand-navy))' }}
              >
                ⚙️ Settings
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--muted-foreground))' }}>Theme</span>
                  <div className="px-3 py-2 rounded-lg border text-sm font-medium"
                    style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / 0.3)', color: 'hsl(var(--foreground))' }}
                  >
                    {tag.name}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--muted-foreground))' }}>Assets</span>
                  <div className="px-3 py-2 rounded-lg border text-sm font-medium"
                    style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / 0.3)', color: 'hsl(var(--foreground))' }}
                  >
                    {taggedAssetIds.size} total
                  </div>
                </div>
              </div>
            </div>

            {/* Gym Coverage List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'hsl(var(--brand-navy))' }}
                >
                  🏋️ Gym Coverage
                </label>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'hsl(var(--brand-rose-gold) / 0.15)', color: 'hsl(var(--brand-navy))' }}
                >
                  {completedCount} / {totalCount}
                </span>
              </div>

              {/* Coverage progress bar */}
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                  background: completedCount === totalCount && totalCount > 0
                    ? 'hsl(var(--brand-gold))'
                    : 'linear-gradient(90deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))',
                }} />
              </div>

              <div className="space-y-1 max-h-[280px] overflow-y-auto rounded-lg border p-1.5" style={{ borderColor: 'hsl(var(--border))' }}>
                {gyms.map(gym => {
                  const hasAsset = gymAssetMap.has(gym.id);
                  const primaryColor = gym.colors[0]?.color_hex || '#6B7280';
                  return (
                    <div key={gym.id} className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors",
                      hasAsset ? "hover:bg-accent" : "opacity-50"
                    )} style={hasAsset ? { background: `${primaryColor}08` } : {}}>
                      <Checkbox checked={hasAsset} disabled className="shrink-0" />
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {gym.code}
                      </span>
                      <span className="text-xs truncate flex-1" style={{ color: 'hsl(var(--foreground))' }}>{gym.name}</span>
                      {hasAsset ? (
                        <Check className="w-3 h-3 shrink-0" style={{ color: 'hsl(142 76% 36%)' }} />
                      ) : (
                        <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: 'hsl(32 95% 44%)' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Synced status */}
            <div className="flex items-center justify-center gap-2 py-2 rounded-lg"
              style={{ background: completedCount === totalCount && totalCount > 0 ? 'hsl(142 76% 36% / 0.1)' : 'hsl(32 95% 44% / 0.1)' }}
            >
              {completedCount === totalCount && totalCount > 0 ? (
                <span className="text-xs font-bold" style={{ color: 'hsl(142 76% 36%)' }}>
                  ✅ {completedCount} synced
                </span>
              ) : (
                <span className="text-xs font-bold" style={{ color: 'hsl(32 95% 44%)' }}>
                  ⚠️ {totalCount - completedCount} missing
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Communication */}
        <div className="w-[360px] shrink-0 flex flex-col overflow-hidden" style={{ background: 'hsl(var(--muted) / 0.15)' }}>
          <div className="px-4 py-3 border-b shrink-0" style={{
            background: 'hsl(var(--muted) / 0.5)',
            borderColor: 'hsl(var(--border))',
          }}>
            <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--brand-navy))' }}>
              💬 Communication
            </span>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {comments.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  No activity yet. Add a comment to start the conversation.
                </p>
              </div>
            )}
            {comments.map(c => (
              <div key={c.id} className="text-xs p-3 rounded-lg border" style={{
                borderColor: 'hsl(var(--border))',
                background: 'hsl(var(--background))',
              }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold" style={{ color: 'hsl(var(--brand-navy))' }}>
                    {c.user_id.slice(0, 8)}...
                  </span>
                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                  </span>
                </div>
                <p style={{ color: 'hsl(var(--foreground))' }}>{c.content}</p>
              </div>
            ))}
          </div>

          {/* Comment input */}
          <div className="shrink-0 p-3 border-t flex gap-2" style={{ borderColor: 'hsl(var(--border))' }}>
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment... (type @ to tag a gym)"
              className="text-sm h-10"
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <Button size="sm" variant="outline" onClick={handleAddComment}
              disabled={!commentText.trim()} className="h-10 px-3"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeDetail;
