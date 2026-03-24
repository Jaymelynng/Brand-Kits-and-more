import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PersonalBrandColor {
  id: string;
  color_hex: string;
  color_name: string | null;
  order_index: number;
}

export interface PersonalBrandInfo {
  id: string;
  brand_name: string | null;
  tagline: string | null;
  heading_font: string | null;
  subheading_font: string | null;
  body_font: string | null;
  notes: string | null;
}

export const usePersonalBrandColors = () =>
  useQuery({
    queryKey: ["personal-brand-colors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_brand_colors")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as PersonalBrandColor[];
    },
  });

export const usePersonalBrandInfo = () =>
  useQuery({
    queryKey: ["personal-brand-info"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_brand_info")
        .select("*")
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as PersonalBrandInfo | null;
    },
  });

export const useAddPersonalColor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ color_hex, color_name, order_index }: { color_hex: string; color_name?: string; order_index: number }) => {
      const { error } = await supabase.from("personal_brand_colors").insert({ color_hex, color_name: color_name || null, order_index });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personal-brand-colors"] }),
  });
};

export const useDeletePersonalColor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personal_brand_colors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personal-brand-colors"] }),
  });
};

export const useUpdatePersonalColor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PersonalBrandColor> }) => {
      const { error } = await supabase.from("personal_brand_colors").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personal-brand-colors"] }),
  });
};

export const useUpdatePersonalBrandInfo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PersonalBrandInfo> }) => {
      const { error } = await supabase.from("personal_brand_info").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personal-brand-info"] }),
  });
};
