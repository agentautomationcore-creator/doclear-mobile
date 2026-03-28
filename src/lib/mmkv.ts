import { MMKV } from 'react-native-mmkv';

/**
 * MMKV instance for non-sensitive app cache.
 * Auth tokens go to expo-secure-store, NOT here.
 *
 * Used for: locale, theme, AI consent flag, onboarding flag,
 * anonymous_user_id (for migration), cached preferences.
 */
// @ts-expect-error MMKV is a native TurboModule, type resolution works at build time
export const mmkv: InstanceType<typeof MMKV> = new MMKV({ id: 'doclear-cache' });

// Keys
export const MMKV_KEYS = {
  LOCALE: 'locale',
  THEME: 'theme',
  AI_CONSENT: 'ai_consent_accepted',
  ONBOARDING_DONE: 'onboarding_done',
  ANONYMOUS_USER_ID: 'anonymous_user_id',
  LAST_SYNC_AT: 'last_sync_at',
} as const;

// Typed helpers
export const mmkvStorage = {
  getString: (key: string): string | undefined => mmkv.getString(key),
  setString: (key: string, value: string): void => mmkv.set(key, value),
  getBoolean: (key: string): boolean => mmkv.getBoolean(key) ?? false,
  setBoolean: (key: string, value: boolean): void => mmkv.set(key, value),
  getNumber: (key: string): number => mmkv.getNumber(key) ?? 0,
  setNumber: (key: string, value: number): void => mmkv.set(key, value),
  delete: (key: string): void => mmkv.delete(key),
  clearAll: (): void => mmkv.clearAll(),
};

/**
 * Zustand persist storage adapter for MMKV.
 * Use with zustand/middleware persist().
 */
export const zustandMMKVStorage = {
  getItem: (name: string): string | null => {
    const value = mmkv.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string): void => {
    mmkv.set(name, value);
  },
  removeItem: (name: string): void => {
    mmkv.delete(name);
  },
};
