import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
// expo-file-system: dynamic import only on native (crashes on web)
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH, API_URL } from '../../src/lib/constants';
import { compressImage, isFileSizeValid, FILE_SIZE_LIMIT_DISPLAY } from '../../src/lib/imageCompression';
import { mmkvStorage, MMKV_KEYS } from '../../src/lib/mmkv';
import { useAuth } from '../../src/hooks/useAuth';
import { useAuthStore } from '../../src/store/auth.store';
import { useUIStore } from '../../src/store/ui.store';
import { supabase } from '../../src/lib/supabase';
import { Button } from '../../src/components/ui/Button';
import { Skeleton } from '../../src/components/ui/Loading';
import { PageContainer } from '../../src/components/layout/PageContainer';
import { useResponsive } from '../../src/hooks/useResponsive';
import { AI_CONSENT_KEY } from '../ai-consent';
import { track } from '../../src/lib/analytics';
import { scheduleDeadlineReminders, savePushToken } from '../../src/lib/notifications';

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  type: string; // 'pdf' | 'image' | 'text' | 'docx' etc
  mimeType: string;
}

type AnalysisStep = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'done' | 'error';

// Step labels are now in i18n: scanner.analyzing_steps.*

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(mimeType: string, name: string): string {
  if (mimeType.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mimeType.includes('image')) return 'image';
  if (mimeType.includes('text') || name.endsWith('.txt') || name.endsWith('.csv')) return 'text';
  if (name.endsWith('.docx') || name.endsWith('.doc') || mimeType.includes('word')) return 'docx';
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || mimeType.includes('sheet')) return 'xlsx';
  if (name.endsWith('.pptx') || mimeType.includes('presentation')) return 'pptx';
  return 'other';
}

