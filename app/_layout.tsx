import React, { useEffect, useCallback } from 'react';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// KeyboardProvider — requires native build with keyboard-controller
// import { KeyboardProvider } from 'react-native-keyboard-controller';

import { AuthProvider } from '../src/providers/AuthProvider';
import { QueryProvider } from '../src/providers/QueryProvider';
import { I18nProvider } from '../src/providers/I18nProvider';
import { initAnalytics, track } from '../src/lib/analytics';
import { configurePurchases } from '../src/lib/purchases';
import '../global.css';

// Prevent splash screen from auto-hiding — we control it manually
SplashScreen.preventAutoHideAsync().catch(() => {});

// Initialize Sentry
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

if (SENTRY_DSN && !SENTRY_DSN.includes('placeholder') && Platform.OS !== 'web') {
  try {
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 0.2,
      enableAutoSessionTracking: true,
    });
  } catch {
    // Sentry not available in dev build
  }
}

export default function RootLayout() {
  useEffect(() => {
    // Initialize analytics
    initAnalytics().catch(() => {});
    track('app_opened');

    // Initialize RevenueCat
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
        <SafeAreaProvider>
          <I18nProvider>
            <QueryProvider>
              <AuthProvider>
                <StatusBar style="dark" />
                <Slot />
              </AuthProvider>
            </QueryProvider>
          </I18nProvider>
        </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
