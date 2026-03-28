import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH } from '../../lib/constants';

interface ErrorStateProps {
  type: 'network' | 'server' | 'ai_overloaded' | 'upload_failed' | 'file_too_large' | 'generic';
  onRetry?: () => void;
  message?: string;
}

export function ErrorState({ type, onRetry, message }: ErrorStateProps) {
  const { t } = useTranslation();

  const config: Record<string, { icon: string; title: string; description: string }> = {
    network: {
      icon: '\uD83D\uDCF6',
      title: t('error.no_internet'),
      description: t('error.no_internet_desc'),
    },
    server: {
      icon: '\u26A0\uFE0F',
      title: t('error.server'),
      description: t('error.server_desc'),
    },
    ai_overloaded: {
      icon: '\u23F3',
      title: t('error.ai_overloaded'),
      description: t('error.ai_overloaded_desc'),
    },
    upload_failed: {
      icon: '\u274C',
      title: t('error.upload_failed'),
      description: t('error.upload_failed_desc'),
    },
    file_too_large: {
      icon: '\uD83D\uDCC4',
      title: t('error.file_too_large'),
      description: t('error.file_too_large_desc'),
    },
    generic: {
      icon: '\u26A0\uFE0F',
      title: t('error.generic'),
      description: message ?? t('error.generic_desc'),
    },
  };

  const { icon, title, description } = config[type] ?? config.generic;

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      accessibilityRole="alert"
    >
      <Text style={{ fontSize: 48, marginBottom: 16 }}>{icon}</Text>
      <Text
        style={{
          fontSize: FONT_SIZE.body,
          fontWeight: '700',
          color: COLORS.textPrimary,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: FONT_SIZE.caption,
          color: COLORS.textSecondary,
          textAlign: 'center',
          lineHeight: 20,
          maxWidth: 300,
          marginBottom: 24,
        }}
      >
        {description}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={{
            backgroundColor: COLORS.accent,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: RADIUS.button,
            minHeight: MIN_TOUCH,
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={t('error.retry')}
        >
          <Text style={{ color: '#FFFFFF', fontSize: FONT_SIZE.body, fontWeight: '600' }}>
            {t('error.retry')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Inline error banner (for top of screens).
 */
export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <View
      style={{
        backgroundColor: '#FEF2F2',
        borderBottomWidth: 1,
        borderBottomColor: '#FECACA',
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      accessibilityRole="alert"
    >
      <Text style={{ flex: 1, fontSize: 13, color: '#DC2626', fontWeight: '500' }}>
        {message}
      </Text>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          style={{ padding: 4 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Text style={{ fontSize: 16, color: '#DC2626' }}>{'\u2715'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Offline banner.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  return (
    <View
      style={{
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: 'center',
      }}
      accessibilityRole="alert"
    >
      <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '600' }}>
        {t('error.offline_mode')}
      </Text>
    </View>
  );
}
