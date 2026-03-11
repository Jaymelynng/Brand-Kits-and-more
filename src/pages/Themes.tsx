import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGyms } from "@/hooks/useGyms";
import { useThemeTags, useAllAssetThemeTags, useCreateThemeTag } from "@/hooks/useThemeTags";
import { useAllAssetsWithAssignments } from "@/hooks/useAssets";
import { ArrowLeft, Layers, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const Themes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { data: themeTags = [], isLoading: tagsLoading } = useThemeTags();
  const { data: allAssetThemeTags = [] } = useAllAssetThemeTags();
  const { data: assetData } = useAllAssetsWithAssignments();
  const { data: gyms = [] } = useGyms();
  const createTagMutation = useCreateThemeTag();

  const [showNewTheme, setShowNewTheme] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");

  const assets = assetData?.assets || [];
  const assignments = assetData?.assignments || [];

  const tagStats = useMemo(() => {
    // For each theme tag, find assets tagged with it, then find gym assignments
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

      return {
        ...tag,
        assetCount: taggedAssetIds.length,
        gymCount: uniqueGymIds.size,
      };
    });
  }, [themeTags, allAssetThemeTags, assignments]);

  const totalGyms = gyms.length;

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

  if (tagsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="text-xl" style={{ color: 'hsl(var(--brand-text-primary))' }}>Loading themes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--brand-rose-gold) / 0.15))' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 shadow-sm" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="text-center py-2 px-6 shadow-sm" style={{
          background: 'linear-gradient(to bottom, hsl(var(--brand-white)), hsl(var(--brand-rose-gold) / 0.12))',
          borderBottom: '2px solid hsl(var(--brand-rose-gold) / 0.25)'
        }}>
          <div className="flex items-center justify-center gap-3 relative">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="absolute left-0">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <Layers className="w-5 h-5" style={{ color: 'hsl(var(--brand-navy))' }} />
            <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--brand-navy))' }}>Theme Library</h1>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowNewTheme(true)} className="absolute right-0 text-white"
                style={{ background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))' }}
              >
                <Plus className="w-4 h-4 mr-1" /> New Theme
              </Button>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--brand-navy) / 0.7)' }}>
            Browse and manage assets by theme across all gyms
          </p>
        </div>
      </div>

      {/* Theme Cards Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tagStats.map(tag => {
            const coverage = totalGyms > 0 ? Math.round((tag.gymCount / totalGyms) * 100) : 0;
            const isFull = tag.gymCount === totalGyms && totalGyms > 0;

            return (
              <button
                key={tag.id}
                onClick={() => navigate(`/themes/${tag.id}`)}
                className="group text-left rounded-2xl border-2 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                style={{
                  background: 'hsl(var(--brand-white))',
                  borderColor: isFull ? 'hsl(var(--brand-gold))' : 'hsl(var(--brand-rose-gold) / 0.3)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-lg font-bold" style={{ color: 'hsl(var(--brand-navy))' }}>{tag.name}</h2>
                  <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                    style={{ color: 'hsl(var(--brand-navy))' }}
                  />
                </div>

                <div className="flex items-center gap-3 text-sm font-medium">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'hsl(var(--brand-rose-gold) / 0.15)', color: 'hsl(var(--brand-navy))' }}
                  >
                    {tag.assetCount} asset{tag.assetCount !== 1 ? 's' : ''}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: isFull ? 'hsl(var(--brand-gold) / 0.2)' : 'hsl(var(--brand-blue-gray) / 0.2)',
                      color: 'hsl(var(--brand-navy))',
                    }}
                  >
                    {tag.gymCount}/{totalGyms} gyms
                  </span>
                </div>

                {/* Coverage bar */}
                <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--brand-blue-gray) / 0.2)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${coverage}%`,
                      background: isFull ? 'hsl(var(--brand-gold))' : 'linear-gradient(90deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))',
                    }}
                  />
                </div>
              </button>
            );
          })}

          {tagStats.length === 0 && (
            <div className="col-span-full text-center py-16">
              <p className="text-lg font-medium" style={{ color: 'hsl(var(--brand-text-primary))' }}>
                No themes found. Create one to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Theme Dialog */}
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
              style={{ background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))' }}
            >
              <Plus className="w-4 h-4 mr-1" /> Create Theme
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Themes;
