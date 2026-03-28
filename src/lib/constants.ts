export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://doclear.app/api';
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  accent: '#1a56db',
  danger: '#dc2626',
  warning: '#f59e0b',
  success: '#16a34a',
  cardBg: '#F8FAFC',
  border: 'rgba(0,0,0,0.06)',
} as const;

export const RADIUS = {
  card: 20,
  button: 14,
} as const;

export const FONT_SIZE = {
  body: 16,
  caption: 14,
  heading: 24,
  headingSm: 20,
} as const;

export const MIN_TOUCH = 44;
