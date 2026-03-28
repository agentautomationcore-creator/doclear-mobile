import React from 'react';
import { Pressable, Text } from 'react-native';
import { COLORS } from '../../lib/constants';

interface CitationChipProps {
  page: number;
  onPress: (page: number) => void;
}

export function CitationChip({ page, onPress }: CitationChipProps) {
  return (
    <Pressable
      onPress={() => onPress(page)}
      style={{
        backgroundColor: COLORS.accent + '15',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginHorizontal: 2,
      }}
      accessibilityRole="button"
      accessibilityLabel={`Page ${page}`}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.accent }}>
        p.{page}
      </Text>
    </Pressable>
  );
}
