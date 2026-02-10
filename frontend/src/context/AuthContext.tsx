import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export interface User {
  id: number;
  email: string;
  name: string;
  phone_number?: string;
  location?: string;
  location_code?: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if token exists in localStorage on mount
    const savedToken = localStorage.getItem('authToken');
    console.log('🔐 AuthProvider mount - token:', savedToken ? 'exists' : 'not found');
    
    if (savedToken) {
      setToken(savedToken);
      loadCurrentUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadCurrentUser = async (authToken: string) => {
    try {
      console.log('📡 Loading current user...');
      const response = await authAPI.getCurrentUser();  // ✅ Matches api.ts
      console.log('✅ Current user loaded:', response.data.user);
      setUser(response.data.user);
    } catch (error: any) {
      console.error('❌ Failed to load current user:', error.message);
      
      // Only logout if it's a 401 (unauthorized)
      if (error.response?.status === 401) {
        console.warn('🚪 Token invalid - logging out');
        localStorage.removeItem('authToken');
        setToken(null);
      } else {
        console.warn('⚠️ Error loading user, but keeping token. Status:', error.response?.status);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      console.log('🔐 Attempting login:', email);
      const response = await authAPI.login(email, password);
      
      console.log('📡 Login response received');

      const { token: newToken, user: userData } = response.data;

      if (!newToken) {
        throw new Error('Invalid login response - no token');
      }

      if (!userData) {
        throw new Error('Invalid login response - no user data');
      }

      if (!userData.id || !userData.email || !userData.role) {
        throw new Error('Invalid user data - missing required fields');
      }

      if (userData.role !== 'user' && userData.role !== 'admin') {
        throw new Error('Invalid user role');
      }

      console.log('✅ Login successful:', userData.name);
      
      localStorage.setItem('authToken', newToken);
      setToken(newToken);
      setUser(userData);

      return userData;
    } catch (error: any) {
      console.error('❌ Login failed:', error.response?.data?.error || error.message);
      throw error;
    }
  };

  const logout = () => {
    console.log('🚪 Logging out');
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
