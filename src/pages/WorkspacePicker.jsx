import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Building2, ArrowRight, Loader2, LogOut } from 'lucide-react';

const BG = '#070B11';
const CARD = '#0D1219';
const TEAL = '#1FB8A0';
const BORDER = 'rgba(31,184,160,0.2)';
const BORDER_DIM = 'rgba(255,255,255,0.07)';

export default function WorkspacePicker() {
  const { companyMemberships, switchWorkspace, logout } = useAuth();
  const [selecting, setSelecting] = useState(null);

  const handlePick = async (orgId) => {
    setSelecting(orgId);
    try {
      await switchWorkspace(orgId);
    } catch {
      setSelecting(null);
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
          <h1 className="text-2xl font-bold text-white">Choose Workspace</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7A92' }}>
            You belong to multiple companies. Select one to continue.
          </p>
        </div>

        <div className="space-y-3">
          {(companyMemberships ?? []).map((m) => {
            const org = m.organizations;
            const isLoading = selecting === m.org_id;
            return (
              <button
                key={m.org_id}
                disabled={!!selecting}
                onClick={() => handlePick(m.org_id)}
                className="w-full text-left rounded-2xl px-5 py-4 transition-all flex items-center gap-4"
                style={{
                  backgroundColor: CARD,
                  border: `1px solid ${isLoading ? TEAL : BORDER_DIM}`,
                  opacity: selecting && !isLoading ? 0.5 : 1,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(31,184,160,0.1)', border: `1px solid ${BORDER}` }}
                >
                  {org?.logo_url
                    ? <img src={org.logo_url} alt={org.name} className="w-8 h-8 object-contain rounded" />
                    : <Building2 className="w-5 h-5" style={{ color: TEAL }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {org?.name ?? 'Unknown Company'}
                  </p>
                  <p className="text-xs capitalize mt-0.5" style={{ color: '#6B7A92' }}>
                    {m.role}
                  </p>
                </div>
                <div style={{ color: TEAL }}>
                  {isLoading
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <ArrowRight className="w-5 h-5" />
                  }
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={logout}
          className="w-full mt-6 flex items-center justify-center gap-2 py-2.5 text-sm transition-colors"
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
