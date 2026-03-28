import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth.store';
import { cacheDocuments, cacheDocument, getCachedDocuments, getCachedDocument } from '../lib/offline';
import type { Document, Category, ChatMessage } from '../types';

const PAGE_SIZE = 20;

interface SupabaseDocument {
  id: string;
  created_at: string;
  title: string;
  category: Category;
  doc_type: string;
  doc_type_label: string | null;
  status: string;
  summary: string | null;
  what_is_this: string;
  what_it_says: string;
  what_to_do: string[];
  deadline: string | null;
  deadline_description: string | null;
  urgency: string;
  amounts: string[];
  health_score: number | null;
  health_score_explanation: string | null;
  risk_flags: any[];
  positive_points: any[];
  key_facts: string[];
  suggested_questions: string[];
  file_url: string | null;
  image_url: string | null;
  file_type: string | null;
  page_count: number | null;
  raw_text: string | null;
  page_texts: Record<string, string> | null;
  language: string;
  recommendations: any[];
  entities: any | null;
  key_entities: any | null;
  specialist_type: string | null;
  specialist_recommendation: string | null;
}

function mapSupabaseDoc(d: SupabaseDocument): Document {
  return {
    id: d.id,
    createdAt: d.created_at,
    title: d.title,
    category: d.category,
    docType: d.doc_type as any,
    docTypeLabel: d.doc_type_label ?? undefined,
    status: d.status as any,
    summary: d.summary ?? undefined,
    whatIsThis: d.what_is_this,
    whatItSays: d.what_it_says,
    whatToDo: d.what_to_do ?? [],
    deadline: d.deadline,
    deadlineDescription: d.deadline_description,
    urgency: d.urgency as any,
    amounts: d.amounts ?? [],
    healthScore: d.health_score ?? undefined,
    healthScoreExplanation: d.health_score_explanation ?? undefined,
    riskFlags: d.risk_flags ?? [],
    positivePoints: d.positive_points ?? [],
    keyFacts: d.key_facts ?? [],
    suggestedQuestions: d.suggested_questions ?? [],
    imageData: '',
    fileUrl: d.file_url ?? undefined,
    fileType: d.file_type ?? undefined,
    pageCount: d.page_count ?? undefined,
    rawText: d.raw_text ?? undefined,
    pageTexts: d.page_texts ?? undefined,
    chatHistory: [],
    language: d.language,
    recommendations: d.recommendations ?? [],
  };
}

export function useDocumentsList(category?: Category | 'all', searchQuery?: string) {
  const userId = useAuthStore((s) => s.user?.id);

  return useInfiniteQuery({
    queryKey: ['documents', 'list', userId, category, searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return { documents: [] as Document[], nextPage: undefined };

      try {
        let query = supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(pageParam, pageParam + PAGE_SIZE - 1);

        if (category && category !== 'all') {
          query = query.eq('category', category);
        }
        if (searchQuery && searchQuery.trim()) {
          query = query.ilike('title', `%${searchQuery.trim()}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        const documents = (data ?? []).map(mapSupabaseDoc);

        // Cache documents for offline use
        if (pageParam === 0 && documents.length > 0) {
          cacheDocuments(documents).catch(() => {});
        }

        return {
          documents,
          nextPage: documents.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined,
        };
      } catch (err) {
        // On network failure, return cached documents for the first page
        if (pageParam === 0) {
          const cached = await getCachedDocuments();
          if (cached.length > 0) {
            let filtered = cached;
            if (category && category !== 'all') {
              filtered = filtered.filter((d) => d.category === category);
            }
            if (searchQuery && searchQuery.trim()) {
              const q = searchQuery.trim().toLowerCase();
              filtered = filtered.filter((d) => d.title.toLowerCase().includes(q));
            }
            return {
              documents: filtered,
              nextPage: undefined,
              _fromCache: true,
            };
          }
        }
        throw err;
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!userId,
  });
}

export function useDocument(id: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<Document | null>({
    queryKey: ['documents', 'detail', id],
    queryFn: async () => {
      if (!id || !userId) return null;

      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) return null;

        // Load chat history
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('role, content, created_at')
          .eq('document_id', id)
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        const doc = mapSupabaseDoc(data);
        doc.chatHistory = (messages ?? []).map((m: any) => ({
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
        }));

        // Cache for offline use
        cacheDocument(doc).catch(() => {});

        return doc;
      } catch (err) {
        // Fallback to cached document when offline
        const cached = await getCachedDocument(id);
        if (cached) return cached;
        throw err;
      }
    },
    enabled: !!id && !!userId,
    staleTime: 1000 * 60 * 10, // 10 min — processed documents rarely change
  });
}

export function useDocumentsWithChat() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['documents', 'with-chat', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get all documents that have chat messages
      const { data: chatDocs } = await supabase
        .from('chat_messages')
        .select('document_id, content, created_at, role')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!chatDocs || chatDocs.length === 0) return [];

      // Get unique doc IDs with last message
      const docMap = new Map<string, { content: string; date: string }>();
      for (const msg of chatDocs) {
        if (!docMap.has(msg.document_id)) {
          docMap.set(msg.document_id, { content: msg.content, date: msg.created_at });
        }
      }

      const docIds = Array.from(docMap.keys());
      const { data: docs } = await supabase
        .from('documents')
        .select('id, title, doc_type, doc_type_label')
        .in('id', docIds);

      return (docs ?? []).map((d: any) => ({
        id: d.id,
        title: d.title,
        docType: d.doc_type,
        lastMessage: docMap.get(d.id)?.content ?? '',
        lastMessageDate: docMap.get(d.id)?.date ?? '',
      }));
    },
    enabled: !!userId,
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
