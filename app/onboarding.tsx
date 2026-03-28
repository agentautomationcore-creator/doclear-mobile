import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  BackHandler,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import PagerView from 'react-native-pager-view';
import * as Haptics from 'expo-haptics';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH } from '../src/lib/constants';
import { useUIStore } from '../src/store/ui.store';
import { useAuthStore } from '../src/store/auth.store';
import { supabase } from '../src/lib/supabase';
import { Button } from '../src/components/ui/Button';
import { track } from '../src/lib/analytics';
import { mmkvStorage, MMKV_KEYS } from '../src/lib/mmkv';
import type { Locale, CountryCode, ImmigrationStatus } from '../src/types';
import { LOCALE_NAMES, COUNTRY_NAMES, COUNTRY_FLAGS } from '../src/types';

const TOTAL_STEPS = 5;

const LANGUAGES: Locale[] = ['fr', 'en', 'ru', 'de', 'es', 'it', 'ar', 'pt', 'tr', 'zh'];
const COUNTRIES: CountryCode[] = ['FR', 'DE', 'IT', 'ES', 'GB', 'NL', 'BE', 'CH', 'AT', 'PT', 'RU', 'TR', 'MA', 'AE', 'SA', 'CN', 'OTHER'];

const STATUS_OPTIONS: { key: ImmigrationStatus; labelKey: string }[] = [
  { key: 'citizen', labelKey: 'onboarding.status_citizen' },
  { key: 'eu_citizen', labelKey: 'onboarding.status_eu_citizen' },
  { key: 'residence_permit', labelKey: 'onboarding.status_residence_permit' },
  { key: 'work_permit', labelKey: 'onboarding.status_work_permit' },
  { key: 'student', labelKey: 'onboarding.status_student' },
  { key: 'tourist', labelKey: 'onboarding.status_tourist' },
  { key: 'family_reunion', labelKey: 'onboarding.status_family_reunion' },
  { key: 'pending', labelKey: 'onboarding.status_pending' },
];

