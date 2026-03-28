import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage-based persister for React Query
const PERSIST_KEY = '@doclear/react_query_cache';

async function persistQueryData(client: QueryClient) {
  try {
    const cache = client.getQueryCache().getAll();
    const serializable = cache
      .filter((q) => q.state.status === 'success' && q.state.data !== undefined)
      .map((q) => ({
        queryKey: q.queryKey,
        state: {
          data: q.state.data,
          dataUpdatedAt: q.state.dataUpdatedAt,
        },
      }));
    await AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(serializable));
  } catch {
    // Silent — persistence is best-effort
  }
}

async function restoreQueryData(client: QueryClient) {
  try {
    const raw = await AsyncStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as Array<{
      queryKey: unknown[];
      state: { data: unknown; dataUpdatedAt: number };
    }>;
    for (const entry of entries) {
      client.setQueryData(entry.queryKey, entry.state.data, {
        updatedAt: entry.state.dataUpdatedAt,
      });
    }
  } catch {
    // Silent
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Restore persisted data on startup
restoreQueryData(queryClient).catch(() => {});

// Persist cache periodically (every 30 seconds) and on changes
let persistTimer: ReturnType<typeof setInterval> | null = null;

function startPersistence() {
  if (persistTimer) return;
  persistTimer = setInterval(() => {
    persistQueryData(queryClient).catch(() => {});
  }, 30_000);
}

startPersistence();

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
