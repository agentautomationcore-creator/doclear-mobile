import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { COLORS, FONT_SIZE, MIN_TOUCH } from '../../src/lib/constants';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleRegister() {
    if (!email || !password) return;
    if (password.length < 6) {
      setError(t('auth.password_min_length', { defaultValue: 'Password must be at least 6 characters' }));
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else if (data.session) {
      // Email confirmation disabled — user is logged in immediately
      router.replace('/(tabs)');
    } else {
      // Email confirmation required — show check email screen
      setSuccess(true);
    }
  }

  if (success) {
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
            {t('auth.check_email')}
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
            {t('auth.create_account')}
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

          <Input
            label={t('auth.password_placeholder')}
            placeholder={t('auth.password_placeholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="newPassword"
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
            title={t('auth.create_account')}
            onPress={handleRegister}
            loading={loading}
            disabled={!email || !password}
          />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 24,
            }}
          >
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary }}>
              {t('auth.have_account')}{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable style={{ minHeight: MIN_TOUCH, justifyContent: 'center' }}>
                <Text
                  style={{
                    fontSize: FONT_SIZE.caption,
                    color: COLORS.accent,
                    fontWeight: '600',
                  }}
                >
                  {t('auth.sign_in')}
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
