# Gear Flow Billing Dashboard Setup

## Overview
The Billing Dashboard integrates Stripe for invoice payment processing, supporting project-based equipment rentals, live events, AV production, crew services, and travel logistics.

## Stripe Configuration

### 1. Obtain Stripe API Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers > API Keys**
3. Copy your **Secret Key** and **Publishable Key**

### 2. Set Secrets in Base44
Store your Stripe API key in Base44:

```
Dashboard → Settings → Environment Variables

STRIPE_API_KEY: sk_live_... (or sk_test_... for testing)
STRIPE_WEBHOOK_SECRET: whsec_... (obtained below)
```

### 3. Configure Webhook Endpoint
1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Add a new endpoint with URL:
   ```
   https://yourapp.base44.app/functions/handleStripeWebhook
   ```
   (Replace with your actual app domain)

3. Select these events:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `invoice.payment_action_required`
   - `invoice.marked_uncollectible`
   - `invoice.voided`
   - `charge.refunded`

4. Copy the **Signing Secret** and add to environment variables:
   ```
   STRIPE_WEBHOOK_SECRET: whsec_...
   ```

## Core Features

### Admin Billing Dashboard (`/billing`)
- **Overview Tab**: Total outstanding, paid, overdue, and failed invoices
- **Invoice Tab**: Searchable, filterable invoice table with status tracking
- **Client Balances Tab**: Shows outstanding balances by client

### Project Billing Tab (in Show Detail)
Each project has a **Billing** tab showing:
- Invoice status and payment summary
- Client and billing contact information
- Project dates and payment terms
- Deposit tracking (if applicable)
- Admin actions (send to Stripe, copy payment link, record manual payment)
- Payment history with all transactions

### Client Portal Billing (`/client-billing`)
Clients see:
- Active invoices due
- Paid invoices (read-only)
- Invoice totals and due dates
- Payment links (Stripe-hosted)
- PDF and receipt downloads
- Deposit tracking

**Client Portal Rules:**
- Clients cannot see internal costs, crew pay, subrent costs, or profit margins
- Only admin-level notes are hidden; client-visible notes display
- All downloads are secure and time-limited

## Invoice Workflow

### Creating an Invoice
1. Generate a quote for the project
2. In the **Project Billing** tab, click **"Send to Stripe"**
3. The system will:
   - Create/retrieve the Stripe customer for the client
   - Create a Stripe invoice with all line items
   - Finalize and email the invoice to the client
   - Store the hosted payment link

### Payment Workflows Supported

#### 1. Full Payment
- Client pays entire invoice via Stripe payment link
- Invoice status updates to **Paid**

#### 2. Deposit + Balance
- Set `deposit_required` on invoice
- Client pays deposit first
- Admin records deposit payment
- Invoice shows remaining balance due
- Client pays balance later
- Invoice status: **Partially Paid** → **Paid**

#### 3. Partial Payment
- Client pays any amount < total
- Invoice status: **Partially Paid**
- Remaining balance due continues to accrue
- Admin can record additional manual payments

#### 4. Manual Payment Recording
- Admin clicks **"Record Payment"** in Project Billing tab
- Supports: Stripe, Bank Transfer, Check, Manual
- Automatically updates invoice status
- Payment records in history with notes

#### 5. Refunds
- Stripe webhooks auto-sync refunds when issued in Stripe
- System adjusts `amount_paid` and `refund_amount`
- Invoice status reverts to **Partially Paid** if balance remains

#### 6. Credits & Adjustments
- Admin can record credits in payment history
- Reduces amount due without creating a refund in Stripe

#### 7. Overdue Tracking
- Invoices automatically marked **Overdue** when past due date
- Dashboard highlights overdue amount
- Admin can add dispute notes and internal notes

#### 8. Failed Payments
- Stripe webhooks update invoice to **Failed** on payment failure
- Admin can resend invoice or record manual payment

## Status Reference

