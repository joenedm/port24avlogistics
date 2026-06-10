import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const bodyText = await req.text();
    const payload = JSON.parse(bodyText);
    const base44 = createClientFromRequest(req);
    const notifications = payload?.eventNotifications || [];

    for (const notification of notifications) {
      const entities = notification?.dataChangeEvent?.entities || [];
      for (const entity of entities) {
        const { name, id, operation } = entity;

        if (name === 'Invoice') {
          const invoices = await base44.asServiceRole.entities.Invoice.filter({ quickbooks_invoice_id: id });
          for (const inv of invoices) {
            if (operation === 'Delete' || operation === 'Void' || operation === 'Update') {
              await base44.asServiceRole.entities.Invoice.update(inv.id, {
                qb_sync_status: 'needs_review',
                qb_sync_error: `QB Invoice was ${operation.toLowerCase()}d in QuickBooks — review required`,
              });
            }
          }
        }

        if (name === 'Customer' && operation === 'Update') {
          const clients = await base44.asServiceRole.entities.Client.filter({ quickbooks_customer_id: id });
          for (const client of clients) {
            await base44.asServiceRole.entities.Client.update(client.id, { qb_customer_sync_status: 'needs_review' });
          }
        }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (e) {
    console.error('QB webhook error:', e.message);
    return new Response('OK', { status: 200 }); // Always 200 to QB
  }
});