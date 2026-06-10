import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { invoice_id } = body;

    const syncServiceUrl = Deno.env.get('QUICKBOOKS_SYNC_SERVICE_URL');
    if (!syncServiceUrl) {
      return Response.json({ error: 'QUICKBOOKS_SYNC_SERVICE_URL not configured' }, { status: 500 });
    }

    const companyId = Deno.env.get('BASE44_APP_ID') || 'port24';

    // If invoice_id provided, pull for that specific invoice
    let quickbooks_invoice_id = null;
    if (invoice_id) {
      const invoices = await base44.entities.Invoice.filter({ id: invoice_id });
      if (invoices.length && invoices[0].quickbooks_invoice_id) {
        quickbooks_invoice_id = invoices[0].quickbooks_invoice_id;
      }
    }

    const res = await fetch(`${syncServiceUrl}/quickbooks/pull-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId,
        invoice_id: invoice_id || null,
        quickbooks_invoice_id: quickbooks_invoice_id || null,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`QB Sync Service error: ${error}`);
    }

    const data = await res.json();
    let imported = 0;

    // Store payment records as QB-synced references
    for (const payment of data.payments || []) {
      const matchInvoices = await base44.entities.Invoice.filter({
        quickbooks_invoice_id: payment.quickbooks_invoice_id,
      });

      if (matchInvoices.length > 0) {
        const inv = matchInvoices[0];

        // Check if payment already recorded
        const existing = await base44.entities.Payment.filter({
          invoice_id: inv.id,
          source_payment_id: payment.quickbooks_payment_id,
        });

        if (existing.length === 0) {
          await base44.entities.Payment.create({
            invoice_id: inv.id,
            show_id: inv.show_id || null,
            client_id: inv.client_id || null,
            amount: payment.amount,
            payment_date: payment.payment_date,
            payment_method: payment.payment_method || 'quickbooks',
            source_provider: 'quickbooks',
            source_payment_id: payment.quickbooks_payment_id,
            source_invoice_id: payment.quickbooks_invoice_id,
            reference_number: payment.reference_number || null,
            status: 'completed',
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          });
          imported++;
        }
      }
    }

    return Response.json({ success: true, payments_imported: imported, total_found: (data.payments || []).length });
  } catch (err) {
    console.error('qbPullPayments error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});