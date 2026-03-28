import React, { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { COLORS, FONT_SIZE } from '../../lib/constants';
import { CitationChip } from './CitationChip';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  onCitationPress?: (page: number) => void;
}

// Parse text and extract [p.N] citations
function renderContent(
  text: string,
  onCitationPress?: (page: number) => void
): React.ReactNode[] {
  const parts = text.split(/(\[p\.\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[p\.(\d+)\]$/);
    if (match && onCitationPress) {
      const pageNum = parseInt(match[1], 10);
      return <CitationChip key={i} page={pageNum} onPress={onCitationPress} />;
    }
    return (
      <Text key={i} style={{ fontSize: FONT_SIZE.body }}>
        {part}
      </Text>
    );
  });
}

export function ChatBubble({ role, content, isStreaming, onCitationPress }: ChatBubbleProps) {
  const isUser = role === 'user';
  const [showReport, setShowReport] = useState(false);
  const { t } = useTranslation();

  const handleLongPress = () => {
    if (!isUser) {
      Alert.alert(
        t('chat.report_title'),
        t('chat.report_desc'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('chat.report'),
            onPress: () => {
              Linking.openURL(
                `mailto:support@doclear.app?subject=AI Response Report&body=Reported response:\n\n${content.slice(0, 500)}`
              );
            },
          },
        ]
      );
    }
  };

  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: isUser ? '80%' : '85%',
        marginBottom: 12,
      }}
    >
      <Pressable onLongPress={handleLongPress} delayLongPress={500}>
        <View
          style={{
            backgroundColor: isUser ? COLORS.accent : '#F3F4F6',
            borderRadius: 16,
            borderBottomRightRadius: isUser ? 4 : 16,
            borderBottomLeftRadius: isUser ? 16 : 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{
              color: isUser ? '#FFFFFF' : COLORS.textPrimary,
              fontSize: FONT_SIZE.body,
              lineHeight: 22,
              flexDirection: 'row',
              flexWrap: 'wrap',
            }}
          >
            {isUser ? content : renderContent(content, onCitationPress)}
          </Text>
          {isStreaming ? (
            <Text
              style={{
                color: isUser ? 'rgba(255,255,255,0.6)' : COLORS.textSecondary,
                fontSize: 12,
                marginTop: 4,
              }}
            >
              ...
            </Text>
          ) : null}
        </View>
      </Pressable>
      {/* AI disclaimer label on assistant messages */}
      {!isUser && !isStreaming ? (
        <Text
          style={{
            fontSize: 11,
            color: COLORS.textSecondary,
            marginTop: 4,
            marginLeft: 4,
          }}
        >
          {t('chat.ai_generated')} {'\u00B7'} {t('chat.verify')}
        </Text>
      ) : null}
    </View>
  );
}
