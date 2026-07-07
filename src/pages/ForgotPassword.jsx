import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle, ArrowRight } from 'lucide-react';

const T = '#1FB8A0';
const T_DIM = '#17907C';
const BG = '#0E1117';
const CARD = '#131920';
const BORDER = 'rgba(31,184,160,0.15)';
const BORDER_DIM = 'rgba(255,255,255,0.06)';
const TEXT_MUTED = '#7B8EA8';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (resetErr) throw resetErr;
    } catch (err) {
      console.error('[ForgotPassword]', err);
      // Don't reveal whether email exists — always show the confirmation screen
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}
    >
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

        {submitted ? (
          <div className="flex flex-col items-start">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ backgroundColor: 'rgba(31,184,160,0.1)', border: `1px solid rgba(31,184,160,0.2)` }}>
              <CheckCircle className="w-6 h-6" style={{ color: T }} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Check your inbox</h1>
            <p className="text-sm leading-relaxed mb-8" style={{ color: TEXT_MUTED }}>
              If an account exists for <span className="text-white font-medium">{email}</span>, you'll receive a password reset link shortly. Check your spam folder if you don't see it.
            </p>
            <Link to="/signin"
              className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
              style={{ backgroundColor: T, color: BG }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = T_DIM}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = T}>
              Back to Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Reset your password</h1>
            <p className="text-sm mb-8" style={{ color: TEXT_MUTED }}>
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: TEXT_MUTED }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@company.com"
                  autoFocus
                  required
                  className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none transition-all"
                  style={{ backgroundColor: CARD, border: `1px solid ${error ? '#EF4444' : BORDER_DIM}`, color: '#fff' }}
                  onFocus={e => { if (!error) e.currentTarget.style.borderColor = BORDER; }}
                  onBlur={e => { if (!error) e.currentTarget.style.borderColor = BORDER_DIM; }}
                />
                {error && <p className="text-xs mt-1.5" style={{ color: '#F87171' }}>{error}</p>}
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm transition-colors mt-2 disabled:opacity-60"
                style={{ backgroundColor: T, color: BG }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = T_DIM; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = T; }}>
                {loading ? 'Sending…' : <><Mail className="w-4 h-4" /> Send Reset Link</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
