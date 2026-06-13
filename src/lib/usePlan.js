import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import {
  getPlanLimits, canUseFeature, requiredPlanFor,
  canAddUser, canAddAsset, canAddShow, PLANS,
} from '@/lib/planLimits';

/**
 * usePlan — loads the org's current plan and exposes feature/limit helpers.
 *
 * Usage:
 *   const { plan, can, requiredPlan, limits } = usePlan();
 *   if (!can('crew_management')) showUpgrade();
 */
export function usePlan() {
  const { orgId } = useAuth();

  const { data: org } = useQuery({
    queryKey: ['org-plan', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from('organizations')
        .select('plan, plan_status, trial_ends_at')
        .eq('id', orgId)
        .single();
      return data;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const plan = org?.plan ?? 'trial';
  const planStatus = org?.plan_status ?? 'active';
  const limits = getPlanLimits(plan);

  return {
    plan,
    planStatus,
    planLabel: PLANS[plan]?.label ?? 'Trial',
    limits,

    /** True if the current plan includes featureKey */
    can: (featureKey) => canUseFeature(plan, featureKey).allowed,

    /** Full result object: { allowed, current_plan, required_plan, reason, upgrade_message } */
    check: (featureKey) => canUseFeature(plan, featureKey),

    /** The minimum plan name string required for a feature */
    requiredPlan: (featureKey) => requiredPlanFor(featureKey),

    /** The minimum plan label (e.g. "Pro") required for a feature */
    requiredPlanLabel: (featureKey) => PLANS[requiredPlanFor(featureKey)]?.label ?? '',

    // Usage limit helpers (pass in current counts)
    canAddUser:  (count) => canAddUser(plan, count),
    canAddAsset: (count) => canAddAsset(plan, count),
    canAddShow:  (count) => canAddShow(plan, count),
  };
}
