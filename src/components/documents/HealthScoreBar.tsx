import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { COLORS, FONT_SIZE, RADIUS } from '../../lib/constants';

interface HealthScoreBarProps {
  score: number;
  explanation?: string;
  compact?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return COLORS.success;
  if (score >= 50) return COLORS.warning;
  return COLORS.danger;
}

function getScoreBg(score: number): string {
  if (score >= 80) return '#f0fdf4';
  if (score >= 50) return '#fffbeb';
  return '#fef2f2';
}

export function HealthScoreBar({ score, explanation, compact = false }: HealthScoreBarProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const color = getScoreColor(score);

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: score,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [score, animatedWidth]);

  if (compact) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View
          style={{
            flex: 1,
            height: 4,
            backgroundColor: '#E5E7EB',
            borderRadius: 2,
          }}
        >
          <Animated.View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: color,
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color,
          }}
        >
          {score}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: getScoreBg(score),
        borderRadius: RADIUS.card,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: '800',
            color,
          }}
        >
          {score}
        </Text>
        <Text
          style={{
            fontSize: FONT_SIZE.body,
            color: COLORS.textSecondary,
            marginLeft: 4,
            marginTop: 8,
          }}
        >
          /100
        </Text>
      </View>
      <View
        style={{
          height: 8,
          backgroundColor: 'rgba(0,0,0,0.08)',
          borderRadius: 4,
          marginBottom: explanation ? 8 : 0,
        }}
      >
        <Animated.View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
            width: animatedWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
      </View>
      {explanation ? (
        <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary }}>
          {explanation}
        </Text>
      ) : null}
    </View>
  );
}
