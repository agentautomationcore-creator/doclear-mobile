import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setLanguage, SUPPORTED_LANGUAGES } from '../../i18n';
import { useUIStore } from '../../store/ui.store';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH } from '../../lib/constants';
import { LOCALE_NAMES } from '../../types';
import type { Locale } from '../../types';

interface LanguagePickerProps {
  compact?: boolean;
  lightText?: boolean;
}

export function LanguagePicker({ compact = false, lightText = false }: LanguagePickerProps) {
  const { i18n, t } = useTranslation();
  const setLocale = useUIStore((s) => s.setLocale);
  const [visible, setVisible] = useState(false);

  const currentLang = (i18n.language || 'en') as Locale;
  const currentCode = currentLang.toUpperCase();

  const handleSelect = async (lang: string) => {
    await setLanguage(lang);
    setLocale(lang as Locale);
    setVisible(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: compact ? 8 : 12,
          paddingVertical: compact ? 6 : 8,
          borderRadius: RADIUS.button,
          backgroundColor: compact ? 'transparent' : '#F3F4F6',
          minHeight: MIN_TOUCH,
          justifyContent: 'center',
        }}
        accessibilityRole="button"
        accessibilityLabel={t('profile.language')}
      >
        <Text
          style={{
            fontSize: compact ? 12 : FONT_SIZE.caption,
            fontWeight: '600',
            color: lightText ? '#FFFFFF' : COLORS.textPrimary,
          }}
        >
          {currentCode} {'\u25BE'}
        </Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: COLORS.background,
              borderRadius: 20,
              padding: 8,
              width: 280,
              maxHeight: 480,
              ...(Platform.OS === 'ios'
                ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.15,
                    shadowRadius: 24,
                  }
                : { elevation: 12 }),
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = lang === currentLang;
              const name = LOCALE_NAMES[lang as Locale] ?? lang;

              return (
                <Pressable
                  key={lang}
                  onPress={() => handleSelect(lang)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: isActive ? COLORS.accent + '10' : 'transparent',
                    minHeight: MIN_TOUCH,
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: FONT_SIZE.body,
                      fontWeight: isActive ? '700' : '400',
                      color: isActive ? COLORS.accent : COLORS.textPrimary,
                    }}
                  >
                    {name}
                  </Text>
                  {isActive ? (
                    <Text style={{ fontSize: 16, color: COLORS.accent, fontWeight: '700' }}>
                      {'\u2713'}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
