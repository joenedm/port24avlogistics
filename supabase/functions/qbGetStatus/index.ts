import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, jsonResponse, errorResponse,
  makeAdminClient, getOrgIdFromRequest, getConnection,
} from '../_shared/qbHelpers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return errorResponse('Unauthorized', 401);

    const adminClient = makeAdminClient();
    const conn = await getConnection(adminClient, orgId);
    const clientId = Deno.env.get('INTUIT_CLIENT_ID');

    return jsonResponse({
      is_connected: !!(conn?.realm_id),
      company_name: conn?.company_name ?? null,
      realm_id: conn?.realm_id ?? null,
      connected_at: conn?.connected_at ?? null,
      last_synced_at: conn?.last_sync_at ?? null,
      last_sync_status: conn?.last_sync_status ?? null,
      last_sync_error: conn?.last_sync_error ?? null,
      sync_service_configured: !!clientId,
      sync_service_reachable: !!clientId,
    });
  } catch (err) {
    return errorResponse(err.message);
  }
});
