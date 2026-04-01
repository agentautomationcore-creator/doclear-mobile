import React, { useEffect, useState } from 'react';
import { View, Text, Platform, ScrollView, Pressable } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/hooks/useAuth';
import { useResponsive } from '../src/hooks/useResponsive';
import { ListSkeleton } from '../src/components/ui/Loading';
import { LanguagePicker } from '../src/components/ui/LanguagePicker';
import { COLORS } from '../src/lib/constants';
import { supabase } from '../src/lib/supabase';
import { loadSavedLanguage } from '../src/i18n';

function WebLandingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [ctaLoading, setCtaLoading] = useState(false);
  const { isMobile, isDesktop } = useResponsive();

  const handleTryFree = async () => {
    setCtaLoading(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        router.push('/(auth)/login');
        return;
      }
      router.replace('/(tabs)');
    } catch {
      router.push('/(auth)/login');
    } finally {
      setCtaLoading(false);
    }
  };

  const DARK = '#1A1A2E';
  const BLUE = '#1a56db';
  const LIGHT_BG = '#F8F9FA';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* ===== HEADER ===== */}
      <View
        style={{
          width: '100%',
          backgroundColor: DARK,
          position: 'sticky' as any,
          top: 0,
          zIndex: 100,
        }}
      >
        <View
          style={{
            maxWidth: 1100,
            width: '100%',
            alignSelf: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 24,
            height: 60,
          }}
        >
          {/* Logo */}
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>
            D DocLear
          </Text>

          {/* Right side */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <LanguagePicker compact lightText />
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              accessibilityRole="button"
              accessibilityLabel={t('auth.sign_in_short')}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '500' }}>
                {t('auth.sign_in_short')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleTryFree}
              disabled={ctaLoading}
              style={{
                backgroundColor: BLUE,
                paddingHorizontal: 18,
                paddingVertical: 9,
                borderRadius: 8,
                opacity: ctaLoading ? 0.7 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel={t('landing.try_free')}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                {ctaLoading ? '...' : t('landing.try_free')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ===== HERO SECTION ===== */}
      <View style={{ width: '100%', backgroundColor: LIGHT_BG }}>
        <View
          style={{
            maxWidth: 1100,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: 24,
            paddingTop: isDesktop ? 64 : 40,
            paddingBottom: isDesktop ? 64 : 40,
            flexDirection: isDesktop ? 'row' : 'column',
            alignItems: isDesktop ? 'center' : 'flex-start',
            gap: isDesktop ? 40 : 32,
          }}
        >
          {/* Left side (text) */}
          <View style={{ flex: isDesktop ? 6 : undefined, width: isDesktop ? undefined : '100%' }}>
            {/* Pill badge */}
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#E8F0FE',
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 13, color: BLUE, fontWeight: '600' }}>
                {t('landing.badge')}
              </Text>
            </View>

            {/* Big title */}
            <Text
              allowFontScaling
              style={{
                fontSize: isDesktop ? 36 : 28,
                fontWeight: '800',
                color: DARK,
                lineHeight: isDesktop ? 44 : 36,
                marginBottom: 16,
              }}
            >
              {t('landing.hero_title')}
            </Text>

            {/* Subtitle */}
            <Text
              allowFontScaling
              style={{
                fontSize: 16,
                color: COLORS.textSecondary,
                lineHeight: 24,
                marginBottom: 6,
                maxWidth: 520,
              }}
            >
              {t('landing.hero_subtitle')}
            </Text>

            {/* Secondary text */}
            <Text
              allowFontScaling
              style={{
                fontSize: 16,
                color: COLORS.textSecondary,
                marginBottom: 28,
              }}
            >
              {t('landing.hero_secondary')}
            </Text>

            {/* CTA button - DARK bg */}
            <Pressable
              onPress={handleTryFree}
              disabled={ctaLoading}
              style={{
                backgroundColor: DARK,
                paddingHorizontal: 28,
                paddingVertical: 16,
                borderRadius: 10,
                alignSelf: 'flex-start',
                opacity: ctaLoading ? 0.7 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel={t('landing.cta')}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                {ctaLoading ? '...' : t('landing.cta')}
              </Text>
            </Pressable>
          </View>

          {/* Right side (demo card) */}
          <View style={{ flex: isDesktop ? 4 : undefined, width: isDesktop ? undefined : '100%' }}>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: COLORS.textSecondary,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                {t('landing.card_label')}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: DARK,
                  marginBottom: 12,
                }}
              >
                {t('landing.card_title')}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.textSecondary,
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                {t('landing.card_body')}
              </Text>

              {/* Numbered steps */}
              <View style={{ gap: 10 }}>
                {[t('landing.card_step1'), t('landing.card_step2'), t('landing.card_step3')].map(
                  (step, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Text
                        style={{
                          fontSize: 14,
                          color: DARK,
                          fontWeight: '700',
                          marginEnd: 8,
                          minWidth: 18,
                        }}
                      >
                        {i + 1}.
                      </Text>
                      <Text style={{ fontSize: 14, color: DARK, flex: 1 }}>{step}</Text>
                    </View>
                  )
                )}
              </View>

              {/* Red deadline badge */}
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: '#FEE2E2',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  alignSelf: 'flex-start',
                }}
              >
                <Text style={{ fontSize: 13, color: '#DC2626', fontWeight: '700' }}>
                  {t('landing.card_deadline')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ===== THREE STEPS SECTION ===== */}
      <View style={{ width: '100%', backgroundColor: '#FFFFFF' }}>
        <View
          style={{
            maxWidth: 1100,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: 24,
            paddingTop: 64,
            paddingBottom: 64,
          }}
        >
          {/* Section header */}
          <Text
            allowFontScaling
            style={{
              fontSize: isDesktop ? 28 : 24,
              fontWeight: '800',
              color: DARK,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {t('landing.how_title')}
          </Text>
          <Text
            allowFontScaling
            style={{
              fontSize: 16,
              color: COLORS.textSecondary,
              textAlign: 'center',
              marginBottom: 48,
              maxWidth: 600,
              alignSelf: 'center',
              lineHeight: 24,
            }}
          >
            {t('landing.how_subtitle')}
          </Text>

          {/* 3 cards */}
          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              gap: 24,
              justifyContent: 'center',
            }}
          >
            {[
              {
                num: '01',
                icon: '\uD83D\uDCF7',
                title: t('landing.step1_title'),
                desc: t('landing.step1_desc'),
              },
              {
                num: '02',
                icon: '\u2728',
                title: t('landing.step2_title'),
                desc: t('landing.step2_desc'),
              },
              {
                num: '03',
                icon: '\u2713',
                title: t('landing.step3_title'),
                desc: t('landing.step3_desc'),
              },
            ].map((step) => (
              <View
                key={step.num}
                style={{
                  flex: isDesktop ? 1 : undefined,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 16,
                  padding: 28,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Watermark number */}
                <Text
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: 8,
                    fontSize: 80,
                    fontWeight: '800',
                    color: '#F3F4F6',
                    lineHeight: 80,
                  }}
                >
                  {step.num}
                </Text>

                {/* Icon */}
                <Text style={{ fontSize: 28, marginBottom: 16 }}>{step.icon}</Text>

                {/* Title */}
                <Text
                  allowFontScaling
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: DARK,
                    marginBottom: 8,
                    zIndex: 1,
                  }}
                >
                  {step.title}
                </Text>

                {/* Description */}
                <Text
                  allowFontScaling
                  style={{
                    fontSize: 14,
                    color: COLORS.textSecondary,
                    lineHeight: 22,
                    zIndex: 1,
                  }}
                >
                  {step.desc}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ===== PRICING SECTION ===== */}
      <View style={{ width: '100%', backgroundColor: LIGHT_BG }}>
        <View
          style={{
            maxWidth: 700,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: 24,
            paddingTop: 64,
            paddingBottom: 64,
          }}
        >
          <Text
            allowFontScaling
            style={{
              fontSize: isDesktop ? 28 : 24,
              fontWeight: '800',
              color: DARK,
              textAlign: 'center',
              marginBottom: 40,
            }}
          >
            {t('landing.pricing_title')}
          </Text>

          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              gap: 20,
              justifyContent: 'center',
            }}
          >
            {/* FREE card */}
            <View
              style={{
                flex: isDesktop ? 1 : undefined,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 16,
                padding: 28,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: DARK, marginBottom: 8 }}>
                {t('landing.free_plan')}
              </Text>
              <Text style={{ fontSize: 36, fontWeight: '800', color: DARK, marginBottom: 8 }}>
                {'\u20AC'}0
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.textSecondary,
                  marginBottom: 24,
                  lineHeight: 20,
                }}
              >
                {t('landing.free_desc_long')}
              </Text>

              {/* Feature list */}
              {[
                t('landing.feature_camera'),
                t('landing.feature_languages'),
                t('landing.feature_deadlines'),
              ].map((feat, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 16, color: '#16A34A', marginEnd: 10 }}>
                    {'\u2713'}
                  </Text>
                  <Text style={{ fontSize: 14, color: DARK }}>{feat}</Text>
                </View>
              ))}
            </View>

            {/* PRO card */}
            <View
              style={{
                flex: isDesktop ? 1 : undefined,
                backgroundColor: DARK,
                borderRadius: 16,
                padding: 28,
                transform: isDesktop ? [{ scale: 1.03 }] : undefined,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
                elevation: 8,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 }}>
                {t('landing.pro_plan')}
              </Text>
              <Text style={{ fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 }}>
                {t('landing.pro_price')}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: '#6B7280',
                  marginBottom: 24,
                }}
              >
                {t('landing.pro_annual')}
              </Text>

              {/* Feature list */}
              {[
                t('landing.feature_camera'),
                t('landing.feature_languages'),
                t('landing.feature_deadlines'),
                t('landing.feature_history'),
                t('landing.feature_priority'),
              ].map((feat, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 16, color: '#4ADE80', marginEnd: 10 }}>
                    {'\u2713'}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#FFFFFF' }}>{feat}</Text>
                </View>
              ))}

              {/* CTA button */}
              <Pressable
                onPress={handleTryFree}
                disabled={ctaLoading}
                style={{
                  backgroundColor: '#FFFFFF',
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginTop: 12,
                  opacity: ctaLoading ? 0.7 : 1,
                }}
                accessibilityRole="button"
                accessibilityLabel={t('landing.final_cta')}
              >
                <Text style={{ color: DARK, fontSize: 16, fontWeight: '700' }}>
                  {t('landing.final_cta')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* ===== TRUST BADGES ===== */}
      <View style={{ width: '100%', backgroundColor: '#FFFFFF', paddingVertical: 40 }}>
        <View
          style={{
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
            paddingHorizontal: 24,
          }}
        >
          {[
            t('landing.trust_secure'),
            t('landing.trust_fast'),
            t('landing.trust_languages'),
          ].map((label, i) => (
            <View
              key={i}
              style={{
                backgroundColor: '#F3F4F6',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 100,
              }}
            >
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' }}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ===== FOOTER ===== */}
      <View
        style={{
          width: '100%',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
          paddingVertical: 20,
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            maxWidth: 1100,
            width: '100%',
            alignSelf: 'center',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'center' : 'center',
            gap: isMobile ? 8 : 0,
          }}
        >
          <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
            DocLear — {t('landing.footer_tagline')}
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
            {t('landing.footer_copyright')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function NativeWelcomeScreen({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1 }}>
      {/* Gradient-like dark background */}
      <View
        style={{
          flex: 1,
          backgroundColor: '#1E293B',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        }}
      >
        {/* Logo placeholder */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            backgroundColor: '#334155',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <Text style={{ fontSize: 40, fontWeight: '800', color: '#FFFFFF' }}>D</Text>
        </View>

        <Text style={{ fontSize: 28, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 16, lineHeight: 36 }}>
          {t('welcome.title')}
        </Text>

        {/* Trust signals */}
        <View style={{ gap: 8, marginBottom: 40 }}>
          {[
            t('welcome.signal_languages'),
            t('welcome.signal_encrypted'),
            t('welcome.signal_instant'),
          ].map((text, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#10B981', marginEnd: 8 }}>{'\u2713'}</Text>
              <Text style={{ fontSize: 15, color: '#CBD5E1' }}>{text}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <Pressable
          onPress={onStart}
          style={{
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            marginBottom: 16,
          }}
          accessibilityRole="button"
          accessibilityLabel={t('welcome.scan_first')}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>
            {t('welcome.scan_first')}
          </Text>
        </Pressable>

        {/* Free limit hint */}
        <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>
          {t('welcome.free_limit')}
        </Text>

        {/* Login link */}
        <Pressable
          onPress={onLogin}
          style={{ paddingVertical: 12, marginTop: 8, opacity: 0.6 }}
          accessibilityRole="button"
          accessibilityLabel={t('welcome.have_account')}
        >
          <Text style={{ fontSize: 14, color: '#CBD5E1' }}>
            {t('welcome.have_account')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [langLoaded, setLangLoaded] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const router = useRouter();

  // Load saved language on mount
  useEffect(() => {
    loadSavedLanguage().finally(() => setLangLoaded(true));
  }, []);

  // Check onboarding status from MMKV
  useEffect(() => {
    (async () => {
      try {
        const { mmkvStorage, MMKV_KEYS } = await import('../src/lib/mmkv');
        const done = mmkvStorage.getBoolean(MMKV_KEYS.ONBOARDING_DONE);
        if (!done && Platform.OS !== 'web') {
          setShowWelcome(true);
          setNeedsOnboarding(true);
        }
      } catch {
        // MMKV not available, skip
      }
      setOnboardingChecked(true);
    })();
  }, []);

  useEffect(() => {
    // On native: auto sign in anonymously if not authenticated (and not showing welcome)
    if (!isLoading && !isAuthenticated && Platform.OS !== 'web' && !signingIn && !showWelcome) {
      setSigningIn(true);
      supabase.auth.signInAnonymously().catch(() => {}).finally(() => setSigningIn(false));
    }
  }, [isLoading, isAuthenticated, signingIn, showWelcome]);

  if (isLoading || signingIn || !langLoaded || !onboardingChecked) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center' }}>
        <ListSkeleton count={3} />
      </View>
    );
  }

  // Native: show welcome screen for first-time users
  if (showWelcome && Platform.OS !== 'web') {
    return (
      <NativeWelcomeScreen
        onStart={async () => {
          setShowWelcome(false);
          // Sign in anonymously
          setSigningIn(true);
          await supabase.auth.signInAnonymously().catch(() => {});
          setSigningIn(false);
          // Show AI consent screen first, then onboarding
          router.replace('/ai-consent');
        }}
        onLogin={() => {
          setShowWelcome(false);
          router.push('/(auth)/login');
        }}
      />
    );
  }

  // On web: show landing page for unauthenticated users
  if (Platform.OS === 'web' && !isAuthenticated) {
    return <WebLandingPage />;
  }

  if (!isAuthenticated) {
    // Fallback: if anonymous sign-in failed, redirect to login
    return <Redirect href="/(auth)/login" />;
  }

  // Check if onboarding needed (first time after auth)
  if (needsOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
