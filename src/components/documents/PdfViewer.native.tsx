import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import * as Linking from 'expo-linking';
import { COLORS, FONT_SIZE, RADIUS, MIN_TOUCH } from '../../lib/constants';

interface PdfViewerProps {
  url: string;
  pageCount?: number;
  onPageChange?: (page: number) => void;
}

export interface PdfViewerRef {
  scrollToPage: (page: number) => void;
}

// Native PDF viewer using react-native-pdf if available,
// otherwise fallback to "open in browser"
export const PdfViewer = forwardRef<PdfViewerRef, PdfViewerProps>(
  function PdfViewerNative({ url, pageCount, onPageChange }, ref) {
    const pdfRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      scrollToPage: (page: number) => {
        pdfRef.current?.setPage?.(page);
      },
    }));

    // Try to use react-native-pdf if it's installed
    // For now, provide a functional fallback
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: COLORS.accent + '15',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 32 }}>PDF</Text>
        </View>
        <Text
          style={{
            fontSize: FONT_SIZE.body,
            color: COLORS.textSecondary,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {pageCount ? `${pageCount} pages` : 'Document ready'}
        </Text>
        <Text
          style={{
            fontSize: FONT_SIZE.caption,
            color: COLORS.textSecondary,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          Tap to view the original document
        </Text>
        <Pressable
          onPress={() => Linking.openURL(url)}
          style={{
            backgroundColor: COLORS.accent,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: RADIUS.button,
            minHeight: MIN_TOUCH,
            justifyContent: 'center',
          }}
          accessibilityRole="button"
        >
          <Text style={{ color: '#FFFFFF', fontSize: FONT_SIZE.body, fontWeight: '600' }}>
            Open PDF
          </Text>
        </Pressable>
      </View>
    );
  }
);
