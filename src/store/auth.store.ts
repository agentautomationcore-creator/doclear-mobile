import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Plan = 'free' | 'trial' | 'pro' | 'year';

const FREE_DOC_LIMIT = 3;           // Anonymous + free registered (after trial)
const FREE_QUESTION_LIMIT = 10;
const TRIAL_DAYS = 7;

const PAID_PLANS: Plan[] = ['pro', 'year'];

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isLoading: boolean;
  plan: Plan;
  scanCount: number;
  scanLimit: number;
  dailyQuestions: number;
  chatMessageCount: number;
  trialStartedAt: string | null;
  trialDaysLeft: number;

  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setPlan: (plan: Plan) => void;
  setScanCount: (count: number) => void;
  setScanLimit: (limit: number) => void;
  setDailyQuestions: (count: number) => void;
  incrementChatMessageCount: () => void;
  setTrialStartedAt: (date: string | null) => void;
  canUpload: () => boolean;
  canAskQuestion: () => boolean;
  shouldShowRegistration: () => boolean;
  fetchDailyQuestions: () => Promise<void>;
  checkTrialStatus: () => Promise<void>;
  reset: () => void;
}

function calculateTrialDaysLeft(trialStartedAt: string | null): number {
  if (!trialStartedAt) return 0;
  const start = new Date(trialStartedAt);
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, TRIAL_DAYS - elapsed);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isAnonymous: false,
  isLoading: true,
  plan: 'free',
  scanCount: 0,
  scanLimit: FREE_DOC_LIMIT,
  dailyQuestions: 0,
  chatMessageCount: 0,
  trialStartedAt: null,
  trialDaysLeft: 0,

  setSession: (session) =>
    set({
      session,
      isAuthenticated: session !== null,
      isAnonymous: session?.user?.is_anonymous === true,
    }),

  setUser: (user) =>
    set({
      user,
      isAnonymous: user?.is_anonymous === true,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setPlan: (plan) =>
    set({
      plan,
      scanLimit: PAID_PLANS.includes(plan) || plan === 'trial' ? Infinity : FREE_DOC_LIMIT,
    }),

  setScanCount: (scanCount) => set({ scanCount }),
  setScanLimit: (scanLimit) => set({ scanLimit }),
  setDailyQuestions: (dailyQuestions) => set({ dailyQuestions }),

  incrementChatMessageCount: () =>
    set((state) => ({ chatMessageCount: state.chatMessageCount + 1 })),

  setTrialStartedAt: (trialStartedAt) =>
    set({
      trialStartedAt,
      trialDaysLeft: calculateTrialDaysLeft(trialStartedAt),
    }),

  canUpload: () => {
    const { plan, scanCount, user } = get();
    if (user?.email === 'review@doclear.app') return true; // Apple reviewer bypass
    if (PAID_PLANS.includes(plan) || plan === 'trial') return true;
    return scanCount < FREE_DOC_LIMIT;
  },

  canAskQuestion: () => {
    const { plan, dailyQuestions, user } = get();
    if (user?.email === 'review@doclear.app') return true; // Apple reviewer bypass
    if (PAID_PLANS.includes(plan) || plan === 'trial') return true;
    return dailyQuestions < FREE_QUESTION_LIMIT;
  },

  shouldShowRegistration: () => {
    const { isAnonymous, chatMessageCount } = get();
    return isAnonymous && chatMessageCount >= 2;
  },

  fetchDailyQuestions: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('role', 'user')
        .gte('created_at', startOfDay.toISOString());

      if (!error && count !== null) {
        set({ dailyQuestions: count });
      }
    } catch {
      // Silent
    }
  },

  checkTrialStatus: async () => {
    const { user, isAnonymous } = get();
    if (!user || isAnonymous) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('trial_started_at')
        .eq('id', user.id)
        .single();

      if (data?.trial_started_at) {
        const daysLeft = calculateTrialDaysLeft(data.trial_started_at);
        set({
          trialStartedAt: data.trial_started_at,
          trialDaysLeft: daysLeft,
        });

        // If trial still active and no paid plan, set to trial
        const currentPlan = get().plan;
        if (!PAID_PLANS.includes(currentPlan)) {
          if (daysLeft > 0) {
            set({ plan: 'trial', scanLimit: Infinity });
          } else {
            set({ plan: 'free', scanLimit: FREE_DOC_LIMIT });
          }
        }
      } else {
        // First time registered user — start trial
        await supabase
          .from('profiles')
          .update({
            trial_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        const now = new Date().toISOString();
        set({
          trialStartedAt: now,
          trialDaysLeft: TRIAL_DAYS,
          plan: 'trial',
          scanLimit: Infinity,
        });
      }
    } catch {
      // Silent — don't block app on profile fetch failure
    }
  },

  reset: () =>
    set({
      user: null,
      session: null,
      isAuthenticated: false,
      isAnonymous: false,
      isLoading: false,
      plan: 'free',
      scanCount: 0,
      scanLimit: FREE_DOC_LIMIT,
      dailyQuestions: 0,
      chatMessageCount: 0,
      trialStartedAt: null,
      trialDaysLeft: 0,
    }),
}));

export { FREE_DOC_LIMIT, FREE_QUESTION_LIMIT, TRIAL_DAYS };
