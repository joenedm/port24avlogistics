import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRecord, setUserRecord] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Emails that are always platform admin + org admin regardless of DB state
  const PLATFORM_ADMIN_EMAILS = ['joe@nedm.com'];

  const loadProfile = async (authUser) => {
    const { data: profile } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .eq('id', authUser.id)
      .single();

    const base = profile ?? authUser;

    // Guarantee platform admin emails always have full rights — DB is best-effort only
    if (PLATFORM_ADMIN_EMAILS.includes(authUser.email?.toLowerCase())) {
      // Try to fix DB row (may be blocked by RLS — that's ok, state is the source of truth here)
      supabase.from('users').upsert({
        id: authUser.id,
        email: authUser.email,
        is_platform_admin: true,
        role: 'admin',
        org_id: base.org_id ?? '00000000-0000-0000-0000-000000000001',
      }, { onConflict: 'id' }).then(() => {});

      // Force correct values — profile fields take priority over raw authUser, then force admin flags on top
      setUserRecord({ ...authUser, ...(profile ?? {}), is_platform_admin: true, role: 'admin' });
    } else {
      setUserRecord(base);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setAuthError(null);
        loadProfile(session.user);
      } else {
        setAuthError({ type: 'auth_required' });
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setAuthError(null);
        loadProfile(session.user);
      } else {
        setUser(null);
        setUserRecord(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required' });
      }
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRecord(null);
    setIsAuthenticated(false);
    setAuthError({ type: 'auth_required' });
    window.location.href = '/signin';
  };

  const navigateToLogin = () => { window.location.href = '/signin'; };

  const checkAppState = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      setIsAuthenticated(true);
      setAuthError(null);
      await loadProfile(session.user);
    } else {
      setAuthError({ type: 'auth_required' });
      setIsAuthenticated(false);
    }
  };

  // Convenience flags
  const isPlatformAdmin = userRecord?.is_platform_admin === true;
  const orgId = userRecord?.org_id ?? null;
  const organization = userRecord?.organizations ?? null;

  return (
    <AuthContext.Provider value={{
      user,
      userRecord,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      isPlatformAdmin,
      orgId,
      organization,
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
