import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export const useAddLogoTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, kind }: { name: string; kind: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("A tag needs a name");
      const { data: rows } = await supabase
        .from("logo_tags").select("order_index").eq("kind", kind)
        .order("order_index", { ascending: false }).limit(1);
      const { error } = await supabase.from("logo_tags")
        .insert({ name: trimmed, kind, order_index: (rows?.[0]?.order_index ?? 0) + 10 });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logo-tags"] }),
  });
};

export const useRenameLogoTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, to }: { id: string; to: string }) => {
      const trimmed = to.trim();
      if (!trimmed) throw new Error("A tag needs a name");
      // Tags are joined by id, so a rename carries every file automatically -
      // nothing to migrate and nothing to strand.
      const { error } = await supabase.from("logo_tags").update({ name: trimmed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logo-tags"] });
      qc.invalidateQueries({ queryKey: ["gyms"] });
    },
  });
};

/** Deleting a tag drops the label, never the file. */
export const useDeleteLogoTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("logo_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logo-tags"] });
      qc.invalidateQueries({ queryKey: ["gyms"] });
    },
  });
};

/** Put a tag on one logo, or take it off. */
export const useToggleLogoTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ logoId, tagId, on }: { logoId: string; tagId: string; on: boolean }) => {
      if (on) {
        const { error } = await supabase.from("gym_logo_tags").insert({ logo_id: logoId, tag_id: tagId });
        if (error && !String(error.message).includes("duplicate")) throw error;
      } else {
        const { error } = await supabase.from("gym_logo_tags")
          .delete().eq("logo_id", logoId).eq("tag_id", tagId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gyms"] }),
  });
};

/** Put one tag on many logos at once, or take it off all of them. */
export const useBulkToggleLogoTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ logoIds, tagId, on }: { logoIds: string[]; tagId: string; on: boolean }) => {
      if (logoIds.length === 0) return;
      if (on) {
        // upsert, so re-applying a tag some of them already carry is not an error
        const { error } = await supabase
          .from("gym_logo_tags")
          .upsert(logoIds.map(id => ({ logo_id: id, tag_id: tagId })), {
            onConflict: "logo_id,tag_id", ignoreDuplicates: true,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("gym_logo_tags").delete().eq("tag_id", tagId).in("logo_id", logoIds);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gyms"] }),
  });
};
