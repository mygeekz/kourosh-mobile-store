import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { AuthUser, LoginFormData, LoginResponse } from '../types';

interface AuthContextType {
  currentUser: AuthUser | null;
  token: string | null;
  isLoading: boolean; // Indicates loading state for login/logout operations
  authReady: boolean; // New state to indicate initial auth process (e.g., from localStorage) is ready
  login: (credentials: LoginFormData) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  updateCurrentUser: (updatedData: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // isLoading for login/logout, initial load of user from storage
  const [authReady, setAuthReady] = useState(false);  // New: For initial load readiness

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('authToken');
    
    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          const parsedUser: AuthUser = JSON.parse(storedUser);
          setCurrentUser(parsedUser);
        } catch (error) {
          console.error("Failed to parse stored user data:", error);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('authToken');
          setToken(null);
        }
      } else {
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
      setToken(null);
    }
    setIsLoading(false); // Initial loading from localStorage is done
    setAuthReady(true);  // Signal that initial auth check is complete
  }, []);

  const login = async (credentials: LoginFormData): Promise<LoginResponse> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data: LoginResponse = await response.json();

      if (data.success && data.token && data.user) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        setToken(data.token);
        setCurrentUser(data.user);
        return data;
      } else {
        // Clear any potentially inconsistent stored data on login failure from server
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        setToken(null);
        setCurrentUser(null);
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      // Ensure state is cleared on any login error (network, parsing, etc.)
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      setToken(null);
      setCurrentUser(null);
      throw error; // Re-throw to be caught by the caller
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    const currentTokenForApiCall = localStorage.getItem('authToken'); // Use token from localStorage for logout API call
    try {
        if(currentTokenForApiCall) {
             await fetch('/api/logout', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentTokenForApiCall}`
                 },
            });
        }
    } catch (error) {
        console.error("Logout API call failed:", error);
        // Even if API call fails, proceed to clear local state/storage
    } finally {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        setToken(null);
        setCurrentUser(null);
        setIsLoading(false);
    }
  };
  
  const isAuthenticated = (): boolean => {
    // Consider authReady as well if strict "authenticated and ready" is needed
    return !!token && !!currentUser;
  };

  const updateCurrentUser = (updatedData: Partial<AuthUser>) => {
    setCurrentUser(prevUser => {
      if (!prevUser) return null;
      const newUser = { ...prevUser, ...updatedData };
      localStorage.setItem('currentUser', JSON.stringify(newUser));
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
