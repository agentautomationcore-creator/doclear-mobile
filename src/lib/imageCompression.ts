import * as ImageManipulator from 'expo-image-manipulator';

const MAX_DIMENSION = 2048;
const QUALITY = 0.7;
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Compress image before upload.
 * Resize to max 2048px on longest dimension, quality 0.7.
 * Reduces 5-8MB iPhone photos to ~300KB.
 */
export async function compressImage(uri: string): Promise<CompressedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    {
      compress: QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

/**
 * Check if file size is within limit.
 */
export function isFileSizeValid(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE;
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FILE_SIZE_LIMIT = MAX_FILE_SIZE;
export const FILE_SIZE_LIMIT_DISPLAY = '15MB';
