import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck, CheckCircle, XCircle } from 'lucide-react';

const BG = '#070B11';
const CARD = '#0D1219';
const T = '#1FB8A0';
const T_DIM = '#17907C';
const BORDER = 'rgba(31,184,160,0.2)';
const BORDER_DIM = 'rgba(255,255,255,0.07)';
const TEXT_MUTED = '#6B7A92';

export default function PlatformJoin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');

  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | valid | invalid | done
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    supabase
      .from('pending_invites')
      .select('*')
      .eq('token', token)
      .eq('role', 'platform_admin')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus('invalid'); return; }
        setInvite(data);
        setStatus('valid');
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPw) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    setError('');
    setLoading(true);
    try {
      // Try sign up first; if account exists, just sign in
      const { error: signUpErr } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: { data: { full_name: invite.full_name } },
      });

      // Sign in (works whether account was just created or already existed)
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: invite.email, password });
      if (signInErr) throw signInErr;

      // Use service-role edge function to bypass RLS (same as regular invite flow)
      const { data: claimData, error: claimErr } = await supabase.functions.invoke('claim-invite', {
        body: { token, full_name: invite.full_name },
      });
      if (claimErr) throw claimErr;
      if (claimData?.error) throw new Error(claimData.error);

      setStatus('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: T }} />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <img src="/port24-logo.svg" alt="Port 24" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
        </div>

        <div className="rounded-2xl p-8 border" style={{ backgroundColor: CARD, borderColor: BORDER }}>
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: T }} />
              <p className="text-sm" style={{ color: TEXT_MUTED }}>Validating invite…</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Invalid Invite</h2>
              <p className="text-sm mb-6" style={{ color: TEXT_MUTED }}>This invite link is expired, already used, or invalid.</p>
              <button onClick={() => navigate('/platform/login')} className="text-sm font-medium" style={{ color: T }}>
                Go to Platform Login →
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#1FB8A0]/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-[#1FB8A0]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Access Granted</h2>
              <p className="text-sm mb-6" style={{ color: TEXT_MUTED }}>Your platform admin account is ready.</p>
              <button onClick={() => navigate('/platform')}
                className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm"
                style={{ backgroundColor: T, color: BG }}>
                Enter Platform <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {status === 'valid' && (
            <>
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex items-center gap-2 border rounded-full px-3 py-1.5" style={{ borderColor: BORDER, backgroundColor: 'rgba(31,184,160,0.08)' }}>
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: T }} />
                  <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: T }}>Platform Invite</span>
                </div>
              </div>

              <h1 className="text-xl font-bold text-white text-center mb-1">Set Up Your Account</h1>
              <p className="text-sm text-center mb-7" style={{ color: TEXT_MUTED }}>
                Joining as <span className="text-white font-medium">{invite?.email}</span>
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Min. 8 characters"
                      className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white outline-none transition-all"
                      style={{ backgroundColor: '#060A10', border: `1px solid ${BORDER_DIM}` }}
                      onFocus={e => e.target.style.borderColor = BORDER}
                      onBlur={e => e.target.style.borderColor = BORDER_DIM}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_MUTED }}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                    style={{ backgroundColor: '#060A10', border: `1px solid ${BORDER_DIM}` }}
                    onFocus={e => e.target.style.borderColor = BORDER}
                    onBlur={e => e.target.style.borderColor = BORDER_DIM}
                  />
                </div>

                {error && (
                  <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm mt-2 disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: T, color: BG }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = T_DIM)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = T)}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Create Account & Enter</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
