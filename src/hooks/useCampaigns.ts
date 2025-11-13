import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'upcoming' | 'archived';
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignTag {
  id: string;
  campaign_id: string;
  asset_type: 'logo' | 'element';
  asset_id: string;
  created_at: string;
}

export interface CampaignAsset {
  id: string;
  campaign_id: string;
  asset_type: 'logo' | 'element';
  asset_id: string;
  gym_id: string;
  gym_code: string;
  gym_name: string;
  file_url?: string;
  filename?: string;
  element_type?: string;
  element_color?: string;
  svg_data?: string;
}

// Fetch all campaigns
export const useCampaigns = () => {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
  });
};

// Fetch single campaign with all its assets
export const useCampaign = (campaignName: string) => {
  return useQuery({
    queryKey: ["campaign", campaignName],
    queryFn: async () => {
      // First get the campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("name", campaignName)
        .single();

      if (campaignError) throw campaignError;

      // Get all tags for this campaign
      const { data: tags, error: tagsError } = await supabase
        .from("campaign_tags")
        .select("*")
        .eq("campaign_id", campaign.id);

      if (tagsError) throw tagsError;

      // Separate logo and element tags
      const logoTags = tags.filter(t => t.asset_type === 'logo');
      const elementTags = tags.filter(t => t.asset_type === 'element');

      // Fetch logos with gym info
      const logoAssets: CampaignAsset[] = [];
      if (logoTags.length > 0) {
        const { data: logos, error: logosError } = await supabase
          .from("gym_logos")
          .select("*, gyms(id, code, name)")
          .in("id", logoTags.map(t => t.asset_id));

        if (logosError) throw logosError;

        logoAssets.push(...logos.map(logo => ({
          id: logo.id,
          campaign_id: campaign.id,
          asset_type: 'logo' as const,
          asset_id: logo.id,
          gym_id: (logo.gyms as any).id,
          gym_code: (logo.gyms as any).code,
          gym_name: (logo.gyms as any).name,
          file_url: logo.file_url,
          filename: logo.filename,
        })));
      }

      // Fetch elements with gym info
      const elementAssets: CampaignAsset[] = [];
      if (elementTags.length > 0) {
        const { data: elements, error: elementsError } = await supabase
          .from("gym_elements")
          .select("*, gyms(id, code, name)")
          .in("id", elementTags.map(t => t.asset_id));

        if (elementsError) throw elementsError;

        elementAssets.push(...elements.map(element => ({
          id: element.id,
          campaign_id: campaign.id,
          asset_type: 'element' as const,
          asset_id: element.id,
          gym_id: (element.gyms as any).id,
          gym_code: (element.gyms as any).code,
          gym_name: (element.gyms as any).name,
          element_type: element.element_type,
          element_color: element.element_color,
          svg_data: element.svg_data,
        })));
      }

      return {
        campaign,
        assets: [...logoAssets, ...elementAssets],
      };
    },
    enabled: !!campaignName,
  });
};

// Create new campaign
export const useAddCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: { name: string; description?: string; status?: 'active' | 'upcoming' | 'archived'; thumbnail_url?: string }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert([campaign])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign created successfully!");
    },
    onError: (error) => {
      console.error("Error creating campaign:", error);
      toast.error("Failed to create campaign");
    },
  });
};

// Update campaign
export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Campaign> }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign"] });
      toast.success("Campaign updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating campaign:", error);
      toast.error("Failed to update campaign");
    },
  });
};

// Delete campaign
export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    },
  });
};

// Tag an asset with a campaign
export const useTagAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      assetType, 
      assetId 
    }: { 
      campaignId: string; 
      assetType: 'logo' | 'element'; 
      assetId: string;
    }) => {
      const { data, error } = await supabase
        .from("campaign_tags")
        .insert([{ campaign_id: campaignId, asset_type: assetType, asset_id: assetId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign"] });
      toast.success("Asset tagged with campaign!");
    },
    onError: (error) => {
      console.error("Error tagging asset:", error);
      toast.error("Failed to tag asset");
    },
  });
};

// Remove campaign tag from asset
export const useUntagAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, assetId }: { campaignId: string; assetId: string }) => {
      const { error } = await supabase
        .from("campaign_tags")
        .delete()
        .eq("campaign_id", campaignId)
        .eq("asset_id", assetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign"] });
      toast.success("Campaign tag removed!");
    },
    onError: (error) => {
      console.error("Error removing tag:", error);
      toast.error("Failed to remove tag");
    },
  });
};

// Get campaigns for a specific asset
export const useAssetCampaigns = (assetId: string, assetType: 'logo' | 'element') => {
  return useQuery({
    queryKey: ["asset-campaigns", assetId, assetType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_tags")
        .select("*, campaigns(*)")
        .eq("asset_id", assetId)
        .eq("asset_type", assetType);

      if (error) throw error;
      return data.map(tag => (tag.campaigns as any) as Campaign);
    },
    enabled: !!assetId,
  });
};
