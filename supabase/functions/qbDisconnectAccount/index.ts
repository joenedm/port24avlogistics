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

    if (conn) {
      await adminClient
        .from('quickbooks_connections')
        .update({
          realm_id: null,
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
          company_name: null,
          connected_at: null,
        })
        .eq('org_id', orgId);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse(err.message);
  }
});
