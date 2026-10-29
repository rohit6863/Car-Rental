import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminProtectedRoute({ children }) {
  const { admin, loading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h3>Loading Admin Panel...</h3>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Force first-login password change
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}
