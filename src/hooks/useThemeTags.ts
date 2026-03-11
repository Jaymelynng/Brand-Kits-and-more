import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ThemeTag {
  id: string;
  name: string;
  created_at: string | null;
}

export interface AssetThemeTag {
  id: string;
  asset_id: string;
  theme_tag_id: string;
  created_at: string | null;
}

export const useThemeTags = () => {
  return useQuery({
    queryKey: ['theme-tags'],
    queryFn: async (): Promise<ThemeTag[]> => {
      const { data, error } = await supabase
        .from('theme_tags')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
};

export const useAssetThemeTags = (assetId: string | undefined) => {
  return useQuery({
    queryKey: ['asset-theme-tags', assetId],
    enabled: !!assetId,
    queryFn: async (): Promise<AssetThemeTag[]> => {
      const { data, error } = await supabase
        .from('asset_theme_tags')
        .select('*')
        .eq('asset_id', assetId!);
      if (error) throw error;
      return data;
    },
  });
};

export const useAllAssetThemeTags = () => {
  return useQuery({
    queryKey: ['all-asset-theme-tags'],
    queryFn: async (): Promise<AssetThemeTag[]> => {
      const { data, error } = await supabase
        .from('asset_theme_tags')
        .select('*');
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateThemeTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('theme_tags')
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-tags'] });
    },
  });
};

export const useToggleAssetThemeTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assetId, themeTagId, isAdding }: { assetId: string; themeTagId: string; isAdding: boolean }) => {
      if (isAdding) {
        const { error } = await supabase
          .from('asset_theme_tags')
          .insert({ asset_id: assetId, theme_tag_id: themeTagId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('asset_theme_tags')
          .delete()
          .eq('asset_id', assetId)
          .eq('theme_tag_id', themeTagId);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['asset-theme-tags', vars.assetId] });
      queryClient.invalidateQueries({ queryKey: ['all-asset-theme-tags'] });
    },
  });
};
