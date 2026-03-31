import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH, API_URL } from '../../src/lib/constants';
import { useDocumentsList } from '../../src/hooks/useDocuments';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/lib/supabase';
import { ListSkeleton } from '../../src/components/ui/Loading';
import { Card } from '../../src/components/ui/Card';
import { PageContainer } from '../../src/components/layout/PageContainer';

const CATEGORY_COLORS: Record<string, string> = {
  taxes: '#3B82F6',
  insurance: '#8B5CF6',
  bank: '#10B981',
  fines: '#EF4444',
  housing: '#F59E0B',
  health: '#EF4444',
  employment: '#6366F1',
  legal: '#3B82F6',
  other: '#64748B',
};

export default function OverviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { data: docsData, isLoading } = useDocumentsList('all', '');
  const [summaryData, setSummaryData] = useState<{ totalToPay?: string; totalToReceive?: string; aiRecommendation?: string } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const documents = React.useMemo(() => {
    if (!docsData?.pages) return [];
    return docsData.pages.flatMap((p) => p.documents);
  }, [docsData]);

  const totalDocs = documents.length;

  // Count by category
  const byCategory = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const doc of documents) {
      counts[doc.category] = (counts[doc.category] || 0) + 1;
    }
    return counts;
  }, [documents]);

  // Upcoming deadlines (sorted by date, max 5)
  const deadlines = React.useMemo(() => {
    const now = new Date();
    return documents
      .filter((d) => d.deadline)
      .map((d) => {
        const deadlineDate = new Date(d.deadline!);
        const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...d, deadlineDate, daysLeft };
      })
      .filter((d) => d.daysLeft >= -7) // include up to 7 days overdue
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
  }, [documents]);

  // Load AI summary
  useEffect(() => {
    if (!user?.id || totalDocs === 0 || summaryData) return;
    setSummaryLoading(true);
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        const res = await fetch(`${API_URL}/summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({}),
        });
        if (res.ok) {
          setSummaryData(await res.json());
        }
      } catch {
        // Silent
      } finally {
        setSummaryLoading(false);
      }
    })();
  }, [user?.id, totalDocs, summaryData]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <PageContainer>
          <ListSkeleton count={4} />
        </PageContainer>
      </SafeAreaView>
    );
  }

  // Empty state
  if (totalDocs === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <PageContainer>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
            <Ionicons name="bar-chart-outline" size={40} color={COLORS.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textSecondary, textAlign: 'center' }}>
              {t('overview.empty')}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/scan')}
              style={{
                marginTop: 20,
                backgroundColor: COLORS.accent,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: RADIUS.button,
              }}
              accessibilityRole="button"
              accessibilityLabel={t('timeline.scan_first')}
            >
              <Text style={{ color: '#FFFFFF', fontSize: FONT_SIZE.body, fontWeight: '600' }}>
                {t('timeline.scan_first')}
              </Text>
            </Pressable>
          </View>
        </PageContainer>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <PageContainer>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Total documents */}
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textSecondary }}>
              {t('overview.documents_analyzed', { count: totalDocs })}
            </Text>
          </Card>

          {/* By category */}
          {Object.keys(byCategory).length > 0 ? (
            <Card style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>
                {t('overview.by_category')}
              </Text>
              {Object.entries(byCategory).map(([cat, count]) => (
                <Pressable
                  key={cat}
                  onPress={() => router.push('/(tabs)')}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' }}
                  accessibilityRole="button"
                  accessibilityLabel={t(`categories.${cat}`)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: CATEGORY_COLORS[cat] || COLORS.textSecondary,
                        marginRight: 10,
                      }}
                    />
                    <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textPrimary }}>
                      {t(`categories.${cat}`)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: COLORS.accent }}>
                      {count as number}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{'\u203A'}</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          ) : null}

          {/* Upcoming deadlines */}
          {deadlines.length > 0 ? (
            <Card style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>
                {t('overview.deadlines')}
              </Text>
              {deadlines.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => router.push(`/doc/${d.id}`)}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(0,0,0,0.04)',
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.title} — ${d.deadline}`}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text numberOfLines={1} style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: COLORS.textPrimary }}>
                      {d.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                      {d.deadline}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: d.daysLeft <= 0 ? '#fef2f2' : d.daysLeft <= 3 ? '#FEF3C7' : '#F0FDF4',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: d.daysLeft <= 0 ? COLORS.danger : d.daysLeft <= 3 ? '#92400E' : COLORS.success,
                      }}
                    >
                      {d.daysLeft < 0
                        ? t('timeline.overdue')
                        : d.daysLeft === 0
                        ? t('timeline.today')
                        : t('timeline.days_left', { count: d.daysLeft })}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          ) : null}

          {/* Finances (from summary API) */}
          {summaryData && (summaryData.totalToPay || summaryData.totalToReceive) ? (
            <Card style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 }}>
                {t('overview.finances')}
              </Text>
              {summaryData.totalToPay ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.danger }}>{t('overview.to_pay')}</Text>
                  <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: COLORS.danger }}>{summaryData.totalToPay}</Text>
                </View>
              ) : null}
              {summaryData.totalToReceive ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.success }}>{t('overview.to_receive')}</Text>
                  <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: COLORS.success }}>{summaryData.totalToReceive}</Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          {/* AI Recommendation */}
          {summaryData?.aiRecommendation ? (
            <Card style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 }}>
                {t('overview.recommendation')}
              </Text>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary, lineHeight: 20 }}>
                {summaryData.aiRecommendation}
              </Text>
            </Card>
          ) : null}

          {/* Summary loading indicator */}
          {summaryLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator size="small" color={COLORS.accent} />
            </View>
          ) : null}
        </ScrollView>
      </PageContainer>
    </SafeAreaView>
  );
}
