import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, api, setSessionExpiredHandler } from '@/lib/api';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/lib/tokenStore';

interface AuthUser {
  id: string;
  email: string;
  emailVerified?: boolean;
}

interface AuthCompany {
  id: string;
  name: string;
  subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  trialExpiresAt: string | null;
  subscriptionExpiresAt: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  company: AuthCompany | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: {
    companyName: string;
    ownerName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshCompany: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<AuthCompany | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastActivity = useRef(Date.now());

  const clearSession = useCallback((message?: string) => {
    clearTokens();
    setUser(null);
    setCompany(null);
    if (message) setError(message);
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const res = await api.get<{ data: { user: AuthUser; company: AuthCompany | null } }>(
        '/auth/me',
      );
      setUser(res.data.user);
      setCompany(res.data.company);
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  // Session-expiry callback lives in the plain fetch layer (lib/api.ts),
  // which has no React dependency — this is the one place that bridges it
  // back into context state so the UI reacts to a token dying mid-session.
  useEffect(() => {
    setSessionExpiredHandler(() => clearSession('Your session expired. Please log in again.'));
  }, [clearSession]);

  useEffect(() => {
    if (getAccessToken() || getRefreshToken()) {
      void loadMe();
    } else {
      setIsLoading(false);
    }
  }, [loadMe]);

  // Idle timeout: any real user interaction resets the clock; a periodic
  // check compares against it rather than resetting a timer on every event,
  // which would fire far more often than needed.
  useEffect(() => {
    function onActivity() {
      lastActivity.current = Date.now();
    }
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity));

    const interval = setInterval(() => {
      if (user && Date.now() - lastActivity.current > IDLE_TIMEOUT_MS) {
        clearSession('Session expired for security.');
      }
    }, 60_000);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
      clearInterval(interval);
    };
  }, [user, clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
        company: AuthCompany | null;
      }>('/auth/login', { email, password });
      setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      setCompany(res.company);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not sign in.';
      setError(message);
      throw err;
    }
  }, []);

  const signup = useCallback(
    async (input: { companyName: string; ownerName: string; email: string; password: string }) => {
      setError(null);
      try {
        await api.post('/auth/register', input);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Could not create your account.';
        setError(message);
        throw err;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', { refreshToken: getRefreshToken() });
    } catch {
      // Clearing local state is what actually logs the user out client-side;
      // a failed revoke call server-side isn't worth blocking on.
    }
    clearSession();
  }, [clearSession]);

  const refreshCompany = useCallback(async () => {
    const res = await api.get<{ data: { user: AuthUser; company: AuthCompany | null } }>(
      '/auth/me',
    );
    setCompany(res.data.company);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      company,
      isAuthenticated: !!user,
      isLoading,
      error,
      login,
      signup,
      logout,
      refreshCompany,
    }),
    [user, company, isLoading, error, login, signup, logout, refreshCompany],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
