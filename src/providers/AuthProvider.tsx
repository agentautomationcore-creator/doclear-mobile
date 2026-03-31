import React, { useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth.store';
import type { Plan } from '../store/auth.store';

interface AuthProviderProps {
  children: ReactNode;
}

async function loadUserProfile(userId: string) {
  const store = useAuthStore.getState();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('plan, scan_count')
      .eq('id', userId)
      .single();

    if (!error && data) {
      store.setPlan((data.plan as Plan) ?? 'free');
      store.setScanCount(data.scan_count ?? 0);
    }
  } catch {
    // Profile not found — keep defaults
  }

  // Check trial status for registered (non-anonymous) users
  store.checkTrialStatus().catch(() => {});

  // Fetch daily question count
  store.fetchDailyQuestions().catch(() => {});
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadUserProfile(session.user.id);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        // Logged out — reset
        useAuthStore.getState().reset();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, setUser, setLoading]);

  return <>{children}</>;
}
