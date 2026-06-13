import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Building2, Loader2, LogOut } from 'lucide-react';

const BG = '#070B11';
const CARD = '#0D1219';
const TEAL = '#1FB8A0';
const BORDER_DIM = 'rgba(255,255,255,0.07)';

export default function CreateCompany() {
  const { user, logout } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setLoading(true);
    try {
      // Create org via edge function so service role can bypass RLS
      const { data, error: fnErr } = await supabase.functions.invoke('create-company', {
        body: { name: name.trim() },
      });
      if (fnErr || data?.error) throw new Error(fnErr?.message || data?.error || 'Failed to create company');

      // Clear the trial flow flag — company is now created, no longer in onboarding.
      sessionStorage.removeItem('port24_flow');
      // Hard-reload so AuthContext re-initialises from scratch with the new org_id.
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: BG }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/port24-logo.svg" alt="Port 24" className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Set Up Your Workspace</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7A92' }}>
            Create your company workspace to start your free trial.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-4"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER_DIM}` }}
        >
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#9AA3B0' }}>
              Company Name
            </label>
            <div className="relative">
              <Building2
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: '#6B7A92' }}
              />
              <input
                required
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Acme AV Productions"
                className="w-full rounded-xl pl-10 pr-3 py-3 text-sm text-white outline-none transition-colors"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${BORDER_DIM}`,
                }}
                onFocus={e => e.target.style.borderColor = TEAL}
                onBlur={e => e.target.style.borderColor = BORDER_DIM}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            style={{
              backgroundColor: loading || !name.trim() ? 'rgba(31,184,160,0.4)' : TEAL,
              color: '#000',
            }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              : 'Create Workspace →'
            }
          </button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: '#6B7A92' }}>
          If you have an invite link, use that instead to join an existing company.
        </p>

        <button
          onClick={logout}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-sm transition-colors"
          style={{ color: '#6B7A92' }}
          onMouseEnter={e => e.currentTarget.style.color = '#9AA3B0'}
          onMouseLeave={e => e.currentTarget.style.color = '#6B7A92'}
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
