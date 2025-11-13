import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignAsset {
  id: string;
  campaign_id: string;
  gym_id: string | null;
  file_url: string;
  filename: string;
  file_type: string;
  file_size: number | null;
  asset_category: string;
  metadata: any;
  thumbnail_url: string | null;
  created_at: string;
  gym?: {
    id: string;
    code: string;
    name: string;
  };
}

export function useCampaignAssets(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-assets', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_assets')
        .select(`
          *,
          gym:gyms(id, code, name)
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CampaignAsset[];
    },
  });
}

export function useDeleteCampaignAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, fileUrl }: { assetId: string; fileUrl: string }) => {
      // Extract filename from URL
      const urlParts = fileUrl.split('/');
      const filename = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('campaign-assets')
        .remove([filename]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('campaign_assets')
        .delete()
        .eq('id', assetId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-assets'] });
    },
  });
}
