import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const syncServiceUrl = Deno.env.get('QUICKBOOKS_SYNC_SERVICE_URL');
    if (!syncServiceUrl) {
      return Response.json({ error: 'QUICKBOOKS_SYNC_SERVICE_URL not configured' }, { status: 500 });
    }

    const companyId = Deno.env.get('BASE44_APP_ID') || 'port24';

    const res = await fetch(`${syncServiceUrl}/quickbooks/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Sync service error: ${error}`);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('qbDisconnectAccount error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});