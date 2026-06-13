import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

// Emails that always have platform-admin rights regardless of DB state
const PLATFORM_ADMIN_EMAILS = ['port24avlogistics@gmail.com'];

// localStorage keys that belong to workspace/company state — cleared on logout
const WORKSPACE_STORAGE_KEYS = ['sidebar_collapsed_groups'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRecord, setUserRecord] = useState(null);
  const [companyMemberships, setCompanyMemberships] = useState(null); // null = not yet loaded
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [routingSource, setRoutingSource] = useState(null);

  // True when the user arrived via the "Start Free Trial" landing-page button.
  // Persisted in sessionStorage so it survives the OAuth redirect.
  const [trialFlow] = useState(() => sessionStorage.getItem('port24_flow') === 'trial');

  const profileLoadingRef = useRef(false);
  const authDoneRef = useRef(false);

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

    let profile = profileByUUID;

    // 2. Email fallback — link a new OAuth UUID to an existing email/password account
    if (!profile) {
      if (DEV) console.log('[Auth] no UUID match — trying email lookup for:', authUser.email);

      const { data: emailProfile } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email?.toLowerCase())
        .single();

      if (emailProfile) {
        if (DEV) console.log('[Auth] email match found — linking UUID', authUser.id, 'to existing account', emailProfile.id);

        // Check if this new UUID already has memberships (e.g. from a previous partial link)
        const { data: newUUIDMemberships } = await supabase
          .from('company_memberships')
          .select('org_id, role, status, joined_at')
          .eq('user_id', authUser.id)
          .eq('status', 'active');

        // Migrate ALL memberships from the old UUID to the new UUID.
        // This is safer than inheriting org_id from users.org_id (which may be stale/NEDM).
        if (!newUUIDMemberships?.length) {
          const { data: oldMemberships } = await supabase
            .from('company_memberships')
            .select('org_id, role, status, joined_at')
            .eq('user_id', emailProfile.id)
            .eq('status', 'active');

          if (oldMemberships?.length > 0) {
            if (DEV) console.log('[Auth] migrating', oldMemberships.length, 'membership(s) from old UUID to new UUID');
            await supabase.from('company_memberships').upsert(
              oldMemberships.map(m => ({
                user_id: authUser.id,
                org_id: m.org_id,
                role: m.role,
                status: m.status,
              })),
              { onConflict: 'user_id,org_id' }
            );
          }
        }

        // Re-fetch memberships for the new UUID after migration
        const { data: resolvedMemberships } = await supabase
          .from('company_memberships')
          .select('org_id, role')
          .eq('user_id', authUser.id)
          .eq('status', 'active')
          .order('joined_at', { ascending: false })
          .limit(1);

        // org_id: use the first real membership; null if no memberships exist.
        // Do NOT fall back to emailProfile.org_id — that may be stale or point to NEDM.
        const resolvedOrgId = resolvedMemberships?.[0]?.org_id ?? null;
        const resolvedRole = resolvedMemberships?.[0]?.role ?? emailProfile.role;

        if (DEV) console.log('[Auth] email linking — resolved org_id:', resolvedOrgId);

        await supabase.from('users').upsert({
          id: authUser.id,
          email: authUser.email,
          full_name: emailProfile.full_name || authUser.user_metadata?.full_name || '',
          org_id: resolvedOrgId,
          role: resolvedRole,
          is_platform_admin: emailProfile.is_platform_admin ?? false,
        }, { onConflict: 'id' });

        const { data: linked } = await supabase.from('users').select('*').eq('id', authUser.id).single();
        profile = linked || { ...emailProfile, id: authUser.id, org_id: resolvedOrgId };
        if (DEV) console.log('[Auth] email linking complete — org_id:', profile?.org_id);
      }
    }

    // 3. No profile — auto-claim pending invite (OAuth only)
    if (!profile) {
      const isOAuth = authUser.app_metadata?.provider !== 'email';
      if (DEV) console.log('[Auth] no profile after email check — provider:', authUser.app_metadata?.provider, 'isOAuth:', isOAuth);

      if (isOAuth) {
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
          if (DEV) console.log('[Auth] OAuth — pending invite found — claiming');
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
    }

    // 3.5. Platform admin shortcut — build synthetic profile for first sign-in
    if (!profile && PLATFORM_ADMIN_EMAILS.includes(authUser.email?.toLowerCase())) {
      if (DEV) console.log('[Auth] platform admin first sign-in — building synthetic profile');
      profile = {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email,
        role: 'admin',
        is_platform_admin: true,
        org_id: null,
      };
    }

    // 4. No account found — block access
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

    // 5. Apply platform-admin override
    if (PLATFORM_ADMIN_EMAILS.includes(authUser.email?.toLowerCase())) {
      if (DEV) console.log('[Auth] platform admin override applied');
      profile = { ...profile, is_platform_admin: true, role: 'admin' };
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
  // Load company_memberships and determine workspace routing
  // -------------------------------------------------------------------
  const loadMemberships = async (userId, profile) => {
    const DEV = import.meta.env.DEV;
    const { data: memberships } = await supabase
      .from('company_memberships')
      .select('*, organizations(*)')
      .eq('user_id', userId)
      .eq('status', 'active');

    let list = memberships ?? [];

    // If any membership is missing its org record (RLS edge case), fetch the org directly
    const activeOrgId = profile?.org_id;
    if (activeOrgId && list.some(m => m.org_id === activeOrgId && !m.organizations)) {
      const { data: org } = await supabase.from('organizations').select('*').eq('id', activeOrgId).single();
      if (org) {
        list = list.map(m => m.org_id === activeOrgId ? { ...m, organizations: org } : m);
      }
    }

    setCompanyMemberships(list);

    if (list.length === 0) {
      // No memberships — needs_company state is derived in context value
      setRoutingSource('no_memberships');
      if (DEV) console.log('[Auth] loadMemberships — no memberships found');
      return;
    }

    // Check if the saved org_id is valid (exists in memberships list)
    const activeOrgValid = profile?.org_id && list.some(m => m.org_id === profile.org_id);

    if (activeOrgValid) {
      if (DEV) console.log('[Auth] loadMemberships — active org_id', profile.org_id, 'valid, keeping it');
      setRoutingSource(list.length === 1 ? 'membership_auto_select' : 'saved_active_company');
      return;
    }

    // org_id is null OR points to an org not in the membership list
    if (!profile?.org_id) {
      // No saved org — route depends on membership count
      if (list.length === 1) {
        // Exactly 1 membership — auto-select it
        const autoOrgId = list[0].org_id;
        if (DEV) console.log('[Auth] loadMemberships — 1 membership, auto-selecting:', autoOrgId);
        await supabase.from('users').update({ org_id: autoOrgId }).eq('id', userId);
        setUserRecord(prev => ({ ...prev, org_id: autoOrgId }));
        setRoutingSource('membership_auto_select');
      } else {
        // Multiple memberships — show workspace picker, do NOT auto-select
        if (DEV) console.log('[Auth] loadMemberships — multiple memberships, showing workspace picker');
        setRoutingSource('workspace_picker');
      }
    } else {
      // org_id is set but not in the membership list — clear it and re-route
      if (DEV) console.log('[Auth] loadMemberships — org_id', profile.org_id, 'not in membership list — clearing and re-routing');
      await supabase.from('users').update({ org_id: null }).eq('id', userId);
      setUserRecord(prev => ({ ...prev, org_id: null }));
      if (list.length === 1) {
        const autoOrgId = list[0].org_id;
        await supabase.from('users').update({ org_id: autoOrgId }).eq('id', userId);
        setUserRecord(prev => ({ ...prev, org_id: autoOrgId }));
        setRoutingSource('membership_auto_select');
      } else {
        setRoutingSource('workspace_picker');
      }
    }
  };

  // -------------------------------------------------------------------
  // Safety valve — if loading hasn't resolved after 12s, clear state
  // -------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authDoneRef.current) {
        console.warn('[Auth] Loading timeout — clearing auth state');
        profileLoadingRef.current = false;
        setUser(null); setUserRecord(null); setCompanyMemberships([]);
        setIsAuthenticated(false); setAuthError({ type: 'auth_required' });
        setIsLoadingAuth(false); setRoutingSource(null);
      }
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  // -------------------------------------------------------------------
  // Auth state listener — single source of truth
  // -------------------------------------------------------------------
  useEffect(() => {
    const DEV = import.meta.env.DEV;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (DEV) console.log('[Auth] event:', event, '— session:', session ? `uid:${session.user.id}` : 'null');

      if (event === 'TOKEN_REFRESHED') {
        if (session?.user) setUser(session.user);
        return;
      }

      if (event === 'SIGNED_OUT' || !session?.user) {
        if (event === 'INITIAL_SESSION') {
          const hasOAuthParams =
            window.location.search.includes('code=') ||
            window.location.hash.includes('access_token=');
          if (hasOAuthParams) {
            if (DEV) console.log('[Auth] INITIAL_SESSION null but OAuth params detected — waiting for SIGNED_IN');
            return;
          }
        }
        if (DEV) console.log('[Auth] clearing all auth state — event:', event);
        authDoneRef.current = true;
        setUser(null);
        setUserRecord(null);
        setCompanyMemberships([]);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required' });
        setIsLoadingAuth(false);
        setRoutingSource(null);
        return;
      }

      if (profileLoadingRef.current) {
        if (DEV) console.log('[Auth] profile load already in progress — skipping duplicate event:', event);
        return;
      }

      profileLoadingRef.current = true;
      setUser(session.user);
      setIsAuthenticated(true);
      setIsLoadingAuth(true);
      setCompanyMemberships(null);
      setAuthError(null);

      try {
        await loadProfile(session.user);
      } catch (err) {
        if (DEV) console.error('[Auth] loadProfile threw:', err);
        setUser(null);
        setUserRecord(null);
        setCompanyMemberships([]);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required' });
      } finally {
        authDoneRef.current = true;
        profileLoadingRef.current = false;
        setIsLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // -------------------------------------------------------------------
  // Switch workspace
  // -------------------------------------------------------------------
  const switchWorkspace = async (orgId) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('users')
      .update({ org_id: orgId })
      .eq('id', user.id);
    if (error) throw error;
    setUserRecord(prev => ({ ...prev, org_id: orgId }));
    setRoutingSource('workspace_picker');
    window.location.href = '/dashboard';
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // Clear workspace-specific localStorage keys
    WORKSPACE_STORAGE_KEYS.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    window.location.href = '/signin';
  };

  const navigateToLogin = () => { window.location.href = '/signin'; };

  const checkAppState = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && !profileLoadingRef.current) {
      profileLoadingRef.current = true;
      setIsLoadingAuth(true);
      setCompanyMemberships(null);
      try {
        await loadProfile(session.user);
      } finally {
        profileLoadingRef.current = false;
        setIsLoadingAuth(false);
      }
    }
  };

  // -------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------
  const isPlatformAdmin = userRecord?.is_platform_admin === true
    || (user?.email != null && PLATFORM_ADMIN_EMAILS.includes(user.email.toLowerCase()));

  const orgId = userRecord?.org_id ?? null;
  const activeMembership = companyMemberships?.find(m => m.org_id === orgId) ?? null;
  const organization = activeMembership?.organizations ?? null;

  const membershipsLoaded = companyMemberships !== null;
  const needsCompany = membershipsLoaded && companyMemberships.length === 0 && !isPlatformAdmin;
  const needsWorkspacePick = membershipsLoaded
    && companyMemberships.length > 0
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
      trialFlow,
      routingSource,
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
