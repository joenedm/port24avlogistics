import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function getToken(base44, conn) {
  const now = new Date();
  if (conn.token_expires_at && new Date(conn.token_expires_at) > now) {
    return conn.access_token_enc;
  }
  const clientId = Deno.env.get('QB_CLIENT_ID');
  const clientSecret = Deno.env.get('QB_CLIENT_SECRET');
  const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refresh_token_enc }),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  const tokens = await res.json();
  await base44.asServiceRole.entities.QuickBooksConnection.update(conn.id, {
    access_token_enc: tokens.access_token,
    refresh_token_enc: tokens.refresh_token || conn.refresh_token_enc,
    token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
  });
  return tokens.access_token;
}

async function qbPost(path, body, token, realmId) {
  const res = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}${path}?minorversion=65`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const scope = body.scope || 'all';
  const invoiceId = body.invoice_id || null;

  const connections = await base44.asServiceRole.entities.QuickBooksConnection.list();
  if (!connections.length || !connections[0].is_connected) {
    return Response.json({ error: 'QuickBooks not connected' }, { status: 400 });
  }

  const conn = connections[0];
  const token = await getToken(base44, conn);
  const realmId = conn.realm_id;
  const report = { customers_synced: 0, invoices_synced: 0, errors: [] };

  // Sync customers
  if (scope === 'all' || scope === 'customers') {
    const clients = await base44.asServiceRole.entities.Client.list();
    for (const client of clients) {
      const name = client.display_name || client.company_name;
      if (!name) continue;
      try {
        if (!client.quickbooks_customer_id) {
          const res = await qbPost('/customer', {
            DisplayName: name,
            CompanyName: client.company_name,
            PrimaryEmailAddr: client.billing_email ? { Address: client.billing_email } : undefined,
          }, token, realmId);
          if (res.Customer?.Id) {
            await base44.asServiceRole.entities.Client.update(client.id, {
              quickbooks_customer_id: res.Customer.Id,
              qb_customer_sync_status: 'synced',
            });
          }
          report.customers_synced++;
        }
      } catch (e) {
        report.errors.push(`Client ${name}: ${e.message}`);
      }
    }
  }

  // Sync invoices
  if (scope === 'all' || scope === 'invoices') {
    const invoiceFilter = invoiceId
      ? [await base44.asServiceRole.entities.Invoice.filter({ id: invoiceId }).then(r => r[0])].filter(Boolean)
      : await base44.asServiceRole.entities.Invoice.list();

    const eligible = invoiceFilter.filter(i =>
      ['sent', 'viewed', 'paid', 'partially_paid', 'overdue'].includes(i?.status) &&
      i?.qb_sync_status !== 'synced' &&
      i?.qb_sync_status !== 'needs_review'
    );

    for (const invoice of eligible) {
      try {
        const lineItems = (invoice.line_items || []).map((item, idx) => ({
          LineNum: idx + 1,
          Amount: item.total || (item.unit_price || 0) * (item.quantity || 1) * (item.days || 1),
          DetailType: 'SalesItemLineDetail',
          Description: item.name || item.description || '',
          SalesItemLineDetail: {
            ItemRef: { value: conn.default_service_item || '1' },
            Qty: item.quantity || 1,
            UnitPrice: item.unit_price || 0,
          },
        }));

        if (!lineItems.length) continue;

        const payload = {
          Line: lineItems,
          DocNumber: invoice.invoice_number,
          DueDate: invoice.due_date,
          TxnDate: invoice.issue_date || new Date().toISOString().split('T')[0],
        };

        if (invoice.client_id) {
          const clients = await base44.asServiceRole.entities.Client.filter({ id: invoice.client_id });
          if (clients[0]?.quickbooks_customer_id) {
            payload.CustomerRef = { value: clients[0].quickbooks_customer_id };
          }
        }

        const res = await qbPost('/invoice', payload, token, realmId);
        await base44.asServiceRole.entities.Invoice.update(invoice.id, {
          quickbooks_invoice_id: res.Invoice?.Id,
          qb_sync_status: 'synced',
          qb_last_synced_at: new Date().toISOString(),
          qb_sync_error: null,
        });
        report.invoices_synced++;
      } catch (e) {
        await base44.asServiceRole.entities.Invoice.update(invoice.id, {
          qb_sync_status: 'error',
          qb_sync_error: e.message,
        });
        report.errors.push(`Invoice ${invoice.invoice_number}: ${e.message}`);
      }
    }
  }

  const syncStatus = report.errors.length === 0 ? 'success' : 'partial';
  await base44.asServiceRole.entities.QuickBooksConnection.update(conn.id, {
    last_sync_at: new Date().toISOString(),
    last_sync_status: syncStatus,
    last_sync_error: report.errors.length ? report.errors.slice(0, 2).join('; ') : null,
  });

  return Response.json({ success: true, report });
});