import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Plan = 'free' | 'starter' | 'pro' | 'year' | 'lifetime' | 'trial';

const FREE_DOC_LIMIT = 3;           // Anonymous users
const REGISTERED_FREE_DOC_LIMIT = 5; // Registered free users
const FREE_QUESTION_LIMIT = 10;

const PAID_PLANS: Plan[] = ['pro', 'year', 'lifetime', 'trial'];

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
  chatMessageCount: number; // for soft registration popup trigger

  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setPlan: (plan: Plan) => void;
  setScanCount: (count: number) => void;
  setScanLimit: (limit: number) => void;
  setDailyQuestions: (count: number) => void;
  incrementChatMessageCount: () => void;
  canUpload: () => boolean;
  canAskQuestion: () => boolean;
  shouldShowRegistration: () => boolean;
  fetchDailyQuestions: () => Promise<void>;
  reset: () => void;
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
    set((state) => ({
      plan,
      scanLimit: PAID_PLANS.includes(plan) ? Infinity : (state.isAnonymous ? FREE_DOC_LIMIT : REGISTERED_FREE_DOC_LIMIT),
    })),

  setScanCount: (scanCount) => set({ scanCount }),
  setScanLimit: (scanLimit) => set({ scanLimit }),
  setDailyQuestions: (dailyQuestions) => set({ dailyQuestions }),

  incrementChatMessageCount: () =>
    set((state) => ({ chatMessageCount: state.chatMessageCount + 1 })),

  canUpload: () => {
    const { plan, scanCount, isAnonymous } = get();
    if (PAID_PLANS.includes(plan)) return true;
    const limit = isAnonymous ? FREE_DOC_LIMIT : REGISTERED_FREE_DOC_LIMIT;
    return scanCount < limit;
  },

  canAskQuestion: () => {
    const { plan, dailyQuestions } = get();
    if (PAID_PLANS.includes(plan)) return true;
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
    }),
}));

export { FREE_DOC_LIMIT, REGISTERED_FREE_DOC_LIMIT, FREE_QUESTION_LIMIT };
