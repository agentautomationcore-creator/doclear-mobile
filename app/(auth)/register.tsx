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
import { useAuthStore } from '../../src/store/auth.store';
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
      setError(t('auth.password_min_length'));
      return;
    }

    setLoading(true);
    setError('');

    const isAnonymous = useAuthStore.getState().isAnonymous;

    if (isAnonymous) {
      // Convert anonymous user → preserve user_id and all documents
      const { error: emailError } = await supabase.auth.updateUser({
        email: email.trim(),
      });

      if (emailError) {
        setLoading(false);
        setError(emailError.message.includes('already been registered') ? t('auth.email_taken') : emailError.message);
        return;
      }

      // Set password
      const { error: pwError } = await supabase.auth.updateUser({
        password,
      });

      if (pwError) {
        setLoading(false);
        setError(pwError.message);
        return;
      }

      // Check if email confirmation is needed
      const { data: { session } } = await supabase.auth.getSession();
      setLoading(false);

      if (session && !session.user.is_anonymous) {
        // No email confirmation — user is now permanent
        router.replace('/(tabs)');
      } else {
        // Email confirmation sent — show check email screen
        setSuccess(true);
      }
    } else {
      // New user (not anonymous) — standard signUp
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
        // Email confirmation required
        setSuccess(true);
      }
    }
  }

  async function handleRetryLogin() {
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (!authError) {
      router.replace('/(tabs)');
    } else {
      setError(t('auth.check_email'));
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
          <Text style={{ fontSize: FONT_SIZE.heading, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8 }}>
            {t('auth.check_email')}
          </Text>
          <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32 }}>
            {email}
          </Text>
          <Button
            title={t('auth.confirmed_login')}
            onPress={handleRetryLogin}
            loading={loading}
          />
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={{ marginTop: 16, paddingVertical: 12 }}
          >
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.accent }}>
              {t('auth.sign_in')}
            </Text>
          </Pressable>
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
          {/* Back button */}
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingEnd: 16, marginBottom: 16 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Text style={{ fontSize: 16, color: COLORS.accent }}>{'\u2190'} {t('common.back')}</Text>
          </Pressable>

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
