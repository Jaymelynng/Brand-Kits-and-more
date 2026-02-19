import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CampaignAsset } from "@/hooks/useCampaignAssets";

export interface AllAssetsFilters {
  search?: string;
  assetTypeId?: string;
  channelId?: string;
  campaignId?: string;
  gymId?: string;
}

export function useAllAssets(filters: AllAssetsFilters) {
  return useQuery({
    queryKey: ['all-assets', filters],
    queryFn: async () => {
      let query = supabase
        .from('campaign_assets')
        .select(`
          *,
          gym:gyms(id, code, name),
          campaign:campaigns(id, name, status)
        `)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.ilike('filename', `%${filters.search}%`);
      }
      if (filters.assetTypeId) {
        query = query.eq('asset_type_id', filters.assetTypeId);
      }
      if (filters.campaignId) {
        query = query.eq('campaign_id', filters.campaignId);
      }
      if (filters.gymId) {
        query = query.eq('gym_id', filters.gymId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data as (CampaignAsset & { campaign?: { id: string; name: string; status: string } })[];

      // Channel filter requires a subquery
      if (filters.channelId) {
        const { data: taggedAssets, error: tagErr } = await supabase
          .from('asset_channel_tags')
          .select('asset_id')
          .eq('channel_id', filters.channelId);
        if (tagErr) throw tagErr;
        const taggedIds = new Set(taggedAssets.map(t => t.asset_id));
        results = results.filter(a => taggedIds.has(a.id));
      }

      return results;
    },
  });
}