const USE_CASES = [
  { key: 'study', icon: 'S' },
  { key: 'work', icon: 'W' },
  { key: 'personal', icon: 'P' },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setOnboardingDone = useUIStore((s) => s.setOnboardingDone);
  const setLocale = useUIStore((s) => s.setLocale);
  const pagerRef = useRef<PagerView>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState<Locale>('fr');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('FR');
  const [selectedStatus, setSelectedStatus] = useState<ImmigrationStatus>('citizen');
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);

  // Android back button: go to previous step
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentStep > 0) {
        pagerRef.current?.setPage(currentStep - 1);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [currentStep]);

  const goNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < TOTAL_STEPS - 1) {
      pagerRef.current?.setPage(currentStep + 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    mmkvStorage.setBoolean(MMKV_KEYS.ONBOARDING_DONE, true);
    setOnboardingDone(true);

    // Save to Supabase profile
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      await supabase.from('profiles').update({
        language: selectedLang,
        country: selectedCountry,
        status: selectedStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    }

    // Set app language
    const { setLanguage } = await import('../src/i18n');
    await setLanguage(selectedLang);
    setLocale(selectedLang);

    track('onboarding_completed', {
      language: selectedLang,
      country: selectedCountry,
      status: selectedStatus,
      useCase: selectedUseCase,
    });

    router.replace('/(tabs)');
  }, [router, setOnboardingDone, setLocale, selectedLang, selectedCountry, selectedStatus, selectedUseCase]);

  const handleSkip = useCallback(async () => {
    mmkvStorage.setBoolean(MMKV_KEYS.ONBOARDING_DONE, true);
    setOnboardingDone(true);
    track('onboarding_skipped', { step: currentStep });
    router.replace('/(tabs)');
  }, [router, setOnboardingDone, currentStep]);

  const handleLanguageSelect = useCallback(async (lang: Locale) => {
    setSelectedLang(lang);
    const { setLanguage } = await import('../src/i18n');
    await setLanguage(lang);
    setLocale(lang);
  }, [setLocale]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Progress bar */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingTop: 12, gap: 6 }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= currentStep ? COLORS.accent : '#E5E7EB',
            }}
          />
        ))}
      </View>

      {/* Skip button */}
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 8 }}>
        <Pressable
          onPress={handleSkip}
          style={{ paddingVertical: 8, paddingHorizontal: 12, minHeight: MIN_TOUCH, justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.skip')}
        >
          <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary, fontWeight: '500' }}>
            {t('onboarding.skip')}
          </Text>
        </Pressable>
      </View>

      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setCurrentStep(e.nativeEvent.position)}
      >
        {/* Step 1: Language */}
        <View key="lang" style={{ flex: 1, paddingHorizontal: 24 }}>
          <Text style={{ fontSize: FONT_SIZE.heading, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 }}>
            {t('onboarding.choose_language')}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                onPress={() => handleLanguageSelect(lang)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: selectedLang === lang ? COLORS.accent + '10' : 'transparent',
                  borderWidth: selectedLang === lang ? 2 : 0,
                  borderColor: COLORS.accent,
                  marginBottom: 6,
                  minHeight: MIN_TOUCH,
                }}
                accessibilityRole="button"
                accessibilityLabel={LOCALE_NAMES[lang]}
              >
                <Text style={{ fontSize: FONT_SIZE.body, fontWeight: selectedLang === lang ? '700' : '400', color: selectedLang === lang ? COLORS.accent : COLORS.textPrimary, flex: 1 }}>
                  {LOCALE_NAMES[lang]}
                </Text>
                {selectedLang === lang ? <Text style={{ fontSize: 18, color: COLORS.accent }}>{'\u2713'}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ position: 'absolute', bottom: 24, start: 24, end: 24 }}>
            <Button title={t('onboarding.next')} onPress={goNext} />
          </View>
        </View>

        {/* Step 2: Country */}
        <View key="country" style={{ flex: 1, paddingHorizontal: 24 }}>
          <Text style={{ fontSize: FONT_SIZE.heading, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 }}>
            {t('onboarding.country_title')}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {COUNTRIES.map((code) => (
              <Pressable
                key={code}
                onPress={() => setSelectedCountry(code)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: selectedCountry === code ? COLORS.accent + '10' : 'transparent',
                  borderWidth: selectedCountry === code ? 2 : 0,
                  borderColor: COLORS.accent,
                  marginBottom: 6,
                  minHeight: MIN_TOUCH,
                }}
                accessibilityRole="button"
                accessibilityLabel={COUNTRY_NAMES[code]}
              >
                <Text style={{ fontSize: 20, marginEnd: 12 }}>{COUNTRY_FLAGS[code]}</Text>
                <Text style={{ fontSize: FONT_SIZE.body, fontWeight: selectedCountry === code ? '700' : '400', color: selectedCountry === code ? COLORS.accent : COLORS.textPrimary, flex: 1 }}>
                  {COUNTRY_NAMES[code]}
                </Text>
                {selectedCountry === code ? <Text style={{ fontSize: 18, color: COLORS.accent }}>{'\u2713'}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ position: 'absolute', bottom: 24, start: 24, end: 24 }}>
            <Button title={t('onboarding.next')} onPress={goNext} />
          </View>
        </View>

        {/* Step 3: Status */}
        <View key="status" style={{ flex: 1, paddingHorizontal: 24 }}>
          <Text style={{ fontSize: FONT_SIZE.heading, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 }}>
            {t('onboarding.status_title')}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => setSelectedStatus(opt.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: selectedStatus === opt.key ? COLORS.accent + '10' : 'transparent',
                  borderWidth: selectedStatus === opt.key ? 2 : 0,
                  borderColor: COLORS.accent,
                  marginBottom: 6,
                  minHeight: MIN_TOUCH,
                }}
                accessibilityRole="button"
                accessibilityLabel={t(opt.labelKey)}
              >
                <Text style={{ fontSize: FONT_SIZE.body, fontWeight: selectedStatus === opt.key ? '700' : '400', color: selectedStatus === opt.key ? COLORS.accent : COLORS.textPrimary, flex: 1 }}>
                  {t(opt.labelKey)}
                </Text>
                {selectedStatus === opt.key ? <Text style={{ fontSize: 18, color: COLORS.accent }}>{'\u2713'}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ position: 'absolute', bottom: 24, start: 24, end: 24 }}>
            <Button title={t('onboarding.next')} onPress={goNext} />
          </View>
        </View>

        {/* Step 4: Use Case */}
        <View key="usecase" style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: FONT_SIZE.heading, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 32 }}>
            {t('onboarding.slide1_title')}
          </Text>
          <View style={{ gap: 12, marginBottom: 32 }}>
            {USE_CASES.map((uc) => (
              <Pressable
                key={uc.key}
                onPress={() => setSelectedUseCase(uc.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: selectedUseCase === uc.key ? COLORS.accent : 'rgba(0,0,0,0.08)',
                  borderRadius: RADIUS.card,
                  padding: 16,
                }}
                accessibilityRole="button"
                accessibilityLabel={t(`onboarding.status_${uc.key}` as any) || uc.key}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: selectedUseCase === uc.key ? COLORS.accent + '15' : '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginEnd: 14,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '700', color: selectedUseCase === uc.key ? COLORS.accent : COLORS.textSecondary }}>
                    {uc.icon}
                  </Text>
                </View>
                <Text style={{ fontSize: FONT_SIZE.body, fontWeight: selectedUseCase === uc.key ? '700' : '500', color: COLORS.textPrimary }}>
                  {uc.key.charAt(0).toUpperCase() + uc.key.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button title={t('onboarding.next')} onPress={goNext} />
        </View>

        {/* Step 5: Done */}
        <View key="done" style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: COLORS.success + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Text style={{ fontSize: 40, color: COLORS.success }}>{'\u2713'}</Text>
          </View>
          <Text style={{ fontSize: FONT_SIZE.heading, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 12 }}>
            {t('onboarding.slide3_title')}
          </Text>
          <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 40 }}>
            {t('onboarding.slide3_desc')}
          </Text>
          <Button title={t('onboarding.start')} onPress={handleComplete} style={{ width: '100%' }} />
        </View>
      </PagerView>
    </SafeAreaView>
  );
}
