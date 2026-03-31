import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH } from '../src/lib/constants';
import { Button } from '../src/components/ui/Button';
import { mmkvStorage, MMKV_KEYS } from '../src/lib/mmkv';

export const AI_CONSENT_KEY = MMKV_KEYS.AI_CONSENT;

export default function AIConsentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleAgree = async () => {
    // Write to both MMKV and AsyncStorage
    mmkvStorage.setBoolean(MMKV_KEYS.AI_CONSENT, true);
    try {
      const AS = (await import('@react-native-async-storage/async-storage')).default;
      await AS.setItem('mmkv_ai_consent_accepted', 'true');
    } catch (e) { if (__DEV__) console.error('[AIConsent] AsyncStorage error:', e); }

    // Check if onboarding is needed (first launch) or returning user
    const onboardingDone = mmkvStorage.getBoolean(MMKV_KEYS.ONBOARDING_DONE);
    if (!onboardingDone) {
      // First launch: consent → onboarding → tabs
      router.replace('/onboarding');
    } else {
      // Returning user: go to tabs
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
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

        {/* Compact explanation */}
        <View style={{ gap: 16 }}>
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
      </ScrollView>

      {/* Fixed bottom buttons */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: COLORS.background,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        <Button
          title={t('consent.agree')}
          onPress={handleAgree}
          style={{ marginBottom: 8 }}
        />
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
