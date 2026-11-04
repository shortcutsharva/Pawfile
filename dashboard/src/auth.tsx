import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  getSession,
  login as loginRequest,
  logout as logoutRequest,
} from './api';

type Status = 'checking' | 'authed' | 'anon';

interface AuthValue {
  status: Status;
  login: (secret: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let cancelled = false;
    const onUnauthorized = () => setStatus('anon');
    window.addEventListener('pawfile:unauthorized', onUnauthorized);
    getSession()
      .then((session) => {
        if (!cancelled) setStatus(session.authenticated ? 'authed' : 'anon');
      })
      .catch(() => {
        if (!cancelled) setStatus('anon');
      });
    return () => {
      cancelled = true;
      window.removeEventListener('pawfile:unauthorized', onUnauthorized);
    };
  }, []);

  const value: AuthValue = {
    status,
    login: async (secret) => {
      await loginRequest(secret);
      setStatus('authed');
    },
    logout: async () => {
      try {
        await logoutRequest();
      } finally {
        setStatus('anon');
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
