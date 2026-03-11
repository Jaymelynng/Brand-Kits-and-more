import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AssetComment {
  id: string;
  asset_id: string;
  user_id: string;
  gym_mention_id: string | null;
  content: string;
  created_at: string | null;
  user_email?: string;
  gym_mention_code?: string;
}

export const useAssetComments = (assetId: string | undefined) => {
  return useQuery({
    queryKey: ['asset-comments', assetId],
    enabled: !!assetId,
    queryFn: async (): Promise<AssetComment[]> => {
      const { data, error } = await supabase
        .from('asset_comments')
        .select('*')
        .eq('asset_id', assetId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

export const useAddAssetComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, userId, content, gymMentionId }: {
      assetId: string;
      userId: string;
      content: string;
      gymMentionId?: string;
    }) => {
      const { data, error } = await supabase
        .from('asset_comments')
        .insert({
          asset_id: assetId,
          user_id: userId,
          content,
          gym_mention_id: gymMentionId || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['asset-comments', vars.assetId] });
    },
  });
};
