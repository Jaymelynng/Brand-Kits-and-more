import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true, generation = 0, receivedEvent = false;
    let identity: string | null | undefined;
    const update = (next: Session | null) => {
      if (!active) return;
      const current = ++generation, nextIdentity = next?.user.id ?? null;
      if (identity !== undefined && identity !== nextIdentity) {
        // Do not reuse an administrator's inventory after signing out.
        void queryClient.resetQueries({ queryKey: ['gyms'] });
        queryClient.removeQueries({ queryKey: ['kit-activity'] });
        queryClient.removeQueries({ queryKey: ['admin-users'] });
      }
      identity = nextIdentity;
      setSession(next); setUser(next?.user ?? null);
      setIsAdmin(false);
      if (!next?.user) { setLoading(false); return; }
      setLoading(true);
      // Supabase callbacks must finish before starting another auth-dependent request.
      setTimeout(async () => {
        if (!active || current !== generation) return;
        try {
          const { data, error } = await supabase.from('user_roles').select('role')
            .eq('user_id', next.user.id).eq('role', 'admin').maybeSingle();
          if (active && current === generation) setIsAdmin(!error && !!data);
        } catch {
          if (active && current === generation) setIsAdmin(false);
        } finally {
          if (active && current === generation) setLoading(false);
        }
      }, 0);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      receivedEvent = true; update(next);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!receivedEvent) update(data.session);
    }).catch(() => { if (!receivedEvent) update(null); });
    return () => { active = false; generation++; subscription.unsubscribe(); };
  }, [queryClient]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };
  return { user, session, isAdmin, loading, signOut };
};
