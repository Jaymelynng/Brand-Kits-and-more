import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FontPairing {
  id: string;
  gym_id: string;
  name: string;
  heading_font: string;
  heading_weight: string;
  body_font: string;
  body_weight: string;
  accent_font: string | null;
  accent_weight: string | null;
  /** A full CSS stack, so it pastes straight into an email template. */
  email_fallback: string;
  is_preferred: boolean;
  order_index: number;
  notes: string | null;
}

export const useFontPairings = (gymId?: string) =>
  useQuery({
    queryKey: ["font-pairings", gymId],
    enabled: !!gymId,
    queryFn: async (): Promise<FontPairing[]> => {
      const { data, error } = await supabase
        .from("gym_font_pairings")
        .select("*")
        .eq("gym_id", gymId!)
        .order("is_preferred", { ascending: false })
        .order("order_index");
      if (error) throw error;
      return (data || []) as FontPairing[];
    },
  });

export const useSaveFontPairing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pairing: Partial<FontPairing> & { gym_id: string }) => {
      if (pairing.id) {
        const { error } = await supabase
          .from("gym_font_pairings")
          .update(pairing)
          .eq("id", pairing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gym_font_pairings").insert(pairing as never);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["font-pairings"] }),
  });
};

export const useDeleteFontPairing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gym_font_pairings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["font-pairings"] }),
  });
};

/**
 * Marking one everyday pairing.
 *
 * The database has a partial unique index allowing a single preferred row per
 * gym, so the old one must be cleared before the new one is set - otherwise
 * the second write is rejected rather than silently winning.
 */
export const useSetPreferredPairing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gymId, id }: { gymId: string; id: string }) => {
      const { error: clearErr } = await supabase
        .from("gym_font_pairings")
        .update({ is_preferred: false })
        .eq("gym_id", gymId)
        .eq("is_preferred", true);
      if (clearErr) throw clearErr;
      const { error } = await supabase
        .from("gym_font_pairings")
        .update({ is_preferred: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["font-pairings"] }),
  });
};

/**
 * Pull the real faces from Google Fonts so a preview shows the actual type
 * rather than a description of it. Injected once per family and left in the
 * document - a stylesheet that is already there costs nothing to keep, and
 * removing it would strip the font from anything still on screen.
 */
export const useGoogleFonts = (families: string[]) => {
  const key = families.filter(Boolean).sort().join("|");
  useEffect(() => {
    if (!key) return;
    key.split("|").forEach(family => {
      const id = `gf-${family.replace(/\W+/g, "-").toLowerCase()}`;
      if (document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      // Every weight this app offers, so switching weight in the preview does
      // not silently fall back to a synthesised bold.
      link.href =
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}` +
        `:wght@300;400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
    });
  }, [key]);
};
