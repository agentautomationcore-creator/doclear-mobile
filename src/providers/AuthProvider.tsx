import React, { useEffect, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
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
  } catch (e) {
    if (__DEV__) console.error('[AuthProvider] profile load error:', e);
  }

  // Check trial status for registered (non-anonymous) users
  store.checkTrialStatus().catch(() => {});

  // Fetch daily question count
  store.fetchDailyQuestions().catch(() => {});
}

// DS5: Anonymous account creation is rate-limited server-side via /api/auth/anonymous
// (max 5 accounts/hour per IP). Client calls this endpoint before signInAnonymously.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://doclear.app/api';

async function checkAnonymousRateLimit(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/anonymous`, { method: 'POST' });
    return res.status !== 429;
  } catch {
    return true; // Network error — allow fallback
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        // No session — create anonymous user (rate-limited by server)
        const allowed = await checkAnonymousRateLimit();
        if (allowed) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (!error && data?.user) {
            setUser(data.user);
            loadUserProfile(data.user.id);
          }
        }
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

    // RevenueCat: listen for subscription changes (cancellation, renewal)
    let rcListenerRemover: (() => void) | undefined;
    if (Platform.OS !== 'web') {
      import('react-native-purchases')
        .then(({ default: Purchases }) => {
          // @ts-ignore — RevenueCat types say void but actually returns remover
          rcListenerRemover = Purchases.addCustomerInfoUpdateListener((info: any) => {
            const entitlements = info?.entitlements?.active;
            const isPro = entitlements?.pro || entitlements?.premium;
            useAuthStore.getState().setPlan(isPro ? 'pro' : 'free');
          });
        })
        .catch(() => {});
    }

    // AppState: re-check subscription when app comes to foreground
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && Platform.OS !== 'web') {
        import('react-native-purchases')
          .then(({ default: Purchases }) => Purchases.getCustomerInfo())
          .then((info: any) => {
            const entitlements = info?.entitlements?.active;
            const isPro = entitlements?.pro || entitlements?.premium;
            useAuthStore.getState().setPlan(isPro ? 'pro' : 'free');
          })
          .catch(() => {});
      }
    });

    return () => {
      subscription.unsubscribe();
      rcListenerRemover?.();
      appStateSubscription.remove();
    };
  }, [setSession, setUser, setLoading]);

  return <>{children}</>;
}
