import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
// UserNotRegisteredError disabled during auth reset
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Shows from './pages/Shows';
import ShowDetail from './pages/ShowDetail';
import { Navigate } from 'react-router-dom';
import Scan from './pages/Scan.jsx';
import Movements from './pages/Movements';
import Categories from './pages/Categories';
import Admin from './pages/Admin';
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

function RootRedirect() {
  const { isPlatformAdmin } = useAuth();
  if (isPlatformAdmin) return <Navigate to="/platform" replace />;
  return <Dashboard />;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'hsl(var(--muted))', borderTopColor: 'hsl(var(--primary))' }}></div>
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

  if (authError?.type === 'auth_required') {
    // Show public routes without sidebar; all others redirect to sign-in
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
      {/* Public pages */}
      <Route path="/landing" element={<LandingPage />} />
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
        <Route path="/" element={<RootRedirect />} />
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

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;