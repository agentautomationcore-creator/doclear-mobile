import React, { type ReactNode } from 'react';
import { View, type ViewStyle, Platform } from 'react-native';
import { COLORS, RADIUS } from '../../lib/constants';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
}

export const Card = React.memo(function Card({ children, style }: CardProps) {
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

  return (
    <View
      accessible
      accessibilityRole="summary"
      style={[
        {
          backgroundColor: COLORS.background,
          borderRadius: RADIUS.card,
          padding: 16,
          ...shadowStyle,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
});
