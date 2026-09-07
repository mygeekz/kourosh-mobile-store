import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { AuthUser, LoginFormData, LoginResponse } from '../types';
import { apiFetch } from '../utils/apiFetch';
import {
  AUTH_SESSION_INVALID_EVENT,
  clearPersistedAuthSession,
  getAuthResponseMessage,
  isAuthUser,
  persistAuthSession,
  readJsonObject,
  readStoredAuthToken,
} from '../utils/authSession';

interface AuthContextType {
  currentUser: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  authReady: boolean;
  login: (credentials: LoginFormData) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  updateCurrentUser: (updatedData: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const clearAuthState = useCallback(() => {
    clearPersistedAuthSession();
    setToken(null);
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const reconcileStoredSession = async () => {
      const storedToken = readStoredAuthToken();
      if (!storedToken) {
        if (!cancelled) clearAuthState();
        return;
      }

      try {
        const response = await apiFetch('/api/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
          cache: 'no-store',
        });
        const payload = await readJsonObject(response);
        if (!response.ok || payload.success !== true || !isAuthUser(payload.user)) {
          throw new Error(getAuthResponseMessage(payload, 'نشست کاربری معتبر نیست.'));
        }
        if (cancelled) return;
        persistAuthSession(storedToken, payload.user);
        setToken(storedToken);
        setCurrentUser(payload.user);
      } catch (error) {
        if (!cancelled) {
          console.warn('[auth] stored session reconciliation failed:', error);
          clearAuthState();
        }
      }
    };

    void reconcileStoredSession().finally(() => {
      if (!cancelled) {
        setIsLoading(false);
        setAuthReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clearAuthState]);

  useEffect(() => {
    const handleInvalidSession = () => {
      clearAuthState();
      setIsLoading(false);
      setAuthReady(true);
    };
    window.addEventListener(AUTH_SESSION_INVALID_EVENT, handleInvalidSession);
    return () => window.removeEventListener(AUTH_SESSION_INVALID_EVENT, handleInvalidSession);
  }, [clearAuthState]);

  const login = async (credentials: LoginFormData): Promise<LoginResponse> => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const payload = await readJsonObject(response);

      if (
        !response.ok ||
        payload.success !== true ||
        typeof payload.token !== 'string' ||
        !isAuthUser(payload.user)
      ) {
        throw new Error(getAuthResponseMessage(payload, 'ورود ناموفق بود.'));
      }
      const data: LoginResponse = {
        success: true,
        token: payload.token,
        user: payload.user,
        message: typeof payload.message === 'string' ? payload.message : undefined,
      };
      persistAuthSession(payload.token, payload.user);
      setToken(payload.token);
      setCurrentUser(payload.user);
      setAuthReady(true);
      return data;
    } catch (error) {
      clearAuthState();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    const currentTokenForApiCall = readStoredAuthToken();
    try {
        if(currentTokenForApiCall) {
             await apiFetch('/api/logout', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentTokenForApiCall}`
                 },
            });
        }
    } catch (error) {
        console.error("Logout API call failed:", error);
    } finally {
        clearAuthState();
        setIsLoading(false);
    }
  };
  
  const isAuthenticated = (): boolean => {
    return authReady && !!token && !!currentUser;
  };

  const updateCurrentUser = (updatedData: Partial<AuthUser>) => {
    setCurrentUser(prevUser => {
      if (!prevUser) return null;
      const newUser = { ...prevUser, ...updatedData };
      if (token) persistAuthSession(token, newUser);
      return newUser;
    });
  };


  return (
    <AuthContext.Provider value={{ currentUser, token, isLoading, authReady, login, logout, isAuthenticated, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
