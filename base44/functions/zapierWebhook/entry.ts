import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    // Validate request origin/signature (optional but recommended)
    const webhookSecret = Deno.env.get('ZAPIER_WEBHOOK_SECRET');
    if (webhookSecret) {
      const signature = req.headers.get('x-zapier-webhook-signature');
      if (!signature || signature !== webhookSecret) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const { event_type, data } = body;

    if (!event_type || !data) {
      return Response.json({ error: 'Missing event_type or data' }, { status: 400 });
    }

    // Route based on event type
    if (event_type === 'invoice.created' || event_type === 'invoice.updated') {
      await handleInvoiceEvent(base44, data);
    } else if (event_type === 'payment.created' || event_type === 'payment.updated') {
      await handlePaymentEvent(base44, data);
    } else if (event_type === 'customer.created' || event_type === 'customer.updated') {
      await handleCustomerEvent(base44, data);
    }

    return Response.json({ success: true, event: event_type });
  } catch (err) {
    console.error('Zapier webhook error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});

async function handleInvoiceEvent(base44, data) {
  const { qb_invoice_id, client_name, total, status } = data;
  
  // Find matching invoice and update QB sync fields
  const invoices = await base44.entities.Invoice.filter({ client: client_name });
  if (invoices.length > 0) {
    const invoice = invoices[0];
    await base44.entities.Invoice.update(invoice.id, {
      quickbooks_invoice_id: qb_invoice_id,
      qb_payment_status: 'synced',
      qb_last_synced_at: new Date().toISOString(),
    });
  }
}

async function handlePaymentEvent(base44, data) {
  const { qb_payment_id, invoice_id, amount, payment_date } = data;
  
  // Record payment in Payment entity
  const invoice = await base44.entities.Invoice.filter({ quickbooks_invoice_id: invoice_id });
  if (invoice.length > 0) {
    await base44.entities.Payment.create({
      invoice_id: invoice[0].id,
      amount,
      payment_date,
      payment_method: 'quickbooks',
      source_provider: 'quickbooks',
      source_payment_id: qb_payment_id,
      status: 'completed',
      sync_status: 'synced',
    });
  }
}

async function handleCustomerEvent(base44, data) {
  const { qb_customer_id, company_name } = data;
  
  // Find matching client and update QB sync status
  const clients = await base44.entities.Client.filter({ company_name });
  if (clients.length > 0) {
    await base44.entities.Client.update(clients[0].id, {
      quickbooks_customer_id: qb_customer_id,
      qb_customer_sync_status: 'synced',
    });
  }
}