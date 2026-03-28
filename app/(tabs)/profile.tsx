import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH, API_URL } from '../../src/lib/constants';
import { useAuth } from '../../src/hooks/useAuth';
import { useAuthStore, type Plan, FREE_DOC_LIMIT, REGISTERED_FREE_DOC_LIMIT, FREE_QUESTION_LIMIT } from '../../src/store/auth.store';
import { useUIStore } from '../../src/store/ui.store';
import { supabase } from '../../src/lib/supabase';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { PageContainer } from '../../src/components/layout/PageContainer';
import type { Locale, CountryCode, ImmigrationStatus } from '../../src/types';
import { LOCALE_NAMES, COUNTRY_NAMES, COUNTRY_FLAGS } from '../../src/types';

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

const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  year: 'Pro (Annual)',
  lifetime: 'Pro (Lifetime)',
  trial: 'Pro (Trial)',
};

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, plan, scanCount, scanLimit, isAnonymous, dailyQuestions } = useAuth();
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [userCountry, setUserCountry] = useState<CountryCode>('FR');
  const [userStatus, setUserStatus] = useState<ImmigrationStatus>('citizen');

  const docLimit = isAnonymous ? FREE_DOC_LIMIT : (plan === 'free' || plan === 'starter') ? REGISTERED_FREE_DOC_LIMIT : Infinity;

  const initials = (() => {
    if (isAnonymous) return '?';
    const email = user?.email ?? '';
    return email.slice(0, 2).toUpperCase();
  })();

  // Load user country/status from Supabase profile
  React.useEffect(() => {
    if (!user?.id || isAnonymous) return;
    supabase
      .from('profiles')
      .select('country, status')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.country) setUserCountry(data.country as CountryCode);
        if (data?.status) setUserStatus(data.status as ImmigrationStatus);
      });
  }, [user?.id, isAnonymous]);

  const handleCountrySelect = useCallback(async (country: CountryCode) => {
    setUserCountry(country);
    setCountryModalVisible(false);
    if (user?.id) {
      await supabase.from('profiles').update({ country, updated_at: new Date().toISOString() }).eq('id', user.id);
    }
  }, [user?.id]);

  const handleStatusSelect = useCallback(async (status: ImmigrationStatus) => {
    setUserStatus(status);
    setStatusModalVisible(false);
    if (user?.id) {
      await supabase.from('profiles').update({ status, updated_at: new Date().toISOString() }).eq('id', user.id);
    }
  }, [user?.id]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      t('profile.sign_out'),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.sign_out'),
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            useAuthStore.getState().reset();
            router.replace('/');
          },
        },
      ]
    );
  }, [router, t]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      t('profile.delete_account'),
      t('settings.delete_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.delete_yes'),
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData?.session?.access_token;

              const response = await fetch(`${API_URL}/account/delete`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ userId: user?.id }),
              });

              if (response.ok) {
                await supabase.auth.signOut();
                useAuthStore.getState().reset();
                router.replace('/');
              } else {
                Alert.alert(t('common.error'), t('common.retry'));
              }
            } catch {
              Alert.alert(t('common.error'), t('common.retry'));
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  }, [user, router, t]);

  const handleLanguageSelect = useCallback(
    async (lang: Locale) => {
      const { setLanguage } = await import('../../src/i18n');
      await setLanguage(lang);
      setLocale(lang);
      setLangModalVisible(false);
    },
    [setLocale]
  );

  const usagePercent = docLimit === Infinity ? 0 : Math.min(100, (scanCount / docLimit) * 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
    <PageContainer>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* User info */}
        <Card style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: COLORS.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '600', color: COLORS.textPrimary }}>
              {isAnonymous ? t('profile.guest_user') : (user?.email ?? '')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View
                style={{
                  backgroundColor: plan === 'free' ? '#F3F4F6' : COLORS.accent + '15',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: plan === 'free' ? COLORS.textSecondary : COLORS.accent,
                  }}
                >
                  {PLAN_LABELS[plan]}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Anonymous user: sign up prompt */}
        {isAnonymous ? (
          <Card style={{ marginBottom: 16, backgroundColor: COLORS.accent + '08' }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 }}>
              {t('profile.save_documents')}
            </Text>
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary, marginBottom: 12 }}>
              {t('profile.save_documents_desc')}
            </Text>
            <Button
              title={t('profile.create_account')}
              onPress={() => router.push('/(auth)/register')}
            />
          </Card>
        ) : null}

        {/* Subscription */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>
            {t('profile.subscription')}
          </Text>
          {plan === 'free' || plan === 'starter' ? (
            <>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary, marginBottom: 4 }}>
                {t('profile.free_documents', { used: scanCount, total: docLimit })}
              </Text>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary, marginBottom: 12 }}>
                {t('profile.questions_today')}: {dailyQuestions} / {FREE_QUESTION_LIMIT}
              </Text>
              {/* Usage bar */}
              <View
                style={{
                  height: 6,
                  backgroundColor: '#E5E7EB',
                  borderRadius: 3,
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: usagePercent > 80 ? COLORS.danger : COLORS.accent,
                    width: `${usagePercent}%` as any,
                  }}
                />
              </View>
              <Button
                title={t('profile.subscribe_pro')}
                onPress={() => router.push('/paywall')}
              />
            </>
          ) : (
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.success, fontWeight: '500' }}>
              {t('paywall.feature_unlimited')}
            </Text>
          )}
        </Card>

        {/* Language */}
        <Card style={{ marginBottom: 16 }}>
          <Pressable
            onPress={() => setLangModalVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: MIN_TOUCH,
            }}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '600', color: COLORS.textPrimary }}>
              {t('profile.language')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary }}>
                {LOCALE_NAMES[locale]}
              </Text>
              <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginLeft: 8 }}>{'\u203A'}</Text>
            </View>
          </Pressable>
        </Card>

        {/* Country (registered users only) */}
        {!isAnonymous ? (
          <Card style={{ marginBottom: 16 }}>
            <Pressable
              onPress={() => setCountryModalVisible(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: MIN_TOUCH,
              }}
              accessibilityRole="button"
              accessibilityLabel={t('settings.country')}
            >
              <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '600', color: COLORS.textPrimary }}>
                {t('settings.country')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary }}>
                  {COUNTRY_FLAGS[userCountry]} {COUNTRY_NAMES[userCountry]}
                </Text>
                <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginStart: 8 }}>{'\u203A'}</Text>
              </View>
            </Pressable>
          </Card>
        ) : null}

        {/* Status (registered users only) */}
        {!isAnonymous ? (
          <Card style={{ marginBottom: 16 }}>
            <Pressable
              onPress={() => setStatusModalVisible(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: MIN_TOUCH,
              }}
              accessibilityRole="button"
              accessibilityLabel={t('settings.status')}
            >
              <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '600', color: COLORS.textPrimary }}>
                {t('settings.status')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary }}>
                  {t(`onboarding.status_${userStatus}`)}
                </Text>
                <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginStart: 8 }}>{'\u203A'}</Text>
              </View>
            </Pressable>
          </Card>
        ) : null}

        {/* Trust signals */}
        <Card style={{ marginBottom: 16 }}>
          {[
            { text: t('profile.trust_encrypted') },
            { text: t('profile.trust_no_training') },
            { text: t('profile.trust_gdpr') },
          ].map((item, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                ...(i < 2 ? { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' } : {}),
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: COLORS.success + '15',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Text style={{ fontSize: 12, color: COLORS.success }}>{'\u2713'}</Text>
              </View>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textPrimary, flex: 1 }}>
                {item.text}
              </Text>
            </View>
          ))}
        </Card>

        {/* Links */}
        <Card style={{ marginBottom: 16 }}>
          <Pressable
            onPress={() => Linking.openURL('https://doclear.app/privacy')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: MIN_TOUCH,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(0,0,0,0.04)',
            }}
            accessibilityRole="link"
          >
            <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textPrimary }}>
              {t('settings.privacy')}
            </Text>
            <Text style={{ color: COLORS.textSecondary }}>{'\u203A'}</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('https://doclear.app/terms')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: MIN_TOUCH,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(0,0,0,0.04)',
            }}
            accessibilityRole="link"
          >
            <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textPrimary }}>
              {t('settings.terms')}
            </Text>
            <Text style={{ color: COLORS.textSecondary }}>{'\u203A'}</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('mailto:support@doclear.app?subject=Bug Report')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: MIN_TOUCH,
            }}
            accessibilityRole="link"
          >
            <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textPrimary }}>
              {t('profile.report_problem')}
            </Text>
            <Text style={{ color: COLORS.textSecondary }}>{'\u203A'}</Text>
          </Pressable>
        </Card>

        {/* App version */}
        <Text
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: COLORS.textSecondary,
            marginBottom: 24,
          }}
        >
          DocLear v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>

        {/* Sign out / Create account — context-dependent */}
        {isAnonymous ? (
          <Button
            title={t('profile.create_account')}
            onPress={() => router.push('/(auth)/register')}
            variant="primary"
          />
        ) : (
          <>
            <Pressable
              onPress={handleSignOut}
              style={{
                paddingVertical: 14,
                alignItems: 'center',
                minHeight: MIN_TOUCH,
              }}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.danger, fontWeight: '600' }}>
                {t('profile.sign_out')}
              </Text>
            </Pressable>

            {/* Delete Account */}
            <Pressable
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
              style={{
                marginTop: 16,
                paddingVertical: 14,
                alignItems: 'center',
                minHeight: MIN_TOUCH,
              }}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary }}>
                {deletingAccount ? t('common.loading') : t('profile.delete_account')}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Language Modal */}
      <Modal
        visible={langModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(0,0,0,0.06)',
            }}
          >
            <Text style={{ fontSize: FONT_SIZE.headingSm, fontWeight: '700', color: COLORS.textPrimary }}>
              {t('profile.language')}
            </Text>
            <Pressable
              onPress={() => setLangModalVisible(false)}
              style={{ width: MIN_TOUCH, height: MIN_TOUCH, justifyContent: 'center', alignItems: 'center' }}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: 20, color: COLORS.textSecondary }}>{'\u2715'}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
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
                  backgroundColor: locale === lang ? COLORS.accent + '10' : 'transparent',
                  marginBottom: 4,
                  minHeight: MIN_TOUCH,
                }}
                accessibilityRole="button"
              >
                <Text
                  style={{
                    fontSize: FONT_SIZE.body,
                    fontWeight: locale === lang ? '600' : '400',
                    color: locale === lang ? COLORS.accent : COLORS.textPrimary,
                    flex: 1,
                  }}
                >
                  {LOCALE_NAMES[lang]}
                </Text>
                {locale === lang ? (
                  <Text style={{ fontSize: 18, color: COLORS.accent }}>{'\u2713'}</Text>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {/* Country Modal */}
      <Modal
        visible={countryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(0,0,0,0.06)',
            }}
          >
            <Text style={{ fontSize: FONT_SIZE.headingSm, fontWeight: '700', color: COLORS.textPrimary }}>
              {t('settings.country')}
            </Text>
            <Pressable
              onPress={() => setCountryModalVisible(false)}
              style={{ width: MIN_TOUCH, height: MIN_TOUCH, justifyContent: 'center', alignItems: 'center' }}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Text style={{ fontSize: 20, color: COLORS.textSecondary }}>{'\u2715'}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {COUNTRIES.map((code) => (
              <Pressable
                key={code}
                onPress={() => handleCountrySelect(code)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: userCountry === code ? COLORS.accent + '10' : 'transparent',
                  marginBottom: 4,
                  minHeight: MIN_TOUCH,
                }}
                accessibilityRole="button"
                accessibilityLabel={COUNTRY_NAMES[code]}
              >
                <Text style={{ fontSize: 20, marginEnd: 12 }}>{COUNTRY_FLAGS[code]}</Text>
                <Text
                  style={{
                    fontSize: FONT_SIZE.body,
                    fontWeight: userCountry === code ? '600' : '400',
                    color: userCountry === code ? COLORS.accent : COLORS.textPrimary,
                    flex: 1,
                  }}
                >
                  {COUNTRY_NAMES[code]}
                </Text>
                {userCountry === code ? (
                  <Text style={{ fontSize: 18, color: COLORS.accent }}>{'\u2713'}</Text>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Status Modal */}
      <Modal
        visible={statusModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(0,0,0,0.06)',
            }}
          >
            <Text style={{ fontSize: FONT_SIZE.headingSm, fontWeight: '700', color: COLORS.textPrimary }}>
              {t('settings.status')}
            </Text>
            <Pressable
              onPress={() => setStatusModalVisible(false)}
              style={{ width: MIN_TOUCH, height: MIN_TOUCH, justifyContent: 'center', alignItems: 'center' }}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Text style={{ fontSize: 20, color: COLORS.textSecondary }}>{'\u2715'}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => handleStatusSelect(opt.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: userStatus === opt.key ? COLORS.accent + '10' : 'transparent',
                  marginBottom: 4,
                  minHeight: MIN_TOUCH,
                }}
                accessibilityRole="button"
                accessibilityLabel={t(opt.labelKey)}
              >
                <Text
                  style={{
                    fontSize: FONT_SIZE.body,
                    fontWeight: userStatus === opt.key ? '600' : '400',
                    color: userStatus === opt.key ? COLORS.accent : COLORS.textPrimary,
                    flex: 1,
                  }}
                >
                  {t(opt.labelKey)}
                </Text>
                {userStatus === opt.key ? (
                  <Text style={{ fontSize: 18, color: COLORS.accent }}>{'\u2713'}</Text>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </PageContainer>
    </SafeAreaView>
  );
}
