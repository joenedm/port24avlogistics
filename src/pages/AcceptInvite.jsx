import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function Port24BracketIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h10v4H8v8H4V4z" fill="#3DC9C0"/>
      <path d="M36 4h-10v4h8v8h4V4z" fill="#1FB8A0"/>
      <path d="M4 36h10v-4H8v-8H4V36z" fill="#3DC9C0"/>
      <path d="M36 36h-10v-4h8v-8h4V36z" fill="#1FB8A0"/>
    </svg>
  );
}

const T = '#1FB8A0';
const T_DIM = '#17907C';
const BG = '#0E1117';
const CARD = '#131920';
const CARD2 = '#0B0F18';
const BORDER = 'rgba(31,184,160,0.2)';
const BORDER_DIM = 'rgba(255,255,255,0.07)';
const TEXT_MUTED = '#7B8EA8';

export default function AcceptInvite() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || '';

  const [invite, setInvite] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setInviteError('Invalid or missing invite link. Please contact your administrator.');
      setLoadingInvite(false);
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await base44.functions.invoke('validateInviteToken', { token });
      setInvite(res.data);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Unable to verify invite. Please contact your administrator.';
      setInviteError(msg);
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Register the account with the platform using the invited email
      await base44.auth.register({
        email: invite.email,
        password,
      });

      // Step 2: Sign in immediately so we have an auth token
      await base44.auth.loginViaEmailPassword(invite.email, password);

      // Step 3: Update name if provided
      if (invite.full_name) {
        await base44.auth.updateMe({ full_name: invite.full_name });
      }

      // Step 4: Claim the invite — matches account to pending invite, assigns role
      await base44.functions.invoke('claimInvite', { token });

      setDone(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to create account. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ──
  if (loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: T }} />
          <p className="text-sm" style={{ color: TEXT_MUTED }}>Verifying your invite…</p>
        </div>
      </div>
    );
  }

  // ── Invite error (invalid / expired / already used) ──
  if (inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>
        <div className="w-full max-w-md rounded-2xl p-10 border text-center" style={{ backgroundColor: CARD, borderColor: 'rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#EF4444' }} />
          <h2 className="text-xl font-bold text-white mb-3">Invite Issue</h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: TEXT_MUTED }}>{inviteError}</p>
          <button
            onClick={() => navigate('/signin')}
            className="w-full py-3 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: T, color: BG }}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>
        <div className="w-full max-w-md rounded-2xl p-10 border text-center" style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgba(31,184,160,0.12)', border: '1px solid rgba(31,184,160,0.3)' }}>
            <CheckCircle className="w-8 h-8" style={{ color: T }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Welcome to Port 24!</h2>
          <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
            Your account is set up. Taking you to the workspace…
          </p>
          <div className="mt-4">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: T }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Create Account form ──
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>

      {/* Left — form panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full blur-3xl"
            style={{ backgroundColor: 'rgba(31,184,160,0.04)' }} />
        </div>

        <div className="relative w-full max-w-sm">
          {/* Wordmark */}
          <div className="flex items-center gap-2.5 mb-12">
            <Port24BracketIcon size={28} />
            <span style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.12em', fontWeight: 700, fontSize: '0.9rem', color: '#3DC9C0' }}>
              PORT <span style={{ color: '#1FB8A0' }}>24</span>
            </span>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 border rounded-full px-3 py-1 text-xs font-semibold mb-5 uppercase tracking-widest"
              style={{ borderColor: BORDER, backgroundColor: 'rgba(31,184,160,0.08)', color: T }}>
              Workspace Invite
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
              {invite?.full_name ? `Welcome, ${invite.full_name.split(' ')[0]}!` : 'Create your account'}
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
              You've been invited as <strong style={{ color: '#fff' }}>{invite?.role || 'a team member'}</strong>. Create a password to complete your account setup.
            </p>
          </div>

          {/* Locked email display */}
          <div className="rounded-lg px-4 py-3 mb-5 flex items-center justify-between gap-3" style={{ backgroundColor: CARD2, border: `1px solid ${BORDER_DIM}` }}>
            <span className="text-xs" style={{ color: TEXT_MUTED }}>Account email</span>
            <span className="text-sm font-medium text-white">{invite?.email}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  autoFocus
                  className="w-full rounded-lg px-4 py-3 pr-11 text-sm text-white outline-none transition-all"
                  style={{ backgroundColor: CARD, border: `1px solid ${BORDER_DIM}` }}
                  onFocus={e => e.target.style.borderColor = BORDER}
                  onBlur={e => e.target.style.borderColor = BORDER_DIM}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_MUTED }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat your password"
                  className="w-full rounded-lg px-4 py-3 pr-11 text-sm text-white outline-none transition-all"
                  style={{ backgroundColor: CARD, border: `1px solid ${BORDER_DIM}` }}
                  onFocus={e => e.target.style.borderColor = BORDER}
                  onBlur={e => e.target.style.borderColor = BORDER_DIM}
                />
                <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_MUTED }}>
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg px-4 py-3 text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm transition-colors mt-2 disabled:opacity-60"
              style={{ backgroundColor: T, color: BG, boxShadow: '0 8px 32px rgba(31,184,160,0.2)' }}
              onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = T_DIM)}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = T}
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><span>Create Account & Enter Workspace</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <p className="text-xs mt-8 text-center" style={{ color: '#374151' }}>
            Already have an account?{' '}
            <button onClick={() => navigate('/signin')} className="hover:underline" style={{ color: T }}>
              Sign in here
            </button>
          </p>
        </div>
      </div>

      {/* Right — hero panel */}
      <div
        className="hidden lg:flex flex-col justify-end w-[55%] flex-shrink-0 relative overflow-hidden"
        style={{
          backgroundImage: `url(https://media.base44.com/images/public/69d5151f0495918d567d1066/f432b4024_ChatGPTImageApr21202611_55_27AM.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,17,23,0.85) 0%, rgba(14,17,23,0.2) 50%, transparent 100%)' }} />
        <div className="relative p-10">
          <p className="text-xs tracking-widest uppercase font-semibold mb-2" style={{ color: '#3DC9C0' }}>Your Workspace</p>
          <h2 className="text-2xl font-extrabold text-white leading-snug tracking-tight">
            Every part of production,<br />
            <span style={{ color: T }}>in one place.</span>
          </h2>
        </div>
      </div>
    </div>
  );
}