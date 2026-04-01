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
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH } from '../../src/lib/constants';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email || !password) return;

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      setError(t('auth.invalid_credentials'));
    } else {
      router.replace('/(tabs)');
    }
  }

  async function handleAppleSignIn() {
    try {
      const AppleAuth = await import('expo-apple-authentication');
      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.EMAIL,
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
        ],
      });

      if (credential.identityToken) {
        const { error: authError } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (authError) {
          setError(authError.message);
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (e: unknown) {
      if (!(e && typeof e === 'object' && 'code' in e && e.code === 'ERR_REQUEST_CANCELED')) {
        setError(t('errors.apple_signin_failed'));
      }
    }
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
            {t('auth.sign_in')}
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

          {/* Apple Sign-In — per Apple HIG: black bg, white text, Apple logo */}
          {Platform.OS === 'ios' ? (
            <Pressable
              onPress={handleAppleSignIn}
              style={{
                minHeight: 52,
                borderRadius: 12,
                backgroundColor: '#000000',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                marginBottom: 16,
              }}
              accessibilityRole="button"
              accessibilityLabel={t('auth.with_apple')}
            >
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
              <Text style={{ fontSize: FONT_SIZE.body, color: '#FFFFFF', fontWeight: '600' }}>
                {t('auth.with_apple')}
              </Text>
            </Pressable>
          ) : null}

          {/* Divider */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
            <Text
              style={{
                paddingHorizontal: 16,
                fontSize: FONT_SIZE.caption,
                color: COLORS.textSecondary,
              }}
            >
              {t('auth.or')}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
          </View>

          {/* Email/Password */}
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
            textContentType="password"
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
            title={t('auth.sign_in')}
            onPress={handleLogin}
            loading={loading}
            disabled={!email || !password}
          />

          <Link href="/(auth)/forgot-password" asChild>
            <Pressable
              style={{
                minHeight: MIN_TOUCH,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  fontSize: FONT_SIZE.caption,
                  color: COLORS.accent,
                }}
              >
                {t('auth.forgot_password')}
              </Text>
            </Pressable>
          </Link>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 24,
            }}
          >
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary }}>
              {t('auth.no_account')}{' '}
            </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable style={{ minHeight: MIN_TOUCH, justifyContent: 'center' }}>
                <Text
                  style={{
                    fontSize: FONT_SIZE.caption,
                    color: COLORS.accent,
                    fontWeight: '600',
                  }}
                >
                  {t('auth.create_account')}
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
