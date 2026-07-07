import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

const T = '#1FB8A0';
const T_DIM = '#17907C';
const BG = '#0E1117';
const CARD = '#131920';
const BORDER = 'rgba(31,184,160,0.15)';
const BORDER_DIM = 'rgba(255,255,255,0.06)';
const TEXT_MUTED = '#7B8EA8';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false); // true once Supabase has established the recovery session
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Case 1: AuthContext already intercepted PASSWORD_RECOVERY before this component mounted.
    if (sessionStorage.getItem('port24_password_recovery')) {
      sessionStorage.removeItem('port24_password_recovery');
      setReady(true);
    }

    // Case 2: Event fires after this component mounts (component beat AuthContext to the subscription).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.removeItem('port24_password_recovery');
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(password)) { setError('Password must contain at least one uppercase letter.'); return; }
    if (!/[a-z]/.test(password)) { setError('Password must contain at least one lowercase letter.'); return; }
    if (!/[0-9]/.test(password)) { setError('Password must contain at least one number.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      setSuccess(true);
      setTimeout(() => navigate('/signin'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update password. The link may have expired — request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(31,184,160,0.04)' }} />
      </div>

      <Link to="/signin" className="absolute top-6 left-6 flex items-center gap-2 text-sm transition-colors"
        style={{ color: TEXT_MUTED }}
        onMouseEnter={e => e.currentTarget.style.color = T}
        onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}>
        <ArrowLeft className="w-4 h-4" /> Back to Sign In
      </Link>

      <div className="relative w-full max-w-sm">
        <div className="mb-10">
          <img src="/port24-logo.svg" alt="Port 24" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
        </div>

        {success ? (
          <div className="flex flex-col items-start">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ backgroundColor: 'rgba(31,184,160,0.1)', border: `1px solid rgba(31,184,160,0.2)` }}>
              <CheckCircle className="w-6 h-6" style={{ color: T }} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Password updated!</h1>
            <p className="text-sm mb-8" style={{ color: TEXT_MUTED }}>
              Your password has been changed. Redirecting to sign in…
            </p>
            <Link to="/signin"
              className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
              style={{ backgroundColor: T, color: BG }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = T_DIM}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = T}>
              Sign In now
            </Link>
          </div>
        ) : !ready ? (
          <div className="flex flex-col items-start">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-6 h-6" style={{ color: '#EF4444' }} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Invalid reset link</h1>
            <p className="text-sm mb-8" style={{ color: TEXT_MUTED }}>
              This link is invalid or has already been used. Request a new one from the sign-in page.
            </p>
            <Link to="/forgot-password"
              className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
              style={{ backgroundColor: T, color: BG }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = T_DIM}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = T}>
              Request new link
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Set new password</h1>
            <p className="text-sm mb-8" style={{ color: TEXT_MUTED }}>Choose a new password for your account.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>New password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="At least 8 characters"
                    autoFocus
                    required
                    className="w-full rounded-lg px-4 py-3 pr-11 text-sm text-white outline-none transition-all"
                    style={{ backgroundColor: CARD, border: `1px solid ${BORDER_DIM}`, color: '#fff' }}
                    onFocus={e => e.currentTarget.style.borderColor = BORDER}
                    onBlur={e => e.currentTarget.style.borderColor = BORDER_DIM}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: TEXT_MUTED }}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Repeat your password"
                  required
                  className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none transition-all"
                  style={{ backgroundColor: CARD, border: `1px solid ${BORDER_DIM}`, color: '#fff' }}
                  onFocus={e => e.currentTarget.style.borderColor = BORDER}
                  onBlur={e => e.currentTarget.style.borderColor = BORDER_DIM}
                />
              </div>

              {error && (
                <div className="rounded-lg px-4 py-3 text-xs flex items-start gap-2"
                  style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-60"
                style={{ backgroundColor: T, color: BG }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = T_DIM; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = T; }}>
                {loading ? 'Saving…' : <><Lock className="w-4 h-4" /> Save New Password</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
