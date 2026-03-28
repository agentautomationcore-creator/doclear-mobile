import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';
import it from './locales/it.json';
import de from './locales/de.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import tr from './locales/tr.json';
import zh from './locales/zh.json';

const RTL_LANGUAGES = ['ar'];
const LANGUAGE_STORAGE_KEY = 'doclear_language';

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'ru', 'de', 'es', 'it', 'ar', 'pt', 'tr', 'zh'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ru: { translation: ru },
  ar: { translation: ar },
  it: { translation: it },
  de: { translation: de },
  es: { translation: es },
  pt: { translation: pt },
  tr: { translation: tr },
  zh: { translation: zh },
};

function getDeviceLanguage(): string {
  try {
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const code = locales[0].languageCode;
      if (code && code in resources) {
        return code;
      }
    }
  } catch {
    // Fallback
  }
  return 'en';
}

const deviceLang = getDeviceLanguage();

// Set RTL for Arabic
if (Platform.OS !== 'web') {
  const shouldBeRTL = RTL_LANGUAGES.includes(deviceLang);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

// Load saved language from AsyncStorage (async, overrides device language)
export async function loadSavedLanguage(): Promise<string | null> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && saved in resources) {
      await setLanguage(saved);
      return saved;
    }
  } catch {
    // Fallback to device language
  }
  return null;
}

export async function setLanguage(lang: string) {
  i18n.changeLanguage(lang);

  // Persist choice
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Silent
  }

  if (Platform.OS !== 'web') {
    const shouldBeRTL = RTL_LANGUAGES.includes(lang);
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
    }
  }

  // For web: set dir attribute
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
  }
}

export default i18n;
