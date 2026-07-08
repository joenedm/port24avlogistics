import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, jsonResponse, errorResponse,
  makeAdminClient, getOrgIdFromRequest, getConnection,
  refreshTokenIfNeeded, callQBAPI, createOrUpdateCustomer, markInvoiceError,
} from '../_shared/qbHelpers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return errorResponse('Unauthorized', 401);

    const adminClient = makeAdminClient();

    let conn = await getConnection(adminClient, orgId);
    if (!conn?.realm_id) return errorResponse('QuickBooks not connected', 400);
    conn = await refreshTokenIfNeeded(adminClient, conn);

    // Fetch invoices eligible for sync (sent/active or previously errored)
    const { data: invoices } = await adminClient
      .from('invoices')
      .select('*')
      .eq('org_id', orgId)
      .or('status.in.(sent,overdue,needs_review),quickbooks_sync_status.eq.error')
      .limit(50);

    const report = { synced: 0, errors: [] as string[] };

    for (const invoice of invoices ?? []) {
      try {
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
        await adminClient
          .from('invoices')
          .update({
            quickbooks_invoice_id: qbId,
            quickbooks_invoice_number: qbInvoice.DocNumber,
            quickbooks_sync_status: 'synced',
            quickbooks_sync_error: null,
            quickbooks_invoice_url: `https://app.qbo.intuit.com/app/invoice?txnId=${qbId}`,
            last_quickbooks_sync_at: new Date().toISOString(),
          })
          .eq('id', invoice.id);

        report.synced++;
      } catch (err) {
        report.errors.push(`Invoice ${invoice.invoice_number || invoice.id}: ${err.message}`);
        await markInvoiceError(adminClient, invoice.id, err.message).catch(() => {});
      }
    }

    const now = new Date().toISOString();
    await adminClient
      .from('quickbooks_connections')
      .update({
        last_sync_at: now,
        last_sync_status: report.errors.length > 0 ? 'error' : 'ok',
        last_sync_error: report.errors.length > 0 ? report.errors[0] : null,
      })
      .eq('org_id', orgId);

    return jsonResponse({ report });
  } catch (err) {
    return errorResponse(err.message);
  }
});
