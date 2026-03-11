import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AssetType {
  id: string;
  name: string;
  slug: string;
  order_index: number;
}

export interface AssetCategory {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  asset_type_id: string | null;
}

export interface GymAsset {
  id: string;
  filename: string;
  file_url: string;
  asset_type_id: string;
  category_id: string | null;
  is_global: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface GymAssetAssignment {
  id: string;
  asset_id: string;
  gym_id: string;
  is_main: boolean;
  created_at: string | null;
}

export interface GymAssetWithDetails extends GymAsset {
  asset_type?: AssetType;
  category?: AssetCategory;
  assignment?: GymAssetAssignment;
}

// Fetch all asset types
export const useAssetTypes = () => {
  return useQuery({
    queryKey: ['asset-types'],
    queryFn: async (): Promise<AssetType[]> => {
      const { data, error } = await supabase
        .from('asset_types')
        .select('*')
        .order('order_index');
      if (error) throw error;
      return data;
    },
  });
};

// Fetch all asset categories
export const useAssetCategories = () => {
  return useQuery({
    queryKey: ['asset-categories'],
    queryFn: async (): Promise<AssetCategory[]> => {
      const { data, error } = await supabase
        .from('asset_categories')
        .select('*')
        .order('order_index');
      if (error) throw error;
      return data;
    },
  });
};

// Fetch assets for a specific gym with full details
export const useGymAssets = (gymId: string | undefined) => {
  return useQuery({
    queryKey: ['gym-assets', gymId],
    enabled: !!gymId,
    queryFn: async (): Promise<GymAssetWithDetails[]> => {
      // Get assignments for this gym
      const { data: assignments, error: assignError } = await supabase
        .from('gym_asset_assignments')
        .select('*')
        .eq('gym_id', gymId!);
      if (assignError) throw assignError;

      // Also get global assets
      const { data: globalAssets, error: globalError } = await supabase
        .from('gym_assets')
        .select('*')
        .eq('is_global', true);
      if (globalError) throw globalError;

      // Get assigned asset IDs
      const assignedAssetIds = assignments.map(a => a.asset_id);
      
      // Get all assigned assets
      let assignedAssets: GymAsset[] = [];
      if (assignedAssetIds.length > 0) {
        const { data, error } = await supabase
          .from('gym_assets')
          .select('*')
          .in('id', assignedAssetIds);
        if (error) throw error;
        assignedAssets = data;
      }

      // Merge: assigned assets + global assets not already assigned
      const allAssetIds = new Set(assignedAssets.map(a => a.id));
      const extraGlobals = globalAssets.filter(g => !allAssetIds.has(g.id));
      const allAssets = [...assignedAssets, ...extraGlobals];

      // Fetch types and categories
      const { data: types, error: typesError } = await supabase
        .from('asset_types')
        .select('*');
      if (typesError) throw typesError;

      const { data: categories, error: catError } = await supabase
        .from('asset_categories')
        .select('*');
      if (catError) throw catError;

      const typeMap = new Map(types.map(t => [t.id, t]));
      const catMap = new Map(categories.map(c => [c.id, c]));
      const assignMap = new Map(assignments.map(a => [a.asset_id, a]));

      return allAssets.map(asset => ({
        ...asset,
        asset_type: typeMap.get(asset.asset_type_id),
        category: asset.category_id ? catMap.get(asset.category_id) : undefined,
        assignment: assignMap.get(asset.id),
      }));
    },
  });
};
