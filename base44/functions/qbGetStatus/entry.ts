import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const syncServiceUrl = Deno.env.get('QUICKBOOKS_SYNC_SERVICE_URL');
    if (!syncServiceUrl) {
      return Response.json({
        is_connected: false,
        sync_service_configured: false,
        error: 'QuickBooks Sync Service not configured'
      });
    }

    const companyId = Deno.env.get('BASE44_APP_ID') || 'port24';

    const res = await fetch(`${syncServiceUrl}/quickbooks/status?company_id=${encodeURIComponent(companyId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({
        is_connected: false,
        sync_service_configured: true,
        sync_service_reachable: false,
        error: `Sync service error: ${text}`
      });
    }

    const data = await res.json();

    return Response.json({
      sync_service_configured: true,
      sync_service_reachable: true,
      is_connected: data.is_connected || false,
      company_name: data.company_name || null,
      realm_id: data.realm_id || null,
      last_synced_at: data.last_synced_at || null,
      last_sync_status: data.last_sync_status || null,
      last_sync_error: data.last_sync_error || null,
      sync_service_url: syncServiceUrl,
    });
  } catch (err) {
    console.error('qbGetStatus error:', err);
    return Response.json({
      is_connected: false,
      sync_service_configured: true,
      sync_service_reachable: false,
      error: err.message
    });
  }
});