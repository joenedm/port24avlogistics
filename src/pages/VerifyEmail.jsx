import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldCheck, RefreshCw } from 'lucide-react';

const T = '#1FB8A0';
const T_DIM = '#17907C';
const BG = '#0E1117';
const CARD = '#131920';
const BORDER_DIM = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(31,184,160,0.15)';
const TEXT_MUTED = '#7B8EA8';

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
        PORT <span style={{ color: T }}>24</span>
      </span>
    </div>
  );
}

// Single digit input cell
function OtpCell({ value, inputRef, onChange, onKeyDown, onPaste }) {
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      className="w-12 h-14 text-center text-xl font-bold rounded-xl outline-none transition-all"
      style={{
        backgroundColor: CARD,
        border: `1.5px solid ${BORDER_DIM}`,
        color: '#fff',
        caretColor: T,
      }}
      onFocus={e => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = `0 0 0 3px rgba(31,184,160,0.12)`; }}
      onBlur={e => { e.target.style.borderColor = BORDER_DIM; e.target.style.boxShadow = 'none'; }}
    />
  );
}

const OTP_LENGTH = 6;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  // Email/password can come from navigation state (passed from SignIn) or URL param
  const params = new URLSearchParams(location.search);
  const [email, setEmail] = useState(location.state?.email || params.get('email') || '');
  const savedPassword = location.state?.password || null;
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef([]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Already authenticated → redirect home
  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) navigate('/');
    });
  }, []);

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
      // Auto-login if we have the password, otherwise redirect to sign-in
      setTimeout(async () => {
        if (savedPassword) {
          try {
            await base44.auth.loginViaEmailPassword(email, savedPassword);
            navigate('/');
            return;
          } catch (loginErr) {
            console.warn('[VerifyEmail] Auto-login failed:', loginErr.message);
          }
        }
        navigate('/signin?verified=1');
      }, 1200);
    } catch (err) {
      const msg = err?.message?.toLowerCase() || '';
      if (msg.includes('expired')) setError('This code has expired — use "Resend Code" to get a new one.');
      else if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('wrong')) setError('Incorrect code. Double-check and try again.');
      else if (msg.includes('already') || msg.includes('verified')) {
        setError('');
        setSuccess(true);
        setTimeout(async () => {
          if (savedPassword) {
            try {
              await base44.auth.loginViaEmailPassword(email, savedPassword);
              navigate('/');
              return;
            } catch {}
          }
          navigate('/signin?verified=1');
        }, 1200);
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
    } catch (err) {
      setResendMsg('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(31,184,160,0.12)', border: `1px solid ${BORDER}` }}>
            <ShieldCheck className="w-8 h-8" style={{ color: T }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Email verified!</h2>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>{savedPassword ? 'Signing you in…' : 'Redirecting to sign in…'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full blur-3xl" style={{ backgroundColor: 'rgba(31,184,160,0.04)' }} />
      </div>

      {/* Back */}
      <Link
        to="/signin"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: TEXT_MUTED }}
        onMouseEnter={e => e.currentTarget.style.color = T}
        onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Sign In
      </Link>

      <div className="relative w-full max-w-sm">

        {/* Wordmark */}
        <div className="mb-10">
          <Port24Wordmark />
        </div>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(31,184,160,0.1)', border: `1px solid ${BORDER}` }}>
          <Mail className="w-6 h-6" style={{ color: T }} />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Verify your email</h1>
        <p className="text-sm mb-1" style={{ color: TEXT_MUTED }}>
          We sent a 6-digit verification code to
        </p>
        <p className="text-sm font-semibold mb-8" style={{ color: '#fff' }}>{email || 'your email'}</p>

        {/* Email input (editable if not pre-filled) */}
        {!location.state?.email && !params.get('email') && (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none transition-all"
              style={{ backgroundColor: CARD, border: `1px solid ${BORDER_DIM}`, color: '#fff' }}
              onFocus={e => e.target.style.borderColor = BORDER}
              onBlur={e => e.target.style.borderColor = BORDER_DIM}
            />
          </div>
        )}

        {/* OTP grid */}
        <form onSubmit={handleVerify}>
          <div className="flex gap-2 justify-between mb-6">
            {digits.map((d, i) => (
              <OtpCell
                key={i}
                value={d}
                inputRef={el => inputRefs.current[i] = el}
                onChange={e => handleCellChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg px-4 py-3 text-xs mb-4" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
              {error}
            </div>
          )}

          {/* Resend message */}
          {resendMsg && (
            <div className="rounded-lg px-4 py-3 text-xs mb-4" style={{ backgroundColor: 'rgba(31,184,160,0.08)', border: `1px solid ${BORDER}`, color: T }}>
              {resendMsg}
            </div>
          )}

          {/* Verify button */}
          <button
            type="submit"
            disabled={verifying || otpCode.length < OTP_LENGTH}
            className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-50"
            style={{ backgroundColor: T, color: BG, boxShadow: '0 8px 32px rgba(31,184,160,0.2)' }}
            onMouseEnter={e => !verifying && (e.currentTarget.style.backgroundColor = T_DIM)}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = T}
          >
            {verifying ? 'Verifying…' : (
              <><ShieldCheck className="w-4 h-4" /> Verify Email</>
            )}
          </button>
        </form>

        {/* Resend */}
        <div className="mt-5 flex items-center justify-center gap-2">
          <span className="text-xs" style={{ color: TEXT_MUTED }}>Didn't receive a code?</span>
          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50"
            style={{ color: cooldown > 0 ? TEXT_MUTED : T }}
            onMouseEnter={e => !cooldown && (e.currentTarget.style.color = T_DIM)}
            onMouseLeave={e => e.currentTarget.style.color = cooldown > 0 ? TEXT_MUTED : T}
          >
            <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
          </button>
        </div>

      </div>
    </div>
  );
}