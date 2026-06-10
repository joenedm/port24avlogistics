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

    if (!invoice.quickbooks_invoice_id) {
      return Response.json({ error: 'Invoice has not been synced to QuickBooks yet' }, { status: 400 });
    }

    const companyId = Deno.env.get('BASE44_APP_ID') || 'port24';

    const res = await fetch(`${syncServiceUrl}/quickbooks/pull-invoice-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId,
        invoice_id: invoice.id,
        quickbooks_invoice_id: invoice.quickbooks_invoice_id,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`QB Sync Service error: ${error}`);
    }

    const data = await res.json();

    // Determine new invoice status from QB data
    const balanceDue = data.balance || 0;
    const amountPaid = data.amount_paid || 0;
    const total = data.total || invoice.total || 0;
    const dueDate = data.due_date || invoice.due_date;
    const isOverdue = dueDate && new Date(dueDate) < new Date() && balanceDue > 0;

    let newStatus = invoice.status;
    if (balanceDue <= 0 && total > 0) {
      newStatus = 'paid';
    } else if (amountPaid > 0 && balanceDue > 0) {
      newStatus = 'partially_paid';
    } else if (isOverdue) {
      newStatus = 'overdue';
    }

    await base44.entities.Invoice.update(invoice_id, {
      amount_paid: amountPaid,
      amount_due: balanceDue,
      total: total,
      due_date: dueDate,
      status: newStatus,
      quickbooks_sync_status: 'synced',
      quickbooks_sync_error: null,
      last_quickbooks_sync_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      status: newStatus,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      total: total,
    });
  } catch (err) {
    console.error('qbPullInvoiceStatus error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});