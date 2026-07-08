import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const QB_API_BASE = 'https://quickbooks.api.intuit.com/v3/company';
export const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
export const QB_MINOR_VERSION = '65';

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 500) {
  return jsonResponse({ error: message }, status);
}

export function makeAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

export async function getOrgIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;

  const adminClient = makeAdminClient();
  const { data: userRecord } = await adminClient
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single();

  return userRecord?.org_id ?? null;
}

export async function getConnection(adminClient: SupabaseClient, orgId: string) {
  const { data } = await adminClient
    .from('quickbooks_connections')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

export async function refreshTokenIfNeeded(
  adminClient: SupabaseClient,
  conn: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!conn.token_expires_at) return conn;

  const expiresAt = new Date(conn.token_expires_at as string).getTime();
  if (expiresAt - Date.now() > 5 * 60 * 1000) return conn;

  const clientId = Deno.env.get('INTUIT_CLIENT_ID')!;
  const clientSecret = Deno.env.get('INTUIT_CLIENT_SECRET')!;
  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(QB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token as string,
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);

  const tokens = await res.json();
  const updated = {
    ...conn,
    access_token: tokens.access_token as string,
    refresh_token: (tokens.refresh_token ?? conn.refresh_token) as string,
    token_expires_at: new Date(Date.now() + (tokens.expires_in as number) * 1000).toISOString(),
  };

  await adminClient
    .from('quickbooks_connections')
    .update({
      access_token: updated.access_token,
      refresh_token: updated.refresh_token,
      token_expires_at: updated.token_expires_at,
    })
    .eq('id', conn.id as string);

  return updated;
}

export async function callQBAPI(
  conn: Record<string, unknown>,
  method: string,
  endpoint: string,
  body?: unknown
): Promise<Record<string, unknown>> {
  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `${QB_API_BASE}/${conn.realm_id}/${endpoint}${sep}minorversion=${QB_MINOR_VERSION}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${conn.access_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`QB API ${res.status}: ${errText}`);
  }

  return res.json();
}

export async function createOrUpdateCustomer(
  conn: Record<string, unknown>,
  invoice: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const clientName = ((invoice.client as string) || 'Unknown Client').replace(/'/g, "\\'");

  const searchRes = await callQBAPI(
    conn,
    'GET',
    `query?query=${encodeURIComponent(`SELECT * FROM Customer WHERE DisplayName = '${clientName}'`)}`
  );

  const existing = (searchRes.QueryResponse as Record<string, unknown>)?.Customer;
  if (Array.isArray(existing) && existing.length > 0) {
    return existing[0] as Record<string, unknown>;
  }

  const createRes = await callQBAPI(conn, 'POST', 'customer', {
    DisplayName: invoice.client || 'Unknown Client',
    PrimaryEmailAddr: { Address: invoice.client_email || 'noreply@example.com' },
  });

  return (createRes.Customer ?? createRes) as Record<string, unknown>;
}

export async function markInvoiceError(
  adminClient: SupabaseClient,
  invoiceId: string,
  message: string
) {
  await adminClient
    .from('invoices')
    .update({
      quickbooks_sync_status: 'error',
      quickbooks_sync_error: message,
      last_quickbooks_sync_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);
}
