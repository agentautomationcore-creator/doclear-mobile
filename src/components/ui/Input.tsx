import React, { useState } from 'react';
import { View, TextInput, Text, type TextInputProps, type ViewStyle } from 'react-native';
import { COLORS, RADIUS, FONT_SIZE } from '../../lib/constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, style, ...rest }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? COLORS.danger
    : isFocused
    ? COLORS.accent
    : COLORS.border;

  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      {label ? (
        <Text
          allowFontScaling
          style={{
            fontSize: FONT_SIZE.caption,
            color: COLORS.textSecondary,
            marginBottom: 6,
            fontWeight: '500',
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        style={[
          {
            height: 48,
            borderWidth: 1.5,
            borderColor,
            borderRadius: RADIUS.button,
            paddingHorizontal: 16,
            fontSize: FONT_SIZE.body, // 16px prevents iOS zoom
            color: COLORS.textPrimary,
            backgroundColor: COLORS.background,
          },
          style,
        ]}
        placeholderTextColor={COLORS.textSecondary}
        allowFontScaling
        accessibilityLabel={label ?? rest.placeholder ?? undefined}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...rest}
      />
      {error ? (
        <Text
          allowFontScaling
          accessibilityRole="alert"
          style={{
            fontSize: FONT_SIZE.caption,
            color: COLORS.danger,
            marginTop: 4,
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
