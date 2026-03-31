import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
 * Clear all cached files and document data.
 */
export async function clearCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_DOCS_KEY);
  } catch (e) {
    if (__DEV__) console.error('[Offline] clearCache error:', e);
  }
}
