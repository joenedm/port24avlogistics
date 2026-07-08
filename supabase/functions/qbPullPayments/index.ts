import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders, jsonResponse, errorResponse,
  makeAdminClient, getOrgIdFromRequest, getConnection,
  refreshTokenIfNeeded, callQBAPI,
} from '../_shared/qbHelpers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const orgId = await getOrgIdFromRequest(req);
    if (!orgId) return errorResponse('Unauthorized', 401);

    const { invoice_id } = await req.json();
    if (!invoice_id) return errorResponse('Missing invoice_id', 400);

    const adminClient = makeAdminClient();

    const { data: invoice } = await adminClient
      .from('invoices')
      .select('id, quickbooks_invoice_id, total, org_id')
      .eq('id', invoice_id)
      .eq('org_id', orgId)
      .single();
    if (!invoice) return errorResponse('Invoice not found', 404);
    if (!invoice.quickbooks_invoice_id) return errorResponse('Invoice not synced to QuickBooks', 400);

    let conn = await getConnection(adminClient, orgId);
    if (!conn?.realm_id) return errorResponse('QuickBooks not connected', 400);
    conn = await refreshTokenIfNeeded(adminClient, conn);

    // Query payments linked to this QB invoice
    const query = `SELECT * FROM Payment WHERE Line.LinkedTxn.TxnId = '${invoice.quickbooks_invoice_id}'`;
    const res = await callQBAPI(
      conn,
      'GET',
      `query?query=${encodeURIComponent(query)}`
    );

    const payments = (res.QueryResponse as Record<string, unknown>)?.Payment;
    const paymentList = Array.isArray(payments) ? payments : [];

    const totalPaid = paymentList.reduce(
      (sum: number, p: Record<string, unknown>) => sum + (Number(p.TotalAmt) || 0),
      0
    );

    const invoiceTotal = Number(invoice.total) || 0;
    let newStatus: string;
    if (totalPaid >= invoiceTotal) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partially_paid';
    } else {
      newStatus = 'sent';
    }

    await adminClient
      .from('invoices')
      .update({
        status: newStatus,
        quickbooks_sync_status: 'synced',
        last_quickbooks_sync_at: new Date().toISOString(),
      })
      .eq('id', invoice_id);

    return jsonResponse({
      payments_imported: paymentList.length,
      total_paid: totalPaid,
      status: newStatus,
    });
  } catch (err) {
    return errorResponse(err.message);
  }
});
