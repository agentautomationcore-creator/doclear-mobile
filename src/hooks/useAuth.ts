import { useAuthStore } from '../store/auth.store';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAnonymous = useAuthStore((s) => s.isAnonymous);
  const isLoading = useAuthStore((s) => s.isLoading);
  const plan = useAuthStore((s) => s.plan);
  const scanCount = useAuthStore((s) => s.scanCount);
  const scanLimit = useAuthStore((s) => s.scanLimit);
  const canUpload = useAuthStore((s) => s.canUpload);
  const canAskQuestion = useAuthStore((s) => s.canAskQuestion);
  const dailyQuestions = useAuthStore((s) => s.dailyQuestions);

  return {
    user,
    session,
    isAuthenticated,
    isAnonymous,
    isLoading,
    plan,
    scanCount,
    scanLimit,
    canUpload,
    canAskQuestion,
    dailyQuestions,
  };
}
