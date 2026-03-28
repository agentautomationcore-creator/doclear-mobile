import { supabase } from './supabase';
import { API_URL } from './constants';

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
  abortSignal?: AbortSignal
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        documentId,
        question,
        chatHistory,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 529) {
        throw new Error('AI_OVERLOADED');
      }
      if (status === 429) {
        throw new Error('RATE_LIMITED');
      }
      throw new Error(`HTTP_${status}`);
    }

    if (!response.body) {
      throw new Error('NO_STREAM_BODY');
    }

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
            const token = parsed.choices?.[0]?.delta?.content
              ?? parsed.content
              ?? parsed.text
              ?? data;
            if (typeof token === 'string' && token.length > 0) {
              fullText += token;
              callbacks.onToken(token);
            }
          } catch {
            // Plain text SSE
            if (data.length > 0) {
              fullText += data;
              callbacks.onToken(data);
            }
          }
        }
      }
    }

    // If we exited the loop without [DONE], finalize
    if (fullText.length > 0) {
      callbacks.onDone(fullText);
    }
  } catch (error) {
    if (abortSignal?.aborted) return;
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
