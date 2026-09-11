import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LogoCategory {
  id: string;
  name: string;
  order_index: number;
  is_protected: boolean;
}

/**
 * The one list of logo categories. The gallery chips, the upload picker and
 * the admin manager all read this - previously the gallery held its own
 * hardcoded array, which went stale the moment the categories changed and
 * silently swallowed six real uploads.
 */
export const useLogoCategories = () =>
  useQuery({
    queryKey: ["logo-categories"],
    queryFn: async (): Promise<LogoCategory[]> => {
      const { data, error } = await supabase
        .from("logo_categories")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return (data || []) as LogoCategory[];
    },
  });

export const useAddLogoCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("A category needs a name");
      // Put a new one just above Uncategorized so the catch-all stays last.
      const { data: rows } = await supabase
        .from("logo_categories")
        .select("order_index")
        .eq("is_protected", false)
        .order("order_index", { ascending: false })
        .limit(1);
      const next = (rows?.[0]?.order_index ?? 0) + 10;
      const { error } = await supabase
        .from("logo_categories")
        .insert({ name: trimmed, order_index: next });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logo-categories"] }),
  });
};

export const useRenameLogoCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, from, to }: { id: string; from: string; to: string }) => {
      const trimmed = to.trim();
      if (!trimmed) throw new Error("A category needs a name");
      const { error } = await supabase
        .from("logo_categories")
        .update({ name: trimmed })
        .eq("id", id);
      if (error) throw error;
      // Carry every file with it. A rename that leaves the logos pointing at
      // the old name is exactly the bug this table exists to prevent.
      const { error: moveErr } = await supabase
        .from("gym_logos")
        .update({ variant: trimmed })
        .eq("variant", from);
      if (moveErr) throw moveErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logo-categories"] });
      qc.invalidateQueries({ queryKey: ["gyms"] });
    },
  });
};

export const useReorderLogoCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ a, b }: { a: LogoCategory; b: LogoCategory }) => {
      const first = await supabase.from("logo_categories").update({ order_index: b.order_index }).eq("id", a.id).select('id').single();
      if (first.error) throw first.error;
      const second = await supabase.from("logo_categories").update({ order_index: a.order_index }).eq("id", b.id).select('id').single();
      if (second.error) throw new Error('The order did not finish saving. The current order has been reloaded; please try again.');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["logo-categories"] }),
  });
};

/** Deleting a category never deletes files - they fall back to Uncategorized. */
export const useDeleteLogoCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error: moveErr } = await supabase
        .from("gym_logos")
        .update({ variant: "Uncategorized" })
        .eq("variant", name);
      if (moveErr) throw moveErr;
      const { error } = await supabase.from("logo_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logo-categories"] });
      qc.invalidateQueries({ queryKey: ["gyms"] });
    },
  });
};

/** Move many logos into one category at once. */
export const useBulkSetLogoCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ logoIds, name }: { logoIds: string[]; name: string }) => {
      if (logoIds.length === 0) return;
      const { error } = await supabase
        .from("gym_logos").update({ variant: name }).in("id", logoIds);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gyms"] }),
  });
};
