import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import {
  getPlanLimits, canUseFeature, requiredPlanFor,
  canAddUser, canAddAsset, canAddShow, PLANS,
} from '@/lib/planLimits';

export function usePlan() {
  const { orgId } = useAuth();

  const { data: org } = useQuery({
    queryKey: ['org-plan', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from('organizations')
        .select('plan, status')
        .eq('id', orgId)
        .single();
      return data;
    },
    enabled: !!orgId,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const plan     = org?.plan   ?? 'trial';
  const orgStatus = org?.status ?? 'active';
  const limits   = getPlanLimits(plan);

  return {
    plan,
    orgStatus,
    isSuspended: orgStatus === 'suspended',
    planLabel: PLANS[plan]?.label ?? 'Trial',
    limits,

    can:              (featureKey) => canUseFeature(plan, featureKey).allowed,
    check:            (featureKey) => canUseFeature(plan, featureKey),
    requiredPlan:     (featureKey) => requiredPlanFor(featureKey),
    requiredPlanLabel:(featureKey) => PLANS[requiredPlanFor(featureKey)]?.label ?? '',

    canAddUser:  (count) => canAddUser(plan, count),
    canAddAsset: (count) => canAddAsset(plan, count),
    canAddShow:  (count) => canAddShow(plan, count),
  };
}
