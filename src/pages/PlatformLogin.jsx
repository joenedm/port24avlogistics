import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

const BG = '#070B11';
const CARD = '#0D1219';
const T = '#1FB8A0';
const T_DIM = '#17907C';
const BORDER = 'rgba(31,184,160,0.2)';
const BORDER_DIM = 'rgba(255,255,255,0.07)';
const TEXT_MUTED = '#6B7A92';
const PLATFORM_ADMIN_EMAILS = ['port24avlogistics@gmail.com'];

function Port24Mark() {
  return <img src="/port24-logo.svg" alt="Port 24" style={{ height: 36, width: 'auto', objectFit: 'contain' }} />;
}

export default function PlatformLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Detect if we're processing an OAuth redirect (code= in URL) so we can show a spinner
  const isOAuthCallback = window.location.search.includes('code=') || window.location.hash.includes('access_token=');
  const [oauthChecking, setOAuthChecking] = useState(isOAuthCallback);

  // If already logged in as platform admin, go straight to platform.
  // Also handles the OAuth redirect — onAuthStateChange fires SIGNED_IN after code exchange.
  useEffect(() => {
    // Safety valve: if OAuth check hasn't resolved in 15s, give up and show the form
    let safetyTimer = null;
    if (isOAuthCallback) {
      safetyTimer = setTimeout(() => setOAuthChecking(false), 15000);
    }

    // Check existing session first (handles direct nav to /platform/login while already logged in)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      clearTimeout(safetyTimer);
      await verifyAndRoute(session.user);
    });

    // Listen for auth events — this fires after Google OAuth code exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        clearTimeout(safetyTimer);
        await verifyAndRoute(session.user);
      } else if (event === 'SIGNED_OUT') {
        clearTimeout(safetyTimer);
        setOAuthChecking(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const verifyAndRoute = async (authUser) => {
    const normalizedEmail = authUser.email?.toLowerCase() ?? '';
    if (PLATFORM_ADMIN_EMAILS.includes(normalizedEmail)) {
      // Ensure the DB row is marked as platform admin then go to the panel
      const { data: existing } = await supabase.from('users').select('org_id').eq('id', authUser.id).single();
      await supabase.from('users').upsert(
        { id: authUser.id, email: authUser.email, is_platform_admin: true, role: 'admin', org_id: existing?.org_id ?? null },
        { onConflict: 'id' }
      );
      navigate('/platform', { replace: true });
      return;
    }
    // Not a platform admin — sign them out and show an error on this page
    await supabase.auth.signOut();
    setOAuthChecking(false);
    setError('Access denied. This portal is for Port 24 staff only.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signInErr) throw signInErr;

      const { data: { user } } = await supabase.auth.getUser();
      const normalizedEmail = user.email?.toLowerCase();

      // Hardcoded super-admins: ensure DB flag is set, then allow through
      if (PLATFORM_ADMIN_EMAILS.includes(normalizedEmail)) {
        const { data: existing } = await supabase.from('users').select('org_id').eq('id', user.id).single();
        await supabase.from('users').upsert(
          { id: user.id, email: user.email, is_platform_admin: true, role: 'admin', org_id: existing?.org_id ?? null },
          { onConflict: 'id' }
        );
        navigate('/platform', { replace: true });
        return;
      }

      // Otherwise check DB
      const { data: profile } = await supabase.from('users').select('is_platform_admin').eq('id', user.id).single();
      if (!profile?.is_platform_admin) {
        await supabase.auth.signOut();
        throw new Error('Access denied. This portal is for Port 24 staff only.');
      }

      navigate('/platform', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (oauthChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: T }} />
        <p className="text-sm" style={{ color: TEXT_MUTED }}>Verifying access…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-[120px] opacity-20"
          style={{ backgroundColor: T }} />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <Port24Mark />
          <div className="mt-3 text-center">
            <span style={{ letterSpacing: '0.18em', fontWeight: 800, fontSize: '0.75rem', color: '#3DC9C0' }}>
              PORT <span style={{ color: T }}>24</span>
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 border" style={{ backgroundColor: CARD, borderColor: BORDER }}>

          {/* Internal badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-2 border rounded-full px-3 py-1.5" style={{ borderColor: BORDER, backgroundColor: 'rgba(31,184,160,0.08)' }}>
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: T }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: T }}>Internal Access Only</span>
            </div>
          </div>

          <h1 className="text-xl font-bold text-white text-center mb-1">Platform Admin</h1>
          <p className="text-sm text-center mb-7" style={{ color: TEXT_MUTED }}>Port 24 staff login</p>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={async () => {
              setError('');
              setOAuthChecking(true);
              await supabase.auth.signOut();
              await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/platform/login` },
              });
            }}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium transition-all mb-5"
            style={{ backgroundColor: '#060A10', border: `1px solid ${BORDER_DIM}`, color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = BORDER}
            onMouseLeave={e => e.currentTarget.style.borderColor = BORDER_DIM}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ backgroundColor: BORDER_DIM }} />
            <span className="text-xs" style={{ color: TEXT_MUTED }}>or use email</span>
            <div className="flex-1 h-px" style={{ backgroundColor: BORDER_DIM }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@port24.com"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                style={{ backgroundColor: '#060A10', border: `1px solid ${BORDER_DIM}` }}
                onFocus={e => e.target.style.borderColor = BORDER}
                onBlur={e => e.target.style.borderColor = BORDER_DIM}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
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

            {error && (
              <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm mt-2 disabled:opacity-50 transition-colors"
              style={{ backgroundColor: T, color: BG }}
              onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = T_DIM)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = T)}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Access Platform</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

        {/* Back to main site */}
        <p className="text-center mt-6 text-xs" style={{ color: '#2D3748' }}>
          <button onClick={() => navigate('/signin')} className="hover:underline transition-colors" style={{ color: '#374151' }}
            onMouseEnter={e => e.currentTarget.style.color = TEXT_MUTED}
            onMouseLeave={e => e.currentTarget.style.color = '#374151'}>
            ← Back to company login
          </button>
        </p>

      </div>
    </div>
  );
}
