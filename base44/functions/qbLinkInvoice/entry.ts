import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { invoice_id, quickbooks_invoice_id } = body;

    if (!invoice_id || !quickbooks_invoice_id) {
      return Response.json({ error: 'Missing invoice_id or quickbooks_invoice_id' }, { status: 400 });
    }

    const syncServiceUrl = Deno.env.get('QUICKBOOKS_SYNC_SERVICE_URL');
    if (!syncServiceUrl) {
      return Response.json({ error: 'QUICKBOOKS_SYNC_SERVICE_URL not configured' }, { status: 500 });
    }

    const companyId = Deno.env.get('BASE44_APP_ID') || 'port24';

    const res = await fetch(`${syncServiceUrl}/quickbooks/link-existing-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, invoice_id, quickbooks_invoice_id }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`QB Sync Service error: ${error}`);
    }

    const data = await res.json();

    await base44.entities.Invoice.update(invoice_id, {
      quickbooks_invoice_id: data.quickbooks_invoice_id || quickbooks_invoice_id,
      quickbooks_customer_id: data.quickbooks_customer_id || null,
      quickbooks_invoice_number: data.quickbooks_invoice_number || null,
      quickbooks_invoice_url: data.quickbooks_invoice_url || null,
      quickbooks_sync_status: 'synced',
      quickbooks_sync_error: null,
      last_quickbooks_sync_at: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('qbLinkInvoice error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});