import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH } from '../src/lib/constants';
import { Button } from '../src/components/ui/Button';
import { mmkvStorage, MMKV_KEYS } from '../src/lib/mmkv';

export const AI_CONSENT_KEY = MMKV_KEYS.AI_CONSENT;

export default function AIConsentScreen() {
  const router = useRouter();

  const handleAgree = () => {
    mmkvStorage.setBoolean(MMKV_KEYS.AI_CONSENT, true);
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: COLORS.accent + '15',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 28 }}>AI</Text>
          </View>
          <Text
            style={{
              fontSize: FONT_SIZE.heading,
              fontWeight: '800',
              color: COLORS.textPrimary,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            How DocLear analyzes your documents
          </Text>
        </View>

        {/* Explanation */}
        <View style={{ gap: 20, marginBottom: 32 }}>
          <View>
            <Text
              style={{
                fontSize: FONT_SIZE.body,
                fontWeight: '700',
                color: COLORS.textPrimary,
                marginBottom: 6,
              }}
            >
              AI-Powered Analysis
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZE.caption,
                color: COLORS.textSecondary,
                lineHeight: 22,
              }}
            >
              DocLear uses Anthropic's Claude AI to analyze your documents. When you upload a document, its contents are sent to Anthropic's API for processing.
            </Text>
          </View>

          <View>
            <Text
              style={{
                fontSize: FONT_SIZE.body,
                fontWeight: '700',
                color: COLORS.textPrimary,
                marginBottom: 6,
              }}
            >
              Your data is not used for training
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZE.caption,
                color: COLORS.textSecondary,
                lineHeight: 22,
              }}
            >
              Your documents are processed solely to provide you with analysis results. They are not stored by Anthropic and are not used to train AI models.
            </Text>
          </View>

          <View>
            <Text
              style={{
                fontSize: FONT_SIZE.body,
                fontWeight: '700',
                color: COLORS.textPrimary,
                marginBottom: 6,
              }}
            >
              Processing only
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZE.caption,
                color: COLORS.textSecondary,
                lineHeight: 22,
              }}
            >
              Document content is transmitted securely (encrypted in transit) and processed in real-time. No copies are retained after analysis is complete.
            </Text>
          </View>

          <View>
            <Text
              style={{
                fontSize: FONT_SIZE.body,
                fontWeight: '700',
                color: COLORS.textPrimary,
                marginBottom: 6,
              }}
            >
              EU data protection
            </Text>
            <Text
              style={{
                fontSize: FONT_SIZE.caption,
                color: COLORS.textSecondary,
                lineHeight: 22,
              }}
            >
              Your analyzed results are stored on EU servers (Supabase). DocLear complies with GDPR requirements.
            </Text>
          </View>
        </View>

        {/* Agree button */}
        <Button
          title="I agree"
          onPress={handleAgree}
          style={{ marginBottom: 16 }}
        />

        {/* Learn more */}
        <Pressable
          onPress={() => Linking.openURL('https://doclear.app/privacy')}
          style={{ alignItems: 'center', paddingVertical: 12, minHeight: MIN_TOUCH }}
          accessibilityRole="link"
        >
          <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.accent }}>
            Learn more about our privacy practices
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
