import React, { createContext, useState, useCallback, ReactNode } from 'react';

export interface User {
  id: number;
  email: string;
  name: string;
  phone_number: string;
  location: string;
  location_code: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (user: User) => void;
  logout: () => void;
  setError: (error: string | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback((userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setError(null);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    login,
    logout,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
