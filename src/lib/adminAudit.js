import { supabase } from '@/api/supabaseClient';

/**
 * Write one row to admin_audit_log.
 * Fire-and-forget — never throws, so callers don't need try/catch.
 *
 * @param {object} opts
 * @param {string} opts.action      e.g. 'plan_changed', 'org_suspended', 'user_role_changed'
 * @param {string} [opts.orgId]     target organization UUID
 * @param {string} [opts.userId]    target user UUID
 * @param {*}      [opts.oldValue]  previous value (coerced to string)
 * @param {*}      [opts.newValue]  new value (coerced to string)
 * @param {object} [opts.metadata]  any extra context (JSONB)
 */
export async function logAdminAction({ action, orgId, userId, oldValue, newValue, metadata } = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('admin_audit_log').insert({
      action,
      target_org_id:  orgId  ?? null,
      target_user_id: userId ?? null,
      changed_by_id:  user.id,
      old_value: oldValue != null ? String(oldValue) : null,
      new_value: newValue != null ? String(newValue) : null,
      metadata:  metadata ?? null,
    });
  } catch (err) {
    console.warn('[Audit] Failed to log admin action:', action, err);
  }
}