| Status | Meaning |
|--------|---------|
| **Draft** | Invoice not yet sent |
| **Sent** | Sent to client, awaiting payment |
| **Viewed** | Client has opened the invoice |
| **Partially Paid** | Some payment received, balance remains |
| **Paid** | Full payment received |
| **Overdue** | Payment not received by due date |
| **Failed** | Payment attempt failed in Stripe |
| **Refunded** | Full refund issued |
| **Voided** | Invoice cancelled |
| **Disputed** | Under dispute (manual flag by admin) |

## Payment Terms Supported

- **Due on receipt** — Invoice due immediately
- **Due before load-in** — Due before event load-in date
- **Due before event** — Due before event start date
- **Net 15 / 30 / 45 / 60** — Due that many days after invoice
- **Custom** — Admin sets specific due date

## Admin Actions

In the **Project Billing** tab, admins can:

1. **Send to Stripe** — Creates Stripe invoice and sends payment link
2. **Copy Payment Link** — Copies hosted invoice URL to clipboard
3. **Record Payment** — Manually record check, bank transfer, or non-Stripe payment
4. **Download PDF** — Downloads Stripe invoice PDF
5. **View Payment History** — See all transactions, refunds, and credits

Additional actions available:
- **Sync with Stripe** — Force refresh from Stripe
- **Mark as Disputed** — Flag invoice for manual review
- **Add Internal Note** — For staff only
- **Add Client-Visible Note** — Client can see this

## Stripe Sync

The system syncs with Stripe in two ways:

### Real-time Webhooks
When a payment occurs in Stripe:
1. Stripe sends webhook to `handleStripeWebhook`
2. System updates invoice status, amount paid, and timestamps
3. Payment recorded in history with Stripe charge ID
4. Clients notified if configured in Stripe settings

### Manual Sync
Admins can manually sync by refreshing the page or clicking "Sync with Stripe" button.

**Note:** The invoice is only marked **Paid** when:
- Stripe confirms successful payment via webhook, OR
- Admin manually records payment with `Record Payment` button

Invoices sent to clients are never marked paid just because they were sent.

## Client Portal Security

The client portal (`/client-billing`) is authenticated and shows only:
- Invoices for the client's company
- Public pricing (no internal costs)
- Due dates and payment terms
- Payment links and receipt URLs
- Client-visible notes only

Internal notes, crew costs, subrent costs, and profit margins are automatically hidden.

## Testing

### Stripe Test Mode
1. Set `STRIPE_API_KEY` to your test secret key (`sk_test_...`)
2. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

### Webhook Testing
1. In Stripe Dashboard, use **Test webhook** button
2. Verify logs in Base44 Functions → handleStripeWebhook
3. Check that invoice status updates correctly

## Troubleshooting

### "Invoice not found" when creating Stripe invoice
- Verify invoice exists in Base44 Invoice entity
- Check that client is linked to invoice
- Ensure invoice has required fields: `show_name`, `client`, `total`

### Webhooks not updating invoices
1. Check webhook URL in Stripe is correct
2. Verify `STRIPE_WEBHOOK_SECRET` is set and matches Stripe
3. Check function logs: Dashboard → Code → Functions → handleStripeWebhook
4. Ensure webhook events are selected in Stripe

### Payment link not visible to client
- Confirm admin clicked "Send to Stripe" and invoice was created
- Check `stripe_hosted_invoice_url` is populated in invoice
- Verify Stripe customer was created (check `stripe_customer_id`)

### Client sees invoice as "not paid" after they paid in Stripe
- Wait a few seconds for webhook to process
- Click refresh or wait 30 seconds (webhook can take time)
- Manually check Stripe Invoice to confirm payment status
- If stuck, admin can manually record payment with "Record Payment" button

## Customization

### Custom Invoice Number Format
Edit `createStripeInvoice` function to customize how invoice numbers are generated.

### Email Templates
Configure in Stripe Dashboard → Billing Portal → Email Templates to customize invoice emails sent to clients.

### Deposit Requirements
Set `deposit_required` on any invoice to enable deposit tracking. Use `deposit_paid` to record partial deposits.

### Tax Rates
Set `tax_pct` and `tax_amount` on invoices. These are automatically added to Stripe invoices.

### Discounts
Set `discount_pct` and `discount_amount`. Negative line items are created in Stripe for discounts.