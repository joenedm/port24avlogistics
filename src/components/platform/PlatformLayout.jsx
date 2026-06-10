import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Building2, LogOut, ChevronRight, ShieldCheck, Loader2 } from 'lucide-react';

const BG = '#070B11';
const SIDEBAR = '#0D1219';
const T = '#1FB8A0';
const BORDER = 'rgba(255,255,255,0.06)';
const TEXT_MUTED = '#6B7A92';

function Port24Mark() {
  return (
    <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
      <path d="M4 4h10v4H8v8H4V4z" fill="#3DC9C0"/>
      <path d="M36 4h-10v4h8v8h4V4z" fill="#1FB8A0"/>
      <path d="M4 36h10v-4H8v-8H4V36z" fill="#3DC9C0"/>
      <path d="M36 36h-10v-4h8v-8h4V36z" fill="#1FB8A0"/>
    </svg>
  );
}

const DEV_ADMIN_EMAILS = ['joe@nedm.com'];

export default function PlatformLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const verify = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/platform/login', { replace: true });
        return;
      }

      const email = session.user.email?.toLowerCase() ?? '';
      setUserEmail(email);

      // Hardcoded dev admins always get through
      if (DEV_ADMIN_EMAILS.includes(email)) {
        setChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('is_platform_admin, email')
        .eq('id', session.user.id)
        .single();

      if (!profile?.is_platform_admin) {
        setDenied(true);
        setChecking(false);
        return;
      }
      setUserEmail(profile.email || email);
      setChecking(false);
    };
    verify();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/platform/login', { replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: T }} />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4" style={{ color: '#EF4444' }} />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-sm mb-6" style={{ color: TEXT_MUTED }}>This area is restricted to Port 24 platform administrators.</p>
          <button onClick={() => navigate('/signin')} className="text-sm underline" style={{ color: T }}>
            Go to company login
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { path: '/platform', label: 'All Companies', icon: Building2, exact: true },
  ];

  const isActive = (item) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>

      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r" style={{ backgroundColor: SIDEBAR, borderColor: BORDER }}>

        {/* Logo */}
        <div className="px-5 py-5 border-b flex items-center gap-3" style={{ borderColor: BORDER }}>
          <Port24Mark />
          <div>
            <p style={{ letterSpacing: '0.15em', fontWeight: 800, fontSize: '0.7rem', color: '#3DC9C0' }}>PORT <span style={{ color: T }}>24</span></p>
            <p className="text-xs font-medium" style={{ color: TEXT_MUTED }}>Platform Admin</p>
          </div>
        </div>

        {/* Internal badge */}
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(31,184,160,0.08)', border: '1px solid rgba(31,184,160,0.15)' }}>
            <ShieldCheck className="w-3 h-3 flex-shrink-0" style={{ color: T }} />
            <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: T }}>Internal Portal</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ path, label, icon: Icon, exact }) => {
            const active = isActive({ path, exact });
            return (
              <Link
                key={path}
                to={path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: active ? 'rgba(31,184,160,0.12)' : 'transparent',
                  color: active ? T : TEXT_MUTED,
                  border: active ? '1px solid rgba(31,184,160,0.2)' : '1px solid transparent',
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="px-4 py-4 border-t" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(31,184,160,0.15)', color: T }}>
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <p className="text-xs truncate flex-1" style={{ color: TEXT_MUTED }}>{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{ color: TEXT_MUTED, border: `1px solid ${BORDER}` }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
