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
      .select('id, quickbooks_invoice_id, org_id')
      .eq('id', invoice_id)
      .eq('org_id', orgId)
      .single();
    if (!invoice) return errorResponse('Invoice not found', 404);
    if (!invoice.quickbooks_invoice_id) return errorResponse('Invoice not synced to QuickBooks', 400);

    let conn = await getConnection(adminClient, orgId);
    if (!conn?.realm_id) return errorResponse('QuickBooks not connected', 400);
    conn = await refreshTokenIfNeeded(adminClient, conn);

    const res = await callQBAPI(conn, 'GET', `invoice/${invoice.quickbooks_invoice_id}`);
    const qbInvoice = (res.Invoice ?? res) as Record<string, unknown>;

    const total = Number(qbInvoice.TotalAmt) || 0;
    const balance = Number(qbInvoice.Balance) || 0;
    const dueDate = qbInvoice.DueDate ? new Date(qbInvoice.DueDate as string) : null;
    const now = new Date();

    let newStatus: string;
    if (balance === 0) {
      newStatus = 'paid';
    } else if (balance < total) {
      newStatus = 'partially_paid';
    } else if (dueDate && dueDate < now) {
      newStatus = 'overdue';
    } else {
      newStatus = 'sent';
    }

    await adminClient
      .from('invoices')
      .update({
        quickbooks_sync_status: 'synced',
        quickbooks_sync_error: null,
        status: newStatus,
        last_quickbooks_sync_at: new Date().toISOString(),
      })
      .eq('id', invoice_id);

    return jsonResponse({ status: newStatus, balance, total });
  } catch (err) {
    return errorResponse(err.message);
  }
});
