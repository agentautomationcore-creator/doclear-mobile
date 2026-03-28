import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../src/lib/constants';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguagePicker } from '../../src/components/ui/LanguagePicker';
import { DesktopHeader } from '../../src/components/layout/DesktopHeader';
import { useResponsive } from '../../src/hooks/useResponsive';

function HeaderRight() {
  return (
    <View style={{ marginRight: 12 }}>
      <LanguagePicker compact />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();

  return (
    <View style={{ flex: 1 }}>
      {!isMobile && <DesktopHeader />}
      <Tabs
        screenOptions={{
          headerShown: isMobile,
          headerRight: () => <HeaderRight />,
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: '700',
            color: COLORS.textPrimary,
          },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle: isMobile
            ? {
                backgroundColor: COLORS.background,
                borderTopColor: COLORS.border,
                borderTopWidth: 1,
                paddingTop: 8,
                paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                height: Platform.OS === 'ios' ? 88 : 64,
              }
            : { display: 'none' },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.documents'),
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name="document-text-outline"
                size={22}
                color={color}
              />
            ),
            tabBarAccessibilityLabel: t('tabs.documents'),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: t('tabs.scanner'),
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name="camera-outline" size={22} color={color} />
            ),
            tabBarAccessibilityLabel: t('tabs.scanner'),
          }}
        />
        <Tabs.Screen
          name="assistant"
          options={{
            title: t('tabs.assistant'),
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name="chatbubble-outline"
                size={22}
                color={color}
              />
            ),
            tabBarAccessibilityLabel: t('tabs.assistant'),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tabs.profile'),
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name="person-outline" size={22} color={color} />
            ),
            tabBarAccessibilityLabel: t('tabs.profile'),
          }}
        />
      </Tabs>
    </View>
  );
}
