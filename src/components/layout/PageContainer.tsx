import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

interface PageContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function PageContainer({ children, style }: PageContainerProps) {
  const { isMobile, maxContent } = useResponsive();

  return (
    <View
      style={[
        {
          flex: 1,
          width: '100%',
          maxWidth: isMobile ? undefined : maxContent,
          alignSelf: 'center',
          paddingHorizontal: isMobile ? 0 : 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