export default function ScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { canUpload, user } = useAuth();
  const { isDesktop } = useResponsive();
  const locale = useUIStore((s) => s.locale);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [step, setStep] = useState<AnalysisStep>('idle');
  const [error, setError] = useState<string | null>(null);

  const checkLimitAndProceed = useCallback((): boolean => {
    const can = useAuthStore.getState().canUpload();
    if (!can) {
      router.push('/paywall');
      return false;
    }
    return true;
  }, [router]);

  const pickDocument = useCallback(async () => {
    if (!checkLimitAndProceed()) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets) return;

      const newFiles: SelectedFile[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name ?? 'document',
        size: asset.size ?? 0,
        type: getFileType(asset.mimeType ?? '', asset.name ?? ''),
        mimeType: asset.mimeType ?? 'application/octet-stream',
      }));

      setFiles(newFiles);
      setError(null);
    } catch (err) {
      setError(t('errors.analysis_failed'));
    }
  }, [checkLimitAndProceed, t]);

  const takePhoto = useCallback(async () => {
    if (!checkLimitAndProceed()) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError(t('errors.no_camera'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];

      // Compress image (2048px max, quality 0.7)
      const compressed = await compressImage(asset.uri);

      let fileSize = 0;
      if (Platform.OS !== 'web') {
        const FS = await import('expo-file-system/legacy');
        const fileInfo = await FS.getInfoAsync(compressed.uri);
        fileSize = (fileInfo as any).size ?? 0;
      }

      setFiles([
        {
          uri: compressed.uri,
          name: 'photo.jpg',
          size: fileSize,
          type: 'image',
          mimeType: 'image/jpeg',
        },
      ]);
      setError(null);
    } catch (err) {
      setError(t('errors.no_camera'));
    }
  }, [checkLimitAndProceed, t]);

  const pickFromGallery = useCallback(async () => {
    if (!checkLimitAndProceed()) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
      });

      if (result.canceled || !result.assets) return;

      const newFiles: SelectedFile[] = [];
      for (const asset of result.assets) {
        // Compress image (2048px max, quality 0.7)
        const compressed = await compressImage(asset.uri);
        let fileSize = 0;
        if (Platform.OS !== 'web') {
          const FS = await import('expo-file-system/legacy');
          const fileInfo = await FS.getInfoAsync(compressed.uri);
          fileSize = (fileInfo as any).size ?? 0;
        }
        newFiles.push({
          uri: compressed.uri,
          name: asset.fileName ?? 'image.jpg',
          size: fileSize,
          type: 'image',
          mimeType: 'image/jpeg',
        });
      }
      setFiles(newFiles);
      setError(null);
    } catch (err) {
      setError(t('errors.analysis_failed'));
    }
  }, [checkLimitAndProceed, t]);

  const checkAIConsent = useCallback((): boolean => {
    const consent = mmkvStorage.getBoolean(MMKV_KEYS.AI_CONSENT);
    if (consent) return true;
    router.push('/ai-consent');
    return false;
  }, [router]);

  const analyzeFiles = useCallback(async () => {
    if (files.length === 0 || !user) return;

    // Check AI consent before first analysis
    const hasConsent = checkAIConsent();
    if (!hasConsent) return;

    setStep('uploading');
    setError(null);

    try {
      for (const file of files) {
        // Check file size (max 15MB)
        if (!isFileSizeValid(file.size)) {
          setError(`${t('error.file_too_large')} (max ${FILE_SIZE_LIMIT_DISPLAY})`);
          setStep('error');
          return;
        }

        // Generate document ID
        const documentId = crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);

        // Read file as base64
        setStep('uploading');
        track('document_uploaded', { type: file.type });
        let base64: string;
        if (Platform.OS === 'web') {
          // Web: use FileReader API (expo-file-system not available on web)
          const resp = await fetch(file.uri);
          const blob = await resp.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const b64 = result.includes(',') ? result.split(',')[1] : result;
              resolve(b64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          // Native: use expo-file-system
          const FS = await import('expo-file-system/legacy');
          base64 = await FS.readAsStringAsync(file.uri, {
            encoding: FS.EncodingType.Base64,
          });
        }

        setStep('extracting');
        const isPdf = file.type === 'pdf';
        const isImage = file.type === 'image';

        let imageData: string;
        if (isPdf) {
          imageData = `data:application/pdf;base64,${base64}`;
        } else if (isImage) {
          imageData = `data:${file.mimeType};base64,${base64}`;
        } else {
          // Text-based formats: send as text
          imageData = `data:${file.mimeType};base64,${base64}`;
        }

        setStep('analyzing');

        // Get auth token
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const response = await fetch(`${API_URL}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            image: imageData,
            language: locale,
            isPdf,
            type: isPdf ? 'pdf' : isImage ? 'image' : 'text',
            textContent: file.type === 'text' ? atob(base64) : undefined,
            userId: user.id,
            documentId,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.error ?? 'Analysis failed');
        }

        const analysisResult = await response.json().catch(() => null);

        setStep('done');
        track('analysis_completed');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (analysisResult?.deadline) {
          scheduleDeadlineReminders(
            documentId,
            analysisResult.document_title ?? file.name,
            analysisResult.deadline
          ).catch(() => {});
        }

        // Save push token after first analysis (for future server push)
        if (user.id) {
          savePushToken(user.id).catch(() => {});
        }

        // Update scan count
        const store = useAuthStore.getState();
        store.setScanCount(store.scanCount + 1);

        // Request store review after 3rd successful analysis
        if (store.scanCount + 1 >= 3) {
          try {
            const StoreReview = await import('expo-store-review');
            if (await StoreReview.isAvailableAsync()) {
              StoreReview.requestReview();
            }
          } catch {
            // Store review not available
          }
        }

        // Navigate to doc detail
        setTimeout(() => {
          router.replace(`/doc/${documentId}`);
        }, 500);
        return;
      }
    } catch (err: any) {
      setError(err?.message ?? t('errors.analysis_failed'));
      setStep('error');
    }
  }, [files, user, locale, router, t]);

  const STEP_LABELS: Record<string, string> = {
    uploading: t('scanner.analyzing_steps.uploading'),
    extracting: t('scanner.analyzing_steps.extracting'),
    analyzing: t('scanner.analyzing_steps.analyzing'),
    done: t('scanner.analyzing_steps.done'),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
    <PageContainer>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {/* Buttons */}
        {step === 'idle' || step === 'error' ? (
          <View style={{ gap: 12, marginBottom: 24, maxWidth: isDesktop ? 400 : undefined, alignSelf: isDesktop ? 'center' : undefined, width: '100%' }}>
            <Button
              title={t('scan.upload_file')}
              onPress={pickDocument}
              variant="primary"
              style={{ minHeight: 56 }}
            />
            <Button
              title={t('scan.take_photo')}
              onPress={takePhoto}
              variant="secondary"
              style={{ minHeight: 56 }}
            />
            <Pressable
              onPress={pickFromGallery}
              style={{
                minHeight: MIN_TOUCH,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
              }}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.accent, fontWeight: '500' }}>
                {t('scan.choose_gallery')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* File previews */}
        {files.length > 0 && (step === 'idle' || step === 'error') ? (
          <View style={{ marginBottom: 24 }}>
            {files.map((f, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: COLORS.accent + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.accent }}>
                    {f.type.toUpperCase().slice(0, 4)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: FONT_SIZE.caption, fontWeight: '600', color: COLORS.textPrimary }}
                  >
                    {f.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                    {formatFileSize(f.size)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  style={{ padding: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Remove file"
                >
                  <Text style={{ fontSize: 16, color: COLORS.textSecondary }}>
                    {'\u2715'}
                  </Text>
                </Pressable>
              </View>
            ))}

            <Button
              title={t('scan.analyze')}
              onPress={analyzeFiles}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : null}

        {/* Progress */}
        {step !== 'idle' && step !== 'error' ? (
          <View style={{ gap: 16, marginTop: 24 }}>
            {(['uploading', 'extracting', 'analyzing', 'done'] as const).map((s) => {
              const isActive = s === step;
              const isPast =
                ['uploading', 'extracting', 'analyzing', 'done'].indexOf(s) <
                ['uploading', 'extracting', 'analyzing', 'done'].indexOf(step);
              const isFuture = !isActive && !isPast;
              return (
                <View
                  key={s}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    opacity: isFuture ? 0.4 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: isPast || (s === 'done' && step === 'done')
                        ? COLORS.success
                        : isActive
                        ? COLORS.accent
                        : '#E5E7EB',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                      {isPast || (s === 'done' && step === 'done') ? '\u2713' : ''}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: FONT_SIZE.body,
                        fontWeight: isActive ? '600' : '400',
                        color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                      }}
                    >
                      {STEP_LABELS[s]}
                    </Text>
                    {isActive && s !== 'done' ? (
                      <Skeleton width="80%" height={4} style={{ marginTop: 6 }} />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Error */}
        {error ? (
          <View
            style={{
              backgroundColor: '#fef2f2',
              borderRadius: 12,
              padding: 16,
              marginTop: 16,
            }}
          >
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.danger, marginBottom: 8 }}>
              {error}
            </Text>
            <Button
              title={t('errors.analysis_failed').replace('Analysis failed. ', '')}
              onPress={() => {
                setStep('idle');
                setError(null);
              }}
              variant="secondary"
            />
          </View>
        ) : null}

        {/* Trust signals */}
        {step === 'idle' || step === 'error' ? (
          <View style={{ marginTop: 32, gap: 8 }}>
            {[
              t('scanner.encrypted'),
              t('scanner.no_training'),
              t('scanner.deleted_after'),
            ].map((text, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: COLORS.success, marginRight: 6 }}>{'\u2713'}</Text>
                <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{text}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </PageContainer>
    </SafeAreaView>
  );
}
