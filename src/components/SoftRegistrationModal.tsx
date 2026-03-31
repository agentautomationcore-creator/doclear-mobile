import React, { useState } from 'react';
import { View, Text, Modal, Pressable, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as AppleAuthentication from 'expo-apple-authentication';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';

interface SoftRegistrationModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function SoftRegistrationModal({ visible, onDismiss }: SoftRegistrationModalProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleEmailSignUp = () => {
    onDismiss();
    router.push('/(auth)/register');
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') return;
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        onDismiss();
      }
    } catch (e) {
      if (__DEV__) console.error('[SoftReg] Apple sign-in error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'doclear://auth/callback',
        },
      });
      if (!error) onDismiss();
    } catch (e) {
      if (__DEV__) console.error('[SoftReg] Google sign-in error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      transparent
      onRequestClose={onDismiss}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.4)',
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: Platform.OS === 'ios' ? 48 : 24,
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: '#D1D5DB',
              alignSelf: 'center',
              marginBottom: 20,
            }}
          />

          <Text
            style={{
              fontSize: FONT_SIZE.heading,
              fontWeight: '800',
              color: COLORS.textPrimary,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {t('soft_reg.title')}
          </Text>
          <Text
            style={{
              fontSize: FONT_SIZE.body,
              color: COLORS.textSecondary,
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 22,
            }}
          >
            {t('soft_reg.desc')}
          </Text>

          {Platform.OS === 'ios' ? (
            <Button
              title={t('soft_reg.apple')}
              onPress={handleAppleSignIn}
              loading={loading}
              style={{ marginBottom: 12, backgroundColor: '#000000' }}
            />
          ) : null}

          <Button
            title={t('soft_reg.google')}
            onPress={handleGoogleSignIn}
            loading={loading}
            variant="secondary"
            style={{ marginBottom: 12 }}
          />

          <Button
            title={t('soft_reg.email')}
            onPress={handleEmailSignUp}
            variant="secondary"
            style={{ marginBottom: 16 }}
          />

          <Pressable
            onPress={onDismiss}
            style={{ alignItems: 'center', paddingVertical: 12, minHeight: MIN_TOUCH }}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary }}>
              {t('soft_reg.skip')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
