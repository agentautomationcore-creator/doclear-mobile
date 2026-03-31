export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://doclear.app/api';
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  accent: '#1E293B',
  accentLight: '#334155',
  cta: '#1E293B',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  // Category badges
  badgeLegal: '#3B82F6',
  badgeMedical: '#EF4444',
  badgeFinance: '#10B981',
  badgeAdmin: '#6B7280',
} as const;

export const RADIUS = {
  card: 12,
  button: 12,
} as const;

export const FONT_SIZE = {
  body: 16,
  caption: 14,
  heading: 24,
  headingSm: 20,
} as const;

export const MIN_TOUCH = 44;
