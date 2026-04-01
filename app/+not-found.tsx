import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../src/components/ui/Button';
import { COLORS, FONT_SIZE } from '../src/lib/constants';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            fontSize: 48,
            fontWeight: '800',
            color: COLORS.textPrimary,
            marginBottom: 8,
          }}
        >
          404
        </Text>
        <Text
          style={{
            fontSize: FONT_SIZE.heading,
            fontWeight: '600',
            color: COLORS.textPrimary,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {t('not_found.title')}
        </Text>
        <Text
          style={{
            fontSize: FONT_SIZE.body,
            color: COLORS.textSecondary,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          {t('not_found.description')}
        </Text>
        <Link href="/" asChild>
          <Button title={t('not_found.go_home')} onPress={() => {}} />
        </Link>
      </View>
    </SafeAreaView>
  );
}
