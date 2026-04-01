import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH } from '../src/lib/constants';
import { Button } from '../src/components/ui/Button';
import { mmkvStorage, MMKV_KEYS } from '../src/lib/mmkv';
import { grantAnalyticsConsent } from '../src/lib/analytics';
import { supabase } from '../src/lib/supabase';

export const AI_CONSENT_KEY = MMKV_KEYS.AI_CONSENT;

export default function AIConsentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [aiConsent, setAiConsent] = useState(true);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);

  const syncConsentToSupabase = async (ai: boolean, analytics: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          ai_consent: ai,
          ai_consent_at: ai ? new Date().toISOString() : null,
          analytics_consent: analytics,
          analytics_consent_at: analytics ? new Date().toISOString() : null,
        }).eq('id', user.id);
      }
    } catch (e) {
      if (__DEV__) console.error('[AIConsent] Supabase sync error:', e);
    }
  };

  const handleAccept = async () => {
    // Save AI consent to MMKV + AsyncStorage
    mmkvStorage.setBoolean(MMKV_KEYS.AI_CONSENT, aiConsent);
    try {
      const AS = (await import('@react-native-async-storage/async-storage')).default;
      await AS.setItem('mmkv_ai_consent_accepted', aiConsent ? 'true' : 'false');
    } catch (e) {
      if (__DEV__) console.error('[AIConsent] AsyncStorage error:', e);
    }

    // Analytics consent
    if (analyticsConsent) {
      await grantAnalyticsConsent();
    }

    // Sync to Supabase
    await syncConsentToSupabase(aiConsent, analyticsConsent);

    // Navigate
    const onboardingDone = mmkvStorage.getBoolean(MMKV_KEYS.ONBOARDING_DONE);
    if (!onboardingDone) {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleDecline = async () => {
    // Save declined state
    mmkvStorage.setBoolean(MMKV_KEYS.AI_CONSENT, false);
    try {
      const AS = (await import('@react-native-async-storage/async-storage')).default;
      await AS.setItem('mmkv_ai_consent_accepted', 'false');
    } catch (e) {
      if (__DEV__) console.error('[AIConsent] AsyncStorage error:', e);
    }

    await syncConsentToSupabase(false, false);

    // Still allow navigation — scan will be blocked without consent
    const onboardingDone = mmkvStorage.getBoolean(MMKV_KEYS.ONBOARDING_DONE);
    if (!onboardingDone) {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 200 }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: COLORS.accent + '15',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.accent }}>AI</Text>
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: COLORS.textPrimary,
              textAlign: 'center',
            }}
          >
            {t('consent.title')}
          </Text>
        </View>

        {/* Info sections */}
        <View style={{ gap: 16, marginBottom: 24 }}>
          {[
            { title: t('consent.ai_title'), desc: t('consent.ai_desc') },
            { title: t('consent.training_title'), desc: t('consent.training_desc') },
            { title: t('consent.encrypted_title'), desc: t('consent.encrypted_desc') },
            { title: t('consent.eu_title'), desc: t('consent.eu_desc') },
          ].map((item, i) => (
            <View key={i}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 }}>
                {item.desc}
              </Text>
            </View>
          ))}
        </View>

        {/* Granular toggles */}
        <View style={{
          backgroundColor: '#F8FAFC',
          borderRadius: RADIUS.card,
          padding: 16,
          gap: 16,
          marginBottom: 16,
        }}>
          {/* AI Processing toggle (required for scan) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginEnd: 12 }}>
              <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '600', color: COLORS.textPrimary }}>
                {t('consent.toggle_ai')}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                {t('consent.toggle_ai_desc')}
              </Text>
            </View>
            <Switch
              value={aiConsent}
              onValueChange={setAiConsent}
              trackColor={{ false: '#D1D5DB', true: COLORS.accent }}
              accessibilityLabel={t('consent.toggle_ai')}
            />
          </View>

          {/* Analytics toggle (optional) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginEnd: 12 }}>
              <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '600', color: COLORS.textPrimary }}>
                {t('consent.toggle_analytics')}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                {t('consent.toggle_analytics_desc')}
              </Text>
            </View>
            <Switch
              value={analyticsConsent}
              onValueChange={setAnalyticsConsent}
              trackColor={{ false: '#D1D5DB', true: COLORS.accent }}
              accessibilityLabel={t('consent.toggle_analytics')}
            />
          </View>
        </View>
      </ScrollView>

      {/* Fixed bottom buttons */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          start: 0,
          end: 0,
          backgroundColor: COLORS.background,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        {/* Accept — outlined style so it doesn't visually dominate (CNIL) */}
        <Button
          title={t('consent.agree')}
          onPress={handleAccept}
          style={{ marginBottom: 8 }}
        />
        {/* Decline */}
        <Pressable
          onPress={handleDecline}
          style={{
            alignItems: 'center',
            paddingVertical: 12,
            minHeight: MIN_TOUCH,
            borderWidth: 1.5,
            borderColor: COLORS.border,
            borderRadius: RADIUS.card,
            marginBottom: 8,
          }}
          accessibilityRole="button"
          accessibilityLabel={t('consent.decline')}
        >
          <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '600', color: COLORS.textSecondary }}>
            {t('consent.decline')}
          </Text>
        </Pressable>
        {/* Privacy link */}
        <Pressable
          onPress={() => Linking.openURL('https://doclear.app/privacy')}
          style={{ alignItems: 'center', paddingVertical: 8, minHeight: MIN_TOUCH }}
          accessibilityRole="link"
          accessibilityLabel={t('consent.learn_more')}
        >
          <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
            {t('consent.learn_more')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
