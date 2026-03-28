import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, FONT_SIZE } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';
import { FREE_DOC_LIMIT, REGISTERED_FREE_DOC_LIMIT, FREE_QUESTION_LIMIT } from '../../store/auth.store';

export function ScanCounter() {
  const { plan, scanCount, dailyQuestions, isAnonymous } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  if (plan === 'pro' || plan === 'year' || plan === 'lifetime' || plan === 'trial') return null;

  const docLimit = isAnonymous ? FREE_DOC_LIMIT : REGISTERED_FREE_DOC_LIMIT;
  const docsRemaining = Math.max(0, docLimit - scanCount);
  const questionsRemaining = Math.max(0, FREE_QUESTION_LIMIT - dailyQuestions);

  return (
    <Pressable
      onPress={() => router.push('/paywall')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: docsRemaining <= 1 ? '#fef2f2' : '#f0f9ff',
        borderRadius: 10,
        marginHorizontal: 16,
        marginBottom: 12,
      }}
      accessibilityRole="button"
    >
      <Text
        style={{
          fontSize: FONT_SIZE.caption,
          color: docsRemaining <= 1 ? COLORS.danger : COLORS.textSecondary,
          fontWeight: '500',
        }}
      >
        {t('profile.free_documents', { used: scanCount, total: docLimit })} {'\u00B7'} {questionsRemaining} {t('profile.questions_today')}
      </Text>
      <Text
        style={{
          fontSize: FONT_SIZE.caption,
          color: COLORS.accent,
          fontWeight: '600',
          marginLeft: 8,
        }}
      >
        {t('profile.subscribe_pro')}
      </Text>
    </Pressable>
  );
}
