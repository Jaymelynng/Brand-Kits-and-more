import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCampaigns, useAddCampaign, useDeleteCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Plus, Folder, Archive, Clock, Trash2, Edit } from "lucide-react";
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

    await addCampaign.mutateAsync({
      name: newCampaignName,
      description: newCampaignDescription || undefined,
      status: newCampaignStatus,
    });

    setIsCreateDialogOpen(false);
    setNewCampaignName("");
    setNewCampaignDescription("");
    setNewCampaignStatus('active');
  };

  const handleDeleteCampaign = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This will remove all associated tags.`)) {
      await deleteCampaign.mutateAsync(id);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Folder className="h-4 w-4" />;
      case 'upcoming': return <Clock className="h-4 w-4" />;
      case 'archived': return <Archive className="h-4 w-4" />;
      default: return <Folder className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'upcoming': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'archived': return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Campaigns Hub</h1>
              <p className="text-muted-foreground">Manage and organize your marketing campaigns</p>
            </div>
            <Button onClick={() => navigate('/')} variant="outline">
              Back to Gyms
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
                  <Button className="w-full sm:w-auto">
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
        </div>

        {/* Campaign Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCampaigns && filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <Card
                key={campaign.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 group"
                onClick={() => navigate(`/campaigns/${encodeURIComponent(campaign.name)}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
                        {getStatusIcon(campaign.status)}
                        {campaign.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {campaign.description || "No description"}
                      </CardDescription>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCampaign(campaign.id, campaign.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Badge className={getStatusColor(campaign.status)}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Folder className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold text-foreground mb-2">No campaigns found</p>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Create your first campaign to get started"}
              </p>
              {isAdmin && !searchQuery && statusFilter === "all" && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
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
