import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AssetChannel {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

export function useAssetChannels() {
  return useQuery({
    queryKey: ['asset-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_channels')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as AssetChannel[];
    },
  });
}

export function useAssetChannelTags(assetId: string | undefined) {
  return useQuery({
    queryKey: ['asset-channel-tags', assetId],
    queryFn: async () => {
      if (!assetId) return [];
      const { data, error } = await supabase
        .from('asset_channel_tags')
        .select('channel_id')
        .eq('asset_id', assetId);
      if (error) throw error;
      return data.map(d => d.channel_id);
    },
    enabled: !!assetId,
  });
}

export function useToggleChannelTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, channelId, active }: { assetId: string; channelId: string; active: boolean }) => {
      if (active) {
        const { error } = await supabase
          .from('asset_channel_tags')
          .insert({ asset_id: assetId, channel_id: channelId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('asset_channel_tags')
          .delete()
          .eq('asset_id', assetId)
          .eq('channel_id', channelId);
        if (error) throw error;
      }
    },
    onSuccess: (_, { assetId }) => {
      queryClient.invalidateQueries({ queryKey: ['asset-channel-tags', assetId] });
      queryClient.invalidateQueries({ queryKey: ['all-assets'] });
    },
  });
}

export function useBulkSetChannelTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, channelIds }: { assetId: string; channelIds: string[] }) => {
      // Delete all existing tags
      const { error: delErr } = await supabase
        .from('asset_channel_tags')
        .delete()
        .eq('asset_id', assetId);
      if (delErr) throw delErr;

      // Insert new tags
      if (channelIds.length > 0) {
        const { error: insErr } = await supabase
          .from('asset_channel_tags')
          .insert(channelIds.map(cid => ({ asset_id: assetId, channel_id: cid })));
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_, { assetId }) => {
      queryClient.invalidateQueries({ queryKey: ['asset-channel-tags', assetId] });
      queryClient.invalidateQueries({ queryKey: ['all-assets'] });
    },
  });
}
