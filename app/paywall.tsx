import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH } from '../src/lib/constants';
import { useAuth } from '../src/hooks/useAuth';
import { useAuthStore } from '../src/store/auth.store';
import { Button } from '../src/components/ui/Button';
import { PageContainer } from '../src/components/layout/PageContainer';
import { getOfferings, purchasePackage, restorePurchases } from '../src/lib/purchases';
import { track } from '../src/lib/analytics';

type SelectedPlan = 'monthly' | 'annual';

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { plan, trialDaysLeft, isAnonymous } = useAuth();
  const [selected, setSelected] = useState<SelectedPlan>('annual');
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- offerings type from dynamic import
  const [offerings, setOfferings] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    track('paywall_shown');
    getOfferings().then(setOfferings).catch(() => {});
  }, []);

  const handlePurchase = async () => {
    if (isAnonymous) {
      Alert.alert(
        t('paywall.registration_required') || 'Registration Required',
        t('paywall.register_to_purchase') || 'Please create an account to subscribe.',
        [
          { text: t('common.cancel') || 'Cancel', style: 'cancel' },
          { text: t('paywall.create_account') || 'Create Account', onPress: () => router.push('/(auth)/register') },
        ]
      );
      return;
    }
    setLoading(true);
    try {
      const currentOffering = offerings?.current;
      if (!currentOffering) {
        Alert.alert(t('common.error'), t('paywall.store_unavailable'));
        setLoading(false);
        return;
      }

      const pkg = selected === 'monthly' ? currentOffering.monthly : currentOffering.annual;
      if (!pkg) {
        Alert.alert(t('common.error'), t('paywall.store_unavailable'));
        setLoading(false);
        return;
      }

      const result = await purchasePackage(pkg);
      if (result) {
        // Sync plan to Zustand store after successful transaction
        useAuthStore.getState().setPlan(selected === 'annual' ? 'year' : 'pro');
        track('subscription_started', { plan: selected });
        router.back();
      }
    } catch (error: unknown) {
      if (!(error && typeof error === 'object' && 'userCancelled' in error && error.userCancelled)) {
        Alert.alert(t('common.error'), t('paywall.purchase_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const info = await restorePurchases();
      if (info) {
        // Check active entitlements and sync to Zustand
        const entitlements = (info as any).entitlements?.active;
        const isPro = entitlements?.pro || entitlements?.premium;
        if (isPro) {
          useAuthStore.getState().setPlan('pro');
        }
        Alert.alert(t('paywall.restored'), t('paywall.restored_desc'));
        router.back();
      } else {
        Alert.alert(t('paywall.no_purchases'), t('paywall.no_purchases_desc'));
      }
    } catch {
      Alert.alert(t('common.error'), t('common.retry'));
    } finally {
      setLoading(false);
    }
  };

  const trialExpired = !isAnonymous && plan === 'free' && trialDaysLeft === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
    <PageContainer>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: MIN_TOUCH, height: MIN_TOUCH, justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Text style={{ fontSize: 20, color: COLORS.textSecondary }}>{'\u2715'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        {/* Title */}
        <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8 }}>
          {t('paywall.pro_title')}
        </Text>
        <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 8 }}>
          {t('paywall.pro_desc')}
        </Text>

        {/* Anon: create account for trial */}
        {isAnonymous ? (
          <View style={{ backgroundColor: '#dbeafe', borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: '#1e40af', textAlign: 'center' }}>
              {t('paywall.anon_trial_hint')}
            </Text>
          </View>
        ) : null}

        {/* Trial expired banner */}
        {trialExpired ? (
          <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: '#92400E', textAlign: 'center' }}>
              {t('trial.expired')}
            </Text>
          </View>
        ) : null}

        {/* Monthly Card */}
        {/* Prices below are fallback values. In production, actual prices come from RevenueCat offerings. */}
        <Pressable
          onPress={() => setSelected('monthly')}
          style={{
            borderWidth: 2,
            borderColor: selected === 'monthly' ? COLORS.accent : 'rgba(0,0,0,0.08)',
            borderRadius: RADIUS.card,
            padding: 20,
            marginBottom: 12,
            marginTop: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.monthly')}
        >
          {/* Radio left */}
          <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: selected === 'monthly' ? COLORS.accent : '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginEnd: 14 }}>
            {selected === 'monthly' ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent }} /> : null}
          </View>
          {/* Content */}
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_SIZE.headingSm, fontWeight: '700', color: COLORS.textPrimary }}>
              {t('paywall.monthly')}
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: FONT_SIZE.heading, fontWeight: '800', color: COLORS.textPrimary }}>
                {'\u20AC'}9.99
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>/{t('paywall.per_month')}</Text>
            </View>
          </View>
        </Pressable>

        {/* Annual Card */}
        <Pressable
          onPress={() => setSelected('annual')}
          style={{
            borderWidth: 2,
            borderColor: selected === 'annual' ? COLORS.accent : 'rgba(0,0,0,0.08)',
            borderRadius: RADIUS.card,
            padding: 20,
            marginBottom: 24,
            overflow: 'hidden',
            flexDirection: 'row',
            alignItems: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.annual')}
        >
          {/* Best value ribbon */}
          <View style={{ position: 'absolute', top: 12, left: -30, backgroundColor: COLORS.success, paddingHorizontal: 40, paddingVertical: 4, transform: [{ rotate: '-30deg' }], zIndex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>{t('paywall.best_value')}</Text>
          </View>

          {/* Radio left */}
          <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: selected === 'annual' ? COLORS.accent : '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginEnd: 14 }}>
            {selected === 'annual' ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent }} /> : null}
          </View>
          {/* Content */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: FONT_SIZE.headingSm, fontWeight: '700', color: COLORS.textPrimary }}>
                {t('paywall.annual')}
              </Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: FONT_SIZE.heading, fontWeight: '800', color: COLORS.textPrimary }}>
                  {'\u20AC'}69.99
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>/{t('paywall.per_year')} ({'\u20AC'}5.83/{t('paywall.per_month')})</Text>
              </View>
            </View>
            <View style={{ marginTop: 8, backgroundColor: COLORS.success + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.success }}>{t('paywall.save_42')}</Text>
            </View>
          </View>
        </Pressable>

        {/* Features */}
        <View style={{ marginBottom: 24 }}>
          {[
            t('paywall.feature_unlimited'),
            t('paywall.feature_questions'),
            t('paywall.feature_export'),
            t('paywall.feature_formats'),
            t('paywall.feature_priority'),
          ].map((feature, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center', marginEnd: 10 }}>
                <Text style={{ fontSize: 12, color: COLORS.accent, fontWeight: '700' }}>{'\u2713'}</Text>
              </View>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textPrimary, flex: 1 }}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <Button
          title={loading ? t('common.loading') : t('paywall.subscribe')}
          onPress={handlePurchase}
          loading={loading}
          style={{ marginBottom: 16 }}
        />

        {/* Restore */}
        <Pressable
          onPress={handleRestore}
          style={{ alignItems: 'center', paddingVertical: 12, minHeight: MIN_TOUCH }}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.restore')}
        >
          <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.accent }}>{t('paywall.restore')}</Text>
        </Pressable>

        {/* Trust */}
        <View style={{ marginTop: 16, gap: 10 }}>
          {[
            t('paywall.trust_cancel'),
            t('paywall.trust_guarantee'),
            t('paywall.trust_no_training'),
          ].map((text, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: COLORS.success, marginEnd: 6 }}>{'\u2713'}</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Auto-renewal disclosure (required by Apple) */}
        <Text style={{ fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: 20, lineHeight: 16 }}>
          {t('paywall.auto_renewal') || 'Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions in your App Store account settings.'}
        </Text>

        {/* TOS / Privacy links (required by Apple) */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, marginBottom: 8 }}>
          <Pressable onPress={() => Linking.openURL('https://doclear.app/terms')} accessibilityRole="link">
            <Text style={{ fontSize: 12, color: COLORS.accent, textDecorationLine: 'underline' }}>
              {t('settings.terms') || 'Terms of Service'}
            </Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('https://doclear.app/privacy')} accessibilityRole="link">
            <Text style={{ fontSize: 12, color: COLORS.accent, textDecorationLine: 'underline' }}>
              {t('settings.privacy') || 'Privacy Policy'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </PageContainer>
    </SafeAreaView>
  );
}
