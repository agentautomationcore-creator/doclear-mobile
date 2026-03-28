import React from 'react';
import { Pressable, Text, ActivityIndicator, type ViewStyle, type TextStyle } from 'react-native';
import { COLORS, RADIUS, MIN_TOUCH, FONT_SIZE } from '../../lib/constants';
import { useResponsive } from '../../hooks/useResponsive';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

const VARIANT_BG: Record<Variant, string> = {
  primary: COLORS.accent,
  secondary: 'transparent',
  danger: COLORS.danger,
};

const VARIANT_TEXT: Record<Variant, string> = {
  primary: '#FFFFFF',
  secondary: COLORS.accent,
  danger: '#FFFFFF',
};

const VARIANT_BORDER: Record<Variant, string> = {
  primary: COLORS.accent,
  secondary: COLORS.accent,
  danger: COLORS.danger,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { isDesktop } = useResponsive();
  const bgColor = VARIANT_BG[variant];
  const textColor = VARIANT_TEXT[variant];
  const borderColor = VARIANT_BORDER[variant];

  const containerStyle: ViewStyle = {
    minHeight: MIN_TOUCH,
    borderRadius: RADIUS.button,
    backgroundColor: disabled ? '#D1D5DB' : bgColor,
    borderWidth: variant === 'secondary' ? 1.5 : 0,
    borderColor: disabled ? '#D1D5DB' : borderColor,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    opacity: disabled ? 0.6 : 1,
    ...(isDesktop ? { maxWidth: 400, alignSelf: 'center' as const, width: '100%' as any } : {}),
    ...style,
  };

  const textStyle: TextStyle = {
    color: disabled ? '#9CA3AF' : textColor,
    fontSize: FONT_SIZE.body,
    fontWeight: '600',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        containerStyle,
        pressed && !disabled && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text allowFontScaling style={textStyle}>{title}</Text>
      )}
    </Pressable>
  );
}
