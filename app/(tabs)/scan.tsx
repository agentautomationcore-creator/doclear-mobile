import React, { useState, useCallback } from 'react';
import { log } from '../../src/lib/debug';
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
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
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
// AI consent key checked via AsyncStorage directly
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
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { canUpload, user } = useAuth();
  const { isDesktop } = useResponsive();
  const storeLocale = useUIStore((s) => s.locale);
  const locale = i18n.language || storeLocale || 'fr';
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

  // AI consent is now handled at app startup (welcome/onboarding flow).
  // Scanner no longer checks or redirects — consent is always granted by the time user reaches tabs.

  const scanCount = useAuthStore((s) => s.scanCount);

  // Demo document — hardcoded French bail contract
  const handleDemo = useCallback(async () => {
    if (!checkLimitAndProceed()) return;

    setStep('analyzing');
    setError(null);

    try {
      let userId = user?.id;
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
        if (!userId) {
          const { data } = await supabase.auth.signInAnonymously();
          userId = data?.user?.id;
        }
      }
      if (!userId) { setError('Auth error'); setStep('error'); return; }

      const documentId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

      const demoText = `CONTRAT DE LOCATION - BAIL D'HABITATION
Loi n° 89-462 du 6 juillet 1989

Entre les soussignés:
Le bailleur: SCI RIVIERA IMMO, 15 avenue des Fleurs, 06000 Nice
Le locataire: M. Jean DUPONT

DÉSIGNATION DU BIEN LOUÉ
Appartement de type T3 situé au 2ème étage, 28 boulevard Victor Hugo, 06000 Nice.
Surface habitable: 65 m². Parking n°12 inclus.

DURÉE ET DATE D'EFFET
Le présent bail est consenti pour une durée de 3 ans à compter du 1er avril 2026.
Date limite de signature: 25 mars 2026.

LOYER ET CHARGES
Loyer mensuel: 1 250,00 € hors charges.
Provisions pour charges: 150,00 € par mois.
Total mensuel: 1 400,00 €.
Dépôt de garantie: 1 250,00 € (un mois de loyer).
Paiement: par virement avant le 5 de chaque mois.

CLAUSE RÉSOLUTOIRE
À défaut de paiement du loyer pendant 2 mois, le bail sera résilié de plein droit.

DIAGNOSTICS TECHNIQUES
DPE: Classe C (émissions: 18 kg CO2/m²/an).
Amiante: Négatif. Plomb: Négatif.

Fait à Nice, le 10 mars 2026, en deux exemplaires.`;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'text',
          textContent: demoText,
          language: locale,
          isPdf: false,
          userId,
          documentId,
        }),
      });

      if (!response.ok) throw new Error('Demo analysis failed');

      const result = await response.json();
      track('demo_document_used');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const store = useAuthStore.getState();
      store.setScanCount(store.scanCount + 1);

      setTimeout(() => router.replace(`/doc/${documentId}`), 500);
    } catch (err: any) {
      setError(err?.message ?? t('errors.analysis_failed'));
      setStep('error');
    }
  }, [user, locale, router, checkLimitAndProceed, t]);

  // Core analysis function (no consent check — called directly after consent granted)
  // Accepts optional fileList override for consent-return flow (avoids stale closure)
  const analyzeFilesDirectly = useCallback(async (fileListOverride?: SelectedFile[]) => {
    const filesToProcess = fileListOverride || files;
    log('[SCAN] analyzeFilesDirectly called', { filesCount: filesToProcess.length, userId: user?.id, isOverride: !!fileListOverride });
    if (filesToProcess.length === 0) {
      log('[SCAN] ABORT: no files');
      return;
    }

    // Get user from Supabase session directly (Zustand store may not be updated yet for anonymous)
    let userId = user?.id;
    if (!userId) {
      log('[SCAN] No user in store, checking Supabase session...');
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
      if (!userId) {
        log('[SCAN] No session either, signing in anonymously...');
        const { data } = await supabase.auth.signInAnonymously();
        userId = data?.user?.id;
      }
    }
    if (!userId) {
      log('[SCAN] ABORT: could not get userId');
      setError('Authentication error. Please restart the app.');
      return;
    }
    log('[SCAN] Using userId:', userId);
    setStep('uploading');
    setError(null);

    try {
      for (const file of filesToProcess) {
        // Check file size (max 15MB)
        if (!isFileSizeValid(file.size)) {
          setError(`${t('errors.file_too_large')} (max ${FILE_SIZE_LIMIT_DISPLAY})`);
          setStep('error');
          return;
        }

        // Generate UUID v4 (Supabase documents.id is UUID type)
        const documentId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

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

        log('[SCAN] Sending to API:', `${API_URL}/analyze`, { documentId, fileType: file.type, base64Length: base64.length });
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
            userId,
            documentId,
          }),
        });

        log('[SCAN] API response status:', response.status);
        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          log('[SCAN] API error:', errData);
          throw new Error(errData?.error ?? 'Analysis failed');
        }

        const analysisResult = await response.json().catch(() => null);
        log('[SCAN] Analysis result:', analysisResult ? 'OK' : 'null', analysisResult?.document_title);

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
        if (userId) {
          savePushToken(userId).catch(() => {});
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
      log('[SCAN] ERROR:', err?.message, err);
      setError(err?.message ?? t('errors.analysis_failed'));
      setStep('error');
    }
  }, [files, user, locale, router, t]);

  // Public analyze function — consent already granted at app startup
  const analyzeFiles = useCallback(async () => {
    log('[SCAN] analyzeFiles called', { filesCount: files.length, userId: user?.id });
    if (files.length === 0) {
      log('[SCAN] ABORT: no files');
      return;
    }
    await analyzeFilesDirectly();
  }, [files, user, analyzeFilesDirectly]);

  // Rotating loading messages
  const LOADING_MESSAGES = [
    t('scanner.analyzing_steps.uploading'),
    t('scanner.analyzing_steps.extracting'),
    t('scanner.analyzing_steps.analyzing'),
    t('scanner.analyzing_steps.done'),
  ];
  const [loadingMsgIndex, setLoadingMsgIndex] = React.useState(0);

  React.useEffect(() => {
    if (step === 'idle' || step === 'error' || step === 'done') return;
    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) => (prev + 1) % (LOADING_MESSAGES.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, [step]);

  // Pulse animation for rings
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const ring3 = useSharedValue(0);

  React.useEffect(() => {
    if (step !== 'idle' && step !== 'error') {
      const duration = 2000;
      ring1.value = withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 0 })
        ),
        -1
      );
      ring2.value = withDelay(
        400,
        withRepeat(
          withSequence(
            withTiming(1, { duration, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 0 })
          ),
          -1
        )
      );
      ring3.value = withDelay(
        800,
        withRepeat(
          withSequence(
            withTiming(1, { duration, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 0 })
          ),
          -1
        )
      );
    } else {
      ring1.value = 0;
      ring2.value = 0;
      ring3.value = 0;
    }
  }, [step]);

  const ring1Style = useAnimatedStyle(() => ({
    opacity: 0.15 * (1 - ring1.value),
    transform: [{ scale: 1 + ring1.value * 0.4 }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: 0.15 * (1 - ring2.value),
    transform: [{ scale: 1 + ring2.value * 0.4 }],
  }));
  const ring3Style = useAnimatedStyle(() => ({
    opacity: 0.15 * (1 - ring3.value),
    transform: [{ scale: 1 + ring3.value * 0.4 }],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
    <PageContainer>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {/* Buttons */}
        {step === 'idle' || step === 'error' ? (
          <View style={{ gap: 12, marginBottom: 24, maxWidth: isDesktop ? 400 : undefined, alignSelf: isDesktop ? 'center' : undefined, width: '100%' }}>
            {/* Camera + Gallery horizontal — outline style */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={takePhoto}
                style={{
                  flex: 1,
                  height: 52,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: COLORS.border,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
                accessibilityRole="button"
                accessibilityLabel={t('scanner.take_photo')}
              >
                <Ionicons name="camera-outline" size={20} color={COLORS.accent} />
                <Text style={{ color: COLORS.textPrimary, fontSize: FONT_SIZE.caption, fontWeight: '600' }}>
                  {t('scanner.take_photo')}
                </Text>
              </Pressable>
              <Pressable
                onPress={pickFromGallery}
                style={{
                  flex: 1,
                  height: 52,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: COLORS.border,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
                accessibilityRole="button"
                accessibilityLabel={t('scanner.choose_gallery')}
              >
                <Ionicons name="images-outline" size={20} color={COLORS.accent} />
                <Text style={{ color: COLORS.textPrimary, fontSize: FONT_SIZE.caption, fontWeight: '600' }}>
                  {t('scanner.choose_gallery')}
                </Text>
              </Pressable>
            </View>

            {/* Import file — full width, same outline style */}
            <Pressable
              onPress={pickDocument}
              style={{
                height: 52,
                backgroundColor: '#FFFFFF',
                borderWidth: 1.5,
                borderColor: COLORS.border,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
              }}
              accessibilityRole="button"
              accessibilityLabel={t('scanner.import_file')}
            >
              <Ionicons name="document-attach-outline" size={20} color={COLORS.accent} />
              <Text style={{ color: COLORS.textPrimary, fontSize: FONT_SIZE.caption, fontWeight: '600' }}>
                {t('scanner.import_file')}
              </Text>
            </Pressable>

            {/* Supported formats */}
            <View style={{ marginTop: 4, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 }}>
                PDF · DOCX · JPG · PNG · XLSX · HEIC · TXT
              </Text>
            </View>

            {/* Demo document button — show only when user has 0 documents */}
            {scanCount === 0 ? (
              <Pressable
                onPress={handleDemo}
                style={{
                  marginTop: 8,
                  height: 44,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: COLORS.border,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
                accessibilityRole="button"
                accessibilityLabel={t('scanner.try_demo')}
              >
                <Ionicons name="sparkles-outline" size={16} color={COLORS.textSecondary} />
                <Text style={{ color: COLORS.textSecondary, fontSize: FONT_SIZE.caption, fontWeight: '500' }}>
                  {t('scanner.try_demo')}
                </Text>
              </Pressable>
            ) : null}
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
                  accessibilityLabel={t('common.delete')}
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

        {/* Animated Loading Screen */}
        {step !== 'idle' && step !== 'error' ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 }}>
            {/* Pulse rings + icon */}
            <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
              {[ring1Style, ring2Style, ring3Style].map((style, i) => (
                <Animated.View
                  key={i}
                  style={[
                    {
                      position: 'absolute',
                      width: 100 + i * 20,
                      height: 100 + i * 20,
                      borderRadius: 60 + i * 10,
                      backgroundColor: '#4F46E5',
                    },
                    style,
                  ]}
                />
              ))}
              <Ionicons name="document-text-outline" size={48} color="#4F46E5" />
            </View>

            {/* Rotating text */}
            <Text style={{ fontSize: 17, color: '#374151', fontWeight: '500', marginTop: 32, textAlign: 'center' }}>
              {step === 'done' ? LOADING_MESSAGES[LOADING_MESSAGES.length - 1] : LOADING_MESSAGES[loadingMsgIndex]}
            </Text>

            {/* Subtext */}
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>
              {t('scanner.usually_takes')}
            </Text>
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

        {/* Privacy badge */}
        {step === 'idle' || step === 'error' ? (
          <View style={{ marginTop: 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, gap: 8 }}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.textSecondary} />
              <Text style={{ flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 }}>
                {t('scanner.privacy_badge')}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </PageContainer>
    </SafeAreaView>
  );
}
