import React from 'react';

export default function SessionExpiringModal({ onStaySignedIn, onSignOut }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.75)',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        maxWidth: 400, width: '100%', margin: '0 1rem',
        backgroundColor: '#0D1219',
        border: '1px solid rgba(251,191,36,0.25)',
        borderRadius: 16, padding: '2rem', textAlign: 'center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          backgroundColor: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <h2 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Session Expiring Soon
        </h2>
        <p style={{ color: '#9AA3B0', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          You will be signed out due to inactivity.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onStaySignedIn}
            style={{
              flex: 1, padding: '0.7rem',
              backgroundColor: '#1FB8A0', color: '#000',
              border: 'none', borderRadius: 10,
              fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Stay Signed In
          </button>
          <button
            onClick={onSignOut}
            style={{
              flex: 1, padding: '0.7rem',
              backgroundColor: 'rgba(255,255,255,0.06)', color: '#9AA3B0',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
              fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
