import React, { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { AuthProvider } from '../src/providers/AuthProvider';
import { QueryProvider } from '../src/providers/QueryProvider';
import { I18nProvider } from '../src/providers/I18nProvider';
import { initAnalytics, track } from '../src/lib/analytics';
import { configurePurchases } from '../src/lib/purchases';
import { loadMMKVCache } from '../src/lib/mmkv';

// Prevent splash screen from auto-hiding — we control it manually
SplashScreen.preventAutoHideAsync().catch(() => {});

// Initialize Sentry only with analytics consent (GDPR)
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

function initSentryIfConsented() {
  if (!SENTRY_DSN || SENTRY_DSN.includes('placeholder') || Platform.OS === 'web') return;
  try {
    const { mmkvStorage } = require('../src/lib/mmkv');
    const consent = mmkvStorage.getString('analytics_consent');
    if (consent !== 'true') return;

    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 0.2,
      enableAutoSessionTracking: true,
    });
  } catch (e) {
    if (__DEV__) console.error('[Sentry] init error:', e);
  }
}

export default function RootLayout() {
  useEffect(() => {
    // Load MMKV cache from AsyncStorage into memory
    loadMMKVCache().catch(() => {});

    // Init Sentry only after consent check
    initSentryIfConsented();

    // Initialize analytics
    initAnalytics().catch(() => {});
    track('app_opened');

    // Subscription SDK setup
    configurePurchases().catch(() => {});

    // Safety timeout: hide splash after 3 seconds no matter what
    // This prevents infinite splash if auth/network is slow
    const timeout = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  const onLayoutReady = useCallback(() => {
    // Hide splash when root layout is rendered
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutReady}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <I18nProvider>
            <QueryProvider>
              <AuthProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false }} />
              </AuthProvider>
            </QueryProvider>
          </I18nProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
