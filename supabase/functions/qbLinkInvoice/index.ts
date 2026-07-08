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

    const { invoice_id, quickbooks_invoice_id } = await req.json();
    if (!invoice_id || !quickbooks_invoice_id) {
      return errorResponse('Missing invoice_id or quickbooks_invoice_id', 400);
    }

    const adminClient = makeAdminClient();

    // Verify invoice belongs to this org
    const { data: invoice } = await adminClient
      .from('invoices')
      .select('id')
      .eq('id', invoice_id)
      .eq('org_id', orgId)
      .single();
    if (!invoice) return errorResponse('Invoice not found', 404);

    let conn = await getConnection(adminClient, orgId);
    if (!conn?.realm_id) return errorResponse('QuickBooks not connected', 400);
    conn = await refreshTokenIfNeeded(adminClient, conn);

    const res = await callQBAPI(conn, 'GET', `invoice/${quickbooks_invoice_id}`);
    const qbInvoice = (res.Invoice ?? res) as Record<string, unknown>;

    await adminClient
      .from('invoices')
      .update({
        quickbooks_invoice_id: qbInvoice.Id,
        quickbooks_invoice_number: qbInvoice.DocNumber,
        quickbooks_sync_status: 'synced',
        quickbooks_sync_error: null,
        quickbooks_invoice_url: `https://app.qbo.intuit.com/app/invoice?txnId=${qbInvoice.Id}`,
        last_quickbooks_sync_at: new Date().toISOString(),
      })
      .eq('id', invoice_id);

    return jsonResponse({
      quickbooks_invoice_id: qbInvoice.Id,
      quickbooks_invoice_number: qbInvoice.DocNumber,
    });
  } catch (err) {
    return errorResponse(err.message);
  }
});
