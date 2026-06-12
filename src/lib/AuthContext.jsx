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
    // Fetch user row first without the join — avoids organizations RLS
    // causing the entire query to return null on first sign-in
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    // Separately fetch the org so a missing/inaccessible org doesn't block login
    if (profile?.org_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.org_id)
        .single();
      if (org) profile.organizations = org;
    }

    // Guarantee platform admin emails always have full rights — DB is best-effort only
    if (PLATFORM_ADMIN_EMAILS.includes(authUser.email?.toLowerCase())) {
      supabase.from('users').upsert({
        id: authUser.id,
        email: authUser.email,
        is_platform_admin: true,
        role: 'admin',
        org_id: profile?.org_id ?? '00000000-0000-0000-0000-000000000001',
      }, { onConflict: 'id' }).then(() => {});
      setUserRecord({ ...authUser, ...(profile ?? {}), is_platform_admin: true, role: 'admin' });
      return;
    }

    // No users row by UUID — could be a new Google OAuth sign-in for an existing email account
    if (!profile) {
      // 1. Try to find an existing account by email (handles Google OAuth linking)
      const { data: emailProfile } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('email', authUser.email?.toLowerCase())
        .single();

      if (emailProfile) {
        // Found account by email — create a new row for the Google auth UUID
        // copying org_id and role so both providers share the same workspace
        await supabase.from('users').upsert({
          id: authUser.id,
          email: authUser.email,
          full_name: emailProfile.full_name || authUser.user_metadata?.full_name || '',
          org_id: emailProfile.org_id,
          role: emailProfile.role,
          is_platform_admin: emailProfile.is_platform_admin ?? false,
        }, { onConflict: 'id' });
        const { data: linkedProfile } = await supabase
          .from('users')
          .select('*, organizations(*)')
          .eq('id', authUser.id)
          .single();
        setUserRecord(linkedProfile || { ...emailProfile, id: authUser.id });
        return;
      }

      // 2. Check for a pending invite for this email (first-time Google OAuth invite claim)
      const { data: invite } = await supabase
        .from('pending_invites')
        .select('token')
        .eq('email', authUser.email?.toLowerCase())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (invite?.token) {
        const { data: claimData, error: claimErr } = await supabase.functions.invoke('claim-invite', {
          body: { token: invite.token, full_name: authUser.user_metadata?.full_name || '' },
        });
        if (!claimErr && !claimData?.error) {
          const { data: newProfile } = await supabase
            .from('users')
            .select('*, organizations(*)')
            .eq('id', authUser.id)
            .single();
          if (newProfile) {
            setUserRecord(newProfile);
            return;
          }
        }
      }

      // 3. No account, no invite — block access
      await supabase.auth.signOut();
      setUser(null);
      setUserRecord(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'no_account', message: 'No account found. You need an invite link to access Port 24.' });
      return;
    }

    setUserRecord(profile);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setAuthError(null);
        await loadProfile(session.user);
      } else {
        setAuthError({ type: 'auth_required' });
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setAuthError(null);
        await loadProfile(session.user);
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
