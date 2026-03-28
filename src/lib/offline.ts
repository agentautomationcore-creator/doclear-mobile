import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Document } from '../types';

// ==================== Network Status ====================

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: Network.NetworkStateType | null;
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  try {
    const state = await Network.getNetworkStateAsync();
    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type ?? null,
    };
  } catch {
    return {
      isConnected: true,
      isInternetReachable: true,
      type: null,
    };
  }
}

export function isOffline(status: NetworkStatus): boolean {
  return !status.isConnected || !status.isInternetReachable;
}

// ==================== Document Caching ====================

const CACHE_DOCS_KEY = '@doclear/cached_documents';
const CACHE_FILES_INDEX_KEY = '@doclear/cached_files_index';
const MAX_CACHE_BYTES = 500 * 1024 * 1024; // 500MB

interface CachedFileEntry {
  docId: string;
  localPath: string;
  sizeBytes: number;
  cachedAt: number; // timestamp for LRU
}

/**
 * Cache a document's metadata to AsyncStorage.
 */
export async function cacheDocument(doc: Document): Promise<void> {
  try {
    const existing = await getCachedDocuments();
    const idx = existing.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      existing[idx] = doc;
    } else {
      existing.unshift(doc);
    }
    await AsyncStorage.setItem(CACHE_DOCS_KEY, JSON.stringify(existing));
  } catch {
    // Silent — caching is best-effort
  }
}

/**
 * Cache multiple documents at once (used after list fetch).
 */
export async function cacheDocuments(docs: Document[]): Promise<void> {
  try {
    const existing = await getCachedDocuments();
    const map = new Map(existing.map((d) => [d.id, d]));
    for (const doc of docs) {
      map.set(doc.id, doc);
    }
    await AsyncStorage.setItem(CACHE_DOCS_KEY, JSON.stringify(Array.from(map.values())));
  } catch {
    // Silent
  }
}

/**
 * Read all cached documents from AsyncStorage.
 */
export async function getCachedDocuments(): Promise<Document[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_DOCS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Document[];
  } catch {
    return [];
  }
}

/**
 * Get a single cached document by ID.
 */
export async function getCachedDocument(id: string): Promise<Document | null> {
  try {
    const docs = await getCachedDocuments();
    return docs.find((d) => d.id === id) ?? null;
  } catch {
    return null;
  }
}

/**
 * Download a PDF file to local storage for offline viewing.
 * Only works on native (expo-file-system).
 */
export async function cacheFile(url: string, docId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const FileSystem = await import('expo-file-system/legacy');
    if (!FileSystem.documentDirectory) return null;

    const localPath = `${FileSystem.documentDirectory}doclear_cache_${docId}.pdf`;

    const downloadResult = await FileSystem.downloadAsync(url, localPath);
    if (downloadResult.status !== 200) return null;

    // Get file info for size tracking
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    const sizeBytes = fileInfo.exists && 'size' in fileInfo ? (fileInfo.size ?? 0) : 0;

    // Update file index
    const index = await getCachedFilesIndex();
    const existingIdx = index.findIndex((e) => e.docId === docId);
    const entry: CachedFileEntry = { docId, localPath, sizeBytes, cachedAt: Date.now() };

    if (existingIdx >= 0) {
      index[existingIdx] = entry;
    } else {
      index.push(entry);
    }

    await AsyncStorage.setItem(CACHE_FILES_INDEX_KEY, JSON.stringify(index));

    // Enforce cache limit
    await enforceCacheLimit();

    return localPath;
  } catch {
    return null;
  }
}

/**
 * Get local file path for a cached document.
 */
export async function getCachedFile(docId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const index = await getCachedFilesIndex();
    const entry = index.find((e) => e.docId === docId);
    if (!entry) return null;

    const FileSystem = await import('expo-file-system/legacy');
    const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
    if (!fileInfo.exists) return null;

    // Update LRU timestamp
    entry.cachedAt = Date.now();
    await AsyncStorage.setItem(CACHE_FILES_INDEX_KEY, JSON.stringify(index));

    return entry.localPath;
  } catch {
    return null;
  }
}

/**
 * Clear old cached files using LRU eviction when total exceeds MAX_CACHE_BYTES.
 */
async function enforceCacheLimit(): Promise<void> {
  try {
    const index = await getCachedFilesIndex();
    let totalSize = index.reduce((sum, e) => sum + e.sizeBytes, 0);

    if (totalSize <= MAX_CACHE_BYTES) return;

    // Sort by cachedAt ascending (oldest first) for LRU eviction
    index.sort((a, b) => a.cachedAt - b.cachedAt);

    const FileSystem = await import('expo-file-system/legacy');
    const toRemove: number[] = [];

    for (let i = 0; i < index.length && totalSize > MAX_CACHE_BYTES; i++) {
      try {
        await FileSystem.deleteAsync(index[i].localPath, { idempotent: true });
      } catch {
        // Silent
      }
      totalSize -= index[i].sizeBytes;
      toRemove.push(i);
    }

    const remaining = index.filter((_, i) => !toRemove.includes(i));
    await AsyncStorage.setItem(CACHE_FILES_INDEX_KEY, JSON.stringify(remaining));
  } catch {
    // Silent
  }
}

/**
 * Clear all cached files and document data.
 */
export async function clearCache(): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      const FileSystem = await import('expo-file-system/legacy');
      const index = await getCachedFilesIndex();
      for (const entry of index) {
        try {
          await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
        } catch {
          // Silent
        }
      }
    }
    await AsyncStorage.removeItem(CACHE_DOCS_KEY);
    await AsyncStorage.removeItem(CACHE_FILES_INDEX_KEY);
  } catch {
    // Silent
  }
}

async function getCachedFilesIndex(): Promise<CachedFileEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_FILES_INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CachedFileEntry[];
  } catch {
    return [];
  }
}
