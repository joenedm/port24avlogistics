/**
 * AuthDebugPanel — DEV-ONLY. Shown only when import.meta.env.DEV is true.
 *
 * Displays auth state, active company, memberships, and the routing decision
 * that determined which workspace was loaded. Helps diagnose NEDM fallback bugs.
 */
import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, Bug } from 'lucide-react';

export default function AuthDebugPanel() {
  const [open, setOpen] = useState(false);

  if (!import.meta.env.DEV) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        fontFamily: 'monospace',
        fontSize: 12,
        maxWidth: 480,
        width: '100%',
      }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: '#1a1a2e',
          border: '1px solid #ff4d6d',
          borderRadius: open ? '8px 8px 0 0' : 8,
          color: '#ff4d6d',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <Bug size={14} />
        AUTH DEBUG {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {open && <PanelContent />}
    </div>
  );
}

const PUBLIC_PATHS = new Set([
  '/', '/landing',
  '/signin', '/forgot-password', '/reset-password', '/verify-email',
  '/accept-invite', '/crew-confirmation', '/booking-confirmation',
  '/qb-callback', '/platform/login', '/platform/join',
]);

function PanelContent() {
  const {
    user, userRecord, companyMemberships, isAuthenticated, isLoadingAuth,
    isPlatformAdmin, orgId, organization, needsCompany, needsWorkspacePick,
    membershipsLoaded, authError, routingSource, trialFlow,
  } = useAuth();
  const location = useLocation();

  const isNEDM = orgId === '7da320de-241c-48a2-98ab-acd1fd215386';
  const isPublicPath = PUBLIC_PATHS.has(location.pathname);

  // Auth state label
  const authState = isLoadingAuth ? 'loading' : isAuthenticated ? 'authenticated' : 'unauthenticated';

  // Route decision
  let routeDecision;
  if (isLoadingAuth || (isAuthenticated && !membershipsLoaded)) routeDecision = 'Loading spinner';
  else if (authError?.type === 'no_account') routeDecision = 'No Account Found';
  else if (!isAuthenticated) routeDecision = isPublicPath ? 'Landing Page' : 'Login (redirect)';
  else if (needsCompany && !isPublicPath) routeDecision = trialFlow ? 'Create Workspace (trial)' : 'No Workspace Access';
  else if (needsWorkspacePick) routeDecision = 'Workspace Picker';
  else if (isAuthenticated && !needsCompany) routeDecision = 'Workspace / Dashboard';
  else routeDecision = routingSource ?? 'unknown';

  // Show why NoWorkspaceAccess is shown, if it is
  const showingNoAccess = isAuthenticated && needsCompany && !isPublicPath && !trialFlow;

  // Routing reason for the "Routing Decision" section
  let routingReason;
  if (!isAuthenticated) routingReason = 'not authenticated';
  else if (isLoadingAuth || !membershipsLoaded) routingReason = 'loading…';
  else if (needsCompany) routingReason = trialFlow ? 'trial flow → CreateCompany' : 'no memberships → NoWorkspaceAccess';
  else if (needsWorkspacePick) routingReason = 'no valid active org → WorkspacePicker';
  else routingReason = routingSource ?? 'unknown';

  const nedmWarning = isNEDM && isAuthenticated && membershipsLoaded && !needsCompany;

  return (
    <div
      style={{
        background: '#0d0d1a',
        border: '1px solid #ff4d6d',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        padding: 12,
        color: '#e2e8f0',
        maxHeight: 480,
        overflowY: 'auto',
      }}
    >
      {nedmWarning && (
        <div style={{ background: 'rgba(255,77,109,0.15)', border: '1px solid #ff4d6d', borderRadius: 6, padding: '6px 10px', marginBottom: 10, color: '#ff4d6d', fontWeight: 700 }}>
          ⚠️ ACTIVE ORG IS NEDM — {routingReason}
        </div>
      )}

      {showingNoAccess && (
        <div style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid #fbbf24', borderRadius: 6, padding: '6px 10px', marginBottom: 10, color: '#fbbf24', fontWeight: 700, fontSize: 11 }}>
          ⚠️ No Workspace Access shown because: authenticated user has zero memberships.
        </div>
      )}

      <Section label="Route &amp; Auth State">
        <Row k="current_path" v={location.pathname} />
        <Row k="is_public_path" v={String(isPublicPath)} />
        <Row k="auth_state" v={authState} highlight={authState === 'loading'} />
        <Row k="route_decision" v={routeDecision} highlight={showingNoAccess} />
        <Row k="trial_flow" v={String(trialFlow)} />
      </Section>

      <Section label="Authenticated User">
        <Row k="user_id" v={user?.id ?? 'none'} />
        <Row k="email" v={user?.email ?? 'none'} />
        <Row k="is_authenticated" v={String(isAuthenticated)} />
        <Row k="is_loading_auth" v={String(isLoadingAuth)} />
        <Row k="is_platform_admin" v={String(isPlatformAdmin)} />
        <Row k="auth_error" v={authError ? JSON.stringify(authError) : 'none'} />
      </Section>

      <Section label="Active Company">
        <Row k="active_org_id" v={orgId ?? 'null'} highlight={isNEDM} />
        <Row k="active_org_name" v={organization?.name ?? 'null'} highlight={isNEDM} />
        <Row k="org_in_userRecord" v={userRecord?.org_id ?? 'null'} />
        <Row k="org_in_auth_context" v={orgId ?? 'null'} />
      </Section>

      <Section label="Memberships Found">
        {!membershipsLoaded && <Row k="status" v="loading…" />}
        {membershipsLoaded && (!companyMemberships || companyMemberships.length === 0) && (
          <Row k="memberships" v="none — user needs to create a company" />
        )}
        {companyMemberships?.map((m, i) => (
          <div key={i} style={{ borderLeft: '2px solid #334155', paddingLeft: 8, marginBottom: 6 }}>
            <Row k="org_id" v={m.org_id} highlight={m.org_id === '7da320de-241c-48a2-98ab-acd1fd215386'} />
            <Row k="org_name" v={m.organizations?.name ?? '(join failed — RLS?)'} />
            <Row k="role" v={m.role ?? 'unknown'} />
            <Row k="status" v={m.status ?? 'unknown'} />
            <Row k="is_active" v={String(m.org_id === orgId)} />
          </div>
        ))}
      </Section>

      <Section label="Routing Decision">
        <Row k="memberships_loaded" v={String(membershipsLoaded)} />
        <Row k="needs_company" v={String(needsCompany)} />
        <Row k="needs_workspace_pick" v={String(needsWorkspacePick)} />
        <Row k="routing_source" v={routingSource ?? 'null'} />
        <Row k="routing_reason" v={routingReason} />
      </Section>

      {nedmWarning && (
        <Section label="Why is NEDM active?">
          {companyMemberships?.some(m => m.org_id === '7da320de-241c-48a2-98ab-acd1fd215386') && (
            <Row k="cause" v="User has an active NEDM membership" />
          )}
          {!companyMemberships?.some(m => m.org_id === '7da320de-241c-48a2-98ab-acd1fd215386') && (
            <Row k="cause" v="NEDM membership not found — org_id set directly on users.org_id" />
          )}
          {companyMemberships?.length === 1 && companyMemberships[0].org_id === '7da320de-241c-48a2-98ab-acd1fd215386' && (
            <Row k="cause" v="Only 1 membership found = NEDM → auto-selected" />
          )}
          {companyMemberships?.length > 1 && (
            <Row k="cause" v="Multiple memberships — userRecord.org_id pointed to NEDM" />
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: '#94a3b8', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.1em' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v, highlight }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
      <span style={{ color: '#64748b', minWidth: 160, flexShrink: 0 }}>{k}:</span>
      <span style={{ color: highlight ? '#ff4d6d' : '#e2e8f0', wordBreak: 'break-all', fontWeight: highlight ? 700 : 400 }}>{v}</span>
    </div>
  );
}
