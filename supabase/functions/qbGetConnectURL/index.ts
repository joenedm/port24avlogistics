import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, jsonResponse, errorResponse,
  getOrgIdFromRequest,
} from '../_shared/qbHelpers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return errorResponse('Unauthorized', 401);

    const clientId = Deno.env.get('INTUIT_CLIENT_ID');
    if (!clientId) return errorResponse('QuickBooks not configured: missing INTUIT_CLIENT_ID', 500);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const callbackUrl = `${supabaseUrl}/functions/v1/qbOAuthCallback`;
    const state = btoa(JSON.stringify({ org_id: orgId }));

    const url = new URL('https://appcenter.intuit.com/connect/oauth2');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'com.intuit.quickbooks.accounting');
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('state', state);

    return jsonResponse({ connect_url: url.toString() });
  } catch (err) {
    return errorResponse(err.message);
  }
});
