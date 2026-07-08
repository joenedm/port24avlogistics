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
    title: '1. Information We Collect',
    body: `We collect information you provide directly, such as your name, email address, company name, and any data you enter into the platform (inventory records, crew profiles, quotes, invoices, and similar operational data). We also collect usage data automatically, including IP address, browser type, pages visited, and actions taken within the platform, to operate and improve the service.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use the information we collect to provide, maintain, and improve Port 24; to communicate with you about your account; to process transactions; to send operational emails (such as crew booking confirmations); and to comply with legal obligations. We do not sell your personal information to third parties.`,
  },
  {
    title: '3. Data Sharing',
    body: `We share your data only with service providers necessary to operate the platform (including Supabase for database and authentication, Resend for transactional email, and Vercel for hosting). These providers are contractually bound to protect your data. We may disclose information if required by law or to protect rights, property, or safety.`,
  },
  {
    title: '4. Data Retention',
    body: `We retain your data for as long as your account is active or as needed to provide the service. You may request deletion of your account and associated data by contacting us at support@port24av.com. Certain data may be retained as required by law or legitimate business purposes (e.g., financial records).`,
  },
  {
    title: '5. Security',
    body: `We implement industry-standard security measures including TLS encryption in transit, bcrypt password hashing, row-level security in the database, and regular security reviews. No system is completely secure; we encourage strong, unique passwords and will notify you of any breach as required by applicable law.`,
  },
  {
    title: '6. Cookies',
    body: `We use cookies and local storage to maintain your session and remember your workspace preferences. We load fonts from Google Fonts, which may set cookies subject to Google's privacy policy. We do not currently use third-party advertising cookies.`,
  },
  {
    title: '7. Your Rights',
    body: `Depending on your jurisdiction, you may have rights to access, correct, delete, or export your personal data. EU/EEA users have rights under GDPR. California residents have rights under CCPA. To exercise these rights, contact us at support@port24av.com and we will respond within 30 days.`,
  },
  {
    title: '8. Children',
    body: `Port 24 is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, contact us at support@port24av.com.`,
  },
  {
    title: '9. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of material changes by email or by a prominent notice in the platform. Continued use of Port 24 after changes take effect constitutes acceptance of the updated policy.`,
  },
  {
    title: '10. Contact',
    body: `Questions about this Privacy Policy? Contact us at support@port24av.com.`,
  },
];

export default function PrivacyPolicy() {
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
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>Privacy Policy</h1>
        <p style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 48 }}>
          Last updated: July 7, 2026 · Effective: July 7, 2026
        </p>

        <p style={{ color: '#C8D0DC', lineHeight: 1.8, marginBottom: 40, fontSize: 15 }}>
          Port 24 ("we," "us," or "our") operates the Port 24 platform at port24av.com. This Privacy Policy describes how we collect, use, and share information about you when you use our services.
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
