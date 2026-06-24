import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, Loader2, Building2, LogIn } from 'lucide-react';

const T = '#1FB8A0';
const T_DIM = '#17907C';
const BG = '#0E1117';
const CARD = '#131920';
const CARD2 = '#0B0F18';
const BORDER = 'rgba(31,184,160,0.2)';
const BORDER_DIM = 'rgba(255,255,255,0.07)';
const TEXT_MUTED = '#7B8EA8';

function Port24Logo() {
  return <img src="/port24-logo.svg" alt="Port 24" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />;
}

async function loadInvite(token) {
  const { data, error } = await supabase
    .from('pending_invites')
    .select('*, organizations(name, plan)')
    .eq('token', token)
    .single();
  if (error || !data) throw new Error('Invite not found. It may have already been used or the link is incorrect.');
  // 'accepted' is allowed here — the component may remount after auth state settles and the
  // edge function handles already-accepted invites idempotently (ensures users row + membership).
  if (data.status !== 'pending' && data.status !== 'accepted') throw new Error(`This invite has already been ${data.status}.`);
  if (new Date(data.expires_at) < new Date()) throw new Error('This invite link has expired. Ask your admin to send a new one.');
  return data;
}

async function claimInvite(token, fullName) {
  const { data, error } = await supabase.functions.invoke('claim-invite', {
    body: { token, full_name: fullName },
  });
  if (error) {
    let msg = error.message;
    try { const b = await error.context?.json(); msg = b?.error || msg; } catch {}
    if (msg.toLowerCase().includes('already accepted') || msg.toLowerCase().includes('already claimed')) return { ok: true };
    throw new Error(msg);
  }
  if (data?.error) {
    if (data.error.toLowerCase().includes('already accepted') || data.error.toLowerCase().includes('already claimed')) return { ok: true };
    throw new Error(data.error);
  }
  return data;
}

// Phases:
// checking       — loading invite + session
// needs_auth     — no session, show create/sign-in options
// creating       — new account email/password form
// confirm_email  — need to verify email before continuing
// mismatch       — signed in with wrong email
// claiming       — auto-claiming invite (already authenticated)
// success        — done, redirecting
// error          — invite invalid

