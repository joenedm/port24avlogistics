import React from 'react';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from './components/layout/AppLayout';
import WorkspacePicker from './pages/WorkspacePicker';
import CreateCompany from './pages/CreateCompany';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Shows from './pages/Shows';
import ShowDetail from './pages/ShowDetail';
import { Navigate } from 'react-router-dom';
import Scan from './pages/Scan.jsx';
import Movements from './pages/Movements';
import Categories from './pages/Categories';
import Admin from './pages/Admin';
import PlanUsage from './pages/PlanUsage';
import Kits from './pages/Kits';
import Alerts from './pages/Alerts';
import ImportInventory from './pages/ImportInventory';
import LiveProject from './pages/LiveProject';
import Utilization from './pages/Utilization';
import QuoteBuilder from './pages/QuoteBuilder';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import BrandingSettings from './pages/BrandingSettings';
import AvailabilityCalendar from './pages/AvailabilityCalendar';
import AVHospital from './pages/AVHospital';
import PrintTemplates from './pages/PrintTemplates';
import CrewDashboard from './pages/CrewDashboard';
import CrewBookings from './pages/CrewBookings';
import CrewMembers from './pages/CrewMembers';
import MyProfile from './pages/MyProfile';
import CrewBookingDetail from './pages/CrewBookingDetail';
import Quotes from './pages/Quotes';
import LaborRateManager from './pages/LaborRateManager';
import CrewBookingEmailTemplate from './pages/CrewBookingEmailTemplate';
import CrewConfirmation from './pages/CrewConfirmation';
import BookingConfirmation from './pages/BookingConfirmation';
import EmailBuilder from './pages/EmailBuilder';
import SendCrewEmail from './pages/SendCrewEmail';
import CrewRoleManager from './pages/CrewRoleManager';
import QuoteTemplateBuilder from './pages/QuoteTemplateBuilder';
import QRLabelBuilder from './pages/QRLabelBuilder';
import MissionControl from './pages/MissionControl';
import SmartProjectBuilder from './pages/SmartProjectBuilder';
import Roundtable from './pages/Roundtable';
import AssignBarcode from './pages/AssignBarcode';
import YearlyReview from './pages/YearlyReview';
import YearlyReviewSession from './pages/YearlyReviewSession';
import FulfillmentCalibration from './pages/FulfillmentCalibration';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Venues from './pages/Venues';
import VenueDetail from './pages/VenueDetail';
import AdminBilling from './pages/AdminBilling';
import ClientBilling from './pages/ClientBilling';
import LandingPage from './pages/LandingPage';
import Containers from './pages/Containers';
import QRCodeSettings from './pages/QRCodeSettings';
import TruckPackBuilder from './pages/TruckPackBuilder';
import DocumentSettings from './pages/DocumentSettings';
import AcceptInvite from './pages/AcceptInvite';
import QuickBooksCallback from './pages/QuickBooksCallback';
import PlatformLogin from './pages/PlatformLogin';
import PlatformJoin from './pages/PlatformJoin';
import PlatformAdmin from './pages/PlatformAdmin';
import PlatformOrgDetail from './pages/PlatformOrgDetail';
import PlatformLayout from './components/platform/PlatformLayout';
import SignIn from './pages/SignIn';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import ThemeProvider from './lib/ThemeProvider';
import AuthDebugPanel from '@/components/dev/AuthDebugPanel';
import SessionExpiringModal from '@/components/shared/SessionExpiringModal';
import { supabase } from '@/api/supabaseClient';

