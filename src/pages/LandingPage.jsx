import React from 'react';
import { base44 } from '@/api/base44Client';
import {
  CalendarDays, Package, Users, FileText,
  ScanBarcode, BarChart3, Layers, Shield,
  ChevronRight, ArrowRight, Cpu, Network } from 'lucide-react';

const T = '#1FB8A0';
const T_DIM = '#17907C';
const C = '#3DC9C0';
const BG = '#0E1117';
const CARD = '#131920';
const CARD2 = '#0B0F18';
const BORDER = 'rgba(31,184,160,0.15)';
const BORDER_DIM = 'rgba(255,255,255,0.06)';
const TEXT_MUTED = '#7B8EA8';

const HERO_IMAGE = 'https://media.base44.com/images/public/69d5151f0495918d567d1066/f432b4024_ChatGPTImageApr21202611_55_27AM.png';

function Port24BracketIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h10v4H8v8H4V4z" fill="#3DC9C0"/>
      <path d="M36 4h-10v4h8v8h4V4z" fill="#1FB8A0"/>
      <path d="M4 36h10v-4H8v-8H4V36z" fill="#3DC9C0"/>
      <path d="M36 36h-10v-4h8v-8h4V36z" fill="#1FB8A0"/>
    </svg>
  );
}

function Port24Wordmark({ size = 'md' }) {
  const iconSize = size === 'sm' ? 18 : 24;
  const textStyle = {
    fontFamily: 'Inter, sans-serif',
    letterSpacing: '0.12em',
    fontWeight: 700,
    fontSize: size === 'sm' ? '0.75rem' : '0.95rem',
    color: '#3DC9C0',
  };
  return (
    <div className="flex items-center gap-2">
      <Port24BracketIcon size={iconSize} />
      <span style={textStyle}>PORT <span style={{ color: '#1FB8A0' }}>24</span></span>
    </div>
  );
}

const MODULES = [
  { icon: CalendarDays, title: 'Show Management', desc: 'Plan, schedule, and execute every production from first call to final strike.' },
  { icon: Package, title: 'Inventory Control', desc: 'QR-tracked assets, serialized kits, and real-time availability across all shows.' },
  { icon: Users, title: 'Crew Operations', desc: 'Book crew, assign roles, send confirmations, and track hours — no back-and-forth.' },
  { icon: FileText, title: 'Quotes & Invoices', desc: 'Build polished proposals, convert to invoices, and close deals faster.' },
  { icon: ScanBarcode, title: 'Scan & Check-out', desc: 'Mobile-ready barcode scanning for fast, accurate gear check-out and returns.' },
  { icon: BarChart3, title: 'Mission Control', desc: 'Operational visibility across all active shows — revenue, crew, and equipment at a glance.' },
];

const PILLARS = [
  { icon: Cpu, title: 'Built for production', desc: 'Every module maps to how live AV, events, and broadcast teams actually operate.' },
  { icon: Layers, title: 'One platform, no silos', desc: 'Inventory, crew, documents, and finance all connected — nothing falls through the cracks.' },
  { icon: Shield, title: 'Role-based by design', desc: 'Admin, director, manager, coordinator, and crew each see exactly what they need.' },
];

