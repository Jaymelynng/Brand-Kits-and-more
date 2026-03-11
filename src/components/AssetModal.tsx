import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGyms, GymWithColors } from "@/hooks/useGyms";
import { useAssetTypes } from "@/hooks/useAssets";
import { useThemeTags, useAssetThemeTags, useCreateThemeTag, useToggleAssetThemeTag } from "@/hooks/useThemeTags";
import { useAssetComments, useAddAssetComment } from "@/hooks/useAssetComments";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2, Download, Plus, Check, AlertTriangle, X, MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import JSZip from "jszip";

interface AssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string | null;
}

interface GymAssignmentRow {
  gym: GymWithColors;
  assignmentId?: string;
  fileUrl: string;
  isAssigned: boolean;
}

const AssetModal = ({ open, onOpenChange, assetId }: AssetModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { data: gyms = [] } = useGyms();
  const { data: assetTypes = [] } = useAssetTypes();
  const { data: themeTags = [] } = useThemeTags();
  const { data: assetThemeTags = [] } = useAssetThemeTags(assetId || undefined);
  const { data: comments = [] } = useAssetComments(assetId || undefined);
  const createTagMutation = useCreateThemeTag();
  const toggleTagMutation = useToggleAssetThemeTag();
  const addCommentMutation = useAddAssetComment();

  const [assetName, setAssetName] = useState("");
  const [assetDescription, setAssetDescription] = useState("");
  const [assetTypeId, setAssetTypeId] = useState("");
  const [isAllGyms, setIsAllGyms] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [gymUrls, setGymUrls] = useState<Record<string, string>>({});
  const [gymAssigned, setGymAssigned] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Load asset data when modal opens
  const loadAssetData = async () => {
    if (!assetId || isLoaded) return;
    
    const { data: asset } = await supabase
      .from('gym_assets')
      .select('*')
      .eq('id', assetId)
      .single();
    
    if (asset) {
      setAssetName(asset.filename);
      setAssetDescription((asset as any).description || "");
      setAssetTypeId(asset.asset_type_id);
      setIsAllGyms((asset as any).is_all_gyms || false);
    }

    const { data: assignments } = await supabase
      .from('gym_asset_assignments')
      .select('*')
      .eq('asset_id', assetId);

    if (assignments) {
      const urls: Record<string, string> = {};
      const assigned: Record<string, boolean> = {};
      assignments.forEach((a: any) => {
        urls[a.gym_id] = a.file_url || "";
        assigned[a.gym_id] = true;
      });
      setGymUrls(urls);
      setGymAssigned(assigned);
    }
    
    setIsLoaded(true);
  };

  // Reset state when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIsLoaded(false);
      setAssetName("");
      setAssetDescription("");
      setAssetTypeId("");
      setIsAllGyms(false);
      setGymUrls({});
      setGymAssigned({});
      setNewTagName("");
      setCommentText("");
    }
    onOpenChange(newOpen);
  };

  // Load when open changes
  if (open && assetId && !isLoaded) {
    loadAssetData();
  }

  const selectedTagIds = new Set(assetThemeTags.map(att => att.theme_tag_id));

  const gymRows: GymAssignmentRow[] = useMemo(() => {
    return gyms.map(gym => ({
      gym,
      fileUrl: gymUrls[gym.id] || "",
      isAssigned: gymAssigned[gym.id] || false,
    }));
  }, [gyms, gymUrls, gymAssigned]);

  const handleSaveAsset = async () => {
    if (!assetId) return;
    const { error } = await supabase
      .from('gym_assets')
      .update({
        filename: assetName,
        description: assetDescription,
        asset_type_id: assetTypeId,
        is_all_gyms: isAllGyms,
      } as any)
      .eq('id', assetId);
    if (error) {
      toast({ description: "Failed to save", variant: "destructive" });
    } else {
      toast({ description: "Asset saved!" });
      queryClient.invalidateQueries({ queryKey: ['gym-assets'] });
      queryClient.invalidateQueries({ queryKey: ['all-assets-with-assignments'] });
    }
  };

  const handleUpdateGymUrl = async (gymId: string, url: string) => {
    setGymUrls(prev => ({ ...prev, [gymId]: url }));
    if (!assetId) return;
    
    // Upsert assignment
    if (gymAssigned[gymId]) {
      await supabase
        .from('gym_asset_assignments')
        .update({ file_url: url } as any)
        .eq('asset_id', assetId)
        .eq('gym_id', gymId);
    }
  };

  const handleToggleGym = async (gymId: string, checked: boolean) => {
    if (!assetId) return;
    setGymAssigned(prev => ({ ...prev, [gymId]: checked }));
    
    if (checked) {
      await supabase
        .from('gym_asset_assignments')
        .insert({ asset_id: assetId, gym_id: gymId, file_url: gymUrls[gymId] || "" } as any);
    } else {
      await supabase
        .from('gym_asset_assignments')
        .delete()
        .eq('asset_id', assetId)
        .eq('gym_id', gymId);
    }
    queryClient.invalidateQueries({ queryKey: ['gym-assets'] });
    queryClient.invalidateQueries({ queryKey: ['all-assets-with-assignments'] });
  };

  const handleRemoveGym = async (gymId: string) => {
    await handleToggleGym(gymId, false);
    setGymUrls(prev => {
      const next = { ...prev };
      delete next[gymId];
      return next;
    });
  };

  const handleCopyAllUrls = () => {
    const urls = gymRows.filter(r => r.isAssigned && r.fileUrl).map(r => r.fileUrl);
    navigator.clipboard.writeText(urls.join('\n'));
    toast({ description: `${urls.length} URL(s) copied!` });
  };

  const handleDownloadAll = async () => {
    const assigned = gymRows.filter(r => r.isAssigned && r.fileUrl);
    if (assigned.length === 0) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      await Promise.all(assigned.map(async (row) => {
        try {
          const res = await fetch(row.fileUrl);
          const blob = await res.blob();
          const ext = row.fileUrl.split('.').pop()?.split('?')[0] || 'png';
          zip.file(`${row.gym.code}_${assetName || 'asset'}.${ext}`, blob);
        } catch {}
      }));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${assetName || 'asset'}_all_gyms.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ description: "ZIP downloaded!" });
    } catch {
      toast({ description: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteAllGyms = async () => {
    if (!assetId) return;
    await supabase
      .from('gym_asset_assignments')
      .delete()
      .eq('asset_id', assetId);
    setGymAssigned({});
    setGymUrls({});
    queryClient.invalidateQueries({ queryKey: ['gym-assets'] });
    toast({ description: "All gym assignments removed" });
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await createTagMutation.mutateAsync(newTagName.trim());
      setNewTagName("");
      toast({ description: `Tag "${newTagName.trim()}" created!` });
    } catch {
      toast({ description: "Failed to create tag", variant: "destructive" });
    }
  };

  const handleToggleTag = (tagId: string) => {
    if (!assetId) return;
    const isAdding = !selectedTagIds.has(tagId);
    toggleTagMutation.mutate({ assetId, themeTagId: tagId, isAdding });
  };

  const handleAddComment = async () => {
    if (!assetId || !user || !commentText.trim()) return;
    try {
      await addCommentMutation.mutateAsync({
        assetId,
        userId: user.id,
        content: commentText.trim(),
      });
      setCommentText("");
    } catch {
      toast({ description: "Failed to post comment", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 gap-0">
        <div className="flex flex-col h-[90vh]">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold" style={{ color: 'hsl(var(--brand-navy))' }}>
                {assetName || "Asset Details"}
              </DialogTitle>
              <Button size="sm" onClick={handleSaveAsset} disabled={!isAdmin}
                className="text-white"
                style={{ background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))' }}
              >
                Save Changes
              </Button>
            </div>
          </DialogHeader>

          {/* Two Panel Layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel - Asset Info / Gym Rows */}
            <div className="flex-1 border-r overflow-y-auto" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="px-4 py-3 border-b sticky top-0 z-10" style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}>
                <h3 className="font-semibold text-sm" style={{ color: 'hsl(var(--brand-navy))' }}>Asset Info</h3>
                <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {gymRows.filter(r => r.isAssigned).length} gym(s) assigned
                </p>
              </div>

              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {gymRows.map(row => {
                  const primaryColor = row.gym.colors[0]?.color_hex || '#6B7280';
                  const hasUrl = !!row.fileUrl;
                  
                  return (
                    <div key={row.gym.id} className={cn(
                      "px-4 py-3 flex items-center gap-3 transition-all",
                      !row.isAssigned && "opacity-50"
                    )}>
                      {/* Checkbox */}
                      <Checkbox
                        checked={row.isAssigned}
                        onCheckedChange={(c) => handleToggleGym(row.gym.id, !!c)}
                        disabled={!isAdmin}
                      />

                      {/* Gym Badge */}
                      <span className="px-2 py-1 rounded-md text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {row.gym.code}
                      </span>

                      {/* URL Input */}
                      <Input
                        value={gymUrls[row.gym.id] || ""}
                        onChange={(e) => handleUpdateGymUrl(row.gym.id, e.target.value)}
                        placeholder="Image URL..."
                        className="flex-1 text-xs h-8"
                        disabled={!row.isAssigned || !isAdmin}
                        onBlur={() => {
                          // Save on blur
                          if (row.isAssigned && assetId) {
                            supabase
                              .from('gym_asset_assignments')
                              .update({ file_url: gymUrls[row.gym.id] || "" } as any)
                              .eq('asset_id', assetId)
                              .eq('gym_id', row.gym.id);
                          }
                        }}
                      />

                      {/* Thumbnail */}
                      {hasUrl && row.isAssigned && (
                        <div className="w-8 h-8 rounded border overflow-hidden shrink-0" style={{ borderColor: 'hsl(var(--border))' }}>
                          <img src={row.fileUrl} alt="" className="w-full h-full object-contain" />
                        </div>
                      )}

                      {/* Status Badge */}
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0",
                        hasUrl && row.isAssigned
                          ? "text-emerald-700"
                          : "text-amber-700"
                      )} style={{
                        background: hasUrl && row.isAssigned
                          ? 'hsl(142 76% 36% / 0.15)'
                          : 'hsl(32 95% 44% / 0.15)'
                      }}>
                        {hasUrl && row.isAssigned ? (
                          <><Check className="w-3 h-3 inline mr-0.5" />COMPLETE</>
                        ) : (
                          <><AlertTriangle className="w-3 h-3 inline mr-0.5" />MISSING</>
                        )}
                      </span>

                      {/* Copy URL */}
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                        disabled={!hasUrl}
                        onClick={() => {
                          navigator.clipboard.writeText(row.fileUrl);
                          toast({ description: "URL copied!" });
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>

                      {/* Remove */}
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive"
                        disabled={!isAdmin}
                        onClick={() => handleRemoveGym(row.gym.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Bulk Actions */}
              <div className="sticky bottom-0 px-4 py-3 border-t flex gap-2" style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleCopyAllUrls}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy All URLs
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleDownloadAll} disabled={downloading}>
                  <Download className="w-3.5 h-3.5 mr-1" /> {downloading ? 'Zipping...' : 'Download All'}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs text-destructive" onClick={handleDeleteAllGyms} disabled={!isAdmin}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete All Gyms
                </Button>
              </div>
            </div>

            {/* Right Panel - Details & Actions */}
            <div className="w-[380px] overflow-y-auto" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
              <div className="px-4 py-3 border-b sticky top-0 z-10" style={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}>
                <h3 className="font-semibold text-sm" style={{ color: 'hsl(var(--brand-navy))' }}>Details & Actions</h3>
              </div>

              <div className="p-4 space-y-5">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Name</Label>
                  <Input value={assetName} onChange={(e) => setAssetName(e.target.value)} className="text-sm" disabled={!isAdmin} />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Description</Label>
                  <Textarea value={assetDescription} onChange={(e) => setAssetDescription(e.target.value)} className="text-sm min-h-[60px]" disabled={!isAdmin} />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Category</Label>
                  <Select value={assetTypeId} onValueChange={setAssetTypeId} disabled={!isAdmin}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Theme Tags */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Theme Tags</Label>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                    {themeTags.map(tag => (
                      <label key={tag.id} className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-accent transition-colors">
                        <Checkbox
                          checked={selectedTagIds.has(tag.id)}
                          onCheckedChange={() => handleToggleTag(tag.id)}
                          disabled={!isAdmin}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="New tag name..."
                      className="text-sm h-8"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                    />
                    <Button size="sm" variant="outline" onClick={handleCreateTag} disabled={!newTagName.trim() || !isAdmin} className="h-8">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Create
                    </Button>
                  </div>
                </div>

                {/* All Gyms Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }}>
                  <div>
                    <Label className="text-xs font-semibold">All Gyms</Label>
                    <p className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Auto-assign to every gym</p>
                  </div>
                  <Switch checked={isAllGyms} onCheckedChange={setIsAllGyms} disabled={!isAdmin} />
                </div>

                {/* Communication */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" style={{ color: 'hsl(var(--brand-navy))' }} />
                    <Label className="text-xs font-semibold">Communication</Label>
                  </div>
                  
                  <div className="space-y-2 max-h-[200px] overflow-y-auto rounded-lg border p-2" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--background))' }}>
                    {comments.length === 0 && (
                      <p className="text-xs text-center py-4" style={{ color: 'hsl(var(--muted-foreground))' }}>No comments yet</p>
                    )}
                    {comments.map(c => (
                      <div key={c.id} className="text-xs p-2 rounded-md" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                        <p className="font-medium" style={{ color: 'hsl(var(--brand-navy))' }}>
                          {c.user_id.slice(0, 8)}...
                        </p>
                        <p style={{ color: 'hsl(var(--foreground))' }}>{c.content}</p>
                        <p className="mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a note... Use @gym to mention"
                      className="text-sm h-8"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <Button size="sm" variant="outline" onClick={handleAddComment} disabled={!commentText.trim()} className="h-8">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssetModal;
