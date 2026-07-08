import React from 'react';
import { useAuth } from '@/lib/AuthContext';

export default function SuspendedPage() {
  const { logout, organization } = useAuth();
  const orgName = organization?.name ?? 'Your account';

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E1117', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#F87171" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Account Suspended
        </h2>
        <p style={{ color: '#9AA3B0', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '0.5rem', maxWidth: 380, margin: '0 auto 0.5rem' }}>
          <strong style={{ color: '#cbd5e1' }}>{orgName}</strong> has been suspended.
        </p>
        <p style={{ color: '#9AA3B0', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '2rem', maxWidth: 380, margin: '0 auto 2rem' }}>
          Please contact Port 24 support to resolve your account status.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="mailto:support@port24av.com"
            style={{ padding: '0.65rem 1.4rem', backgroundColor: '#1FB8A0', color: '#000', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-block' }}>
            Contact Support
          </a>
          <button
            onClick={logout}
            style={{ padding: '0.65rem 1.4rem', backgroundColor: 'rgba(255,255,255,0.07)', color: '#9AA3B0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
