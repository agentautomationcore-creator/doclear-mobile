import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { COLORS, FONT_SIZE } from '../../src/lib/constants';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email) return;

    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: 'doclear://reset-password' }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{
              fontSize: FONT_SIZE.heading,
              fontWeight: '700',
              color: COLORS.textPrimary,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            {t('auth.reset_sent')}
          </Text>
          <Text
            style={{
              fontSize: FONT_SIZE.body,
              color: COLORS.textSecondary,
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            {email}
          </Text>
          <Button
            title={t('auth.sign_in')}
            onPress={() => router.replace('/(auth)/login')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              fontSize: FONT_SIZE.heading,
              fontWeight: '700',
              color: COLORS.textPrimary,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {t('auth.forgot_password')}
          </Text>
          <Text
            style={{
              fontSize: FONT_SIZE.body,
              color: COLORS.textSecondary,
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            {t('auth.subtitle')}
          </Text>

          <Input
            label={t('auth.email_placeholder')}
            placeholder={t('auth.email_placeholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />

          {error ? (
            <Text
              style={{
                color: COLORS.danger,
                fontSize: FONT_SIZE.caption,
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              {error}
            </Text>
          ) : null}

          <Button
            title={t('auth.update_password')}
            onPress={handleReset}
            loading={loading}
            disabled={!email}
          />

          <Button
            title={t('auth.back_home')}
            onPress={() => router.back()}
            variant="secondary"
            style={{ marginTop: 12 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
