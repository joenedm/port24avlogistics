import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all non-paid, non-voided invoices
    const invoices = await base44.asServiceRole.entities.Invoice.list();
    const now = new Date();
    let updated = 0;

    for (const invoice of invoices) {
      // Skip already paid or voided invoices
      if (invoice.status === 'paid' || invoice.status === 'voided') continue;

      const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
      const amountDue = invoice.amount_due || 0;

      // Check if invoice should be marked overdue
      if (dueDate && dueDate < now && amountDue > 0 && invoice.status !== 'overdue') {
        await base44.asServiceRole.entities.Invoice.update(invoice.id, {
          status: 'overdue'
        });
        updated++;
      }

      // Check if invoice should be marked paid (in case payment_history was updated elsewhere)
      const totalPaid = invoice.amount_paid || 0;
      const total = invoice.total || 0;
      if (totalPaid >= total && invoice.status !== 'paid') {
        await base44.asServiceRole.entities.Invoice.update(invoice.id, {
          status: 'paid',
          amount_due: 0,
          is_paid_in_full: true,
          paid_in_full_date: new Date().toISOString()
        });
        updated++;
      }
    }

    return Response.json({
      success: true,
      checked: invoices.length,
      updated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});