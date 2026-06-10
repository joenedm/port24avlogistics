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
      return Response.json(
        { error: 'QUICKBOOKS_SYNC_SERVICE_URL not configured. Add this in Base44 Settings → Secrets.' },
        { status: 500 }
      );
    }

    const returnUrl = 'https://port24avlogistics.online/admin?tab=accounting';
    const companyId = Deno.env.get('BASE44_APP_ID') || 'port24';

    const connectUrl = `${syncServiceUrl}/quickbooks/connect?company_id=${encodeURIComponent(companyId)}&return_url=${encodeURIComponent(returnUrl)}`;

    return Response.json({ connect_url: connectUrl });
  } catch (err) {
    console.error('qbGetConnectURL error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});