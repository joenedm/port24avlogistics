import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Cpu, Network, Layers, ShieldCheck, Mail, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

function Port24BracketIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h10v4H8v8H4V4z" fill="#3DC9C0"/>
      <path d="M36 4h-10v4h8v8h4V4z" fill="#1FB8A0"/>
      <path d="M4 36h10v-4H8v-8H4V36z" fill="#3DC9C0"/>
      <path d="M36 36h-10v-4h8v-8h4V36z" fill="#1FB8A0"/>
    </svg>
  );
}

function Port24Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <Port24BracketIcon size={28} />
      <span style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.12em', fontWeight: 700, fontSize: '0.9rem', color: '#3DC9C0' }}>
        PORT <span style={{ color: '#1FB8A0' }}>24</span>
      </span>
    </div>
  );
}

const T = '#1FB8A0';
const T_DIM = '#17907C';
const C = '#3DC9C0';
const BG = '#0E1117';
const CARD = '#131920';
const CARD2 = '#0B0F18';
const BORDER = 'rgba(31,184,160,0.15)';
const BORDER_DIM = 'rgba(255,255,255,0.06)';
const TEXT_MUTED = '#7B8EA8';

const FEATURES = [
  { icon: Cpu, label: 'Mission Control', desc: 'Live ops dashboard across all active shows' },
  { icon: Network, label: 'Crew & Gear', desc: 'Bookings, inventory, and logistics in one place' },
  { icon: Layers, label: 'Quotes to Invoices', desc: 'Full production document workflow built in' },
];

const OTP_LENGTH = 6;

