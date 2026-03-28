import React from 'react';
import { View, Text } from 'react-native';
import { COLORS, FONT_SIZE } from '../../lib/constants';

interface PdfViewerProps {
  url: string;
  pageCount?: number;
  onPageChange?: (page: number) => void;
}

export function PdfViewer({ url, pageCount }: PdfViewerProps) {
  // On web: use iframe with Google Docs viewer
  const viewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;

  return (
    <View style={{ flex: 1 }}>
      <iframe
        src={viewerUrl}
        style={{ width: '100%', height: '100%', border: 'none' } as any}
        title="PDF Viewer"
      />
      {pageCount ? (
        <View
          style={{
            position: 'absolute',
            bottom: 16,
            alignSelf: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '500' }}>
            {pageCount} pages
          </Text>
        </View>
      ) : null}
    </View>
  );
}