export default function LandingPage() {
  // Check if this is an invite link (Base44 passes invite params in the URL)
  const urlParams = new URLSearchParams(window.location.search);
  const hasInvite = urlParams.has('invite_token') || urlParams.has('token') || urlParams.has('invite');

  // If arriving via invite link, go directly to the platform login/account setup
  if (hasInvite) {
    window.location.href = '/signin';
    return null;
  }

  const handleSignIn = () => { window.location.href = '/signin'; };

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ backgroundColor: BG, fontFamily: 'Inter, sans-serif' }}>

      {/* ── Nav ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{ borderBottom: `1px solid ${BORDER_DIM}`, backgroundColor: 'rgba(14,17,23,0.75)', backdropFilter: 'blur(16px)' }}
      >
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <Port24Wordmark />
          <nav className="hidden md:flex items-center gap-8">
            {['Platform', 'Modules', 'Workflow'].map(label => (
              <span key={label} className="text-sm cursor-default select-none transition-colors" style={{ color: TEXT_MUTED }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}
              >{label}</span>
            ))}
          </nav>
          <button
            onClick={handleSignIn}
            className="font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            style={{ backgroundColor: T, color: BG }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = T_DIM}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = T}
          >
            Sign In
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Full-bleed background image */}
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="Port 24 Platform"
            className="w-full h-full object-cover object-center"
            style={{ opacity: 0.55 }}
          />
          {/* Heavy left fade so text is legible */}
          <div className="absolute inset-0" style={{
            background: `linear-gradient(100deg, ${BG} 0%, ${BG} 35%, rgba(14,17,23,0.88) 55%, rgba(14,17,23,0.3) 100%)`
          }} />
          {/* Bottom fade into next section */}
          <div className="absolute bottom-0 left-0 right-0 h-40" style={{ background: `linear-gradient(to top, ${BG}, transparent)` }} />
          {/* Top fade behind nav */}
          <div className="absolute top-0 left-0 right-0 h-28" style={{ background: `linear-gradient(to bottom, rgba(14,17,23,0.9), transparent)` }} />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full px-8 sm:px-12 lg:px-20 pt-28 pb-24">
          <div className="max-w-2xl">

            {/* Eyebrow */}
            <div
              className="inline-flex items-center gap-2 border rounded-full px-4 py-1.5 text-xs font-semibold mb-8 tracking-widest uppercase"
              style={{ borderColor: BORDER, backgroundColor: 'rgba(31,184,160,0.1)', color: C }}
            >
              <Network className="w-3 h-3" />
              Live Production Platform
            </div>

            {/* Headline */}
            <h1 className="font-extrabold leading-[1.06] tracking-tight text-white mb-6" style={{ fontSize: 'clamp(2.8rem, 5.5vw, 4.5rem)' }}>
              Run every part<br />of production.<br />
              <span style={{ color: T }}>From one place.</span>
            </h1>

            <p className="text-lg leading-relaxed mb-10" style={{ color: TEXT_MUTED, maxWidth: '480px' }}>
              Projects, inventory, crew, quotes, and workflow — one powerful platform built for production teams.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3">
              <button
                onClick={handleSignIn}
                className="inline-flex items-center gap-2 font-semibold px-8 py-4 rounded-xl text-sm transition-colors"
                style={{ backgroundColor: T, color: BG, boxShadow: '0 8px 40px rgba(31,184,160,0.3)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = T_DIM}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = T}
              >
                Sign In to Your Workspace
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-10 mt-14 pt-8 border-t" style={{ borderColor: BORDER_DIM }}>
              {[
                { val: '6', label: 'Core modules' },
                { val: 'Real-time', label: 'Mission Control' },
                { val: 'QR', label: 'Asset tracking' },
              ].map(({ val, label }) => (
                <div key={label}>
                  <p className="text-xl font-bold text-white">{val}</p>
                  <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Modules ── */}
      <section className="py-24 px-8" style={{ backgroundColor: CARD2 }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: C }}>Platform</p>
            <h2 className="text-3xl font-bold mb-3 text-white">Everything your operation needs</h2>
            <p className="text-base" style={{ color: TEXT_MUTED }}>Six core systems. One platform. Built for how live production teams work.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl p-6 border transition-all cursor-default"
                style={{ backgroundColor: CARD, borderColor: BORDER_DIM }}
                onMouseEnter={e => e.currentTarget.style.borderColor = BORDER}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER_DIM}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(31,184,160,0.1)', border: '1px solid rgba(31,184,160,0.2)' }}>
                  <Icon className="w-5 h-5" style={{ color: T }} />
                </div>
                <h3 className="font-semibold text-white mb-1.5 text-sm">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Port 24 ── */}
      <section className="py-24 px-8" style={{ backgroundColor: BG }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: C }}>Why Port 24</p>
            <h2 className="text-3xl font-bold mb-3 text-white">Built for production companies that can't afford loose ends</h2>
            <p className="text-base" style={{ color: TEXT_MUTED }}>Stop juggling tools. Start running tighter shows.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PILLARS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: CARD, border: '1px solid rgba(31,184,160,0.15)' }}>
                  <Icon className="w-5 h-5" style={{ color: T }} />
                </div>
                <h3 className="font-semibold text-white mb-2 text-sm">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission Control callout ── */}
      <section className="py-20 px-8" style={{ backgroundColor: CARD2 }}>
        <div className="max-w-6xl mx-auto">
          <div
            className="rounded-2xl p-10 border flex flex-col md:flex-row items-start md:items-center gap-8"
            style={{ backgroundColor: CARD, borderColor: BORDER }}
          >
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(31,184,160,0.12)', border: '1px solid rgba(31,184,160,0.25)' }}>
                <Cpu className="w-7 h-7" style={{ color: T }} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">Mission Control</h3>
              <p style={{ color: TEXT_MUTED }} className="text-sm leading-relaxed">
                A real-time operational dashboard across all active shows. See every crew member, piece of equipment, active quote, and revenue metric — from one screen. Built for production directors who need to stay ahead of every moving part.
              </p>
            </div>
            <button
              onClick={handleSignIn}
              className="flex-shrink-0 inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
              style={{ backgroundColor: T, color: BG }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = T_DIM}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = T}
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-8" style={{ backgroundColor: BG }}>
        <div className="max-w-2xl mx-auto text-center rounded-2xl p-14 border"
          style={{ background: `linear-gradient(135deg, rgba(31,184,160,0.08) 0%, ${CARD} 100%)`, borderColor: BORDER }}>
          <h2 className="text-3xl font-bold mb-3 text-white">Ready to run tighter productions?</h2>
          <p className="mb-8 text-sm" style={{ color: TEXT_MUTED }}>
            Sign in to your Port 24 workspace and get back to what matters — the show.
          </p>
          <button
            onClick={handleSignIn}
            className="inline-flex items-center gap-2 font-semibold px-8 py-3.5 rounded-xl text-base transition-colors"
            style={{ backgroundColor: T, color: BG, boxShadow: '0 8px 32px rgba(31,184,160,0.2)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = T_DIM}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = T}
          >
            Sign In <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 text-center border-t" style={{ borderColor: BORDER_DIM }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Port24Wordmark size="sm" />
        </div>
        <p className="text-xs mt-2" style={{ color: '#4A5568' }}>The all-in-one platform for live production.</p>
      </footer>

    </div>
  );
}