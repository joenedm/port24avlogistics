import React from 'react';
import { Lock, ArrowRight, X, Zap } from 'lucide-react';
import { PLANS, FEATURE_LABELS } from '@/lib/planLimits';

const PLAN_COLORS = {
  starter:    { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)',  text: '#93C5FD', badge: '#3B82F6' },
  pro:        { bg: 'rgba(168,85,247,0.1)',  border: 'rgba(168,85,247,0.3)', text: '#D8B4FE', badge: '#A855F7' },
  enterprise: { bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.3)',  text: '#FDE68A', badge: '#EAB308' },
};

/**
 * UpgradeModal
 *
 * Props:
 *   open         — boolean
 *   onClose      — () => void
 *   featureKey   — string (from FEATURE_REQUIRED_PLAN keys)
 *   requiredPlan — string ('starter' | 'pro' | 'enterprise')
 *   message      — optional override message
 */
export default function UpgradeModal({ open, onClose, featureKey, requiredPlan, message }) {
  if (!open) return null;

  const planKey = requiredPlan ?? 'starter';
  const planInfo = PLANS[planKey] ?? PLANS.starter;
  const colors = PLAN_COLORS[planKey] ?? PLAN_COLORS.starter;
  const featureLabel = FEATURE_LABELS[featureKey] ?? featureKey ?? 'This feature';
  const isEnterprise = planKey === 'enterprise';

  const defaultMessage = message ?? (
    isEnterprise
      ? `${featureLabel} is available on Enterprise. Contact Port 24 to enable Enterprise features.`
      : `${featureLabel} is available on ${planInfo.label}. Upgrade your plan to access this feature.`
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-7"
        style={{ backgroundColor: '#0D1219', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: '#6B7A92' }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lock icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
          style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
        >
          <Lock className="w-5 h-5" style={{ color: colors.text }} />
        </div>

        {/* Plan badge */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
          >
            <Zap className="w-3 h-3" />
            {planInfo.label}
          </span>
        </div>

        <h2 className="text-lg font-bold text-white mb-2">
          {featureLabel}
        </h2>
        <p className="text-sm mb-6" style={{ color: '#9AA3B0', lineHeight: '1.6' }}>
          {defaultMessage}
        </p>

        {/* What's included in the plan */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: colors.text }}>
            {planInfo.label} Plan — {planInfo.price}
          </p>
          <p className="text-xs" style={{ color: '#9AA3B0' }}>
            {planKey === 'starter' && 'Core project management, inventory, QR scanning, quotes & invoices.'}
            {planKey === 'pro' && 'Everything in Starter plus crew management, AV Hospital, yearly reviews, and financial reports.'}
            {planKey === 'enterprise' && 'Everything in Pro plus API integrations, advanced automations, and priority support.'}
          </p>
        </div>

        {/* CTA */}
        {isEnterprise ? (
          <a
            href="mailto:support@port24.io?subject=Enterprise%20Plan%20Inquiry"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ backgroundColor: colors.badge, color: '#000' }}
          >
            Contact Port 24 <ArrowRight className="w-4 h-4" />
          </a>
        ) : (
          <a
            href="mailto:support@port24.io?subject=Upgrade%20Plan%20Request"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ backgroundColor: '#1FB8A0', color: '#000' }}
          >
            Upgrade to {planInfo.label} <ArrowRight className="w-4 h-4" />
          </a>
        )}

        <p className="text-center text-xs mt-3" style={{ color: '#6B7A92' }}>
          Contact your Port 24 admin or{' '}
          <a href="mailto:support@port24.io" className="underline">support@port24.io</a>
        </p>
      </div>
    </div>
  );
}
