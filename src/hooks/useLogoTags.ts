import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LogoTag {
  id: string;
  name: string;
  /** Shape | Background | Size | Style - groups the filter row into headings. */
  kind: string;
  order_index: number;
}

export const useLogoTags = () =>
  useQuery({
    queryKey: ["logo-tags"],
    queryFn: async (): Promise<LogoTag[]> => {
      const { data, error } = await supabase
        .from("logo_tags")
        .select("*")
        .order("kind")
        .order("order_index");
      if (error) throw error;
      return (data || []) as LogoTag[];
    },
  });
