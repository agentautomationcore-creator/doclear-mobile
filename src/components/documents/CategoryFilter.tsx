import React from 'react';
import { ScrollView, Pressable, Text } from 'react-native';
import { COLORS, RADIUS, MIN_TOUCH } from '../../lib/constants';
import { useTranslation } from 'react-i18next';
import type { Category } from '../../types';

const CATEGORIES: Array<Category | 'all'> = [
  'all',
  'taxes',
  'insurance',
  'bank',
  'housing',
  'health',
  'employment',
  'legal',
  'other',
];

interface CategoryFilterProps {
  selected: Category | 'all';
  onSelect: (category: Category | 'all') => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      style={{ flexGrow: 0, marginBottom: 12 }}
    >
      {CATEGORIES.map((cat) => {
        const isActive = cat === selected;
        const label = cat === 'all' ? t('timeline.filter_all') : t(`categories.${cat}`);
        return (
          <Pressable
            key={cat}
            onPress={() => onSelect(cat)}
            style={{
              minHeight: MIN_TOUCH,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: RADIUS.button,
              backgroundColor: isActive ? COLORS.accent : '#F3F4F6',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: isActive ? '#FFFFFF' : COLORS.textSecondary,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
