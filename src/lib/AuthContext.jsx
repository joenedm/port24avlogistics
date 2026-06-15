import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

const PLATFORM_ADMIN_EMAILS = ['port24avlogistics@gmail.com'];

// All localStorage keys that belong to workspace/session state — cleared on logout
const WORKSPACE_LS_KEYS = [
  'sidebar_collapsed_groups',
  'active_company_id',
  'selected_workspace',
  'port24_company',
  'port24_org',
];

// Inactivity timeout: warn at 55 min, log out at 60 min
const WARN_MS    = 55 * 60 * 1000;
const TIMEOUT_MS = 60 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRecord, setUserRecord] = useState(null);
  const [companyMemberships, setCompanyMemberships] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [routingSource, setRoutingSource] = useState(null);

  // Set by landing page "Start Free Trial" button; survives OAuth redirect via sessionStorage
  const [trialFlow] = useState(() => sessionStorage.getItem('port24_flow') === 'trial');

  // Tracks where the sign-in originated:
  //   'platform_admin' — set by PlatformLogin before Google/email OAuth
  //   'company_login'  — everything else (default)
  // When 'platform_admin': company membership routing is skipped entirely.
  const [loginSource] = useState(() => sessionStorage.getItem('port24_login_source') ?? 'company_login');

  // Session warning modal state
  const [sessionWarning, setSessionWarning] = useState(false);

  // Refs
  const profileLoadingRef  = useRef(false);
  const authDoneRef        = useRef(false);
  const sessionWarningRef  = useRef(false);
  const lastActivityRef    = useRef(Date.now());
  const warnTimerRef       = useRef(null);
  const logoutTimerRef     = useRef(null);
  const logoutRef          = useRef(null); // stable ref so timer can call logout

  // -------------------------------------------------------------------
  // Inactivity timer — schedules warn + auto-logout
  // -------------------------------------------------------------------
  const scheduleSessionTimers = useCallback(() => {
    clearTimeout(warnTimerRef.current);
    clearTimeout(logoutTimerRef.current);
    warnTimerRef.current = setTimeout(() => {
      sessionWarningRef.current = true;
      setSessionWarning(true);
    }, WARN_MS);
    logoutTimerRef.current = setTimeout(() => {
      sessionWarningRef.current = false;
      setSessionWarning(false);
      logoutRef.current?.();
    }, TIMEOUT_MS);
  }, []);

  // Start/stop timer whenever auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      clearTimeout(warnTimerRef.current);
      clearTimeout(logoutTimerRef.current);
      return;
    }

    scheduleSessionTimers();

    const handleActivity = () => {
      if (sessionWarningRef.current) return; // don't reset once warning is showing
      lastActivityRef.current = Date.now();
      scheduleSessionTimers();
    };

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
      clearTimeout(warnTimerRef.current);
      clearTimeout(logoutTimerRef.current);
    };
  }, [isAuthenticated, scheduleSessionTimers]);

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
  // Core profile loader — called after every auth state change
  // -------------------------------------------------------------------
  const loadProfile = async (authUser) => {
    const DEV = import.meta.env.DEV;
    if (DEV) console.log('[Auth] loadProfile start — uid:', authUser.id, 'email:', authUser.email, 'loginSource:', loginSource);

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

        const { data: newUUIDMemberships } = await supabase
          .from('company_memberships')
          .select('org_id, role, status, joined_at')
          .eq('user_id', authUser.id)
          .eq('status', 'active');

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

        const { data: resolvedMemberships } = await supabase
          .from('company_memberships')
          .select('org_id, role')
          .eq('user_id', authUser.id)
          .eq('status', 'active')
          .order('joined_at', { ascending: false })
          .limit(1);

        // Do NOT fall back to emailProfile.org_id — that may be stale or point to NEDM.
        const resolvedOrgId = resolvedMemberships?.[0]?.org_id ?? null;
        const resolvedRole  = resolvedMemberships?.[0]?.role ?? emailProfile.role;

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
      if (DEV) console.log('[Auth] no profile after email check — isOAuth:', isOAuth);

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

    // 3.6. Start Free Trial — brand-new OAuth user who clicked "Start Free Trial".
    // Create a minimal record so they can reach CreateCompany and pass the
    // create-company edge function gate ("user must exist in public.users").
    if (!profile && trialFlow && authUser.app_metadata?.provider !== 'email') {
      if (DEV) console.log('[Auth] trial flow — creating minimal profile for new OAuth user:', authUser.email);
      await supabase.from('users').upsert({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || '',
        org_id: null,
        role: 'admin',
      }, { onConflict: 'id' });
      const { data: newProfile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      profile = newProfile || {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || '',
        org_id: null,
        role: 'admin',
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

    // 5. Apply platform-admin override.
    //    Force org_id=null so the admin is never accidentally routed into a company
    //    workspace (e.g. NEDM) due to a stale org_id in the users table.
    const isEmailAdmin = PLATFORM_ADMIN_EMAILS.includes(authUser.email?.toLowerCase());
    if (isEmailAdmin) {
      if (DEV) console.log('[Auth] platform admin override applied — clearing org_id');
      profile = { ...profile, is_platform_admin: true, role: 'admin', org_id: null };
      supabase.from('users').upsert({
        id: authUser.id,
        email: authUser.email,
        is_platform_admin: true,
        role: 'admin',
        org_id: null,
      }, { onConflict: 'id' }).then(() => {});
    }

    // 6. Platform admin path — skip ALL company membership routing.
    //    loginSource 'platform_admin' = user came through PlatformLogin (Google or email).
    //    isEmailAdmin = belt-and-suspenders for the hardcoded admin email.
    //    Either way: they go to /platform, never a company workspace.
    const isAdminLogin = loginSource === 'platform_admin' || isEmailAdmin;

    if (isAdminLogin) {
      if (DEV) console.log('[Auth] platform admin path — skipping company membership routing');
      setUserRecord({ ...profile, org_id: null }); // guarantee org_id is null
      setCompanyMemberships([]);
      setRoutingSource('platform_admin');
      return;
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
      setRoutingSource('no_memberships');
      if (DEV) console.log('[Auth] loadMemberships — no memberships found');
      return;
    }

    const activeOrgValid = profile?.org_id && list.some(m => m.org_id === profile.org_id);

    if (activeOrgValid) {
      if (DEV) console.log('[Auth] loadMemberships — active org_id', profile.org_id, 'valid, keeping it');
      setRoutingSource(list.length === 1 ? 'membership_auto_select' : 'saved_active_company');
      return;
    }

    if (!profile?.org_id) {
      if (list.length === 1) {
        const autoOrgId = list[0].org_id;
        if (DEV) console.log('[Auth] loadMemberships — 1 membership, auto-selecting:', autoOrgId);
        await supabase.from('users').update({ org_id: autoOrgId }).eq('id', userId);
        setUserRecord(prev => ({ ...prev, org_id: autoOrgId }));
        setRoutingSource('membership_auto_select');
      } else {
        if (DEV) console.log('[Auth] loadMemberships — multiple memberships, showing workspace picker');
        setRoutingSource('workspace_picker');
      }
    } else {
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
  const switchWorkspace = async (targetOrgId) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('users')
      .update({ org_id: targetOrgId })
      .eq('id', user.id);
    if (error) throw error;
    setUserRecord(prev => ({ ...prev, org_id: targetOrgId }));
    setRoutingSource('workspace_picker');
    window.location.href = '/dashboard';
  };

  // -------------------------------------------------------------------
  // Logout — clears ALL session/workspace state then redirects
  // -------------------------------------------------------------------
  const logout = async () => {
    clearTimeout(warnTimerRef.current);
    clearTimeout(logoutTimerRef.current);
    setSessionWarning(false);
    sessionWarningRef.current = false;

    await supabase.auth.signOut();

    WORKSPACE_LS_KEYS.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    try { sessionStorage.clear(); } catch {}

    window.location.href = '/';
  };
  // Keep ref in sync on every render so the timer callback always calls the latest version
  logoutRef.current = logout;

  // -------------------------------------------------------------------
  // Extend session after warning modal "Stay Signed In"
  // -------------------------------------------------------------------
  const extendSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      logout();
      return;
    }
    sessionWarningRef.current = false;
    setSessionWarning(false);
    lastActivityRef.current = Date.now();
    scheduleSessionTimers();
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
      loginSource,
      routingSource,
      sessionWarning,
      logout,
      extendSession,
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
