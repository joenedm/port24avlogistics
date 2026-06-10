import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle, AlertCircle } from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/69d5151f0495918d567d1066/ad22e0b11_ShowForgelogodesignwithsparks.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      setError('Missing or invalid reset link. Please request a new one.');
    } else {
      setToken(t);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await db.functions.invoke('resetPassword', {
        token,
        new_password: password,
      });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/signin'), 3000);
      }
    } catch (err) {
      const msg = err?.response?.data?.error;
      if (msg && typeof msg === 'string') {
        setError(msg);
      } else {
        setError('This reset link is invalid or has expired. Please request a new one.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: '#1E1B2E' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(245,158,11,0.06)' }}
        />
      </div>

      <Link
        to="/signin"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm transition-colors"
        style={{ color: '#A1A1AA' }}
        onMouseEnter={e => e.currentTarget.style.color = '#F59E0B'}
        onMouseLeave={e => e.currentTarget.style.color = '#A1A1AA'}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sign In
      </Link>

      <div
        className="relative w-full max-w-md rounded-3xl p-10 flex flex-col items-center"
        style={{
          backgroundColor: '#2A2540',
          border: '1px solid rgba(245,158,11,0.15)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        }}
      >
        <img src={LOGO_URL} alt="Show Forge" className="w-16 h-16 object-contain mb-5 rounded-2xl" />

        {success ? (
          <div className="flex flex-col items-center text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
              style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              <CheckCircle className="w-7 h-7" style={{ color: '#F59E0B' }} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Password updated!</h1>
            <p className="text-sm leading-relaxed mb-8" style={{ color: '#A1A1AA' }}>
              Your password has been changed successfully. Redirecting you to Sign In…
            </p>
            <Link
              to="/signin"
              className="w-full flex items-center justify-center font-semibold py-3.5 rounded-xl text-base"
              style={{ backgroundColor: '#F59E0B', color: '#1E1B2E' }}
            >
              Sign In now
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight text-center">
              Set new <span style={{ color: '#F59E0B' }}>password</span>
            </h1>
            <p className="text-sm mb-8 text-center" style={{ color: '#A1A1AA' }}>
              Enter and confirm your new password below.
            </p>

            {error && !token ? (
              <div
                className="w-full rounded-xl p-4 flex items-start gap-3 mb-4"
                style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#EF4444' }} />
                <div>
                  <p className="text-sm" style={{ color: '#FCA5A5' }}>{error}</p>
                  <Link to="/forgot-password" className="text-xs underline mt-1 block" style={{ color: '#F59E0B' }}>
                    Request a new reset link
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="w-full space-y-4">
                {error && (
                  <div
                    className="w-full rounded-xl p-4 flex items-start gap-3"
                    style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#EF4444' }} />
                    <div>
                      <p className="text-sm" style={{ color: '#FCA5A5' }}>{error}</p>
                      {(error.includes('invalid') || error.includes('expired')) && (
                        <Link to="/forgot-password" className="text-xs underline mt-1 block" style={{ color: '#F59E0B' }}>
                          Request a new reset link
                        </Link>
                      )}
                    </div>
                  </div>
                )}
                <div className="w-full">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#D1D5DB' }}>
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
                    <input
                      type="password"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="Minimum 8 characters"
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                      style={{
                        backgroundColor: '#1E1B2E',
                        border: error ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                      }}
                      onFocus={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)'; }}
                      onBlur={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    />
                  </div>
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#D1D5DB' }}>
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
                    <input
                      type="password"
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError(''); }}
                      placeholder="Re-enter your password"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
                      style={{
                        backgroundColor: '#1E1B2E',
                        border: error ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                      }}
                      onFocus={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)'; }}
                      onBlur={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl transition-colors text-base disabled:opacity-60"
                  style={{ backgroundColor: '#F59E0B', color: '#1E1B2E', boxShadow: '0 8px 32px rgba(245,158,11,0.2)' }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#D97706'; }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#F59E0B'; }}
                >
                  {loading ? 'Saving...' : 'Save new password'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}