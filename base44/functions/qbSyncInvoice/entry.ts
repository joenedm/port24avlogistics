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

    if (!invoice_id) {
      return Response.json({ error: 'Missing invoice_id' }, { status: 400 });
    }

    const syncServiceUrl = Deno.env.get('QUICKBOOKS_SYNC_SERVICE_URL');
    if (!syncServiceUrl) {
      return Response.json({ error: 'QUICKBOOKS_SYNC_SERVICE_URL not configured' }, { status: 500 });
    }

    const invoices = await base44.entities.Invoice.filter({ id: invoice_id });
    if (!invoices.length) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const invoice = invoices[0];

    const companyId = Deno.env.get('BASE44_APP_ID') || 'port24';

    // Mark as pending sync immediately
    await base44.entities.Invoice.update(invoice_id, {
      quickbooks_sync_status: 'pending',
    });

    // Build the payload — only client-visible data, no internal costs
    const payload = {
      company_id: companyId,
      invoice: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        client: invoice.client,
        client_email: invoice.client_email,
        client_address: invoice.client_address,
        billing_contact_name: invoice.billing_contact_name,
        show_name: invoice.show_name,
        project_date_start: invoice.project_date_start,
        project_date_end: invoice.project_date_end,
        venue_name: invoice.venue_name,
        due_date: invoice.due_date,
        issue_date: invoice.issue_date,
        payment_terms: invoice.payment_terms,
        po_number: invoice.po_number,
        line_items: (invoice.line_items || []).map(li => ({
          id: li.id,
          name: li.name,
          description: li.description,
          quantity: li.quantity,
          days: li.days,
          unit_price: li.unit_price,
          total: li.total,
          group_name: li.group_name,
        })),
        subtotal: invoice.subtotal,
        discount_pct: invoice.discount_pct,
        discount_amount: invoice.discount_amount,
        tax_pct: invoice.tax_pct,
        tax_amount: invoice.tax_amount,
        total: invoice.total,
        client_visible_notes: invoice.client_visible_notes,
        terms_and_conditions: invoice.terms_and_conditions,
        // Existing QB IDs if re-syncing
        quickbooks_customer_id: invoice.quickbooks_customer_id || null,
        quickbooks_invoice_id: invoice.quickbooks_invoice_id || null,
      },
    };

    const res = await fetch(`${syncServiceUrl}/quickbooks/sync-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.text();
      await base44.entities.Invoice.update(invoice_id, {
        quickbooks_sync_status: 'error',
        quickbooks_sync_error: error,
      });
      throw new Error(`QB Sync Service error: ${error}`);
    }

    const data = await res.json();

    // Store QB IDs and mark synced
    await base44.entities.Invoice.update(invoice_id, {
      quickbooks_customer_id: data.quickbooks_customer_id,
      quickbooks_invoice_id: data.quickbooks_invoice_id,
      quickbooks_invoice_number: data.quickbooks_invoice_number,
      quickbooks_invoice_url: data.quickbooks_invoice_url || null,
      quickbooks_sync_status: 'synced',
      quickbooks_sync_error: null,
      last_quickbooks_sync_at: new Date().toISOString(),
      status: 'sent',
    });

    return Response.json({ success: true, data });
  } catch (err) {
    console.error('qbSyncInvoice error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});