import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import {
  getPlanLimits, canUseFeature, requiredPlanFor,
  canAddUser, canAddAsset, canAddShow, PLANS,
} from '@/lib/planLimits';

/**
 * usePlan — loads the org's current plan and exposes feature/limit helpers.
 *
 * Also subscribes to Supabase Realtime on the organizations row so that
 * plan changes and suspensions pushed by a platform admin propagate to the
 * active session within seconds rather than waiting for the cache to expire.
 *
 * NOTE: for Realtime to deliver postgres_changes, the `organizations` table
 * must be added to the Supabase Realtime publication in the Dashboard
 * (Database → Replication → Tables in publication).
 */
export function usePlan() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

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
    refetchInterval: 30 * 1000, // guaranteed fallback if Realtime misses an event
  });

  // Realtime: invalidate whenever the org row changes (plan upgrade, suspension, etc.)
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`org-plan-${orgId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'organizations',
        filter: `id=eq.${orgId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['org-plan', orgId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, queryClient]);

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
