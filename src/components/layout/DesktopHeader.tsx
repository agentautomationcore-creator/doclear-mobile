import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, FONT_SIZE, MIN_TOUCH } from '../../lib/constants';
import { LanguagePicker } from '../ui/LanguagePicker';

interface NavLink {
  label: string;
  href: string;
  match: string;
}

export function DesktopHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const links: NavLink[] = [
    { label: t('tabs.documents'), href: '/(tabs)', match: '/(tabs)' },
    { label: t('tabs.scanner'), href: '/(tabs)/scan', match: '/scan' },
    { label: t('tabs.assistant'), href: '/(tabs)/assistant', match: '/assistant' },
  ];

  return (
    <View
      style={{
        height: 64,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
      }}
    >
      {/* Logo */}
      <Pressable
        onPress={() => router.push('/')}
        accessibilityRole="button"
        accessibilityLabel="DocLear home"
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: '800',
            color: COLORS.textPrimary,
          }}
        >
          DocLear
        </Text>
      </Pressable>

      {/* Nav links center */}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {links.map((link) => {
          const isActive = pathname.includes(link.match);
          return (
            <Pressable
              key={link.href}
              onPress={() => router.push(link.href as any)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 4,
                minHeight: MIN_TOUCH,
                justifyContent: 'center',
              }}
              accessibilityRole="button"
            >
              <Text
                style={{
                  fontSize: FONT_SIZE.caption,
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? COLORS.accent : COLORS.textSecondary,
                }}
              >
                {link.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Right side */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <LanguagePicker compact />
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={t('tabs.profile')}
        >
          <Text style={{ fontSize: 16, color: COLORS.textSecondary }}>{'\u{1F464}'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
