import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get Stripe account
    const stripeAccounts = await base44.asServiceRole.entities.StripeAccount.list();
    if (!stripeAccounts || stripeAccounts.length === 0 || !stripeAccounts[0].is_connected) {
      return Response.json({ error: 'Stripe not connected' }, { status: 400 });
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe credentials not configured' }, { status: 500 });
    }

    // Import Stripe SDK
    const Stripe = (await import('npm:stripe')).default;
    const stripe = new Stripe(stripeSecretKey);

    // Fetch all invoices with Stripe payment intent IDs
    const invoices = await base44.asServiceRole.entities.Invoice.list();
    let synced = 0;
    let errors = 0;

    for (const invoice of invoices) {
      if (!invoice.stripe_payment_intent_id) continue;

      try {
        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(invoice.stripe_payment_intent_id);

        if (paymentIntent.status === 'succeeded') {
          // Check if payment already recorded
          const existingPayments = await base44.asServiceRole.entities.Payment.filter({
            invoice_id: invoice.id,
            stripe_payment_intent_id: paymentIntent.id
          });

          if (existingPayments.length === 0 && paymentIntent.charges?.data?.length > 0) {
            const charge = paymentIntent.charges.data[0];

            // Create payment record
            await base44.asServiceRole.entities.Payment.create({
              invoice_id: invoice.id,
              show_id: invoice.show_id,
              client_id: invoice.client_id,
              amount: paymentIntent.amount / 100, // Stripe amounts are in cents
              payment_date: new Date(charge.created * 1000).toISOString(),
              payment_method: 'stripe',
              source_provider: 'stripe',
              source_payment_id: charge.id,
              source_invoice_id: paymentIntent.invoice,
              stripe_charge_id: charge.id,
              stripe_payment_intent_id: paymentIntent.id,
              receipt_url: charge.receipt_url,
              status: 'completed',
              sync_status: 'synced',
              last_synced_at: new Date().toISOString()
            });

            // Update invoice
            const currentPaid = invoice.amount_paid || 0;
            const amount = paymentIntent.amount / 100;
            const newAmountPaid = currentPaid + amount;
            const newAmountDue = (invoice.total || 0) - newAmountPaid;

            let newStatus = invoice.status;
            if (newAmountDue <= 0) {
              newStatus = 'paid';
            } else if (newAmountPaid > 0 && newAmountDue > 0) {
              newStatus = 'partially_paid';
            }

            const badges = invoice.supporting_badges || [];
            if (!badges.includes('stripe_synced')) {
              badges.push('stripe_synced');
            }
            // Remove error badge if present
            const errorIndex = badges.indexOf('stripe_sync_error');
            if (errorIndex > -1) {
              badges.splice(errorIndex, 1);
            }

            const paymentHistory = invoice.payment_history || [];
            paymentHistory.push({
              date: new Date(charge.created * 1000).toISOString(),
              amount,
              method: 'stripe',
              source: 'stripe',
              receipt_url: charge.receipt_url
            });

            await base44.asServiceRole.entities.Invoice.update(invoice.id, {
              amount_paid: newAmountPaid,
              amount_due: Math.max(0, newAmountDue),
              status: newStatus,
              stripe_payment_status: 'paid',
              stripe_receipt_url: charge.receipt_url,
              stripe_last_sync: new Date().toISOString(),
              payment_history: paymentHistory,
              supporting_badges: badges,
              is_paid_in_full: newAmountDue <= 0,
              paid_in_full_date: newAmountDue <= 0 ? new Date().toISOString() : null
            });

            synced++;
          }
        }
      } catch (error) {
        console.error(`Error syncing Stripe payment for invoice ${invoice.id}:`, error.message);
        errors++;

        // Mark with error badge
        const badges = invoice.supporting_badges || [];
        if (!badges.includes('stripe_sync_error')) {
          badges.push('stripe_sync_error');
        }

        await base44.asServiceRole.entities.Invoice.update(invoice.id, {
          stripe_sync_error: error.message,
          supporting_badges: badges
        });
      }
    }

    return Response.json({
      success: true,
      invoices_checked: invoices.filter(i => i.stripe_payment_intent_id).length,
      payments_synced: synced,
      errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});