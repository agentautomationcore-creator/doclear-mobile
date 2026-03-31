import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * App cache for non-sensitive data.
 * Auth tokens go to expo-secure-store, NOT here.
 *
 * Uses AsyncStorage as fallback (MMKV requires native module that may not be available).
 * Used for: locale, theme, AI consent flag, onboarding flag,
 * anonymous_user_id (for migration), cached preferences.
 */

// Keys
export const MMKV_KEYS = {
  LOCALE: 'locale',
  THEME: 'theme',
  AI_CONSENT: 'ai_consent_accepted',
  ONBOARDING_DONE: 'onboarding_done',
  ANONYMOUS_USER_ID: 'anonymous_user_id',
  LAST_SYNC_AT: 'last_sync_at',
} as const;

// In-memory cache for sync access
const memoryCache = new Map<string, string>();

// Typed helpers — sync API backed by in-memory cache, persisted to AsyncStorage
export const mmkvStorage = {
  getString: (key: string): string | undefined => memoryCache.get(key),
  setString: (key: string, value: string): void => {
    memoryCache.set(key, value);
    AsyncStorage.setItem(`mmkv_${key}`, value).catch(() => {});
  },
  getBoolean: (key: string): boolean => memoryCache.get(key) === 'true',
  setBoolean: (key: string, value: boolean): void => {
    memoryCache.set(key, value ? 'true' : 'false');
    AsyncStorage.setItem(`mmkv_${key}`, value ? 'true' : 'false').catch(() => {});
  },
  getNumber: (key: string): number => {
    const v = memoryCache.get(key);
    return v ? Number(v) : 0;
  },
  setNumber: (key: string, value: number): void => {
    memoryCache.set(key, String(value));
    AsyncStorage.setItem(`mmkv_${key}`, String(value)).catch(() => {});
  },
  delete: (key: string): void => {
    memoryCache.delete(key);
    AsyncStorage.removeItem(`mmkv_${key}`).catch(() => {});
  },
  clearAll: (): void => {
    memoryCache.clear();
  },
};

// Load persisted values into memory cache on startup
export async function loadMMKVCache(): Promise<void> {
  for (const key of Object.values(MMKV_KEYS)) {
    try {
      const value = await AsyncStorage.getItem(`mmkv_${key}`);
      if (value !== null) memoryCache.set(key, value);
    } catch { /* silent */ }
  }
}

/**
 * Zustand persist storage adapter.
 */
export const zustandMMKVStorage = {
  getItem: (name: string): string | null => memoryCache.get(name) ?? null,
  setItem: (name: string, value: string): void => {
    memoryCache.set(name, value);
    AsyncStorage.setItem(`mmkv_${name}`, value).catch(() => {});
  },
  removeItem: (name: string): void => {
    memoryCache.delete(name);
    AsyncStorage.removeItem(`mmkv_${name}`).catch(() => {});
  },
};
