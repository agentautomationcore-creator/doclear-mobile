import { create } from 'zustand';
import type { Locale } from '../types';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  locale: Locale;
  onboardingDone: boolean;
  theme: Theme;

  setLocale: (locale: Locale) => void;
  setOnboardingDone: (done: boolean) => void;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIState>((set) => ({
  locale: 'en',
  onboardingDone: false,
  theme: 'light',

  setLocale: (locale) => set({ locale }),
  setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
  setTheme: (theme) => set({ theme }),
}));
