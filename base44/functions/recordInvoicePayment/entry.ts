import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      invoice_id,
      amount,
      payment_date,
      payment_method,
      source_provider = 'manual',
      reference_number,
      receipt_url,
      notes
    } = await req.json();

    // Validate required fields
    if (!invoice_id || !amount || !payment_date) {
      return Response.json(
        { error: 'Missing required fields: invoice_id, amount, payment_date' },
        { status: 400 }
      );
    }

    // Fetch the invoice
    const invoice = await base44.entities.Invoice.get(invoice_id);
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Create normalized payment record
    const payment = await base44.entities.Payment.create({
      invoice_id,
      show_id: invoice.show_id,
      client_id: invoice.client_id,
      amount,
      payment_date: new Date(payment_date).toISOString(),
      payment_method,
      source_provider,
      reference_number,
      receipt_url,
      recorded_by: user.email,
      notes,
      status: 'completed',
      sync_status: source_provider === 'manual' ? 'manual' : 'pending_sync'
    });

    // Update invoice
    const currentPaid = invoice.amount_paid || 0;
    const newAmountPaid = currentPaid + amount;
    const newAmountDue = (invoice.total || 0) - newAmountPaid;

    // Determine new status
    let newStatus = invoice.status;
    if (newAmountDue <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0 && newAmountDue > 0) {
      newStatus = 'partially_paid';
    }

    // Add to payment history
    const paymentHistory = invoice.payment_history || [];
    paymentHistory.push({
      id: payment.id,
      payment_id: payment.id,
      date: payment.payment_date,
      amount,
      method: payment_method,
      source: source_provider,
      reference_number,
      receipt_url,
      recorded_by: user.email,
      notes
    });

    // Update supporting badges
    const badges = invoice.supporting_badges || [];
    if (source_provider === 'manual' && !badges.includes('manual_payment_recorded')) {
      badges.push('manual_payment_recorded');
    }
    if (payment_method === 'check' && !badges.includes('check_payment')) {
      badges.push('check_payment');
    }
    if (payment_method === 'ach' && !badges.includes('ach_payment')) {
      badges.push('ach_payment');
    }
    if (payment_method === 'wire' && !badges.includes('wire_payment')) {
      badges.push('wire_payment');
    }
    if (payment_method === 'cash' && !badges.includes('cash_payment')) {
      badges.push('cash_payment');
    }

    // Update invoice
    await base44.entities.Invoice.update(invoice_id, {
      amount_paid: newAmountPaid,
      amount_due: Math.max(0, newAmountDue),
      status: newStatus,
      payment_history: paymentHistory,
      supporting_badges: badges,
      is_paid_in_full: newAmountDue <= 0,
      paid_in_full_date: newAmountDue <= 0 ? new Date().toISOString() : null
    });

    return Response.json({
      success: true,
      payment_id: payment.id,
      invoice_updated: {
        amount_paid: newAmountPaid,
        amount_due: Math.max(0, newAmountDue),
        status: newStatus
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});