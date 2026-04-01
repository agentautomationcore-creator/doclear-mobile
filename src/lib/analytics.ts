import { Platform } from 'react-native';
import { log } from './debug';
import { mmkvStorage } from './mmkv';
import { requestTrackingPermissionsAsync, getTrackingPermissionsAsync } from 'expo-tracking-transparency';

type EventName =
  | 'app_opened'
  | 'document_uploaded'
  | 'analysis_completed'
  | 'chat_message_sent'
  | 'paywall_shown'
  | 'subscription_started'
  | 'trial_started'
  | 'onboarding_completed'
  | 'document_shared'
  | 'document_exported'
  | 'ai_consent_given'
  | 'registration_shown'
  | 'registration_completed'
  | 'demo_started'
  | 'demo_document_used'
  | 'onboarding_skipped';

// PostHog client — comes from dynamic import, uses structural typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let posthogClient: any = null;

export async function initAnalytics(): Promise<void> {
  // Don't initialize until user has given analytics consent (GDPR)
  const consent = mmkvStorage.getString('analytics_consent');
  if (consent !== 'true') {
    log('PostHog: waiting for user consent, skipping initialization');
    return;
  }

  const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  if (!posthogKey || posthogKey.includes('placeholder')) {
    log('PostHog: using placeholder key, skipping initialization');
    return;
  }

  try {
    if (Platform.OS !== 'web') {
      // GDPR-4: Request ATT permission on iOS before initializing tracking
      if (Platform.OS === 'ios') {
        const { status } = await requestTrackingPermissionsAsync();
        if (status !== 'granted') {
          log('PostHog: ATT permission denied, skipping initialization');
          return;
        }
      }

      const { PostHog } = await import('posthog-react-native');
      posthogClient = new PostHog(posthogKey, {
        host: 'https://eu.posthog.com',
      });
    }
  } catch (e) {
    log('PostHog: not available in this environment');
    if (__DEV__) console.error('[Analytics] init error:', e);
  }
}

/**
 * Call after user grants analytics consent.
 * Stores consent flag and initializes PostHog.
 */
export async function grantAnalyticsConsent(): Promise<void> {
  mmkvStorage.setString('analytics_consent', 'true');
  await initAnalytics();
}

/**
 * Call when user revokes analytics consent.
 */
export function revokeAnalyticsConsent(): void {
  mmkvStorage.setString('analytics_consent', 'false');
  posthogClient?.reset();
  posthogClient = null;
}

export function track(event: EventName, properties?: Record<string, unknown>): void {
  try {
    posthogClient?.capture(event, properties);
  } catch (e) {
    if (__DEV__) console.error('[Analytics] track error:', e);
  }
}

export function identify(userId: string, traits?: Record<string, unknown>): void {
  try {
    posthogClient?.identify(userId, traits);
  } catch (e) {
    if (__DEV__) console.error('[Analytics] identify error:', e);
  }
}

export function resetAnalytics(): void {
  try {
    posthogClient?.reset();
  } catch (e) {
    if (__DEV__) console.error('[Analytics] reset error:', e);
  }
}
