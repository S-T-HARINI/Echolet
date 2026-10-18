'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, fetchMe, login as apiLogin, signup as apiSignup, logout as apiLogout } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (data: { email: string; password: string }) => Promise<void>;
  signup: (data: { email: string; password: string; name: string; role: 'ORGANIZER' | 'MEMBER' }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await fetchMe();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (data: { email: string; password: string }) => {
    setError(null);
    try {
      const res = await apiLogin(data);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const signup = async (data: {
    email: string;
    password: string;
    name: string;
    role: 'ORGANIZER' | 'MEMBER';
  }) => {
    setError(null);
    try {
      const res = await apiSignup(data);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        signup,
        logout,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
