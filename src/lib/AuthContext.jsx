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
    const DEV = import.meta.env.DEV;
    if (DEV) console.log('[Auth] loadProfile start — uid:', authUser.id, 'email:', authUser.email);

    // 1. Fetch user row by UUID
    const { data: profileByUUID } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (DEV) console.log('[Auth] profile by UUID:', profileByUUID ? 'found' : 'not found');

    // 2. Resolve the profile — UUID lookup first, email fallback for OAuth linking
    let profile = profileByUUID;

    if (!profile) {
      if (DEV) console.log('[Auth] no UUID match — trying email lookup for:', authUser.email);

      const { data: emailProfile } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email?.toLowerCase())
        .single();

      if (emailProfile) {
        if (DEV) console.log('[Auth] email match found — linking Google UUID to existing account');
        // Create a new row for the new auth UUID (Google OAuth → existing email/password account)
        await supabase.from('users').upsert({
          id: authUser.id,
          email: authUser.email,
          full_name: emailProfile.full_name || authUser.user_metadata?.full_name || '',
          org_id: emailProfile.org_id,
          role: emailProfile.role,
          is_platform_admin: emailProfile.is_platform_admin ?? false,
        }, { onConflict: 'id' });

        // Also upsert the company_membership for this new UUID
        if (emailProfile.org_id) {
          await supabase.from('company_memberships').upsert({
            user_id: authUser.id,
            org_id: emailProfile.org_id,
            role: emailProfile.role ?? 'member',
            status: 'active',
          }, { onConflict: 'user_id,org_id' });
        }

        const { data: linked } = await supabase.from('users').select('*').eq('id', authUser.id).single();
        profile = linked || { ...emailProfile, id: authUser.id };
        if (DEV) console.log('[Auth] email linking complete — org_id:', profile?.org_id);
      }
    }

    // 3. Still no profile — check for pending invite or block access
    if (!profile) {
      if (DEV) console.log('[Auth] no profile after email check — checking pending invites');

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
        if (DEV) console.log('[Auth] pending invite found — claiming');
        const { data: claimData, error: claimErr } = await supabase.functions.invoke('claim-invite', {
          body: { token: invite.token, full_name: authUser.user_metadata?.full_name || '' },
        });
        if (!claimErr && !claimData?.error) {
          const { data: claimed } = await supabase.from('users').select('*').eq('id', authUser.id).single();
          if (claimed) {
            profile = claimed;
            if (DEV) console.log('[Auth] invite claimed — org_id:', profile.org_id);
          }
        }
      }
    }

    // 4. Absolute block — no account, no invite
    if (!profile) {
      if (DEV) console.log('[Auth] BLOCKED — no account found for', authUser.email);
      await supabase.auth.signOut();
      setUser(null);
      setUserRecord(null);
      setCompanyMemberships([]);
      setIsAuthenticated(false);
      setAuthError({ type: 'no_account', message: 'No account found. You need an invite link to access Port 24.' });
      return;
    }

    // 5. Apply platform-admin override on top of resolved profile
    //    This runs AFTER email-linking so Google OAuth for admin emails works correctly
    if (PLATFORM_ADMIN_EMAILS.includes(authUser.email?.toLowerCase())) {
      if (DEV) console.log('[Auth] platform admin override applied');
      profile = { ...profile, is_platform_admin: true, role: 'admin' };
      // Keep DB in sync (fire-and-forget)
      supabase.from('users').upsert({
        id: authUser.id,
        email: authUser.email,
        is_platform_admin: true,
        role: 'admin',
        ...(profile.org_id ? { org_id: profile.org_id } : {}),
      }, { onConflict: 'id' }).then(() => {});
    }

    if (DEV) console.log('[Auth] setUserRecord — org_id:', profile.org_id, 'is_platform_admin:', profile.is_platform_admin);
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
    const DEV = import.meta.env.DEV;

    // Initial session check — runs once on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (DEV) console.log('[Auth] getSession —', session ? `uid:${session.user.id}` : 'no session');
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (DEV) console.log('[Auth] onAuthStateChange event:', event, '— session:', session ? `uid:${session.user.id}` : 'null');

      if (session?.user) {
        // Only run full profile load on sign-in events, not token refreshes
        // TOKEN_REFRESHED keeps the existing state to avoid re-flashing the UI
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          setUser(session.user);
          setIsAuthenticated(true);
          setAuthError(null);
          await loadProfile(session.user);
          setIsLoadingAuth(false);
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refresh — user is still authenticated, just update the user object
          setUser(session.user);
        }
        // PASSWORD_RECOVERY and other events do nothing here
      } else {
        // SIGNED_OUT or null session — clear everything
        if (DEV) console.log('[Auth] signed out — clearing all state');
        setUser(null);
        setUserRecord(null);
        setCompanyMemberships([]);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required' });
        setIsLoadingAuth(false);
      }
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
