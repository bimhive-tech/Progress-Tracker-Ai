import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, setUnauthorizedHandler } from './api';
import type { AuthUser } from './types';

type Auth = {
  user: AuthUser;
  /** Admins can change things; viewers get a read-only dashboard. */
  canEdit: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);
const ME = ['me'] as const;

/** Resolves the signed-in account. Renders `signIn` until there is one, then `children`. */
export function AuthGate({ children, signIn, loading }: { children: ReactNode; signIn: ReactNode; loading: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ME,
    queryFn: api.me,
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    setUnauthorizedHandler(() => qc.setQueryData(ME, null));
    return () => setUnauthorizedHandler(null);
  }, [qc]);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => {});
    qc.setQueryData(ME, null);
    // Drop everything the previous account loaded (but keep the "me" query the gate is watching).
    qc.removeQueries({ predicate: (query) => query.queryKey[0] !== ME[0] });
  }, [qc]);

  const user = me.data;
  const value = useMemo(() => (user ? { user, canEdit: user.role === 'admin', signOut } : null), [user, signOut]);

  if (me.isLoading) return <>{loading}</>;
  if (!value) return <>{signIn}</>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Call after a successful sign-in so the gate swaps to the dashboard. */
export function useSignedIn() {
  const qc = useQueryClient();
  return useCallback((user: AuthUser) => qc.setQueryData(ME, user), [qc]);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthGate');
  return ctx;
}
