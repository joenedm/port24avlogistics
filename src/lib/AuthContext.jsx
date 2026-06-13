import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

// Emails that always have platform-admin rights regardless of DB state
const PLATFORM_ADMIN_EMAILS = ['port24avlogistics@gmail.com'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRecord, setUserRecord] = useState(null);
  const [companyMemberships, setCompanyMemberships] = useState(null); // null = not yet loaded
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  // Tracks how the active org was selected (shown in debug panel)
  const [routingSource, setRoutingSource] = useState(null);

  // Prevents concurrent loadProfile calls (eliminates getSession/onAuthStateChange race)
  const profileLoadingRef = useRef(false);

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
        if (DEV) console.log('[Auth] email match found — linking UUID to existing account');

        // Before inheriting the email profile's org_id, check if this new UUID already has
        // company_memberships assigned by an edge function (e.g. create-company or claim-invite
        // ran before loadProfile). If so, use that org_id instead of the email profile's org_id
        // to avoid inheriting a stale/wrong workspace (e.g. NEDM).
        const { data: existingMemberships } = await supabase
          .from('company_memberships')
          .select('org_id, role')
          .eq('user_id', authUser.id)
          .eq('status', 'active')
          .order('joined_at', { ascending: false })
          .limit(1);

        const inheritedOrgId = existingMemberships?.length
          ? existingMemberships[0].org_id
          : emailProfile.org_id;
        const inheritedRole = existingMemberships?.length
          ? existingMemberships[0].role
          : emailProfile.role;

        if (DEV) console.log('[Auth] email linking — inherited org_id:', inheritedOrgId, '(from', existingMemberships?.length ? 'existing membership' : 'email profile', ')');

        // Create/update the public.users row for this new UUID
        await supabase.from('users').upsert({
          id: authUser.id,
          email: authUser.email,
          full_name: emailProfile.full_name || authUser.user_metadata?.full_name || '',
          org_id: inheritedOrgId,
          role: inheritedRole,
          is_platform_admin: emailProfile.is_platform_admin ?? false,
        }, { onConflict: 'id' });

        // Only add the email profile's org membership if the user doesn't already have
        // a different active membership (avoids injecting NEDM into a new-company user)
        if (emailProfile.org_id && !existingMemberships?.length) {
          await supabase.from('company_memberships').upsert({
            user_id: authUser.id,
            org_id: emailProfile.org_id,
            role: emailProfile.role ?? 'member',
            status: 'active',
          }, { onConflict: 'user_id,org_id' });
        }

        const { data: linked } = await supabase.from('users').select('*').eq('id', authUser.id).single();
        profile = linked || { ...emailProfile, id: authUser.id, org_id: inheritedOrgId };
        if (DEV) console.log('[Auth] email linking complete — org_id:', profile?.org_id);
      }
    }

    // 3. Still no profile — auto-claim pending invite for OAuth providers only.
    //    Email/password users who accept invites go through AcceptInvite.jsx which
    //    calls claim-invite explicitly AFTER sign-in. Auto-claiming here for email/password
    //    would race with AcceptInvite and could claim with wrong data or the wrong org.
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

    // 3.5. Platform admin shortcut — if no profile found but email is a platform admin,
    //      build a synthetic in-memory profile. The override in step 5 upserts it to the DB.
    //      This avoids client-side INSERT RLS issues on first sign-in.
    if (!profile && PLATFORM_ADMIN_EMAILS.includes(authUser.email?.toLowerCase())) {
      if (DEV) console.log('[Auth] platform admin first sign-in — building synthetic profile for', authUser.email);
      profile = {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email,
        role: 'admin',
        is_platform_admin: true,
        org_id: null,
      };
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
      // Keep DB in sync (fire-and-forget — uses service role path via RLS bypass)
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
    const DEV = import.meta.env.DEV;
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
      setRoutingSource('no_memberships');
      return;
    }

    // Check if the current active org_id is valid (exists in memberships)
    const activeOrgValid = profile?.org_id && list.some(m => m.org_id === profile.org_id);

    if (activeOrgValid) {
      // Active workspace is a valid membership — nothing to change
      if (DEV) console.log('[Auth] loadMemberships — active org_id', profile.org_id, 'is valid, keeping it');
      setRoutingSource(list.length === 1 ? 'membership_auto_select' : 'saved_active_company');
      return;
    }

    // Active org_id is null or not in membership list.
    // Only auto-correct if org_id is null — never silently overwrite a non-null org_id
    if (!profile?.org_id) {
      // org_id is null — safe to auto-select; pick the most recently joined membership
      const sortedByNewest = [...list].sort((a, b) =>
        new Date(b.joined_at ?? 0).getTime() - new Date(a.joined_at ?? 0).getTime()
      );
      const fallbackOrgId = sortedByNewest[0]?.org_id;
      if (fallbackOrgId) {
        if (DEV) console.log('[Auth] loadMemberships — org_id is null, auto-selecting newest membership:', fallbackOrgId);
        await supabase.from('users').update({ org_id: fallbackOrgId }).eq('id', userId);
        setUserRecord(prev => ({ ...prev, org_id: fallbackOrgId }));
        setRoutingSource(list.length === 1 ? 'membership_auto_select' : 'workspace_picker');
      }
    } else {
      if (DEV) console.log('[Auth] loadMemberships — org_id', profile.org_id, 'has no matching membership; leaving for workspace picker');
      setRoutingSource('workspace_picker');
    }
  };

  // -------------------------------------------------------------------
  // Auth state listener — single source of truth.
  // Uses INITIAL_SESSION to eliminate the getSession() / onAuthStateChange race.
  // -------------------------------------------------------------------
  useEffect(() => {
    const DEV = import.meta.env.DEV;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (DEV) console.log('[Auth] event:', event, '— session:', session ? `uid:${session.user.id}` : 'null');

      // Token refresh: just update the user object, don't re-run full profile load
      if (event === 'TOKEN_REFRESHED') {
        if (session?.user) setUser(session.user);
        return;
      }

      // Sign-out or null session: clear all state
      if (event === 'SIGNED_OUT' || !session?.user) {
        // For INITIAL_SESSION with null session, check if there are OAuth params in the URL.
        // PKCE flow fires INITIAL_SESSION (null) BEFORE the code exchange completes,
        // then fires SIGNED_IN with the real session. If we clear state here, the user
        // briefly sees the landing page. Detecting OAuth params lets us stay in loading
        // state and wait for the SIGNED_IN event instead.
        if (event === 'INITIAL_SESSION') {
          const hasOAuthParams =
            window.location.search.includes('code=') ||
            window.location.hash.includes('access_token=');
          if (hasOAuthParams) {
            if (DEV) console.log('[Auth] INITIAL_SESSION null but OAuth params detected — waiting for SIGNED_IN');
            return; // stay in loading state; SIGNED_IN will fire after code exchange
          }
        }
        if (DEV) console.log('[Auth] clearing all auth state — event:', event);
        setUser(null);
        setUserRecord(null);
        setCompanyMemberships([]);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required' });
        setIsLoadingAuth(false);
        setRoutingSource(null);
        return;
      }

      // INITIAL_SESSION, SIGNED_IN, USER_UPDATED — run full profile load.
      // profileLoadingRef prevents concurrent loads when both INITIAL_SESSION
      // and SIGNED_IN fire for the same session (e.g. Google OAuth redirect).
      if (profileLoadingRef.current) {
        if (DEV) console.log('[Auth] profile load already in progress — skipping duplicate event:', event);
        return;
      }

      profileLoadingRef.current = true;
      setUser(session.user);
      setIsAuthenticated(true);
      setIsLoadingAuth(true);
      setCompanyMemberships(null); // reset so membershipsLoaded = false during load
      setAuthError(null);

      try {
        await loadProfile(session.user);
      } catch (err) {
        if (DEV) console.error('[Auth] loadProfile threw:', err);
        // Unexpected crash — sign out so the user sees the sign-in page instead of infinite spinner.
        // Do NOT call supabase.auth.signOut() here (it fires another SIGNED_OUT event which re-enters
        // this handler). Instead, clear state directly to reach the auth_required error UI.
        setUser(null);
        setUserRecord(null);
        setCompanyMemberships([]);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required' });
      } finally {
        profileLoadingRef.current = false;
        setIsLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    setRoutingSource('workspace_picker');
    // Force full reload so all React Query caches clear
    window.location.href = '/dashboard';
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // supabase.auth.signOut() triggers SIGNED_OUT event which clears all state above.
    // Hard redirect clears all in-memory React Query caches too.
    window.location.href = '/signin';
  };

  const navigateToLogin = () => { window.location.href = '/signin'; };

  const checkAppState = async () => {
    // Force a re-check of auth state (used by AcceptInvite after claim-invite)
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
  // isPlatformAdmin is true if:
  // 1. DB record says so (after profile loads), OR
  // 2. Auth user email is in the platform admin list (available immediately before profile loads)
  //    — prevents the race where userRecord=null briefly causes needsCompany=true
  const isPlatformAdmin = userRecord?.is_platform_admin === true
    || (user?.email != null && PLATFORM_ADMIN_EMAILS.includes(user.email.toLowerCase()));

  const orgId = userRecord?.org_id ?? null;

  // Fetch org record for the active org from the membership list
  const activeMembership = companyMemberships?.find(m => m.org_id === orgId) ?? null;
  const organization = activeMembership?.organizations ?? null;

  // Membership routing states
  const membershipsLoaded = companyMemberships !== null;
  const needsCompany = membershipsLoaded && companyMemberships.length === 0 && !isPlatformAdmin;
  // Show workspace picker when active org doesn't match any membership
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