const BtnStyle = (bg, fg) => ({
  padding: '0.6rem 1.25rem', backgroundColor: bg, color: fg,
  borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer',
  fontSize: '0.85rem', fontFamily: 'Inter, sans-serif',
});

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, clearing: false }; }
  static getDerivedStateFromError(error) { return { error }; }

  clearSession = async () => {
    this.setState({ clearing: true });
    try { await supabase.auth.signOut(); } catch {}
    try {
      // Clear all localStorage (workspace caches, React Query persisted state, etc.)
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = '/signin';
  };

  render() {
    if (this.state.error) {
      const { error, clearing } = this.state;
      return (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E1117', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ maxWidth: 520, width: '100%', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, padding: '2rem', backgroundColor: 'rgba(239,68,68,0.04)' }}>
            <p style={{ color: '#F87171', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              Port 24 ran into a loading issue.
            </p>
            <p style={{ color: '#9AA3B0', fontSize: '0.8rem', marginBottom: '1.75rem', wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.5 }}>
              {error?.message || 'Unknown error'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => window.location.reload()} style={BtnStyle('#1FB8A0', '#000')}>
                Retry
              </button>
              <button onClick={this.clearSession} disabled={clearing} style={BtnStyle('rgba(239,68,68,0.15)', '#F87171')}>
                {clearing ? 'Clearing…' : 'Clear Session and Return to Login'}
              </button>
              <button onClick={() => { window.location.href = '/landing'; }} style={BtnStyle('rgba(255,255,255,0.07)', '#9AA3B0')}>
                Go to Landing Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RootRedirect() {
  return <Dashboard />;
}

function NoWorkspaceAccess() {
  const { logout } = useAuth();
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E1117', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 460, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#F87171" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"/></svg>
        </div>
        <h2 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem' }}>No Workspace Access</h2>
        <p style={{ color: '#9AA3B0', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '2rem', maxWidth: 380, margin: '0 auto 2rem' }}>
          Your account is not connected to a Port 24 company workspace.
          Please contact your company admin and ask them to send you an invite.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => { window.location.href = '/signin'; }}
            style={{ padding: '0.65rem 1.4rem', backgroundColor: '#1FB8A0', color: '#000', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
            Back to Login
          </button>
          <button
            onClick={logout}
            style={{ padding: '0.65rem 1.4rem', backgroundColor: 'rgba(255,255,255,0.07)', color: '#9AA3B0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
            Sign Out
          </button>
          <a
            href="mailto:support@port24av.com"
            style={{ padding: '0.65rem 1.4rem', color: '#6B7A92', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'none' }}>
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

// Public routes — never blocked by NoWorkspaceAccess, regardless of auth state.
const PUBLIC_PATHS = new Set([
  '/', '/landing',
  '/signin', '/forgot-password', '/reset-password', '/verify-email',
  '/accept-invite', '/crew-confirmation', '/booking-confirmation',
  '/qb-callback', '/platform/login', '/platform/join',
]);

const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, membershipsLoaded, needsCompany, needsWorkspacePick, trialFlow, isPlatformAdmin, user, userRecord, companyMemberships } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth || (isAuthenticated && !membershipsLoaded)) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0E1117' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(31,184,160,0.2)', borderTopColor: '#1FB8A0', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (authError?.type === 'no_account') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0E1117] px-4">
        <div className="max-w-md w-full text-center rounded-2xl border border-red-500/20 bg-red-500/5 p-10">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"/></svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">No Account Found</h2>
          <p className="text-sm text-gray-400 mb-6">You need an invite link to access Port 24. Contact your company admin or Port 24 support.</p>
          <button onClick={() => window.location.href = '/signin'} className="w-full py-3 rounded-xl font-semibold text-sm bg-[#1FB8A0] text-black">Back to Sign In</button>
        </div>
      </div>
    );
  }

  // Platform admin redirect — always fires for users whose email is in PLATFORM_ADMIN_EMAILS.
  // These are pure platform admins with no workspace; they always go to /platform.
  // Users who have is_platform_admin=true via DB (e.g. joe@nedm.com) but are NOT in
  // PLATFORM_ADMIN_EMAILS are workspace users with elevated DB flags — they skip this
  // and land in their workspace normally.
  // Redirect platform-admin users away from company routes → /platform.
  // MUST skip this when already on /platform/* — returning <Navigate to="/platform">
  // while already at /platform creates an infinite render loop that prevents
  // PlatformAdmin from ever mounting.
  const isPureAdmin = user?.email && ['port24avlogistics@gmail.com'].includes(user.email.toLowerCase());
  if (isAuthenticated && isPureAdmin && membershipsLoaded && !location.pathname.startsWith('/platform')) {
    return <Navigate to="/platform" replace />;
  }

  // Authenticated but no company membership.
  // Skip this guard for public landing/marketing paths so the marketing site is always
  // reachable regardless of auth state — NoWorkspaceAccess is for protected routes only.
  if (isAuthenticated && needsCompany && !PUBLIC_PATHS.has(location.pathname)) {
    if (trialFlow) return <CreateCompany />;
    return <NoWorkspaceAccess />;
  }

  // Authenticated, multiple companies, no active workspace selected → workspace picker
  if (isAuthenticated && needsWorkspacePick) {
    return <WorkspacePicker />;
  }

  if (authError?.type === 'auth_required') {
    // Show public routes without sidebar; protected routes redirect to sign-in
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/crew-confirmation" element={<CrewConfirmation />} />
        <Route path="/booking-confirmation" element={<BookingConfirmation />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/qb-callback" element={<QuickBooksCallback />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/platform/login" element={<PlatformLogin />} />
        <Route path="/platform/join" element={<PlatformJoin />} />
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* / → dashboard for users with a workspace; /landing always shows the marketing page */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/workspace-picker" element={<WorkspacePicker />} />
      <Route path="/create-company" element={<CreateCompany />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/crew-confirmation" element={<CrewConfirmation />} />
      <Route path="/booking-confirmation" element={<BookingConfirmation />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/qb-callback" element={<QuickBooksCallback />} />

      {/* Main app with sidebar layout */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<RootRedirect />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/shows" element={<Shows />} />
        <Route path="/shows/:id" element={<ShowDetail />} />
        <Route path="/live/:id" element={<LiveProject />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/quotes/:id" element={<QuoteBuilder />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/new" element={<InvoiceDetail />} />
        <Route path="/invoices/from-quote/:id" element={<InvoiceDetail />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/crew" element={<Scan />} />
        <Route path="/movements" element={<Movements />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/kits" element={<Kits />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/utilization" element={<Navigate to="/mission-control" replace />} />
        <Route path="/import" element={<ImportInventory />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/plan-usage" element={<PlanUsage />} />
        <Route path="/branding" element={<BrandingSettings />} />
        <Route path="/availability" element={<AvailabilityCalendar />} />
        <Route path="/av-hospital" element={<AVHospital />} />
        <Route path="/print-templates" element={<PrintTemplates />} />
        <Route path="/crew-dashboard" element={<CrewDashboard />} />
        <Route path="/crew-bookings" element={<CrewBookings />} />
        <Route path="/crew-members" element={<CrewMembers />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/crew-booking/:id" element={<CrewBookingDetail />} />
        <Route path="/labor-rates" element={<LaborRateManager />} />
        <Route path="/crew-booking-email" element={<CrewBookingEmailTemplate />} />
        <Route path="/email-builder" element={<EmailBuilder />} />
        <Route path="/send-crew-email" element={<SendCrewEmail />} />
        <Route path="/crew-roles" element={<CrewRoleManager />} />
        <Route path="/quote-template-builder" element={<QuoteTemplateBuilder />} />
        <Route path="/qr-label-builder" element={<QRLabelBuilder />} />
          <Route path="/mission-control" element={<MissionControl />} />
          <Route path="/smart-builder" element={<SmartProjectBuilder />} />
          <Route path="/roundtable" element={<Roundtable />} />
          <Route path="/assign-barcode" element={<AssignBarcode />} />
          <Route path="/yearly-review" element={<YearlyReview />} />
          <Route path="/yearly-review/:id" element={<YearlyReviewSession />} />
          <Route path="/containers" element={<Containers />} />
          <Route path="/qr-code-settings" element={<QRCodeSettings />} />
          <Route path="/truck-pack/:showId" element={<TruckPackBuilder />} />
          <Route path="/truck-pack" element={<TruckPackBuilder />} />
          <Route path="/fulfillment-calibration" element={<FulfillmentCalibration />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/venues/:id" element={<VenueDetail />} />
          <Route path="/billing" element={<AdminBilling />} />
          <Route path="/client-billing" element={<ClientBilling />} />
          <Route path="/document-settings" element={<DocumentSettings />} />
      </Route>

      {/* ── Platform Admin — completely separate layout + auth ── */}
      <Route path="/platform/login" element={<PlatformLogin />} />
      <Route path="/platform/join" element={<PlatformJoin />} />
      <Route element={<PlatformLayout />}>
        <Route path="/platform" element={<PlatformAdmin />} />
        <Route path="/platform/org/:orgId" element={<PlatformOrgDetail />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function SessionWarningModal() {
  const { sessionWarning, extendSession, logout } = useAuth();
  if (!sessionWarning) return null;
  return <SessionExpiringModal onStaySignedIn={extendSession} onSignOut={logout} />;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <ThemeProvider>
            <SessionWarningModal />
            <Router>
              <AuthenticatedApp />
              <AuthDebugPanel />
            </Router>
            <Toaster />
          </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;