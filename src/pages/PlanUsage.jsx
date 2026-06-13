import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { usePlan } from '@/lib/usePlan';
import { PLANS, FEATURE_LABELS, FEATURE_REQUIRED_PLAN } from '@/lib/planLimits';
import { Lock, Check, Zap, Users, Package, CalendarDays, ArrowRight } from 'lucide-react';

const PLAN_ORDER = ['trial', 'starter', 'pro', 'enterprise'];

function UsageBar({ used, limit, label }) {
  const pct = limit ? Math.min((used / limit) * 100, 100) : 0;
  const near = pct >= 80;
  const over = pct >= 100;
  const color = over ? '#EF4444' : near ? '#F59E0B' : '#1FB8A0';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span style={{ color: '#9AA3B0' }}>{label}</span>
        <span style={{ color: over ? '#EF4444' : '#E2E8F0', fontWeight: 500 }}>
          {used} {limit ? `/ ${limit}` : '/ ∞'}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
        {limit && (
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        )}
        {!limit && (
          <div className="h-1.5 rounded-full" style={{ width: '100%', backgroundColor: '#1FB8A0' }} />
        )}
      </div>
    </div>
  );
}

const PLAN_COLORS = {
  trial:      { text: '#9AA3B0', badge: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.12)' },
  starter:    { text: '#93C5FD', badge: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)'  },
  pro:        { text: '#D8B4FE', badge: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)' },
  enterprise: { text: '#FDE68A', badge: 'rgba(234,179,8,0.15)',  border: 'rgba(234,179,8,0.3)'  },
};

export default function PlanUsage() {
  const { orgId } = useAuth();
  const { plan, planLabel, limits } = usePlan();
  const colors = PLAN_COLORS[plan] ?? PLAN_COLORS.trial;

  // Usage counts
  const { data: userCount = 0 } = useQuery({
    queryKey: ['usage-users', orgId],
    queryFn: async () => {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('org_id', orgId);
      return count ?? 0;
    },
    enabled: !!orgId,
  });
  const { data: assetCount = 0 } = useQuery({
    queryKey: ['usage-assets', orgId],
    queryFn: async () => {
      const { count } = await supabase.from('assets').select('*', { count: 'exact', head: true }).eq('org_id', orgId);
      return count ?? 0;
    },
    enabled: !!orgId,
  });
  const { data: showCount = 0 } = useQuery({
    queryKey: ['usage-shows', orgId],
    queryFn: async () => {
      const { count } = await supabase.from('shows').select('*', { count: 'exact', head: true }).eq('org_id', orgId);
      return count ?? 0;
    },
    enabled: !!orgId,
  });

  const featureKeys = Object.keys(FEATURE_LABELS);
  const planIdx = PLAN_ORDER.indexOf(plan);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8 px-4">
      {/* Current plan header */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: '#0D1219', border: `1px solid ${colors.border}` }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: colors.badge, color: colors.text, border: `1px solid ${colors.border}` }}
              >
                <Zap className="w-3 h-3" />
                {planLabel}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-3">Plan &amp; Usage</h1>
            <p className="text-sm mt-1" style={{ color: '#9AA3B0' }}>
              {PLANS[plan]?.price ?? 'Free'} · {planLabel} plan
            </p>
          </div>
          {plan !== 'enterprise' && (
            <a
              href="mailto:support@port24.io?subject=Upgrade%20Plan%20Request"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: '#1FB8A0', color: '#000' }}
            >
              Upgrade plan <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Usage bars */}
        <div className="mt-6 space-y-4">
          <UsageBar used={userCount} limit={limits.users_limit} label="Team members" />
          <UsageBar used={assetCount} limit={limits.assets_limit} label="Assets" />
          <UsageBar used={showCount} limit={limits.shows_limit} label="Projects" />
        </div>
      </div>

      {/* Feature matrix */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4">Features</h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {featureKeys.map((key, i) => {
            const reqPlan = FEATURE_REQUIRED_PLAN[key] ?? 'trial';
            const reqIdx = PLAN_ORDER.indexOf(reqPlan);
            const included = planIdx >= reqIdx;
            const reqColors = PLAN_COLORS[reqPlan] ?? PLAN_COLORS.trial;

            return (
              <div
                key={key}
                className="flex items-center justify-between px-5 py-3.5"
                style={{
                  borderBottom: i < featureKeys.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  backgroundColor: '#0D1219',
                }}
              >
                <div className="flex items-center gap-3">
                  {included
                    ? <Check className="w-4 h-4 shrink-0" style={{ color: '#1FB8A0' }} />
                    : <Lock className="w-4 h-4 shrink-0" style={{ color: '#6B7A92' }} />
                  }
                  <span className="text-sm" style={{ color: included ? '#E2E8F0' : '#6B7A92' }}>
                    {FEATURE_LABELS[key]}
                  </span>
                </div>
                {!included && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: reqColors.badge, color: reqColors.text, border: `1px solid ${reqColors.border}` }}
                  >
                    {PLANS[reqPlan]?.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan comparison strip */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4">All plans</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PLAN_ORDER.map(p => {
            const isCurrent = p === plan;
            const pc = PLAN_COLORS[p];
            return (
              <div
                key={p}
                className="rounded-xl p-4"
                style={{
                  backgroundColor: isCurrent ? pc.badge : '#0D1219',
                  border: `1px solid ${isCurrent ? pc.border : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <p className="text-sm font-semibold" style={{ color: isCurrent ? pc.text : '#E2E8F0' }}>
                  {PLANS[p].label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#9AA3B0' }}>{PLANS[p].price}</p>
                {isCurrent && (
                  <span className="inline-block mt-2 text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: pc.border, color: pc.text }}>
                    Current
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
