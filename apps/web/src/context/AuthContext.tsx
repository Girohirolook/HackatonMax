import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { checkUser, type CheckResponse } from '../lib/api';

type AuthStatus = 'loading' | 'new_user' | 'registered' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  data: CheckResponse | null;
  markRegistered: (newData: CheckResponse) => void;
  /** Перечитать профиль с сервера (после сохранения изменений) */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [data, setData] = useState<CheckResponse | null>(null);

  const load = useCallback(async () => {
    const res = await checkUser();
    setData(res);
    setStatus(res.isNewUser ? 'new_user' : 'registered');
  }, []);

  useEffect(() => {
    window.WebApp?.ready?.();
    load().catch((err) => {
      console.error('Auth check failed:', err);
      setStatus('error');
    });
  }, [load]);

  const markRegistered = (newData: CheckResponse) => {
    setData(newData);
    setStatus('registered');
  };

  return (
    <AuthContext.Provider value={{ status, data, markRegistered, refresh: load }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth должен использоваться внутри <AuthProvider>');
  }
  return ctx;
}