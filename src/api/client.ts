import { API_URL } from '../lib/constants';
import { supabase } from '../lib/supabase';

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

interface RequestOptions extends Omit<RequestInit, 'signal'> {
  timeout?: number;
  retries?: number;
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return { Authorization: `Bearer ${data.session.access_token}` };
    }
  } catch {
    // No session available
  }
  return {};
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function request<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = TIMEOUT_MS, retries = MAX_RETRIES, ...fetchOptions } = options;

  const authHeaders = await getAuthHeader();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  const url = `${API_URL}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        { ...fetchOptions, headers },
        timeout
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError(
          errorData?.error ?? `Request failed with status ${response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error as Error;

      // 401 Unauthorized — try refreshing the token once
      if (error instanceof ApiError && error.status === 401 && attempt === 0) {
        try {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData.session?.access_token) {
            headers['Authorization'] = `Bearer ${refreshData.session.access_token}`;
            continue; // Retry with refreshed token
          }
        } catch {
          // Refresh failed — fall through to throw
        }
      }

      // Don't retry client errors (4xx)
      // 429 with limit_reached = plan limit (not retryable), without = burst rate limit (retryable)
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        if (error.status === 429 && !(error.data as Record<string, unknown>)?.limit_reached) {
          // Burst rate limit — allow retry with backoff
        } else {
          throw error;
        }
      }

      // Don't retry if out of attempts
      if (attempt >= retries) {
        break;
      }

      // Exponential backoff
      const delay = RETRY_BASE_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error('Request failed');
}

export const api = {
  get: <T = unknown>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

/**
 * Filter AI response content for safety.
 * Removes potential prompt injection artifacts and ensures appropriate formatting.
 */
export function filterAIResponse(text: string): string {
  if (!text) return text;

  // Remove any potential system prompt leaks
  let filtered = text.replace(/\[SYSTEM\].*?\[\/SYSTEM\]/gs, '');
  filtered = filtered.replace(/\<\|.*?\|\>/gs, '');

  // Remove any attempts to impersonate other roles
  filtered = filtered.replace(/^(Human|User|System|Assistant):\s*/gim, '');

  // Trim excessive whitespace
  filtered = filtered.replace(/\n{4,}/g, '\n\n\n');

  return filtered.trim();
}

export { ApiError };
