import { supabase } from './supabase';
import { API_URL } from './constants';
import { log } from './debug';
import { fetch as expoFetch } from 'expo/fetch';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * SSE streaming chat via expo/fetch (native streaming support in SDK 55).
 * Sends question + document context to backend, streams AI response.
 */
export async function streamChat(
  documentId: string,
  question: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
  language?: string
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // Mandatory 60s timeout composed with user cancel signal
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 60_000);

  let composedSignal: AbortSignal;
  if (abortSignal) {
    composedSignal = AbortSignal.any([abortSignal, timeoutController.signal]);
  } else {
    composedSignal = timeoutController.signal;
  }

  try {
    const effectiveLanguage = language || 'fr';
    log('[CHAT] Sending to', `${API_URL}/chat`, { documentId, question: question.slice(0, 50), language: effectiveLanguage });

    const response = await expoFetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        documentId,
        question,
        chatHistory,
        language: effectiveLanguage,
        useSupabase: true,
      }),
      signal: composedSignal,
    });

    log('[CHAT] Response status:', response.status);
    if (!response.ok) {
      const status = response.status;
      const errorBody = await response.text().catch(() => '');
      log('[CHAT] Error body:', errorBody);
      if (status === 529) {
        throw new Error('AI_OVERLOADED');
      }
      if (status === 429) {
        throw new Error('RATE_LIMITED');
      }
      throw new Error(`HTTP_${status}`);
    }

    // Stream via expo/fetch ReadableStream (works in React Native SDK 55+)
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              callbacks.onDone(fullText);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const tkn = parsed.choices?.[0]?.delta?.content
                ?? parsed.content
                ?? parsed.text
                ?? data;
              if (typeof tkn === 'string' && tkn.length > 0) {
                fullText += tkn;
                callbacks.onToken(tkn);
              }
            } catch {
              if (data.length > 0) {
                fullText += data;
                callbacks.onToken(data);
              }
            }
          }
        }
      }

      if (fullText.length > 0) {
        callbacks.onDone(fullText);
      }
      return;
    }

    // Fallback: read full response body (non-streaming)
    log('[CHAT] Using non-streaming fallback');
    const text = await response.text();
    let fullText = '';
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const tkn = parsed.choices?.[0]?.delta?.content
            ?? parsed.content
            ?? parsed.text
            ?? '';
          if (typeof tkn === 'string' && tkn.length > 0) {
            fullText += tkn;
          }
        } catch {
          if (data.length > 0 && data !== '[DONE]') {
            fullText += data;
          }
        }
      }
    }
    // If no SSE data found, maybe it's a plain JSON response
    if (!fullText && text.length > 0) {
      try {
        const json = JSON.parse(text);
        fullText = json.content ?? json.text ?? json.response ?? text;
      } catch {
        fullText = text;
      }
    }
    if (fullText.length > 0) {
      callbacks.onDone(fullText);
    } else {
      callbacks.onError(new Error('Empty response'));
    }
  } catch (error) {
    if (composedSignal.aborted) {
      if (abortSignal?.aborted) return; // User cancelled — silent
      callbacks.onError(new Error('TIMEOUT'));
      return;
    }
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  } finally {
    clearTimeout(timeoutId);
  }
}
