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

  async function handleGoogleSignIn() {
    // Google OAuth will be implemented with expo-auth-session
    // Placeholder for Stage 2
    setError('Google Sign-In coming soon');
  }

  async function handleAppleSignIn() {
    // Apple Sign In will be implemented with expo-apple-authentication
    // Placeholder for Stage 2
    setError('Apple Sign-In coming soon');
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

          {/* Social Sign-In Buttons */}
          <Pressable
            onPress={handleGoogleSignIn}
            style={({ pressed }) => ({
              minHeight: MIN_TOUCH,
              borderRadius: RADIUS.button,
              borderWidth: 1.5,
              borderColor: COLORS.border,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              marginBottom: 12,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textPrimary, fontWeight: '500' }}>
              {t('auth.with_google')}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleAppleSignIn}
            style={({ pressed }) => ({
              minHeight: MIN_TOUCH,
              borderRadius: RADIUS.button,
              backgroundColor: '#000000',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              marginBottom: 24,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: FONT_SIZE.body, color: '#FFFFFF', fontWeight: '500' }}>
              {t('auth.with_apple')}
            </Text>
          </Pressable>

          {/* Divider */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 24,
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
