import React, { useState } from 'react';
import { Pressable, Text, ActivityIndicator, type ViewStyle, type TextStyle } from 'react-native';
import { COLORS, RADIUS, MIN_TOUCH, FONT_SIZE } from '../../lib/constants';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);

  const bgColor = variant === 'primary' ? '#1E293B'
    : variant === 'secondary' ? '#FFFFFF'
    : COLORS.danger;

  const textColor = variant === 'secondary' ? '#1E293B' : '#FFFFFF';

  const borderColor = variant === 'primary' ? '#1E293B'
    : variant === 'secondary' ? '#E5E7EB'
    : COLORS.danger;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled || loading}
      style={{
        minHeight: 52,
        borderRadius: 12,
        backgroundColor: disabled ? '#D1D5DB' : bgColor,
        borderWidth: variant === 'secondary' ? 1.5 : 0,
        borderColor: disabled ? '#D1D5DB' : borderColor,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
        ...style,
      }}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text
          allowFontScaling
          style={{
            color: disabled ? '#9CA3AF' : textColor,
            fontSize: 16,
            fontWeight: '600',
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
