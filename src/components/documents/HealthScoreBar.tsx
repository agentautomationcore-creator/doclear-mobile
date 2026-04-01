import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
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
  const progress = useSharedValue(0);
  const color = getScoreColor(score);

  useEffect(() => {
    progress.value = withTiming(score, { duration: 800 });
  }, [score, progress]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%` as any,
  }));

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
            style={[
              {
                height: 4,
                borderRadius: 2,
                backgroundColor: color,
              },
              animatedBarStyle,
            ]}
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
            marginStart: 4,
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
          style={[
            {
              height: 8,
              borderRadius: 4,
              backgroundColor: color,
            },
            animatedBarStyle,
          ]}
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
