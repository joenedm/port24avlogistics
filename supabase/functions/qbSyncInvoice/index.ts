import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, jsonResponse, errorResponse,
  makeAdminClient, getOrgIdFromRequest, getConnection,
  refreshTokenIfNeeded, callQBAPI, createOrUpdateCustomer, markInvoiceError,
} from '../_shared/qbHelpers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let invoice_id: string | null = null;

  try {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return errorResponse('Unauthorized', 401);

    const body = await req.json();
    invoice_id = body.invoice_id;
    if (!invoice_id) return errorResponse('Missing invoice_id', 400);

    const adminClient = makeAdminClient();

    const { data: invoice } = await adminClient
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .eq('org_id', orgId)
      .single();
    if (!invoice) return errorResponse('Invoice not found', 404);

    let conn = await getConnection(adminClient, orgId);
    if (!conn?.realm_id) return errorResponse('QuickBooks not connected', 400);
    conn = await refreshTokenIfNeeded(adminClient, conn);

    const customer = await createOrUpdateCustomer(conn, invoice);
    const customerId = String(customer.Id ?? customer.id);

    const lineItems = (Array.isArray(invoice.line_items) ? invoice.line_items : []).map(
      (item: Record<string, unknown>) => ({
        Description: item.name || 'Service',
        Amount: Number(item.total) || 0,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: { value: (conn.default_service_item as string) || '1' },
          Qty: Number(item.quantity) || 1,
          UnitPrice: Number(item.unit_price) || 0,
        },
      })
    );

    if (lineItems.length === 0) {
      lineItems.push({
        Description: 'Services',
        Amount: Number(invoice.total) || 0,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: { value: (conn.default_service_item as string) || '1' },
          Qty: 1,
          UnitPrice: Number(invoice.total) || 0,
        },
      });
    }

    const invoiceBody: Record<string, unknown> = {
      CustomerRef: { value: customerId },
      Line: lineItems,
    };
    if (invoice.invoice_number) invoiceBody.DocNumber = invoice.invoice_number;
    if (invoice.due_date) invoiceBody.DueDate = invoice.due_date;
    if (invoice.client_email) invoiceBody.BillEmail = { Address: invoice.client_email };

    let qbInvoice: Record<string, unknown>;

    if (invoice.quickbooks_invoice_id) {
      // Fetch current SyncToken before updating (QB requires it for updates)
      const existing = await callQBAPI(conn, 'GET', `invoice/${invoice.quickbooks_invoice_id}`);
      const existingData = (existing.Invoice ?? existing) as Record<string, unknown>;

      const updateRes = await callQBAPI(conn, 'POST', 'invoice', {
        ...invoiceBody,
        Id: invoice.quickbooks_invoice_id,
        SyncToken: existingData.SyncToken,
        sparse: true,
      });
      qbInvoice = (updateRes.Invoice ?? updateRes) as Record<string, unknown>;
    } else {
      const createRes = await callQBAPI(conn, 'POST', 'invoice', invoiceBody);
      qbInvoice = (createRes.Invoice ?? createRes) as Record<string, unknown>;
    }

    const qbId = qbInvoice.Id as string;
    const qbNumber = qbInvoice.DocNumber as string;
    const qbUrl = `https://app.qbo.intuit.com/app/invoice?txnId=${qbId}`;
    const now = new Date().toISOString();

    await Promise.all([
      adminClient
        .from('invoices')
        .update({
          quickbooks_invoice_id: qbId,
          quickbooks_invoice_number: qbNumber,
          quickbooks_sync_status: 'synced',
          quickbooks_sync_error: null,
          quickbooks_invoice_url: qbUrl,
          last_quickbooks_sync_at: now,
        })
        .eq('id', invoice_id),
      adminClient
        .from('quickbooks_connections')
        .update({ last_sync_at: now, last_sync_status: 'ok', last_sync_error: null })
        .eq('org_id', orgId),
    ]);

    return jsonResponse({
      quickbooks_invoice_id: qbId,
      quickbooks_invoice_number: qbNumber,
      quickbooks_invoice_url: qbUrl,
      status: 'synced',
    });
  } catch (err) {
    if (invoice_id) {
      const adminClient = makeAdminClient();
      await markInvoiceError(adminClient, invoice_id, err.message).catch(() => {});
    }
    return errorResponse(err.message);
  }
});
