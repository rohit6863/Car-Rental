import React, { createContext, useContext, useState, useEffect } from 'react';
import client, { fetchCsrfToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const checkAuth = async () => {
    try {
      const res = await client.get('/api/admin/me');
      setAdmin(res.data.admin);
      setMustChangePassword(!!res.data.admin?.mustChangePassword);
    } catch {
      setAdmin(null);
      setMustChangePassword(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCsrfToken();
    checkAuth();
  }, []);

  const login = async (username, password) => {
    const res = await client.post('/api/admin/login', { username, password });
    setAdmin(res.data.admin);
    setMustChangePassword(!!res.data.mustChangePassword);
    return res.data;
  };

  const logout = async () => {
    try {
      await client.post('/api/admin/logout');
    } catch (err) {
      console.warn('Logout request failed:', err);
    } finally {
      setAdmin(null);
      setMustChangePassword(false);
    }
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    const res = await client.post('/api/admin/change-password', {
      password: currentPassword,
      newpassword: newPassword,
      confirmpassword: confirmPassword,
    });
    setMustChangePassword(false);
    if (admin) {
      setAdmin({ ...admin, mustChangePassword: false });
    }
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        loading,
        mustChangePassword,
        login,
        logout,
        changePassword,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
