import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, Loader2, Building2 } from 'lucide-react';

const T = '#1FB8A0';
const T_DIM = '#17907C';
const BG = '#0E1117';
const CARD = '#131920';
const CARD2 = '#0B0F18';
const BORDER = 'rgba(31,184,160,0.2)';
const BORDER_DIM = 'rgba(255,255,255,0.07)';
const TEXT_MUTED = '#7B8EA8';

function Port24Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
        <path d="M4 4h10v4H8v8H4V4z" fill="#3DC9C0"/>
        <path d="M36 4h-10v4h8v8h4V4z" fill="#1FB8A0"/>
        <path d="M4 36h10v-4H8v-8H4V36z" fill="#3DC9C0"/>
        <path d="M36 36h-10v-4h8v-8h4V36z" fill="#1FB8A0"/>
      </svg>
      <span style={{ letterSpacing: '0.12em', fontWeight: 700, fontSize: '0.9rem', color: '#3DC9C0' }}>
        PORT <span style={{ color: T }}>24</span>
      </span>
    </div>
  );
}

// Step 1: load & validate the token from the DB (no auth required)
async function loadInvite(token) {
  const { data, error } = await supabase
    .from('pending_invites')
    .select('*, organizations(name, plan)')
    .eq('token', token)
    .single();

  if (error || !data) throw new Error('Invite not found. It may have already been used or the link is incorrect.');
  if (data.status !== 'pending') throw new Error(`This invite has already been ${data.status}.`);
  if (new Date(data.expires_at) < new Date()) throw new Error('This invite link has expired. Ask Port 24 to send a new one.');
  return data;
}

