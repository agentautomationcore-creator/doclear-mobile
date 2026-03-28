import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH } from '../../src/lib/constants';
import { useDocumentsList } from '../../src/hooks/useDocuments';
import { useAuth } from '../../src/hooks/useAuth';
import { useNetwork } from '../../src/hooks/useNetwork';
import { DocumentCard } from '../../src/components/documents/DocumentCard';
import { CategoryFilter } from '../../src/components/documents/CategoryFilter';
import { ScanCounter } from '../../src/components/documents/ScanCounter';
import { ListSkeleton } from '../../src/components/ui/Loading';
import { PageContainer } from '../../src/components/layout/PageContainer';
import type { Category, Document } from '../../src/types';

const CARD_HEIGHT = 130; // approximate fixed height for DocumentCard

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { plan } = useAuth();
  const { isOffline } = useNetwork();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useDocumentsList(category, search);

  const documents = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((p) => p.documents);
  }, [data]);

  const isFromCache = useMemo(() => {
    return data?.pages?.some((p: any) => p._fromCache) ?? false;
  }, [data]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: CARD_HEIGHT,
      offset: CARD_HEIGHT * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: Document }) => (
      <DocumentCard
        document={item}
        onPress={() => router.push(`/doc/${item.id}`)}
        showOfflineBadge={isFromCache || isOffline}
      />
    ),
    [router, isFromCache, isOffline]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 28 }}>{'\u2B1C'}</Text>
        </View>
        <Text
          allowFontScaling
          style={{
            fontSize: FONT_SIZE.headingSm,
            fontWeight: '700',
            color: COLORS.textPrimary,
            marginBottom: 8,
          }}
        >
          {t('timeline.empty_title')}
        </Text>
        <Text
          allowFontScaling
          style={{
            fontSize: FONT_SIZE.body,
            color: COLORS.textSecondary,
            marginBottom: 24,
          }}
        >
          {t('timeline.empty_desc')}
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/scan')}
          style={{
            backgroundColor: COLORS.accent,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: RADIUS.button,
            minHeight: MIN_TOUCH,
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={t('timeline.scan_first')}
        >
          <Text allowFontScaling style={{ color: '#FFFFFF', fontSize: FONT_SIZE.body, fontWeight: '600' }}>
            {t('timeline.scan_first')}
          </Text>
        </Pressable>
      </View>
    );
  }, [isLoading, t, router]);

  const renderHeader = useCallback(
    () => (
      <View>
        {/* Offline banner */}
        {isOffline ? (
          <View
            style={{
              backgroundColor: '#FEF3C7',
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginBottom: 8,
              borderRadius: 8,
            }}
          >
            <Text
              allowFontScaling
              style={{ fontSize: 13, color: '#92400E', fontWeight: '500', textAlign: 'center' }}
              accessibilityRole="alert"
            >
              {t('offline.banner')}
            </Text>
          </View>
        ) : null}
        {(plan === 'free' || plan === 'starter') && <ScanCounter />}
        {/* Search */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('timeline.search')}
            placeholderTextColor={COLORS.textSecondary}
            allowFontScaling
            accessibilityLabel={t('timeline.search')}
            style={{
              height: 44,
              borderWidth: 1.5,
              borderColor: 'rgba(0,0,0,0.08)',
              borderRadius: 12,
              paddingHorizontal: 16,
              fontSize: FONT_SIZE.body,
              color: COLORS.textPrimary,
              backgroundColor: '#F9FAFB',
            }}
          />
        </View>
        <CategoryFilter selected={category} onSelect={setCategory} />
      </View>
    ),
    [plan, search, category, t, isOffline]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
    <PageContainer>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Pressable onPress={() => router.push('/')} accessibilityRole="button">
          <Text
            allowFontScaling
            style={{
              fontSize: FONT_SIZE.heading,
              fontWeight: '800',
              color: COLORS.textPrimary,
            }}
          >
            DocLear
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          style={{
            width: MIN_TOUCH,
            height: MIN_TOUCH,
            borderRadius: MIN_TOUCH / 2,
            backgroundColor: '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={t('tabs.profile')}
        >
          <Text style={{ fontSize: 18, color: COLORS.textSecondary }}>{'\u2699'}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
          // Performance optimizations
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS !== 'web'}
          getItemLayout={getItemLayout}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/(tabs)/scan')}
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 100 : 80,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: COLORS.accent,
          alignItems: 'center',
          justifyContent: 'center',
          ...(Platform.OS === 'ios'
            ? {
                shadowColor: COLORS.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }
            : { elevation: 6 }),
        }}
        accessibilityRole="button"
        accessibilityLabel={t('scan.upload_file')}
      >
        <Text style={{ fontSize: 28, color: '#FFFFFF', fontWeight: '300' }}>+</Text>
      </Pressable>
    </PageContainer>
    </SafeAreaView>
  );
}
