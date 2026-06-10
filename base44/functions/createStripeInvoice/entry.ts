import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@15.4.0';

const STRIPE_API_KEY = Deno.env.get('STRIPE_API_KEY');

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return Response.json({ error: 'Missing invoiceId' }, { status: 400 });
    }

    // Fetch the invoice
    const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoiceId });
    if (!invoices.length) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoices[0];

    // Fetch the client
    let client = null;
    if (invoice.client_id) {
      const clients = await base44.asServiceRole.entities.Client.filter({ id: invoice.client_id });
      client = clients[0];
    }

    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const stripe = new Stripe(STRIPE_API_KEY);

    // Create or get Stripe customer
    let stripeCustomerId = invoice.stripe_customer_id;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: invoice.client_email || client.billing_email,
        name: client.company_name,
        address: {
          line1: client.billing_address || '',
          city: client.billing_city || '',
          state: client.billing_state || '',
          postal_code: client.billing_zip || '',
          country: client.billing_country || 'US'
        },
        metadata: {
          gearflow_client_id: client.id
        }
      });
      stripeCustomerId = customer.id;
    }

    // Create Stripe invoice
    const stripeInvoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      auto_advance: false,
      collection_method: 'send_invoice',
      days_until_due: Math.ceil((new Date(invoice.due_date) - new Date()) / (1000 * 60 * 60 * 24)),
      metadata: {
        gearflow_invoice_id: invoiceId,
        show_id: invoice.show_id
      }
    });

    // Add line items
    if (invoice.line_items && invoice.line_items.length > 0) {
      for (const item of invoice.line_items) {
        await stripe.invoiceItems.create({
          invoice: stripeInvoice.id,
          customer: stripeCustomerId,
          amount: Math.round((item.total || 0) * 100), // Convert to cents
          currency: 'usd',
          description: item.name,
          metadata: { group: item.group_name || '' }
        });
      }
    }

    // Add tax if applicable
    if (invoice.tax_amount && invoice.tax_amount > 0) {
      await stripe.invoiceItems.create({
        invoice: stripeInvoice.id,
        customer: stripeCustomerId,
        amount: Math.round(invoice.tax_amount * 100),
        currency: 'usd',
        description: `Tax (${invoice.tax_pct}%)`
      });
    }

    // Add discount if applicable
    if (invoice.discount_amount && invoice.discount_amount > 0) {
      await stripe.invoiceItems.create({
        invoice: stripeInvoice.id,
        customer: stripeCustomerId,
        amount: -Math.round(invoice.discount_amount * 100),
        currency: 'usd',
        description: `Discount (${invoice.discount_pct}%)`
      });
    }

    // Finalize the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);

    // Update Gear Flow invoice with Stripe details
    await base44.asServiceRole.entities.Invoice.update(invoiceId, {
      stripe_customer_id: stripeCustomerId,
      stripe_invoice_id: finalizedInvoice.id,
      stripe_hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
      stripe_payment_status: finalizedInvoice.status,
      stripe_pdf_url: finalizedInvoice.pdf,
      stripe_last_sync: new Date().toISOString()
    });

    return Response.json({
      success: true,
      stripe_invoice_id: finalizedInvoice.id,
      hosted_invoice_url: finalizedInvoice.hosted_invoice_url
    });
  } catch (error) {
    console.error('Error creating Stripe invoice:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});