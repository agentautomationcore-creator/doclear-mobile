import { Platform } from 'react-native';

// RevenueCat setup — ALL platforms (iOS, Android, Web)
// Web uses RevenueCat Web Billing with Stripe as billing provider
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? 'appl_PLACEHOLDER';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? 'goog_PLACEHOLDER';
const WEB_KEY = process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY ?? 'rcb_PLACEHOLDER';

let purchasesConfigured = false;

export async function configurePurchases(userId?: string): Promise<void> {
  if (purchasesConfigured) return;

  try {
    const { default: Purchases } = await import('react-native-purchases');

    const apiKey = Platform.OS === 'ios' ? IOS_KEY
      : Platform.OS === 'android' ? ANDROID_KEY
      : WEB_KEY;

    // Skip if using placeholder keys
    if (apiKey.includes('PLACEHOLDER')) {
      console.log('RevenueCat: using placeholder keys, skipping configuration');
      return;
    }

    Purchases.configure({ apiKey, appUserID: userId ?? undefined });
    purchasesConfigured = true;
  } catch (error) {
    console.log('RevenueCat: not available in this environment');
  }
}

export async function getOfferings() {
  try {
    const { default: Purchases } = await import('react-native-purchases');
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: any) {
  try {
    const { default: Purchases } = await import('react-native-purchases');
    const result = await Purchases.purchasePackage(pkg);
    return result;
  } catch (error: any) {
    if (error?.userCancelled) return null;
    throw error;
  }
}

export async function restorePurchases() {
  try {
    const { default: Purchases } = await import('react-native-purchases');
    const info = await Purchases.restorePurchases();
    return info;
  } catch {
    return null;
  }
}

export async function getCustomerInfo() {
  try {
    const { default: Purchases } = await import('react-native-purchases');
    const info = await Purchases.getCustomerInfo();
    return info;
  } catch {
    return null;
  }
}
