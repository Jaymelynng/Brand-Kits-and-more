import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AssetType {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

export function useAssetTypes() {
  return useQuery({
    queryKey: ['asset-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_types')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as AssetType[];
    },
  });
}

export function useUpdateAssetType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, typeId }: { assetId: string; typeId: string | null }) => {
      const { error } = await supabase
        .from('campaign_assets')
        .update({ asset_type_id: typeId })
        .eq('id', assetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-assets'] });
      queryClient.invalidateQueries({ queryKey: ['all-assets'] });
    },
  });
}