// Step 2: claim the invite via edge function (service role — bypasses RLS)
async function claimInvite(token, fullName) {
  const { data, error } = await supabase.functions.invoke('claim-invite', {
    body: { token, full_name: fullName },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function AcceptInvite() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token') || '';

  const [invite, setInvite] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');

  // Form state
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [step, setStep] = useState('account'); // 'account' | 'company'
  const [companyInfo, setCompanyInfo] = useState({ phone: '', website: '', address: '' });

  useEffect(() => {
    if (!token) {
      setInviteError('No invite token found. Check the link you were sent.');
      setLoadingInvite(false);
      return;
    }
    loadInvite(token)
      .then(inv => { setInvite(inv); setFullName(inv.full_name || ''); })
      .catch(err => setInviteError(err.message))
      .finally(() => setLoadingInvite(false));
  }, [token]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) return setError('Please enter your full name.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      // Sign up with Supabase Auth
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (signUpErr) throw signUpErr;

      // Try to sign in immediately (works if email already confirmed or auto-confirmed)
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: invite.email, password });
      if (signInErr) {
        setStep('confirm_email');
        return;
      }

      await claimInvite(token, fullName);

      setStep('company');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (companyInfo.phone || companyInfo.website || companyInfo.address) {
        await supabase.from('organizations').update({
          phone: companyInfo.phone || null,
          website: companyInfo.website || null,
          address: companyInfo.address || null,
        }).eq('id', invite.org_id);
      }
      setDone(true);
      setTimeout(() => navigate('/'), 1500);
    } catch {
      // non-fatal — columns may not exist yet
      setDone(true);
      setTimeout(() => navigate('/'), 1500);
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

  // ── Invite error ──
  if (inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
        <div className="w-full max-w-md rounded-2xl p-10 border text-center" style={{ backgroundColor: CARD, borderColor: 'rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#EF4444' }} />
          <h2 className="text-xl font-bold text-white mb-3">Invite Issue</h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: TEXT_MUTED }}>{inviteError}</p>
          <button onClick={() => navigate('/signin')} className="w-full py-3 rounded-xl font-semibold text-sm" style={{ backgroundColor: T, color: BG }}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Email confirmation required ──
  if (step === 'confirm_email') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
        <div className="w-full max-w-md rounded-2xl p-10 border text-center" style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: 'rgba(31,184,160,0.1)', border: `1px solid ${BORDER}` }}>
            <CheckCircle className="w-7 h-7" style={{ color: T }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Check your email</h2>
          <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
            We sent a confirmation link to <strong style={{ color: '#fff' }}>{invite.email}</strong>. Click it to activate your account, then come back and sign in.
          </p>
          <button onClick={() => navigate('/signin')} className="mt-6 w-full py-3 rounded-xl font-semibold text-sm" style={{ backgroundColor: T, color: BG }}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Company info ──
  if (step === 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
        <div className="w-full max-w-md">
          <div className="mb-8"><Port24Logo /></div>
          <div className="rounded-2xl p-8 border" style={{ backgroundColor: CARD, borderColor: BORDER_DIM }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(31,184,160,0.1)' }}>
                <Building2 className="w-5 h-5" style={{ color: T }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Tell us about {invite.organizations?.name}</h2>
                <p className="text-xs" style={{ color: TEXT_MUTED }}>Optional — you can fill this in later</p>
              </div>
            </div>
            <form onSubmit={handleCompanyInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Phone Number</label>
                <input type="tel" className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none" style={{ backgroundColor: CARD2, border: `1px solid ${BORDER_DIM}` }}
                  value={companyInfo.phone} onChange={e => setCompanyInfo(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Website</label>
                <input type="url" className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none" style={{ backgroundColor: CARD2, border: `1px solid ${BORDER_DIM}` }}
                  value={companyInfo.website} onChange={e => setCompanyInfo(p => ({ ...p, website: e.target.value }))} placeholder="https://yourcompany.com" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Business Address</label>
                <input className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none" style={{ backgroundColor: CARD2, border: `1px solid ${BORDER_DIM}` }}
                  value={companyInfo.address} onChange={e => setCompanyInfo(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St, City, State" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" disabled={loading} onClick={() => { setDone(true); setTimeout(() => navigate('/'), 1000); }}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors" style={{ border: `1px solid ${BORDER_DIM}`, color: TEXT_MUTED }}>
                  Skip for now
                </button>
                <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: T, color: BG }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Enter Workspace</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
        <div className="w-full max-w-md rounded-2xl p-10 border text-center" style={{ backgroundColor: CARD, borderColor: BORDER }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(31,184,160,0.12)', border: `1px solid ${BORDER}` }}>
            <CheckCircle className="w-8 h-8" style={{ color: T }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Welcome to Port 24!</h2>
          <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>Your workspace is ready. Taking you there now…</p>
          <Loader2 className="w-5 h-5 animate-spin mx-auto mt-4" style={{ color: T }} />
        </div>
      </div>
    );
  }

  // ── Step 1: Create account ──
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: BG }}>
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full blur-3xl" style={{ backgroundColor: 'rgba(31,184,160,0.04)' }} />
        </div>

        <div className="relative w-full max-w-sm">
          <div className="mb-10"><Port24Logo /></div>

          {/* Org badge */}
          <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5 mb-8" style={{ borderColor: BORDER, backgroundColor: 'rgba(31,184,160,0.06)' }}>
            <Building2 className="w-4 h-4 flex-shrink-0" style={{ color: T }} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{invite.organizations?.name}</p>
              <p className="text-xs capitalize" style={{ color: TEXT_MUTED }}>{invite.organizations?.plan} plan · {invite.role} access</p>
            </div>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Create your account</h1>
            <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>
              You were invited to join <strong style={{ color: '#fff' }}>{invite.organizations?.name}</strong> on Port 24. Set a password to get started.
            </p>
          </div>

          {/* Locked email */}
          <div className="rounded-lg px-4 py-3 mb-5 flex items-center justify-between gap-3" style={{ backgroundColor: CARD2, border: `1px solid ${BORDER_DIM}` }}>
            <span className="text-xs" style={{ color: TEXT_MUTED }}>Email</span>
            <span className="text-sm font-medium text-white">{invite.email}</span>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Your Full Name *</label>
              <input
                type="text" value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus
                placeholder="Jane Smith"
                className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none transition-all"
                style={{ backgroundColor: CARD, border: `1px solid ${BORDER_DIM}` }}
                onFocus={e => e.target.style.borderColor = BORDER}
                onBlur={e => e.target.style.borderColor = BORDER_DIM}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Password *</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="At least 8 characters"
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
              <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Confirm Password *</label>
              <input
                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                placeholder="Repeat your password"
                className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none transition-all"
                style={{ backgroundColor: CARD, border: `1px solid ${BORDER_DIM}` }}
                onFocus={e => e.target.style.borderColor = BORDER}
                onBlur={e => e.target.style.borderColor = BORDER_DIM}
              />
            </div>

            {error && (
              <div className="rounded-lg px-4 py-3 text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm mt-2 disabled:opacity-60 transition-colors"
              style={{ backgroundColor: T, color: BG }}
              onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = T_DIM)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = T)}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-xs mt-8 text-center" style={{ color: '#374151' }}>
            Already have an account?{' '}
            <button onClick={() => navigate('/signin')} className="hover:underline" style={{ color: T }}>Sign in</button>
          </p>
        </div>
      </div>

      {/* Right hero panel */}
      <div className="hidden lg:flex flex-col justify-between w-[50%] flex-shrink-0 relative overflow-hidden"
        style={{ background: '#070B11' }}>
        {/* Grid texture */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="igrid" width="56" height="56" patternUnits="userSpaceOnUse">
              <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#1FB8A0" strokeWidth="0.6"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#igrid)" />
        </svg>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(31,184,160,0.07) 0%, transparent 65%)' }} />
        {/* Large bracket watermark */}
        <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.04 }}>
          <svg width="380" height="380" viewBox="0 0 40 40" fill="none">
            <path d="M4 4h10v4H8v8H4V4z" fill="#3DC9C0"/>
            <path d="M36 4h-10v4h8v8h4V4z" fill="#1FB8A0"/>
            <path d="M4 36h10v-4H8v-8H4V36z" fill="#3DC9C0"/>
            <path d="M36 36h-10v-4h8v-8h4V36z" fill="#1FB8A0"/>
          </svg>
        </div>
        {/* Mockup */}
        <div className="relative flex-1 flex items-center justify-center p-10">
          <div style={{ width: '100%', maxWidth: 340, background: '#0D1219', border: '1px solid rgba(31,184,160,0.15)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ background: '#111820', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.5 }} />)}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: T, background: 'rgba(31,184,160,0.1)', border: '1px solid rgba(31,184,160,0.2)', borderRadius: 5, padding: '2px 8px' }}>Your Workspace</span>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[{ l: 'Total Assets', v: '—', c: T }, { l: 'Active Shows', v: '—', c: '#818CF8' }].map(({ l, v, c }) => (
                  <div key={l} style={{ background: '#111820', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ color: c, fontSize: 15, fontWeight: 700, margin: 0 }}>{v}</p>
                    <p style={{ color: '#4A5568', fontSize: 9, margin: '2px 0 0' }}>{l}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(31,184,160,0.06)', border: '1px solid rgba(31,184,160,0.18)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <p style={{ color: T, fontSize: 11, fontWeight: 700, margin: '0 0 4px' }}>Ready for your first show</p>
                <p style={{ color: '#4A5568', fontSize: 10, margin: 0 }}>Add assets, build your crew, send a quote</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative p-10">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: T }} />
            <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: '#3DC9C0', margin: 0 }}>Your Workspace Awaits</p>
          </div>
          <h2 className="text-2xl font-extrabold text-white leading-snug tracking-tight">
            Every part of production,<br />
            <span style={{ color: T }}>in one place.</span>
          </h2>
        </div>
      </div>
    </div>
  );
}
