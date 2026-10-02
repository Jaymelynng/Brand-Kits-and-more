import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
export type VariationGallery = Tables<'variation_galleries'>;
export type VariationAsset = Tables<'variation_assets'>;
export type GalleryItem = Tables<'variation_gallery_items'> & { asset: VariationAsset };
export function useVariationGalleries(gymId?: string, admin = false) {
  return useQuery({ queryKey: ['variation-galleries', gymId, admin], enabled: !!gymId,
    queryFn: async () => {
      let query = supabase.from('variation_galleries').select('*').eq('gym_id', gymId!).order('created_at', { ascending: false });
      if (!admin) query = query.eq('is_published', true);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    } });
}
export function useGalleryItems(galleryId?: string, admin = false) {
  return useQuery({ queryKey: ['variation-items', galleryId, admin], enabled: !!galleryId,
    queryFn: async (): Promise<GalleryItem[]> => {
      const all: GalleryItem[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('variation_gallery_items').select('*, asset:variation_assets(*)')
          .eq('gallery_id', galleryId!).order('sort_order').order('asset_id').range(offset, offset + 499);
        if (error) throw error;
        all.push(...data);
        if (data.length < 500) return all;
      }
    } });
}
export const galleryPath = (code: string, slug: string, solo = true) =>
  `/${solo ? 'kit' : 'gym'}/${encodeURIComponent(code)}/variations/${encodeURIComponent(slug)}`;
