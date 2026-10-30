import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setCsrfToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState({ google: false });

  const checkAuth = async () => {
    try {
      const res = await api.get('/api/auth/me');
      if (res.data && res.data.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const res = await api.get('/api/auth/providers');
      if (res.data) setProviders(res.data);
    } catch {
      setProviders({ google: false });
    }
  };

  useEffect(() => {
    checkAuth();
    loadProviders();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    if (res.data.user) {
      setUser(res.data.user);
      if (res.data.csrfToken) setCsrfToken(res.data.csrfToken);
    }
    return res.data;
  };

  const register = async (formData) => {
    const res = await api.post('/api/auth/register', formData);
    if (res.data.user) {
      setUser(res.data.user);
      if (res.data.csrfToken) setCsrfToken(res.data.csrfToken);
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, providers, login, register, logout, checkAuth }}>
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
