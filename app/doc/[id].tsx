import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH, API_URL } from '../../src/lib/constants';
import { useDocument, useDeleteDocument } from '../../src/hooks/useDocuments';
import { useAuth } from '../../src/hooks/useAuth';
import { useNetwork } from '../../src/hooks/useNetwork';
import { useUIStore } from '../../src/store/ui.store';
import { useAuthStore } from '../../src/store/auth.store';
import { supabase } from '../../src/lib/supabase';
import { filterAIResponse } from '../../src/api/client';
import { streamChat } from '../../src/lib/streaming';
import { HealthScoreBar } from '../../src/components/documents/HealthScoreBar';
import { ChatBubble } from '../../src/components/chat/ChatBubble';
import { MessageInput } from '../../src/components/chat/MessageInput';
import { SoftRegistrationModal } from '../../src/components/SoftRegistrationModal';
import { Card } from '../../src/components/ui/Card';
import { ListSkeleton, Skeleton } from '../../src/components/ui/Loading';
import { PageContainer } from '../../src/components/layout/PageContainer';
import { track } from '../../src/lib/analytics';
import type { ChatMessage, RiskFlag, PositivePoint } from '../../src/types';

const SHEET_SNAP_POINTS = ['1%', '50%', '95%'];

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, canAskQuestion } = useAuth();
  const { isOffline: networkOffline } = useNetwork();
  const locale = useUIStore((s) => s.locale);
  const { data: doc, isLoading, refetch } = useDocument(id);
  const deleteDoc = useDeleteDocument();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatListRef = useRef(null);

  // Load chat history from doc
  useEffect(() => {
    if (doc?.chatHistory && doc.chatHistory.length > 0) {
      setMessages(doc.chatHistory);
    }
  }, [doc?.chatHistory]);

  // Android back button: close bottom sheet before navigating back
  useEffect(() => {
    const onBackPress = () => {
      const currentIndex = bottomSheetRef.current?.snapToIndex;
      // If bottom sheet is expanded, collapse it
      bottomSheetRef.current?.close();
      return true; // Prevent default back behavior
    };

    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, []);

  // Share
  const handleShare = useCallback(async () => {
    if (!doc) return;
    track('document_shared');
    const facts = (doc.keyFacts ?? []).map((f, i) => `${i + 1}. ${f}`).join('\n');
    const text = `${doc.title}\n\nHealth Score: ${doc.healthScore ?? '?'}/100\n\n5 Key Facts:\n${facts}\n\nDocLear - doclear.app`;

    try {
      if (await Sharing.isAvailableAsync()) {
        await Linking.openURL(
          `mailto:?subject=${encodeURIComponent(doc.title)}&body=${encodeURIComponent(text)}`
        );
      }
    } catch {
      // Silent fallback
    }
  }, [doc]);

  // Export PDF
  const handleExportPDF = useCallback(async () => {
    if (!doc) return;
    track('document_exported', { format: 'pdf' });
    const html = `
      <html><head><meta charset="utf-8"><style>
        body { font-family: -apple-system, sans-serif; padding: 40px; color: #1A1A2E; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        .score { font-size: 48px; font-weight: 800; }
        .section { margin-top: 24px; }
        .fact { margin-bottom: 8px; }
        .risk { padding: 12px; margin-bottom: 8px; border-radius: 8px; }
        .risk-high { background: #fef2f2; }
        .risk-medium { background: #fffbeb; }
        .risk-low { background: #eff6ff; }
        .disclaimer { margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #6b7280; }
      </style></head><body>
        <h1>${doc.title}</h1>
        <p>${doc.docTypeLabel ?? doc.docType ?? ''}</p>
        <div class="section">
          <div class="score" style="color: ${(doc.healthScore ?? 0) >= 80 ? '#16a34a' : (doc.healthScore ?? 0) >= 50 ? '#f59e0b' : '#dc2626'}">${doc.healthScore ?? '?'}/100</div>
          <p>${doc.healthScoreExplanation ?? ''}</p>
        </div>
        ${doc.summary ? `<div class="section"><h2>Summary</h2><p>${doc.summary}</p></div>` : ''}
        <div class="section"><h2>Key Facts</h2>${(doc.keyFacts ?? []).map((f, i) => `<div class="fact">${i + 1}. ${f}</div>`).join('')}</div>
        <div class="section"><h2>Risk Flags</h2>${(doc.riskFlags ?? []).map((r) => `<div class="risk risk-${r.severity}"><strong>${r.title}</strong><p>${r.description}</p></div>`).join('')}</div>
        <div class="section"><h2>Positive Points</h2>${(doc.positivePoints ?? []).map((p) => `<div class="fact">\u2713 ${p.title} - ${p.description}</div>`).join('')}</div>
        <div class="disclaimer">This analysis was generated by AI (DocLear). It is for informational purposes only and does not constitute legal, medical, or financial advice. Always verify important details with a qualified professional.</div>
        <p style="margin-top:40px;color:#6B7280;">Generated by DocLear - doclear.app</p>
      </body></html>
    `;
    try {
      await Print.printAsync({ html });
    } catch {
      // Silent
    }
    setMenuVisible(false);
  }, [doc]);

  // Export Excel
  const handleExportExcel = useCallback(async () => {
    if (!doc) return;
    track('document_exported', { format: 'xlsx' });
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const factsData = (doc.keyFacts ?? []).map((f, i) => ({ '#': i + 1, Fact: f }));
      const ws1 = XLSX.utils.json_to_sheet(factsData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Key Facts');

      const risksData = (doc.riskFlags ?? []).map((r) => ({
        Severity: r.severity.toUpperCase(),
        Title: r.title,
        Description: r.description,
        Page: r.page ?? '',
        Recommendation: r.recommendation ?? '',
      }));
      const ws2 = XLSX.utils.json_to_sheet(risksData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Risk Flags');

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const LegacyFS = await import('expo-file-system/legacy');
      const uri = LegacyFS.documentDirectory + `${doc.title}.xlsx`;
      await LegacyFS.writeAsStringAsync(uri, wbout, {
        encoding: LegacyFS.EncodingType.Base64,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch {
      // Silent
    }
    setMenuVisible(false);
  }, [doc]);

  // Delete
  const handleDelete = useCallback(() => {
    Alert.alert(
      t('document.delete_title'),
      t('document.delete_confirm'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.delete_yes'),
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deleteDoc.mutateAsync(id);
              router.back();
            }
          },
        },
      ]
    );
    setMenuVisible(false);
  }, [id, deleteDoc, router, t]);

  // Open chat bottom sheet
  const handleOpenChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bottomSheetRef.current?.snapToIndex(1); // 50%
  }, []);

  // Chat: send message with SSE streaming via expo/fetch
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!doc || !user || isStreaming) return;

      // Check question limit
      const store = useAuthStore.getState();
      if (!store.canAskQuestion()) {
        router.push('/paywall');
        return;
      }

      const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamText('');

      // Track and increment counters
      track('chat_message_sent');
      store.incrementChatMessageCount();
      store.setDailyQuestions(store.dailyQuestions + 1);

      // Check if we should show registration popup
      if (store.shouldShowRegistration()) {
        setTimeout(() => setShowRegistration(true), 1500);
      }

      // Abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const chatHistory = messages.map((m) => ({ role: m.role, content: m.content }));

      await streamChat(
        doc.id,
        text,
        chatHistory,
        {
          onToken: (token) => {
            setStreamText((prev) => prev + token);
          },
          onDone: (fullText) => {
            const filteredText = filterAIResponse(fullText);
            const assistantMsg: ChatMessage = {
              role: 'assistant',
              content: filteredText,
              timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setIsStreaming(false);
            setStreamText('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
          onError: (error) => {
            let errorContent = t('chat.error_generic');
            if (error.message === 'AI_OVERLOADED') {
              errorContent = t('chat.error_overloaded');
            } else if (error.message === 'RATE_LIMITED') {
              errorContent = t('chat.error_rate_limited');
            }
            const errorMsg: ChatMessage = {
              role: 'assistant',
              content: errorContent,
              timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMsg]);
            setIsStreaming(false);
            setStreamText('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          },
        },
        abortControllerRef.current.signal
      );
    },
    [doc, user, isStreaming, messages, router, t]
  );

  // Send suggested question
  const handleSuggestedQuestion = useCallback(
    (q: string) => {
      bottomSheetRef.current?.snapToIndex(2); // full screen
      setTimeout(() => handleSendMessage(q), 300);
    },
    [handleSendMessage]
  );

  // Citation press
  const handleCitationPress = useCallback((page: number) => {
    // TODO: scroll to page in document viewer
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Report AI response
  const handleReport = useCallback(
    async (messageContent: string) => {
      try {
        await supabase.from('ai_reports').insert({
          user_id: user?.id,
          document_id: doc?.id,
          message_content: messageContent,
          created_at: new Date().toISOString(),
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('chat.report_title'), t('chat.report_thanks'));
      } catch {
        Alert.alert(t('chat.report_title'), t('chat.report_error'));
      }
    },
    [user, doc, t]
  );

  if (isLoading || !doc) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <ListSkeleton count={5} />
      </SafeAreaView>
    );
  }

  // Build chat messages including streaming
  const allMessages: ChatMessage[] = [...messages];
  if (isStreaming && streamText) {
    allMessages.push({
      role: 'assistant',
      content: streamText,
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(0,0,0,0.06)',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: MIN_TOUCH, height: MIN_TOUCH, justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text style={{ fontSize: 20, color: COLORS.accent }}>{'\u2190'}</Text>
        </Pressable>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: FONT_SIZE.body,
            fontWeight: '600',
            color: COLORS.textPrimary,
            textAlign: 'center',
          }}
          accessibilityRole="header"
        >
          {doc.title}
        </Text>
        <Pressable
          onPress={handleShare}
          style={{ width: MIN_TOUCH, height: MIN_TOUCH, justifyContent: 'center', alignItems: 'center' }}
          accessibilityRole="button"
          accessibilityLabel={t('document.share')}
        >
          <Text style={{ fontSize: 18, color: COLORS.accent }}>{'\u2197'}</Text>
        </Pressable>
        <View style={{ position: 'relative' }}>
          <Pressable
            onPress={() => setMenuVisible(!menuVisible)}
            style={{ width: MIN_TOUCH, height: MIN_TOUCH, justifyContent: 'center', alignItems: 'center' }}
            accessibilityRole="button"
            accessibilityLabel={t('common.menu')}
          >
            <Text style={{ fontSize: 20, color: COLORS.textSecondary }}>{'\u22EF'}</Text>
          </Pressable>
          {menuVisible ? (
            <View
              style={{
                position: 'absolute',
                top: MIN_TOUCH,
                end: 0,
                backgroundColor: COLORS.background,
                borderRadius: 12,
                padding: 4,
                minWidth: 180,
                ...(Platform.OS === 'ios'
                  ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }
                  : { elevation: 8 }),
                zIndex: 100,
              }}
            >
              <Pressable
                onPress={handleExportPDF}
                style={{ padding: 12, minHeight: MIN_TOUCH, justifyContent: 'center' }}
                accessibilityRole="button"
                accessibilityLabel={t('document.export_pdf')}
              >
                <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textPrimary }}>
                  {t('document.export_pdf')}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleExportExcel}
                style={{ padding: 12, minHeight: MIN_TOUCH, justifyContent: 'center' }}
                accessibilityRole="button"
                accessibilityLabel={t('document.export_excel')}
              >
                <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textPrimary }}>
                  {t('document.export_excel')}
                </Text>
              </Pressable>
              <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginVertical: 2 }} />
              <Pressable
                onPress={handleDelete}
                style={{ padding: 12, minHeight: MIN_TOUCH, justifyContent: 'center' }}
                accessibilityRole="button"
                accessibilityLabel={t('document.delete')}
              >
                <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.danger }}>
                  {t('document.delete')}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {/* Analysis Content (ScrollView) */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Analysis label + disclosure */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
            paddingHorizontal: 4,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.accent + '15',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 6,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.accent }}>
              {t('document.ai_analysis')}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginStart: 8 }}>
            {t('document.ai_disclaimer')}
          </Text>
        </View>

        {/* Summary Card */}
        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text
              style={{ fontSize: FONT_SIZE.headingSm, fontWeight: '700', color: COLORS.textPrimary, flex: 1 }}
              accessibilityRole="header"
            >
              {doc.title}
            </Text>
          </View>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#dbeafe',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#1e40af' }}>
              {doc.docTypeLabel ?? doc.docType ?? 'Document'}
            </Text>
          </View>
          {doc.summary ? (
            <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textSecondary, lineHeight: 22 }}>
              {doc.summary}
            </Text>
          ) : null}
          {doc.pageCount ? (
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 8 }}>
              {doc.pageCount} {t('document.pages')} {doc.fileType ? `\u00B7 ${doc.fileType.toUpperCase()}` : ''}
            </Text>
          ) : null}
        </Card>

        {/* Health Score */}
        {typeof doc.healthScore === 'number' ? (
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>
              {t('document.health_score')}
            </Text>
            <HealthScoreBar score={doc.healthScore} explanation={doc.healthScoreExplanation} />
          </Card>
        ) : null}

        {/* What Is This */}
        {doc.whatIsThis ? (
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 }}>
              {t('document.what_is_this')}
            </Text>
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary, lineHeight: 20 }}>
              {doc.whatIsThis}
            </Text>
          </Card>
        ) : null}

        {/* What It Says */}
        {doc.whatItSays ? (
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 }}>
              {t('document.what_it_says')}
            </Text>
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textSecondary, lineHeight: 20 }}>
              {doc.whatItSays}
            </Text>
          </Card>
        ) : null}

        {/* What To Do */}
        {doc.whatToDo && doc.whatToDo.length > 0 ? (
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 }}>
              {t('document.what_to_do')}
            </Text>
            {doc.whatToDo.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: COLORS.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginEnd: 10,
                    marginTop: 1,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{i + 1}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: FONT_SIZE.caption, color: COLORS.textPrimary, lineHeight: 20 }}>
                  {step}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {/* Key Facts */}
        {doc.keyFacts && doc.keyFacts.length > 0 ? (
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>
              {t('document.key_facts')}
            </Text>
            {doc.keyFacts.map((fact, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: COLORS.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginEnd: 10,
                    marginTop: 1,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>{i + 1}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: FONT_SIZE.caption, color: COLORS.textPrimary, lineHeight: 20 }}>
                  {fact}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {/* Risk Flags */}
        {doc.riskFlags && doc.riskFlags.length > 0 ? (
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>
              {t('document.risk_flags')}
            </Text>
            {doc.riskFlags.map((risk: RiskFlag, i: number) => (
              <View
                key={i}
                style={{
                  backgroundColor:
                    risk.severity === 'high' ? '#fef2f2' : risk.severity === 'medium' ? '#fffbeb' : '#eff6ff',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor:
                        risk.severity === 'high'
                          ? COLORS.danger
                          : risk.severity === 'medium'
                          ? COLORS.warning
                          : COLORS.accent,
                      marginEnd: 8,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
                      {risk.severity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: FONT_SIZE.caption, fontWeight: '600', color: COLORS.textPrimary }}>
                    {risk.title}
                  </Text>
                  {risk.page ? (
                    <Pressable
                      onPress={() => handleCitationPress(risk.page!)}
                      style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: COLORS.accent + '15', borderRadius: 4 }}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('document.page')} ${risk.page}`}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.accent }}>p.{risk.page}</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 }}>{risk.description}</Text>
                {risk.recommendation ? (
                  <Text style={{ fontSize: 12, color: COLORS.textPrimary, marginTop: 6, fontStyle: 'italic' }}>
                    {risk.recommendation}
                  </Text>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}

        {/* Positive Points */}
        {doc.positivePoints && doc.positivePoints.length > 0 ? (
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>
              {t('document.positive_points')}
            </Text>
            {doc.positivePoints.map((pp: PositivePoint, i: number) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' }}>
                <Text style={{ color: COLORS.success, fontWeight: '700', fontSize: 16, marginEnd: 8 }}>
                  {'\u2713'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: COLORS.textPrimary }}>
                    {pp.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 }}>
                    {pp.description}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {/* Deadline */}
        {doc.deadline ? (
          <Card style={{ marginBottom: 16, backgroundColor: '#FEF3C7' }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: '#92400E', marginBottom: 4 }}>
              {t('document.deadline')}
            </Text>
            <Text style={{ fontSize: FONT_SIZE.heading, fontWeight: '800', color: '#DC2626' }}>
              {doc.deadline}
            </Text>
            {doc.deadlineDescription ? (
              <Text style={{ fontSize: FONT_SIZE.caption, color: '#92400E', marginTop: 4 }}>
                {doc.deadlineDescription}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {/* Suggested Questions */}
        {doc.suggestedQuestions && doc.suggestedQuestions.length > 0 ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 }}>
              {t('document.suggested_questions')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {doc.suggestedQuestions.map((q, i) => (
                <Pressable
                  key={i}
                  onPress={() => handleSuggestedQuestion(q)}
                  style={{
                    backgroundColor: COLORS.accent + '10',
                    borderWidth: 1,
                    borderColor: COLORS.accent + '30',
                    borderRadius: RADIUS.button,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={q}
                >
                  <Text style={{ fontSize: 13, color: COLORS.accent, fontWeight: '500' }}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Recommendations */}
        {doc.recommendations && doc.recommendations.length > 0 ? (
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 }}>
              {t('document.recommendations')}
            </Text>
            {doc.recommendations.map((rec, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: COLORS.textPrimary }}>
                  {rec.title}
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{rec.description}</Text>
                {rec.url ? (
                  <Pressable
                    onPress={() => Linking.openURL(rec.url!)}
                    style={{ marginTop: 4 }}
                    accessibilityRole="link"
                    accessibilityLabel={`${t('document.visit_portal')} ${rec.title}`}
                  >
                    <Text style={{ fontSize: 13, color: COLORS.accent, fontWeight: '500' }}>
                      {t('document.visit_portal')} {'\u2197'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>

      {/* Sticky "Ask a question" button */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 16,
          start: 16,
          end: 16,
        }}
      >
        <Pressable
          onPress={handleOpenChat}
          style={{
            backgroundColor: COLORS.accent,
            borderRadius: RADIUS.button,
            paddingVertical: 14,
            alignItems: 'center',
            ...(Platform.OS === 'ios'
              ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }
              : { elevation: 6 }),
          }}
          accessibilityRole="button"
          accessibilityLabel={t('document.ask_question')}
        >
          <Text style={{ color: '#FFFFFF', fontSize: FONT_SIZE.body, fontWeight: '700' }}>
            {t('document.ask_question')}
          </Text>
        </Pressable>
      </View>

      {/* Bottom Sheet Chat */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={SHEET_SNAP_POINTS}
        enablePanDownToClose
        enableContentPanningGesture
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        backgroundStyle={{ backgroundColor: '#FFFFFF', borderRadius: 20 }}
        handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 40 }}
      >
        {/* Chat header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(0,0,0,0.06)',
          }}
        >
          <Text style={{ fontSize: FONT_SIZE.body, fontWeight: '700', color: COLORS.textPrimary }}>
            {t('document.chat_title')}
          </Text>
          {networkOffline ? (
            <View
              style={{
                backgroundColor: '#FEF3C7',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
              }}
              accessibilityRole="alert"
            >
              <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600' }}>
                {t('common.offline')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Chat messages */}
        <BottomSheetScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        >
          {allMessages.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textSecondary, textAlign: 'center' }}>
                {t('document.ask_question')}
              </Text>
              {/* Quick prompts */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                {[t('chat.prompt_summarize'), t('chat.prompt_risks'), t('chat.prompt_actions')].map((prompt, i) => (
                  <Pressable
                    key={i}
                    onPress={() => handleSendMessage(prompt)}
                    style={{
                      backgroundColor: COLORS.accent + '10',
                      borderWidth: 1,
                      borderColor: COLORS.accent + '30',
                      borderRadius: RADIUS.button,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={prompt}
                  >
                    <Text style={{ fontSize: 13, color: COLORS.accent, fontWeight: '500' }}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            allMessages.map((msg, index) => (
              <View key={`msg-${index}`}>
                <ChatBubble
                  role={msg.role}
                  content={msg.content}
                  isStreaming={isStreaming && index === allMessages.length - 1 && msg.role === 'assistant'}
                  onCitationPress={handleCitationPress}
                />
                {/* AI Disclosure + Report on assistant messages */}
                {msg.role === 'assistant' && !(isStreaming && index === allMessages.length - 1) ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: 8,
                      paddingStart: 4,
                      gap: 12,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>
                      {t('chat.ai_generated')}
                    </Text>
                    <Pressable
                      onPress={() => handleReport(msg.content)}
                      accessibilityRole="button"
                      accessibilityLabel={t('chat.report')}
                    >
                      <Text style={{ fontSize: 10, color: COLORS.warning }}>
                        {t('chat.report')}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))
          )}
          {/* Thinking indicator */}
          {isStreaming && !streamText ? (
            <View style={{ paddingBottom: 8 }}>
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#F3F4F6',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: COLORS.textSecondary, fontSize: FONT_SIZE.body }}>
                  {t('chat.thinking')}
                </Text>
              </View>
            </View>
          ) : null}
        </BottomSheetScrollView>

        {/* Message input - sticky at bottom of sheet */}
        <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: 'rgba(0,0,0,0.06)',
              backgroundColor: '#FFFFFF',
              paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            }}
          >
            <MessageInput
              placeholder={t('document.ask_placeholder')}
              onSend={handleSendMessage}
              disabled={isStreaming || networkOffline}
            />
          </View>
        </KeyboardStickyView>
      </BottomSheet>

      {/* Soft Registration Modal */}
      <SoftRegistrationModal
        visible={showRegistration}
        onDismiss={() => setShowRegistration(false)}
      />
    </SafeAreaView>
  );
}
