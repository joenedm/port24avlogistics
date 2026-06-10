import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    // Only POST requests
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.text();
    const event = JSON.parse(body);
    
    const base44 = createClientFromRequest(req);

    // Handle different Stripe events
    switch (event.type) {
      case 'invoice.payment_succeeded':
      case 'invoice.payment_action_required': {
        const stripeInvoice = event.data.object;
        
        // Find corresponding Gear Flow invoice by stripe_invoice_id
        const invoices = await base44.asServiceRole.entities.Invoice.filter({
          stripe_invoice_id: stripeInvoice.id
        });

        if (invoices.length === 0) {
          console.log(`No invoice found for Stripe invoice ${stripeInvoice.id}`);
          return Response.json({ received: true });
        }

        const gfInvoice = invoices[0];
        let newStatus = gfInvoice.status;
        let amountPaid = gfInvoice.amount_paid || 0;

        if (stripeInvoice.status === 'paid') {
          newStatus = 'paid';
          amountPaid = stripeInvoice.amount_paid / 100; // Convert cents to dollars
        } else if (stripeInvoice.status === 'open' && amountPaid > 0) {
          newStatus = 'partially_paid';
        }

        // Update invoice with Stripe data
        await base44.asServiceRole.entities.Invoice.update(gfInvoice.id, {
          status: newStatus,
          amount_paid: amountPaid,
          amount_due: (gfInvoice.total || 0) - amountPaid,
          stripe_payment_status: stripeInvoice.status,
          stripe_pdf_url: stripeInvoice.pdf,
          stripe_receipt_url: stripeInvoice.receipt_number ? `https://pay.stripe.com/receipts/${stripeInvoice.receipt_number}` : null,
          stripe_last_sync: new Date().toISOString(),
          viewed_date: stripeInvoice.status_transitions?.finalized_at ? new Date(stripeInvoice.status_transitions.finalized_at * 1000).toISOString() : gfInvoice.viewed_date
        });

        // Record payment in history
        if (stripeInvoice.status === 'paid' && gfInvoice.amount_paid === 0) {
          const paymentHistoryEntry = {
            id: crypto.randomUUID?.() || `payment-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'payment',
            amount: amountPaid,
            method: 'stripe',
            stripe_charge_id: stripeInvoice.payment_intent,
            notes: `Stripe payment received`
          };

          const updatedHistory = [...(gfInvoice.payment_history || []), paymentHistoryEntry];
          await base44.asServiceRole.entities.Invoice.update(gfInvoice.id, {
            payment_history: updatedHistory
          });
        }

        break;
      }

      case 'invoice.marked_uncollectible': {
        const stripeInvoice = event.data.object;
        const invoices = await base44.asServiceRole.entities.Invoice.filter({
          stripe_invoice_id: stripeInvoice.id
        });

        if (invoices.length > 0) {
          await base44.asServiceRole.entities.Invoice.update(invoices[0].id, {
            status: 'failed',
            stripe_payment_status: 'uncollectible'
          });
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        
        // Find invoice by payment intent
        const invoices = await base44.asServiceRole.entities.Invoice.filter({
          stripe_payment_intent_id: charge.payment_intent
        });

        if (invoices.length > 0) {
          const gfInvoice = invoices[0];
          const refundAmount = charge.amount_refunded / 100; // Convert cents to dollars
          
          const refundEntry = {
            id: crypto.randomUUID?.() || `refund-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'refund',
            amount: refundAmount,
            method: 'stripe',
            stripe_charge_id: charge.id,
            notes: `Stripe refund processed`
          };

          const updatedHistory = [...(gfInvoice.payment_history || []), refundEntry];
          const newAmountPaid = Math.max(0, (gfInvoice.amount_paid || 0) - refundAmount);
          
          await base44.asServiceRole.entities.Invoice.update(gfInvoice.id, {
            amount_paid: newAmountPaid,
            amount_due: (gfInvoice.total || 0) - newAmountPaid,
            refund_amount: (gfInvoice.refund_amount || 0) + refundAmount,
            payment_history: updatedHistory,
            status: newAmountPaid === 0 ? 'sent' : 'partially_paid'
          });
        }
        break;
      }

      case 'invoice.voided': {
        const stripeInvoice = event.data.object;
        const invoices = await base44.asServiceRole.entities.Invoice.filter({
          stripe_invoice_id: stripeInvoice.id
        });

        if (invoices.length > 0) {
          await base44.asServiceRole.entities.Invoice.update(invoices[0].id, {
            status: 'voided',
            stripe_payment_status: 'void'
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const stripeInvoice = event.data.object;
        const invoices = await base44.asServiceRole.entities.Invoice.filter({
          stripe_invoice_id: stripeInvoice.id
        });

        if (invoices.length > 0) {
          await base44.asServiceRole.entities.Invoice.update(invoices[0].id, {
            status: 'failed'
          });
        }
        break;
      }
    }

    return Response.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});