function VerifyModal({ email, password, onClose, onVerified }) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Auto-focus first cell when modal opens
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const otpCode = digits.join('');

  const focusCell = (idx) => {
    if (idx >= 0 && idx < OTP_LENGTH) inputRefs.current[idx]?.focus();
  };

  const handleCellChange = (idx, val) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    setError('');
    if (char && idx < OTP_LENGTH - 1) focusCell(idx + 1);
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const next = [...digits];
        next[idx] = '';
        setDigits(next);
      } else {
        focusCell(idx - 1);
      }
    } else if (e.key === 'ArrowLeft') focusCell(idx - 1);
    else if (e.key === 'ArrowRight') focusCell(idx + 1);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    focusCell(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (otpCode.length < OTP_LENGTH) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setError('');
    setVerifying(true);
    try {
      await base44.auth.verifyOtp({ email, otpCode });
      setSuccess(true);
      // Small delay so user sees the success state, then login
      setTimeout(async () => {
        if (password) {
          try {
            await base44.auth.loginViaEmailPassword(email, password);
          } catch {}
        }
        onVerified();
      }, 1000);
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('expired')) setError('This code has expired. Use "Resend Code" to get a new one.');
      else if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('wrong')) setError('Incorrect code. Double-check and try again.');
      else if (msg.includes('already') || msg.includes('verified')) {
        setSuccess(true);
        setTimeout(async () => {
          if (password) {
            try {
              await base44.auth.loginViaEmailPassword(email, password);
            } catch {}
          }
          onVerified();
        }, 1000);
      } else setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      await base44.auth.resendOtp(email);
      setResendMsg('A new code was sent to your email.');
      setCooldown(60);
      setDigits(Array(OTP_LENGTH).fill(''));
      focusCell(0);
    } catch {
      setResendMsg('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-8"
        style={{ backgroundColor: CARD, border: `1px solid rgba(31,184,160,0.2)`, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
          style={{ color: TEXT_MUTED }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}
        >
          <X className="w-4 h-4" />
        </button>

        {success ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(31,184,160,0.12)', border: `1px solid rgba(31,184,160,0.25)` }}>
              <ShieldCheck className="w-7 h-7" style={{ color: T }} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Email verified!</h3>
            <p className="text-sm" style={{ color: TEXT_MUTED }}>
              {password ? 'Signing you in…' : 'Redirecting to sign in…'}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(31,184,160,0.1)', border: `1px solid rgba(31,184,160,0.2)` }}>
                <Mail className="w-5 h-5" style={{ color: T }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Verify your email</h3>
                <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>
                  Enter the 6-digit code sent to <span className="text-white font-medium">{email}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleVerify}>
              {/* OTP cells */}
              <div className="flex gap-2 justify-between mb-5">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleCellChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className="w-11 h-13 text-center text-xl font-bold rounded-xl outline-none transition-all"
                    style={{
                      width: '44px', height: '52px',
                      backgroundColor: CARD2,
                      border: `1.5px solid rgba(255,255,255,0.08)`,
                      color: '#fff',
                      caretColor: T,
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(31,184,160,0.4)'; e.target.style.boxShadow = `0 0 0 3px rgba(31,184,160,0.1)`; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                ))}
              </div>

              {/* Single-field paste fallback */}
              <div className="mb-5">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Or paste full code here: 123456"
                  maxLength={6}
                  value={digits.every(d => d === '') ? '' : otpCode}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
                    const next = Array(OTP_LENGTH).fill('');
                    val.split('').forEach((c, i) => { next[i] = c; });
                    setDigits(next);
                    setError('');
                  }}
                  onPaste={handlePaste}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all text-center font-mono tracking-widest"
                  style={{
                    backgroundColor: CARD2,
                    border: `1px solid rgba(255,255,255,0.06)`,
                    color: '#fff',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(31,184,160,0.3)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                />
                <p className="text-xs mt-1 text-center" style={{ color: TEXT_MUTED }}>Paste your 6-digit code in either field</p>
              </div>

              {error && (
                <div className="rounded-lg px-3 py-2.5 text-xs mb-4"
                  style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                  {error}
                </div>
              )}
              {resendMsg && (
                <div className="rounded-lg px-3 py-2.5 text-xs mb-4"
                  style={{ backgroundColor: 'rgba(31,184,160,0.08)', border: `1px solid rgba(31,184,160,0.2)`, color: T }}>
                  {resendMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={verifying || otpCode.length < OTP_LENGTH}
                className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50 mb-3"
                style={{ backgroundColor: T, color: BG, boxShadow: '0 4px 16px rgba(31,184,160,0.25)' }}
                onMouseEnter={e => !verifying && (e.currentTarget.style.backgroundColor = T_DIM)}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = T}
              >
                {verifying ? 'Verifying…' : <><ShieldCheck className="w-4 h-4" /> Verify Email</>}
              </button>
            </form>

            <div className="flex items-center justify-center gap-2">
              <span className="text-xs" style={{ color: TEXT_MUTED }}>Didn't get a code?</span>
              <button
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50"
                style={{ color: cooldown > 0 ? TEXT_MUTED : T }}
              >
                <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const navigate = useNavigate();
  const { checkAppState } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const justVerified = urlParams.get('verified') === '1';

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) navigate('/');
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = '/';
      return;
    } catch (err) {
      setLoading(false);
      const msg = (err?.message || '').toLowerCase();
      // Clear "wrong password" indicators — everything else may be a verification issue
      const isWrongPassword =
        msg.includes('invalid password') ||
        msg.includes('wrong password') ||
        msg.includes('incorrect password') ||
        msg.includes('invalid credentials') ||
        msg.includes('invalid email or password') ||
        msg.includes('user not found') ||
        msg.includes('no user') ||
        msg.includes('does not exist');
      if (!isWrongPassword) {
        // Likely a verification/unconfirmed account issue — show the verify modal
        setShowVerifyModal(true);
        return;
      }
      setError(err?.message || 'Invalid email or password. Please try again.');
    }
  };

  // Called by VerifyModal after successful verification + auto-login
  const handleVerified = () => {
    window.location.href = '/';
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}
    >
      {/* Verify Email Modal */}
      {showVerifyModal && (
        <VerifyModal
          email={email}
          password={password}
          onClose={() => setShowVerifyModal(false)}
          onVerified={handleVerified}
        />
      )}

      {/* ── Left panel — form ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 relative z-10">

        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-3xl"
            style={{ backgroundColor: 'rgba(31,184,160,0.04)' }}
          />
        </div>

        <div className="relative w-full max-w-sm">

          {/* Wordmark */}
          <div className="mb-12">
            <Port24Wordmark />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Sign in to your workspace
            </h1>
            <p className="text-sm" style={{ color: TEXT_MUTED }}>
              Access your crew, gear, shows, and operations.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full rounded-lg px-4 py-3 text-sm text-white placeholder-opacity-40 outline-none transition-all"
                style={{
                  backgroundColor: CARD,
                  border: `1px solid ${BORDER_DIM}`,
                  color: '#fff',
                }}
                onFocus={e => e.target.style.borderColor = BORDER}
                onBlur={e => e.target.style.borderColor = BORDER_DIM}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium" style={{ color: TEXT_MUTED }}>
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs transition-colors"
                  style={{ color: TEXT_MUTED }}
                  onMouseEnter={e => e.currentTarget.style.color = T}
                  onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg px-4 py-3 pr-11 text-sm text-white outline-none transition-all"
                  style={{
                    backgroundColor: CARD,
                    border: `1px solid ${BORDER_DIM}`,
                    color: '#fff',
                  }}
                  onFocus={e => e.target.style.borderColor = BORDER}
                  onBlur={e => e.target.style.borderColor = BORDER_DIM}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: TEXT_MUTED }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Verified success banner */}
            {justVerified && (
              <div
                className="rounded-lg px-4 py-3 text-xs"
                style={{ backgroundColor: 'rgba(31,184,160,0.08)', border: '1px solid rgba(31,184,160,0.25)', color: '#1FB8A0' }}
              >
                ✓ Email verified! Sign in below to enter your workspace.
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="rounded-lg px-4 py-3 text-xs"
                style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
              >
                {error}
                {email && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(239,68,68,0.2)' }}>
                    New user or need to verify?{' '}
                    <button
                      type="button"
                      onClick={() => { setError(''); setShowVerifyModal(true); }}
                      style={{ color: T, textDecoration: 'underline' }}
                    >
                      Enter verification code
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm transition-colors mt-2 disabled:opacity-60"
              style={{
                backgroundColor: T,
                color: BG,
                boxShadow: '0 8px 32px rgba(31,184,160,0.2)',
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = T_DIM)}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = T}
            >
              {loading ? 'Signing in...' : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-xs mt-8 text-center" style={{ color: '#374151' }}>
            Don't have access?{' '}
            <a
              href="mailto:info@port24.io"
              style={{ color: T }}
              className="hover:underline"
            >
              Contact your administrator
            </a>
          </p>
        </div>
      </div>

      {/* ── Right panel — hero image ── */}
      <div
        className="hidden lg:flex flex-col justify-end w-[55%] flex-shrink-0 relative overflow-hidden"
        style={{
          backgroundImage: `url(https://media.base44.com/images/public/69d5151f0495918d567d1066/f432b4024_ChatGPTImageApr21202611_55_27AM.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark gradient overlay at bottom */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(14,17,23,0.85) 0%, rgba(14,17,23,0.2) 50%, transparent 100%)' }} />
        {/* Bottom tagline */}
        <div className="relative p-10">
          <p className="text-xs tracking-widest uppercase font-semibold mb-2" style={{ color: C }}>Your Turnkey Solution</p>
          <h2 className="text-2xl font-extrabold text-white leading-snug tracking-tight">
            Every part of production,<br />
            <span style={{ color: T }}>in one place.</span>
          </h2>
        </div>
      </div>
    </div>
  );
}