export default function AcceptInvite() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token') || '';

  const [phase, setPhase] = useState('checking');
  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [authedUser, setAuthedUser] = useState(null);

  // Create-account form state
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setInviteError('No invite token found. Check the link you were sent.');
      setPhase('error');
      return;
    }

    let cancelled = false;

    async function init() {
      // Load and validate invite first
      const inv = await loadInvite(token);
      if (cancelled) return;

      // Route company owner invites to their dedicated page
      if (inv.invite_type === 'company_owner' || inv.invite_type === 'company_admin') {
        window.location.replace(`/accept-company-invite?token=${token}`);
        return;
      }
      // Route platform staff invites to the platform join page
      if (inv.invite_type === 'platform_staff') {
        window.location.replace(`/platform/join?token=${token}`);
        return;
      }

      setInvite(inv);
      setFullName(inv.full_name || '');

      // Check existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.user) {
        // Preserve token so sign-in flow can return here
        sessionStorage.setItem('pending_invite_token', token);
        setPhase('needs_auth');
        return;
      }

      // Already authenticated — validate email match then auto-claim
      const userEmail = session.user.email?.toLowerCase().trim();
      const inviteEmail = inv.email?.toLowerCase().trim();

      if (userEmail !== inviteEmail) {
        setAuthedUser(session.user);
        setPhase('mismatch');
        return;
      }

      // Email matches — claim now
      setPhase('claiming');
      await claimInvite(token, session.user.user_metadata?.full_name || inv.full_name || '');
      sessionStorage.removeItem('pending_invite_token');
      setPhase('success');
      setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
    }

    init().catch(err => {
      if (!cancelled) {
        setInviteError(err.message);
        setPhase('error');
        // Clear stale token so future sign-ins aren't hijacked by this dead invite
        sessionStorage.removeItem('pending_invite_token');
        sessionStorage.removeItem('pending_invite_path');
      }
    });

    return () => { cancelled = true; };
  }, [token]);

  // New email/password account creation
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!fullName.trim()) return setFormError('Please enter your full name.');
    if (password.length < 8) return setFormError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setFormError('Passwords do not match.');

    setSubmitting(true);
    try {
      await supabase.auth.signUp({
        email: invite.email,
        password,
        options: { data: { full_name: fullName } },
      });

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });

      if (signInErr) {
        // Email confirmation required
        setPhase('confirm_email');
        return;
      }

      // Claim the invite
      setPhase('claiming');
      await claimInvite(token, fullName);

      // Verify the users row was actually created before redirecting
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        let verified = false;
        for (let i = 0; i < 12; i++) {
          const { data: row } = await supabase.from('users').select('id').eq('id', currentUser.id).single();
          if (row) { verified = true; break; }
          await new Promise(r => setTimeout(r, 400));
        }
        if (!verified) throw new Error('Account setup incomplete. Please refresh and try signing in again.');
      }

      sessionStorage.removeItem('pending_invite_token');
      setPhase('success');
      setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
    } catch (err) {
      setFormError(err.message);
      setPhase('creating');
    } finally {
      setSubmitting(false);
    }
  };

  // Navigate to sign-in with token preserved
  const goToSignIn = () => {
    sessionStorage.setItem('pending_invite_token', token);
    navigate('/signin');
  };


  // ── Shared Org Badge ──
  const OrgBadge = () => invite ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${BORDER}`, backgroundColor: 'rgba(31,184,160,0.06)', borderRadius: 12, padding: '10px 14px', marginBottom: 28 }}>
      <Building2 style={{ color: T, width: 18, height: 18, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{invite.organizations?.name}</p>
        <p style={{ color: TEXT_MUTED, fontSize: 11, margin: 0, textTransform: 'capitalize' }}>{invite.organizations?.plan} plan · {invite.role} access</p>
      </div>
    </div>
  ) : null;

  // ── Checking / Claiming / Success spinners ──
  if (phase === 'checking' || phase === 'claiming' || phase === 'success') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {phase === 'success'
            ? <CheckCircle style={{ color: T, width: 40, height: 40 }} />
            : <Loader2 style={{ color: T, width: 32, height: 32 }} className="animate-spin" />}
          <p style={{ color: TEXT_MUTED, fontSize: 14, margin: 0 }}>
            {phase === 'checking' ? 'Verifying your invite…' : phase === 'claiming' ? 'Setting up your access…' : 'Welcome to Port 24! Taking you there…'}
          </p>
        </div>
      </div>
    );
  }

  // ── Error / invalid invite ──
  if (phase === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', backgroundColor: BG }}>
        <div style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: 40, border: '1px solid rgba(239,68,68,0.2)', backgroundColor: CARD, textAlign: 'center' }}>
          <AlertCircle style={{ color: '#EF4444', width: 44, height: 44, margin: '0 auto 16px' }} />
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Invite Issue</h2>
          <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{inviteError}</p>
          <button onClick={() => navigate('/signin')} style={{ width: '100%', padding: '12px', backgroundColor: T, color: BG, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Email mismatch ──
  if (phase === 'mismatch') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', backgroundColor: BG }}>
        <div style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: 40, border: '1px solid rgba(239,68,68,0.2)', backgroundColor: CARD, textAlign: 'center' }}>
          <AlertCircle style={{ color: '#F59E0B', width: 44, height: 44, margin: '0 auto 16px' }} />
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Wrong Account</h2>
          <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
            This invite was sent to <strong style={{ color: '#fff' }}>{invite?.email}</strong>.
          </p>
          <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            You're signed in as <strong style={{ color: '#fff' }}>{authedUser?.email}</strong>. Please sign out and sign in with the invited email address, or ask your admin for a new invite.
          </p>
          <button onClick={async () => { await supabase.auth.signOut(); sessionStorage.setItem('pending_invite_token', token); navigate('/signin'); }}
            style={{ width: '100%', padding: '12px', backgroundColor: T, color: BG, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 10 }}>
            Sign Out &amp; Use Correct Account
          </button>
          <button onClick={() => navigate('/dashboard')}
            style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', color: TEXT_MUTED, border: `1px solid ${BORDER_DIM}`, borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Continue to My Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Email confirmation needed ──
  if (phase === 'confirm_email') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', backgroundColor: BG }}>
        <div style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: 40, border: `1px solid ${BORDER}`, backgroundColor: CARD, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'rgba(31,184,160,0.1)', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle style={{ color: T, width: 28, height: 28 }} />
          </div>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Check your email</h2>
          <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6 }}>
            We sent a confirmation link to <strong style={{ color: '#fff' }}>{invite?.email}</strong>. Click it to activate your account, then return to this invite link.
          </p>
          <button onClick={() => navigate('/signin')} style={{ marginTop: 24, width: '100%', padding: '12px', backgroundColor: T, color: BG, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── needs_auth: show options ──
  if (phase === 'needs_auth') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 32 }}><Port24Logo /></div>
          <OrgBadge />
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>You've been invited</h1>
          <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
            You were invited to join <strong style={{ color: '#fff' }}>{invite?.organizations?.name}</strong> as <strong style={{ color: '#fff' }}>{invite?.role}</strong>.
            Sign in or create an account to continue.
          </p>

          {/* Sign in with existing account */}
          <button onClick={goToSignIn}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', backgroundColor: 'rgba(31,184,160,0.08)', border: `1px solid ${BORDER}`, borderRadius: 12, color: T, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
            <LogIn style={{ width: 16, height: 16 }} />
            Sign In with Existing Account
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: BORDER_DIM }} />
            <span style={{ color: TEXT_MUTED, fontSize: 12 }}>or create account</span>
            <div style={{ flex: 1, height: 1, backgroundColor: BORDER_DIM }} />
          </div>

          <button onClick={() => setPhase('creating')}
            style={{ width: '100%', padding: '12px', backgroundColor: T, color: BG, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Create New Account →
          </button>
        </div>
      </div>
    );
  }

  // ── creating: new email/password account ──
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ marginBottom: 32 }}><Port24Logo /></div>
        <OrgBadge />

        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Create your account</h1>
        <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Set a password to join <strong style={{ color: '#fff' }}>{invite?.organizations?.name}</strong>.
        </p>

        {/* Locked email */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD2, border: `1px solid ${BORDER_DIM}`, borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
          <span style={{ color: TEXT_MUTED, fontSize: 12 }}>Email</span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{invite?.email}</span>
        </div>

        <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Your Full Name *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus placeholder="Jane Smith"
              style={{ width: '100%', backgroundColor: CARD, border: `1px solid ${BORDER_DIM}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Password *</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="At least 8 characters"
                style={{ width: '100%', backgroundColor: CARD, border: `1px solid ${BORDER_DIM}`, borderRadius: 10, padding: '11px 40px 11px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: 0 }}>
                {showPw ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', color: TEXT_MUTED, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Confirm Password *</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repeat your password"
              style={{ width: '100%', backgroundColor: CARD, border: `1px solid ${BORDER_DIM}`, borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {formError && (
            <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', color: '#F87171', fontSize: 13 }}>
              {formError}
            </div>
          )}

          <button type="submit" disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', backgroundColor: T, color: BG, border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <><span>Create Account</span><ArrowRight style={{ width: 16, height: 16 }} /></>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#374151' }}>
          Already have an account?{' '}
          <button onClick={goToSignIn} style={{ color: T, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
