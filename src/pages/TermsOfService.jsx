import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BG = '#080C12';
const SURFACE = '#0D1219';
const T = '#1FB8A0';
const BORDER_DIM = 'rgba(255,255,255,0.07)';
const TEXT_MUTED = '#6B7A92';

function Port24Mark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M4 4h10v4H8v8H4V4z" fill="#3DC9C0"/>
      <path d="M36 4h-10v4h8v8h4V4z" fill="#1FB8A0"/>
      <path d="M4 36h10v-4H8v-8H4V36z" fill="#3DC9C0"/>
      <path d="M36 36h-10v-4h8v-8h4V36z" fill="#1FB8A0"/>
    </svg>
  );
}

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using Port 24, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use the platform. These terms apply to all users, including company administrators and invited team members.`,
  },
  {
    title: '2. Description of Service',
    body: `Port 24 is a business operations platform for AV and live production companies, providing tools for inventory management, crew scheduling, quoting, invoicing, and logistics. We reserve the right to modify, suspend, or discontinue any part of the service at any time with reasonable notice.`,
  },
  {
    title: '3. Account Registration',
    body: `You must provide accurate information when creating an account. You are responsible for maintaining the security of your credentials and for all activity that occurs under your account. Notify us immediately at support@port24av.com if you suspect unauthorized access.`,
  },
  {
    title: '4. Acceptable Use',
    body: `You agree not to: (a) use the platform for unlawful purposes; (b) attempt to gain unauthorized access to any part of the platform or its related systems; (c) reverse-engineer or attempt to extract the source code; (d) transmit harmful, fraudulent, or misleading content; or (e) interfere with the platform's operation or other users' access.`,
  },
  {
    title: '5. Your Data',
    body: `You retain ownership of all data you input into Port 24. You grant us a limited license to store, process, and display your data solely to operate the service. We do not claim any intellectual property rights over your data. You are responsible for ensuring your data does not violate any applicable laws or third-party rights.`,
  },
  {
    title: '6. Subscription and Payment',
    body: `Certain features require a paid subscription. Pricing is as displayed at the time of purchase. Subscriptions renew automatically unless cancelled before the renewal date. Refunds are handled on a case-by-case basis — contact support@port24av.com. We reserve the right to change pricing with 30 days' notice.`,
  },
  {
    title: '7. Trial Period',
    body: `We may offer a free trial period. At the end of the trial, you must subscribe to continue using the platform or your access will be suspended. We reserve the right to modify or terminate trial offers at any time.`,
  },
  {
    title: '8. Termination',
    body: `Either party may terminate this agreement at any time. You may delete your account by contacting support@port24av.com. We may suspend or terminate your account for violations of these terms, non-payment, or as required by law. Upon termination, your access ends and we may delete your data after a reasonable retention period.`,
  },
  {
    title: '9. Disclaimer of Warranties',
    body: `Port 24 is provided "as is" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the service will be uninterrupted, error-free, or secure.`,
  },
  {
    title: '10. Limitation of Liability',
    body: `To the fullest extent permitted by law, Port 24 shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of revenue, profits, data, or business opportunities, even if advised of the possibility of such damages. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.`,
  },
  {
    title: '11. Governing Law',
    body: `These terms are governed by the laws of the State of [YOUR STATE], without regard to conflict of law provisions. Disputes shall be resolved in the courts of [YOUR JURISDICTION].`,
  },
  {
    title: '12. Changes to Terms',
    body: `We may update these Terms of Service from time to time. We will notify you of material changes with at least 14 days' notice. Continued use of the platform after changes take effect constitutes acceptance of the updated terms.`,
  },
  {
    title: '13. Contact',
    body: `Questions about these Terms? Contact us at support@port24av.com.`,
  },
];

export default function TermsOfService() {
  return (
    <div style={{ backgroundColor: BG, color: '#fff', fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh' }}>

      {/* Nav */}
      <header style={{ borderBottom: `1px solid ${BORDER_DIM}`, background: SURFACE }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <Port24Mark size={22} />
            <span style={{ letterSpacing: '0.16em', fontWeight: 800, fontSize: '0.75rem', color: '#3DC9C0' }}>PORT <span style={{ color: T }}>24</span></span>
          </Link>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: TEXT_MUTED, fontSize: 13, textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>
      </header>

      <main id="main-content" style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 80px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>Terms of Service</h1>
        <p style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 48 }}>
          Last updated: July 7, 2026 · Effective: July 7, 2026
        </p>

        <p style={{ color: '#C8D0DC', lineHeight: 1.8, marginBottom: 40, fontSize: 15 }}>
          These Terms of Service govern your access to and use of Port 24 products and services provided by Port 24 ("Port 24," "we," "us," or "our"). Please read them carefully.
        </p>

        {SECTIONS.map(({ title, body }) => (
          <section key={title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: 10 }}>{title}</h2>
            <p style={{ color: '#9AAABB', lineHeight: 1.8, fontSize: 14, margin: 0 }}>{body}</p>
          </section>
        ))}
      </main>

      <footer style={{ borderTop: `1px solid ${BORDER_DIM}`, padding: '24px', textAlign: 'center' }}>
        <p style={{ color: TEXT_MUTED, fontSize: 12, margin: 0 }}>
          &copy; {new Date().getFullYear()} Port 24 &nbsp;·&nbsp;
          <Link to="/privacy" style={{ color: TEXT_MUTED, textDecoration: 'none' }}>Privacy Policy</Link> &nbsp;·&nbsp;
          <Link to="/terms" style={{ color: TEXT_MUTED, textDecoration: 'none' }}>Terms of Service</Link>
        </p>
      </footer>
    </div>
  );
}
