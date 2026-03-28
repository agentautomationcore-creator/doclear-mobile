import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Button } from '../src/components/ui/Button';
import { COLORS, FONT_SIZE } from '../src/lib/constants';

export default function NotFoundScreen() {
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
          Page not found
        </Text>
        <Text
          style={{
            fontSize: FONT_SIZE.body,
            color: COLORS.textSecondary,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          The page you are looking for does not exist.
        </Text>
        <Link href="/" asChild>
          <Button title="Go home" onPress={() => {}} />
        </Link>
      </View>
    </SafeAreaView>
  );
}
