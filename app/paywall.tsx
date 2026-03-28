import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH, API_URL } from '../src/lib/constants';
import { useAuth } from '../src/hooks/useAuth';
import { supabase } from '../src/lib/supabase';
import { Button } from '../src/components/ui/Button';
import { PageContainer } from '../src/components/layout/PageContainer';
import { getOfferings, purchasePackage, restorePurchases } from '../src/lib/purchases';
import { track } from '../src/lib/analytics';

type SelectedPlan = 'monthly' | 'annual' | 'lifetime';

const FEATURES = [
  'Unlimited documents',
  'Unlimited AI chat questions',
  'PDF + Excel export',
  'Multi-upload',
  'All formats (PDF, DOCX, XLSX, PPTX, photos)',
  'Priority support',
];

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [selected, setSelected] = useState<SelectedPlan>('annual');
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);

  useEffect(() => {
    track('paywall_shown');
    // Load RevenueCat offerings on ALL platforms (iOS, Android, Web)
    getOfferings().then(setOfferings).catch(() => {});
  }, []);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      // RevenueCat on ALL platforms (iOS, Android, Web)
      // Web uses RevenueCat Web Billing with Stripe as billing provider
      const currentOffering = offerings?.current;
      if (!currentOffering) {
        Alert.alert('Store not available', 'Please try again later.');
        setLoading(false);
        return;
      }

      let pkg;
      if (selected === 'monthly') {
        pkg = currentOffering.monthly;
      } else if (selected === 'annual') {
        pkg = currentOffering.annual;
      } else {
        pkg = currentOffering.lifetime;
      }

      if (!pkg) {
        Alert.alert('Package not available', 'Please try again later.');
        setLoading(false);
        return;
      }

      const result = await purchasePackage(pkg);
      if (result) {
        track('subscription_started', { plan: selected });
        router.back();
      }
    } catch (error: any) {
      if (!error?.userCancelled) {
        Alert.alert('Error', 'Purchase failed. Please try again.');
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
        Alert.alert('Restored', 'Your purchases have been restored.');
        router.back();
      } else {
        Alert.alert('No purchases found', 'No active subscriptions were found.');
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
    <PageContainer>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: MIN_TOUCH, height: MIN_TOUCH, justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={{ fontSize: 20, color: COLORS.textSecondary }}>{'\u2715'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: COLORS.textPrimary,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Upgrade to DocLear Pro
        </Text>
        <Text
          style={{
            fontSize: FONT_SIZE.body,
            color: COLORS.textSecondary,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Unlimited documents and AI questions
        </Text>

        {/* Monthly Card */}
        <Pressable
          onPress={() => setSelected('monthly')}
          style={{
            borderWidth: 2,
            borderColor: selected === 'monthly' ? COLORS.accent : 'rgba(0,0,0,0.08)',
            borderRadius: RADIUS.card,
            padding: 20,
            marginBottom: 12,
          }}
          accessibilityRole="button"
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: FONT_SIZE.headingSm, fontWeight: '700', color: COLORS.textPrimary }}>
                Monthly
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: FONT_SIZE.heading, fontWeight: '800', color: COLORS.textPrimary }}>
                {'\u20AC'}9.99
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>/month</Text>
            </View>
          </View>
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              borderColor: selected === 'monthly' ? COLORS.accent : '#D1D5DB',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected === 'monthly' ? (
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent }} />
            ) : null}
          </View>
        </Pressable>

        {/* Annual Card (highlighted) */}
        <Pressable
          onPress={() => setSelected('annual')}
          style={{
            borderWidth: 2,
            borderColor: selected === 'annual' ? COLORS.accent : 'rgba(0,0,0,0.08)',
            borderRadius: RADIUS.card,
            padding: 20,
            marginBottom: 12,
            position: 'relative',
            overflow: 'hidden',
          }}
          accessibilityRole="button"
        >
          {/* Best value ribbon */}
          <View
            style={{
              position: 'absolute',
              top: 12,
              left: -30,
              backgroundColor: COLORS.success,
              paddingHorizontal: 40,
              paddingVertical: 4,
              transform: [{ rotate: '-30deg' }],
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>BEST VALUE</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: FONT_SIZE.headingSm, fontWeight: '700', color: COLORS.textPrimary }}>
                Annual
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: FONT_SIZE.heading, fontWeight: '800', color: COLORS.textPrimary }}>
                {'\u20AC'}69.99
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>/year ({'\u20AC'}5.83/mo)</Text>
            </View>
          </View>
          <View
            style={{
              marginTop: 8,
              backgroundColor: COLORS.success + '15',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 6,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.success }}>Save 42%</Text>
          </View>
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              borderColor: selected === 'annual' ? COLORS.accent : '#D1D5DB',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected === 'annual' ? (
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent }} />
            ) : null}
          </View>
        </Pressable>

        {/* Lifetime Card */}
        <Pressable
          onPress={() => setSelected('lifetime')}
          style={{
            borderWidth: 2,
            borderColor: selected === 'lifetime' ? COLORS.accent : 'rgba(0,0,0,0.08)',
            borderRadius: RADIUS.card,
            padding: 20,
            marginBottom: 24,
          }}
          accessibilityRole="button"
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: FONT_SIZE.headingSm, fontWeight: '700', color: COLORS.textPrimary }}>
                Lifetime
              </Text>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary, marginTop: 2 }}>
                One-time payment
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: FONT_SIZE.heading, fontWeight: '800', color: COLORS.textPrimary }}>
                {'\u20AC'}149.99
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>forever</Text>
            </View>
          </View>
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              borderColor: selected === 'lifetime' ? COLORS.accent : '#D1D5DB',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected === 'lifetime' ? (
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent }} />
            ) : null}
          </View>
        </Pressable>

        {/* Features */}
        <View style={{ marginBottom: 24 }}>
          {FEATURES.map((feature, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: COLORS.accent + '15',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Text style={{ fontSize: 12, color: COLORS.accent, fontWeight: '700' }}>{'\u2713'}</Text>
              </View>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textPrimary, flex: 1 }}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <Button
          title={loading ? 'Processing...' : 'Start 7-day free trial'}
          onPress={handlePurchase}
          loading={loading}
          style={{ marginBottom: 16 }}
        />

        {/* Restore */}
        <Pressable
          onPress={handleRestore}
          style={{ alignItems: 'center', paddingVertical: 12, minHeight: MIN_TOUCH }}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.accent }}>
            Restore purchases
          </Text>
        </Pressable>

        {/* Trust signals */}
        <View style={{ marginTop: 16, gap: 10 }}>
          {[
            'Cancel anytime, no hidden charges',
            '14-day money-back guarantee',
            'Your documents are not used for AI training',
            'Trusted by thousands of users',
          ].map((text, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: COLORS.success, marginRight: 6 }}>{'\u2713'}</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </PageContainer>
    </SafeAreaView>
  );
}
