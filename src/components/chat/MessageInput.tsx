import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, Platform } from 'react-native';
import { COLORS, FONT_SIZE, MIN_TOUCH } from '../../lib/constants';

interface MessageInputProps {
  placeholder: string;
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function MessageInput({ placeholder, onSend, disabled = false }: MessageInputProps) {
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 8,
        paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.06)',
        gap: 8,
      }}
    >
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        multiline
        maxLength={4000}
        allowFontScaling
        accessibilityLabel={placeholder}
        style={{
          flex: 1,
          minHeight: MIN_TOUCH,
          maxHeight: 120,
          borderWidth: 1.5,
          borderColor: 'rgba(0,0,0,0.1)',
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 10,
          fontSize: FONT_SIZE.body,
          color: COLORS.textPrimary,
          backgroundColor: '#F9FAFB',
        }}
        editable={!disabled}
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
        returnKeyType="send"
      />
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        style={{
          width: MIN_TOUCH,
          height: MIN_TOUCH,
          borderRadius: MIN_TOUCH / 2,
          backgroundColor: canSend ? COLORS.accent : '#D1D5DB',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityRole="button"
        accessibilityLabel="Send"
      >
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
          {'\u2191'}
        </Text>
      </Pressable>
    </View>
  );
}
