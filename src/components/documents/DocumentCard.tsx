import React from 'react';
import { View, Text, Pressable, type ViewStyle, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH } from '../../lib/constants';
import { HealthScoreBar } from './HealthScoreBar';
import type { Document, DocType } from '../../types';

interface DocumentCardProps {
  document: Document;
  onPress: () => void;
  showOfflineBadge?: boolean;
}

const DOC_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  lease: { bg: '#dbeafe', text: '#1e40af' },
  nda: { bg: '#fce7f3', text: '#9d174d' },
  employment: { bg: '#d1fae5', text: '#065f46' },
  medical: { bg: '#fef3c7', text: '#92400e' },
  tax: { bg: '#fee2e2', text: '#991b1b' },
  insurance: { bg: '#e0e7ff', text: '#3730a3' },
  court: { bg: '#fce7f3', text: '#9d174d' },
  invoice: { bg: '#f3e8ff', text: '#6b21a8' },
  academic: { bg: '#cffafe', text: '#155e75' },
  other: { bg: '#f3f4f6', text: '#374151' },
};

const shadowStyle: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: {
    elevation: 3,
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
}) as ViewStyle;

export const DocumentCard = React.memo(function DocumentCard({ document, onPress, showOfflineBadge = false }: DocumentCardProps) {
  const { t } = useTranslation();
  const docTypeColors = DOC_TYPE_COLORS[document.docType ?? 'other'] ?? DOC_TYPE_COLORS.other;
  const dateStr = (() => {
    try {
      return formatDistanceToNow(new Date(document.createdAt), { addSuffix: true });
    } catch {
      return '';
    }
  })();

  const scoreText = typeof document.healthScore === 'number' ? `, Health Score ${document.healthScore}` : '';
  const label = `${document.title}, ${document.docTypeLabel ?? document.docType ?? 'Document'}${scoreText}, ${dateStr}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: COLORS.background,
          borderRadius: RADIUS.card,
          padding: 16,
          marginBottom: 12,
          minHeight: MIN_TOUCH,
          ...shadowStyle,
        },
        pressed && { opacity: 0.9 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text
          numberOfLines={1}
          allowFontScaling
          style={{
            flex: 1,
            fontSize: FONT_SIZE.body,
            fontWeight: '600',
            color: COLORS.textPrimary,
          }}
        >
          {document.title}
        </Text>
        {showOfflineBadge ? (
          <View
            style={{
              backgroundColor: '#E5E7EB',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              marginStart: 8,
            }}
          >
            <Text allowFontScaling style={{ fontSize: 10, fontWeight: '600', color: '#6B7280' }}>
              {t('common.offline')}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <View
          style={{
            backgroundColor: docTypeColors.bg,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
          }}
        >
          <Text allowFontScaling style={{ fontSize: 11, fontWeight: '600', color: docTypeColors.text }}>
            {document.docTypeLabel ?? document.docType ?? 'Document'}
          </Text>
        </View>
        {document.deadline ? (
          <View
            style={{
              backgroundColor: '#fef2f2',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text allowFontScaling style={{ fontSize: 11, fontWeight: '600', color: COLORS.danger }}>
              {document.deadlineDescription ?? document.deadline}
            </Text>
          </View>
        ) : null}
      </View>

      {typeof document.healthScore === 'number' ? (
        <View style={{ marginBottom: 8 }}>
          <HealthScoreBar score={document.healthScore} compact />
        </View>
      ) : null}

      <Text allowFontScaling style={{ fontSize: 12, color: COLORS.textSecondary }}>
        {dateStr}
      </Text>
    </Pressable>
  );
});
