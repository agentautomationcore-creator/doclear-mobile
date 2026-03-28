import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import * as Linking from 'expo-linking';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH, API_URL } from '../../src/lib/constants';
import { useDocumentsWithChat } from '../../src/hooks/useDocuments';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/lib/supabase';
import { ListSkeleton } from '../../src/components/ui/Loading';
import { Card } from '../../src/components/ui/Card';
import { PageContainer } from '../../src/components/layout/PageContainer';
import type { Professional, ProfessionalType } from '../../src/types';

type Tab = 'chat' | 'specialists' | 'summary';

interface ChatDocItem {
  id: string;
  title: string;
  docType: string;
  lastMessage: string;
  lastMessageDate: string;
}

const SPECIALIST_FILTERS: { key: string; labelKey: string }[] = [
  { key: 'all', labelKey: 'pros.filter_all' },
  { key: 'lawyers', labelKey: 'pros.filter_lawyers' },
  { key: 'accountants', labelKey: 'pros.filter_accountants' },
  { key: 'translators', labelKey: 'pros.filter_translators' },
  { key: 'notaries', labelKey: 'pros.filter_notaries' },
  { key: 'doctors', labelKey: 'pros.filter_doctors' },
  { key: 'realtors', labelKey: 'pros.filter_realtors' },
];

export default function AssistantScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { data: chatDocs, isLoading: chatLoading } = useDocumentsWithChat();
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    if (summaryData || summaryLoading || !user?.id) return;
    setSummaryLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(`${API_URL}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        setSummaryData(await res.json());
      }
    } catch {
      // Silent
    } finally {
      setSummaryLoading(false);
    }
  }, [user?.id, summaryData, summaryLoading]);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'summary') loadSummary();
  }, [loadSummary]);

  const renderChatItem = ({ item }: { item: ChatDocItem }) => {
    const dateStr = (() => {
      try { return formatDistanceToNow(new Date(item.lastMessageDate), { addSuffix: true }); }
      catch { return ''; }
    })();

    return (
      <Pressable
        onPress={() => router.push(`/doc/${item.id}`)}
        style={({ pressed }) => [{
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)', minHeight: MIN_TOUCH,
        }, pressed && { backgroundColor: '#F9FAFB' }]}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} - ${dateStr}`}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: FONT_SIZE.body, fontWeight: '600', color: COLORS.textPrimary }}>
            {item.title}
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginStart: 8 }}>{dateStr}</Text>
        </View>
        <Text numberOfLines={2} style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary, lineHeight: 20 }}>
          {item.lastMessage}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <PageContainer>
        {/* Segmented control */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 0, backgroundColor: '#F3F4F6', marginHorizontal: 16, marginTop: 8, borderRadius: 10 }}>
          {([
            { key: 'chat' as Tab, label: t('assistant.title') },
            { key: 'specialists' as Tab, label: t('pros.title') },
            { key: 'summary' as Tab, label: t('summary.title') },
          ]).map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => handleTabChange(tab.key)}
              style={{
                flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8,
                backgroundColor: activeTab === tab.key ? '#FFFFFF' : 'transparent',
              }}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
            >
              <Text style={{
                fontSize: 13, fontWeight: activeTab === tab.key ? '600' : '400',
                color: activeTab === tab.key ? COLORS.textPrimary : COLORS.textSecondary,
              }}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'chat' ? (
          chatLoading ? <ListSkeleton count={4} /> : (
            <FlatList
              data={chatDocs ?? []}
              keyExtractor={(item) => item.id}
              renderItem={renderChatItem}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
                  <Text style={{ fontSize: 28, marginBottom: 16 }}>{'\uD83D\uDCAC'}</Text>
                  <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40 }}>
                    {t('assistant.empty')}
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )
        ) : activeTab === 'specialists' ? (
          <SpecialistsTab />
        ) : (
          <SummaryTab data={summaryData} loading={summaryLoading} />
        )}
      </PageContainer>
    </SafeAreaView>
  );
}

