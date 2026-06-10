import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRecord, setUserRecord] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      let currentUser;
      try {
        currentUser = await base44.auth.me();
      } catch {
        setAuthError({ type: 'auth_required' });
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      setUser(currentUser);
      setUserRecord(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setUserRecord(null);
    setIsAuthenticated(false);
    setAuthError({ type: 'auth_required' });
    try { await base44.auth.logout(); } catch {}
    window.location.href = '/signin';
  };

  const navigateToLogin = () => {
    window.location.href = '/signin';
  };

  return (
    <AuthContext.Provider value={{
      user,
      userRecord,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};