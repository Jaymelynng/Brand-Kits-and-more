import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { readAllPages } from '@/lib/queryPages';
import type { InventorySnapshot } from '@/lib/inventory';

export function useInventory() {
  return useQuery({ queryKey: ['admin-inventory'], queryFn: async (): Promise<InventorySnapshot> => {
    const [logos, elements, assets, assignments, categories] = await Promise.all([
      readAllPages<Tables<'gym_logos'>>((a, b) => supabase.from('gym_logos').select('*').order('id').range(a, b)),
      readAllPages<Tables<'gym_elements'>>((a, b) => supabase.from('gym_elements').select('*').order('id').range(a, b)),
      readAllPages<Tables<'gym_assets'>>((a, b) => supabase.from('gym_assets').select('*').order('id').range(a, b)),
      readAllPages<Tables<'gym_asset_assignments'>>((a, b) => supabase.from('gym_asset_assignments').select('*').order('id').range(a, b)),
      readAllPages<Tables<'asset_categories'>>((a, b) => supabase.from('asset_categories').select('*').order('id').range(a, b)),
    ]);
    return { logos, elements, assets, assignments, categories };
  } });
}
