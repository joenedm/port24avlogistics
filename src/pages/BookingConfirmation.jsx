import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function BookingConfirmation() {
  const [state, setState] = useState('loading'); // loading | confirmed | declined | already_used | error
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token || token.startsWith('PREVIEW_')) {
      setState('error');
      setErrorMsg('This is a preview link and cannot be used to respond. The real links will be in the email sent to the crew member.');
      return;
    }

    base44.functions.invoke('processBookingConfirmation', { token })
      .then(res => {
        const d = res.data;
        if (d.success) {
          setData(d);
          if (d.already_used) {
            setState('already_used');
          } else {
            setState(d.action === 'confirm' ? 'confirmed' : 'declined');
          }
        } else {
          setState('error');
          setErrorMsg(d.error || 'Unable to process your response.');
        }
      })
      .catch(err => {
        setState('error');
        const msg = err.response?.data?.error || err.message || 'Unable to process your response.';
        // Never show raw entity errors
        if (msg.includes('not found') || msg.includes('404')) {
          setErrorMsg('This invitation link is invalid or has expired. Please contact the project manager.');
        } else {
          setErrorMsg(msg);
        }
      });
  }, []);

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>

        {/* Loading */}
        {state === 'loading' && (
          <div style={{ padding: '60px 30px', textAlign: 'center' }}>
            <Loader2 style={{ width: 48, height: 48, color: '#6b7280', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#6b7280', fontSize: 16, margin: 0 }}>Processing your response…</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Confirmed */}
        {state === 'confirmed' && (
          <>
            <div style={{ backgroundColor: '#10b981', padding: '48px 30px 40px', textAlign: 'center' }}>
              <CheckCircle2 style={{ width: 64, height: 64, color: 'white', margin: '0 auto 16px' }} />
              <h1 style={{ color: 'white', fontSize: 26, fontWeight: 700, margin: '0 0 8px' }}>You're Confirmed!</h1>
              {data?.show_name && (
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, margin: '0 0 4px' }}>{data.show_name}</p>
              )}
              {data?.date_range && (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: 0 }}>{data.date_range}</p>
              )}
            </div>
            <div style={{ padding: '36px 30px', textAlign: 'center' }}>
              {data?.crew_name && (
                <p style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 12 }}>
                  Hey {data.crew_name.split(' ')[0]}!
                </p>
              )}
              <p style={{ fontSize: 16, color: '#374151', marginBottom: 16 }}>
                Thank you for your response.
              </p>
              {(data?.show_name || data?.role || data?.date_range) && (
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px 20px', textAlign: 'left', display: 'inline-block', minWidth: 220 }}>
                  {data?.show_name && (
                    <div style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>
                      <strong>Project:</strong> {data.show_name}
                    </div>
                  )}
                  {data?.role && (
                    <div style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>
                      <strong>Role:</strong> {data.role}
                    </div>
                  )}
                  {data?.date_range && (
                    <div style={{ fontSize: 14, color: '#374151' }}>
                      <strong>Dates:</strong> {data.date_range}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Declined */}
        {state === 'declined' && (
          <>
            <div style={{ backgroundColor: '#3b82f6', padding: '48px 30px 40px', textAlign: 'center' }}>
              <XCircle style={{ width: 64, height: 64, color: 'white', margin: '0 auto 16px' }} />
              <h1 style={{ color: 'white', fontSize: 26, fontWeight: 700, margin: '0 0 8px' }}>Response Recorded</h1>
              {data?.show_name && (
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, margin: '0 0 4px' }}>{data.show_name}</p>
              )}
              {data?.date_range && (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: 0 }}>{data.date_range}</p>
              )}
            </div>
            <div style={{ padding: '36px 30px', textAlign: 'center' }}>
              {data?.crew_name && (
                <p style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 12 }}>
                  Hey {data.crew_name.split(' ')[0]},
                </p>
              )}
              <p style={{ fontSize: 16, color: '#374151', marginBottom: 16 }}>
                Thank you for letting us know.
              </p>
              {(data?.show_name || data?.role || data?.date_range) && (
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px 20px', textAlign: 'left', display: 'inline-block', minWidth: 220 }}>
                  {data?.show_name && (
                    <div style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>
                      <strong>Project:</strong> {data.show_name}
                    </div>
                  )}
                  {data?.role && (
                    <div style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>
                      <strong>Role:</strong> {data.role}
                    </div>
                  )}
                  {data?.date_range && (
                    <div style={{ fontSize: 14, color: '#374151' }}>
                      <strong>Dates:</strong> {data.date_range}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Already used */}
        {state === 'already_used' && (
          <>
            <div style={{ backgroundColor: '#6b7280', padding: '48px 30px 40px', textAlign: 'center' }}>
              <CheckCircle2 style={{ width: 64, height: 64, color: 'white', margin: '0 auto 16px' }} />
              <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, margin: 0 }}>Already Responded</h1>
            </div>
            <div style={{ padding: '36px 30px', textAlign: 'center' }}>
              <p style={{ fontSize: 16, color: '#374151', marginBottom: 8 }}>{data?.message}</p>
              <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>
                If you think this is a mistake, please contact the project manager.
              </p>
            </div>
          </>
        )}

        {/* Error */}
        {state === 'error' && (
          <>
            <div style={{ backgroundColor: '#ef4444', padding: '48px 30px 40px', textAlign: 'center' }}>
              <AlertCircle style={{ width: 64, height: 64, color: 'white', margin: '0 auto 16px' }} />
              <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, margin: 0 }}>Link Invalid</h1>
            </div>
            <div style={{ padding: '36px 30px', textAlign: 'center' }}>
              <p style={{ fontSize: 16, color: '#374151', marginBottom: 8 }}>{errorMsg}</p>
              <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>
                Please contact the project manager for a new invitation.
              </p>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #e5e7eb',
          padding: '16px 30px',
          textAlign: 'center',
          fontSize: 12,
          color: '#9ca3af',
        }}>
          Crew Management System
        </div>
      </div>
    </div>
  );
}