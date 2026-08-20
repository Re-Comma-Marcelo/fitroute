import { useEffect, useState } from "react";
import { supabase, assertSupabaseConfigured } from "@/integrations/supabase/client";


export interface AuthUser {
  id: string;
  email: string | undefined;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        assertSupabaseConfigured();
        const {
          data: { user: supabaseUser },
        } = await supabase.auth.getUser();
        if (mounted) {
          setUser(
            supabaseUser
              ? {
                  id: supabaseUser.id,
                  email: supabaseUser.email,
                }
              : null,
          );
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }


    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(
        session?.user
          ? {
              id: session.user.id,
              email: session.user.email,
            }
          : null,
      );
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