// ==================== Specialists Tab ====================
function SpecialistsTab() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');

  // Static professionals data (from data/professionals.json or embedded)
  const professionals: Professional[] = []; // TODO: load from data/professionals.json

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {SPECIALIST_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                backgroundColor: filter === f.key ? COLORS.accent : '#F3F4F6',
              }}
              accessibilityRole="button"
              accessibilityLabel={t(f.labelKey)}
            >
              <Text style={{
                fontSize: 13, fontWeight: '500',
                color: filter === f.key ? '#FFFFFF' : COLORS.textSecondary,
              }}>
                {t(f.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {professionals.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 40 }}>
          <Text style={{ fontSize: 28, marginBottom: 16 }}>{'\uD83D\uDC65'}</Text>
          <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textSecondary, textAlign: 'center' }}>
            {t('pros.subtitle')}
          </Text>
          <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 }}>
            Coming soon
          </Text>
        </View>
      ) : (
        professionals.map((pro) => (
          <Card key={pro.id} style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary }}>{pro.name}</Text>
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary, marginTop: 2 }}>
              {pro.specialties.join(', ')} — {pro.city}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
              {pro.phone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${pro.phone}`)}
                  style={{ backgroundColor: COLORS.accent + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('pros.call')} ${pro.name}`}
                >
                  <Text style={{ fontSize: 13, color: COLORS.accent, fontWeight: '500' }}>{t('pros.call')}</Text>
                </Pressable>
              ) : null}
              {pro.email ? (
                <Pressable
                  onPress={() => Linking.openURL(`mailto:${pro.email}`)}
                  style={{ backgroundColor: COLORS.accent + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('pros.email')} ${pro.name}`}
                >
                  <Text style={{ fontSize: 13, color: COLORS.accent, fontWeight: '500' }}>{t('pros.email')}</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

// ==================== Summary Tab ====================
function SummaryTab({ data, loading }: { data: any; loading: boolean }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary, marginTop: 12 }}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 60 }}>
        <Text style={{ fontSize: 28, marginBottom: 16 }}>{'\uD83D\uDCCA'}</Text>
        <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40 }}>
          {t('summary.documents_analyzed', { count: 0 })}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Total documents */}
      <Card style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: FONT_SIZE.heading, fontWeight: '800', color: COLORS.accent }}>
          {data.totalDocuments ?? 0}
        </Text>
        <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary }}>
          {t('summary.documents_analyzed', { count: data.totalDocuments ?? 0 })}
        </Text>
      </Card>

      {/* By category */}
      {data.byCategory ? (
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>
            {t('summary.by_category')}
          </Text>
          {Object.entries(data.byCategory).map(([cat, count]) => (
            <View key={cat} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textPrimary }}>
                {t(`categories.${cat}`)}
              </Text>
              <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: COLORS.accent }}>
                {count as number}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Urgent deadlines */}
      {data.urgentDeadlines && data.urgentDeadlines.length > 0 ? (
        <Card style={{ marginBottom: 16, backgroundColor: '#FEF3C7' }}>
          <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: '#92400E', marginBottom: 8 }}>
            {t('summary.attention')}
          </Text>
          {data.urgentDeadlines.map((d: any, i: number) => (
            <View key={i} style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: '#92400E' }}>{d.title}</Text>
              <Text style={{ fontSize: 12, color: '#B45309' }}>{d.deadline}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Finances */}
      {(data.totalToPay || data.totalToReceive) ? (
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 }}>
            {t('summary.finances')}
          </Text>
          {data.totalToPay ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.danger }}>{t('summary.to_pay')}</Text>
              <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: COLORS.danger }}>{data.totalToPay}</Text>
            </View>
          ) : null}
          {data.totalToReceive ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.success }}>{t('summary.to_receive')}</Text>
              <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: COLORS.success }}>{data.totalToReceive}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* AI Recommendation */}
      {data.aiRecommendation ? (
        <Card style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 }}>
            {t('summary.recommendation')}
          </Text>
          <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary, lineHeight: 20 }}>
            {data.aiRecommendation}
          </Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}
