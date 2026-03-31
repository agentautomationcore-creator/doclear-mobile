import { Platform } from 'react-native';
import { log } from './debug';

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
  const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  if (!posthogKey || posthogKey.includes('placeholder')) {
    log('PostHog: using placeholder key, skipping initialization');
    return;
  }

  try {
    if (Platform.OS !== 'web') {
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
