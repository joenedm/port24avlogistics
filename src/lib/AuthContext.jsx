import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

// Emails that always have platform-admin rights regardless of DB state
const PLATFORM_ADMIN_EMAILS = ['joe@nedm.com'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRecord, setUserRecord] = useState(null);
  const [companyMemberships, setCompanyMemberships] = useState(null); // null = not yet loaded
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  // -------------------------------------------------------------------
  // Core profile loader — called after every auth state change
  // -------------------------------------------------------------------
  const loadProfile = async (authUser) => {
    // 1. Fetch user row (no join — avoids orgs RLS killing the query)
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    // 2. Guarantee platform-admin emails always have full rights
    if (PLATFORM_ADMIN_EMAILS.includes(authUser.email?.toLowerCase())) {
      const orgId = profile?.org_id ?? null;
      // Keep DB in sync (fire-and-forget)
      supabase.from('users').upsert({
        id: authUser.id,
        email: authUser.email,
        is_platform_admin: true,
        role: 'admin',
        ...(orgId ? { org_id: orgId } : {}),
      }, { onConflict: 'id' }).then(() => {});

      const merged = { ...authUser, ...(profile ?? {}), is_platform_admin: true, role: 'admin' };
      setUserRecord(merged);
      await loadMemberships(authUser.id, merged);
      return;
    }

    // 3. No users row by UUID — try email-based link (Google OAuth for existing account)
    if (!profile) {
      const { data: emailProfile } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email?.toLowerCase())
        .single();

      if (emailProfile) {
        // Create a new row for the Google auth UUID, copying org/role
        await supabase.from('users').upsert({
          id: authUser.id,
          email: authUser.email,
          full_name: emailProfile.full_name || authUser.user_metadata?.full_name || '',
          org_id: emailProfile.org_id,
          role: emailProfile.role,
          is_platform_admin: emailProfile.is_platform_admin ?? false,
        }, { onConflict: 'id' });
        const { data: linked } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        const resolved = linked || { ...emailProfile, id: authUser.id };
        setUserRecord(resolved);
        await loadMemberships(authUser.id, resolved);
        return;
      }

      // 4. Check for pending invite (first-time Google OAuth invite claim)
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
            .select('*')
            .eq('id', authUser.id)
            .single();
          if (newProfile) {
            setUserRecord(newProfile);
            await loadMemberships(authUser.id, newProfile);
            return;
          }
        }
      }

      // 5. No account, no invite → block access
      await supabase.auth.signOut();
      setUser(null);
      setUserRecord(null);
      setCompanyMemberships([]);
      setIsAuthenticated(false);
      setAuthError({ type: 'no_account', message: 'No account found. You need an invite link to access Port 24.' });
      return;
    }

    // 6. Normal path — profile found by UUID
    setUserRecord(profile);
    await loadMemberships(authUser.id, profile);
  };

  // -------------------------------------------------------------------
  // Load company_memberships and update users.org_id if needed
  // -------------------------------------------------------------------
  const loadMemberships = async (userId, profile) => {
    const { data: memberships } = await supabase
      .from('company_memberships')
      .select('*, organizations(*)')
      .eq('user_id', userId)
      .eq('status', 'active');

    let list = memberships ?? [];

    // If any membership is missing its org record (RLS edge case), fetch the active org directly
    const activeOrgId = profile?.org_id;
    if (activeOrgId && list.some(m => m.org_id === activeOrgId && !m.organizations)) {
      const { data: org } = await supabase.from('organizations').select('*').eq('id', activeOrgId).single();
      if (org) {
        list = list.map(m => m.org_id === activeOrgId ? { ...m, organizations: org } : m);
      }
    }

    setCompanyMemberships(list);

    if (list.length === 0) {
      // No membership → needs_company state is derived in the context value
      return;
    }

    if (list.length === 1) {
      // Single membership — auto-select if org_id doesn't match
      const targetOrgId = list[0].org_id;
      if (profile?.org_id !== targetOrgId) {
        await supabase
          .from('users')
          .update({ org_id: targetOrgId })
          .eq('id', userId);
        setUserRecord(prev => ({ ...prev, org_id: targetOrgId }));
      }
      return;
    }

    // Multiple memberships — check if active org_id is one of them
    if (profile?.org_id && list.some(m => m.org_id === profile.org_id)) {
      // Already has a valid active workspace — nothing to do
      return;
    }

    // Active org_id is missing or stale — will trigger workspace picker
    // (no org_id update here; user must pick)
  };

  // -------------------------------------------------------------------
  // Switch workspace (call from WorkspacePicker)
  // -------------------------------------------------------------------
  const switchWorkspace = async (orgId) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('users')
      .update({ org_id: orgId })
      .eq('id', user.id);
    if (error) throw error;
    setUserRecord(prev => ({ ...prev, org_id: orgId }));
    // Force full reload so all React Query caches clear
    window.location.href = '/dashboard';
  };

  // -------------------------------------------------------------------
  // Auth state listeners
  // -------------------------------------------------------------------
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setAuthError(null);
        await loadProfile(session.user);
      } else {
        setIsAuthenticated(false);
        setCompanyMemberships([]);
        setAuthError({ type: 'auth_required' });
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
        setCompanyMemberships([]);
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
    setCompanyMemberships([]);
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
      setIsAuthenticated(false);
      setCompanyMemberships([]);
      setAuthError({ type: 'auth_required' });
    }
  };

  // -------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------
  const isPlatformAdmin = userRecord?.is_platform_admin === true;
  const orgId = userRecord?.org_id ?? null;

  // Fetch org record for the active org from the membership list (or separately)
  const activeMembership = companyMemberships?.find(m => m.org_id === orgId) ?? null;
  const organization = activeMembership?.organizations ?? null;

  // Membership routing states (null = still loading)
  const membershipsLoaded = companyMemberships !== null;
  const needsCompany = membershipsLoaded && companyMemberships.length === 0 && !isPlatformAdmin;
  const needsWorkspacePick = membershipsLoaded
    && companyMemberships.length > 1
    && (!orgId || !companyMemberships.some(m => m.org_id === orgId));

  return (
    <AuthContext.Provider value={{
      user,
      userRecord,
      companyMemberships,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      isPlatformAdmin,
      orgId,
      organization,
      needsCompany,
      needsWorkspacePick,
      membershipsLoaded,
      logout,
      navigateToLogin,
      checkAppState,
      switchWorkspace,
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
