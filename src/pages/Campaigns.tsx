import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCampaigns, useAddCampaign, useDeleteCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { useCampaignAssets } from "@/hooks/useCampaignAssets";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Plus, Folder, Archive, Clock, Trash2, Edit, Video, FileImage, FileText, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

const Campaigns = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: campaigns, isLoading } = useCampaigns();
  const addCampaign = useAddCampaign();
  const deleteCampaign = useDeleteCampaign();
  const updateCampaign = useUpdateCampaign();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDescription, setNewCampaignDescription] = useState("");
  const [newCampaignStatus, setNewCampaignStatus] = useState<'active' | 'upcoming' | 'archived'>('active');
  const [newCampaignThumbnail, setNewCampaignThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Filter campaigns
  const filteredCampaigns = campaigns?.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    let thumbnailUrl: string | undefined;

    // Upload thumbnail if provided
    if (newCampaignThumbnail) {
      const fileExt = newCampaignThumbnail.name.split('.').pop();
      const fileName = `${Date.now()}-${newCampaignName.replace(/\s+/g, '-')}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('campaign-assets')
        .upload(fileName, newCampaignThumbnail);
      
      if (uploadError) {
        toast.error("Failed to upload thumbnail");
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-assets')
        .getPublicUrl(fileName);
      
      thumbnailUrl = publicUrl;
    }

    await addCampaign.mutateAsync({
      name: newCampaignName,
      description: newCampaignDescription || undefined,
      status: newCampaignStatus,
      thumbnail_url: thumbnailUrl,
    });

    setIsCreateDialogOpen(false);
    setNewCampaignName("");
    setNewCampaignDescription("");
    setNewCampaignStatus('active');
    setNewCampaignThumbnail(null);
    setThumbnailPreview(null);
  };

  const handleDeleteCampaign = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This will remove all associated tags.`)) {
      await deleteCampaign.mutateAsync(id);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Sparkles className="h-3 w-3" />;
      case 'upcoming': return <Clock className="h-3 w-3" />;
      case 'archived': return <Archive className="h-3 w-3" />;
      default: return <Folder className="h-3 w-3" />;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active': return {
        badge: 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/30',
        gradient: 'from-emerald-500/20 via-teal-500/10 to-cyan-500/5'
      };
      case 'upcoming': return {
        badge: 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/30',
        gradient: 'from-blue-500/20 via-indigo-500/10 to-purple-500/5'
      };
      case 'archived': return {
        badge: 'bg-gray-500 text-white border-gray-400 shadow-lg shadow-gray-500/30',
        gradient: 'from-gray-500/20 via-slate-500/10 to-zinc-500/5'
      };
      default: return {
        badge: 'bg-gray-500 text-white border-gray-400',
        gradient: 'from-gray-500/20 to-transparent'
      };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30">
      {/* Hero Header Section */}
      <div 
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)) 0%, hsl(var(--brand-blue-gray)) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-6 py-8 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">Campaigns Hub</h1>
              <p className="text-white/80 text-lg">Manage and organize your marketing campaigns</p>
            </div>
            <Button 
              onClick={() => navigate('/')} 
              className="bg-white text-gray-800 hover:bg-white/90 shadow-md"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gyms
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div 
          className="flex flex-col sm:flex-row gap-4 mb-8 p-4 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.1), hsl(var(--brand-blue-gray) / 0.1))',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)'
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/80 border-white/50 shadow-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white/80 border-white/50 shadow-sm">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full sm:w-auto shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))',
                    boxShadow: '0 4px 15px hsl(var(--brand-rose-gold) / 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Campaign</DialogTitle>
                  <DialogDescription>
                    Add a new marketing campaign to organize your assets
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Campaign Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Gift Card 2025"
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of the campaign..."
                      value={newCampaignDescription}
                      onChange={(e) => setNewCampaignDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={newCampaignStatus} onValueChange={(val) => setNewCampaignStatus(val as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="thumbnail">Campaign Thumbnail (optional)</Label>
                    <div className="space-y-2">
                      <Input
                        id="thumbnail"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewCampaignThumbnail(file);
                            setThumbnailPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      {thumbnailPreview && (
                        <div className="relative w-full h-32 rounded-md overflow-hidden border">
                          <img 
                            src={thumbnailPreview} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCampaign} disabled={addCampaign.isPending}>
                    {addCampaign.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Campaign Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredCampaigns && filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCampaigns.map((campaign) => {
              const statusStyles = getStatusStyles(campaign.status);
              
              return (
                <Card
                  key={campaign.id}
                  className="cursor-pointer group overflow-hidden border-0 bg-white/80 backdrop-blur-sm"
                  style={{
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onClick={() => navigate(`/campaigns/${encodeURIComponent(campaign.name)}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Thumbnail Area */}
                  <div className="relative h-44 overflow-hidden">
                    {campaign.thumbnail_url ? (
                      <>
                        <img 
                          src={campaign.thumbnail_url} 
                          alt={campaign.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      </>
                    ) : (
                      <div 
                        className={`w-full h-full bg-gradient-to-br ${statusStyles.gradient} flex items-center justify-center relative`}
                        style={{
                          background: `linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.3) 0%, hsl(var(--brand-blue-gray) / 0.2) 50%, hsl(var(--brand-rose-gold) / 0.1) 100%)`
                        }}
                      >
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-4 left-4 w-16 h-16 border-2 border-current rounded-lg rotate-12" />
                          <div className="absolute bottom-4 right-4 w-12 h-12 border-2 border-current rounded-full" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-current rotate-45" />
                        </div>
                        <Folder className="h-16 w-16 text-muted-foreground/40" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      </div>
                    )}
                    
                    {/* Status Badge - Floating */}
                    <div className="absolute top-3 right-3">
                      <Badge className={`${statusStyles.badge} flex items-center gap-1 px-2 py-1`}>
                        {getStatusIcon(campaign.status)}
                        <span className="text-xs font-semibold">
                          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                        </span>
                      </Badge>
                    </div>
                    
                    {/* Delete Button */}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCampaign(campaign.id, campaign.name);
                        }}
                        className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-destructive text-white h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Campaign Name Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-xl font-bold text-white drop-shadow-lg group-hover:text-white/90 transition-colors">
                        {campaign.name}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Card Footer */}
                  <CardContent className="p-4 pt-3">
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                      {campaign.description || (
                        <span className="italic text-muted-foreground/60">Click to add assets and details</span>
                      )}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card 
            className="border-0 bg-white/60 backdrop-blur-sm"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          >
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div 
                className="h-20 w-20 rounded-2xl flex items-center justify-center mb-6"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold) / 0.2), hsl(var(--brand-blue-gray) / 0.2))',
                }}
              >
                <Folder className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-xl font-semibold text-foreground mb-2">No campaigns found</p>
              <p className="text-muted-foreground mb-6">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Create your first campaign to get started"}
              </p>
              {isAdmin && !searchQuery && statusFilter === "all" && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--brand-rose-gold)), hsl(var(--brand-blue-gray)))',
                    boxShadow: '0 4px 15px hsl(var(--brand-rose-gold) / 0.4)'
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Campaigns;
