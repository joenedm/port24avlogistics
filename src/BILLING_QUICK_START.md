# Billing Dashboard — Quick Start Guide

## 5-Minute Setup

### 1. Get Stripe API Key
1. Go to [stripe.com](https://stripe.com) and sign in
2. Navigate to **Developers** → **API Keys**
3. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

### 2. Set Secret in Base44
1. Dashboard → **Settings** → **Environment Variables**
2. Create new secret: `STRIPE_API_KEY`
3. Paste your Stripe secret key
4. Save

### 3. Create Webhook Endpoint
1. Go back to Stripe → **Developers** → **Webhooks**
2. Click **+ Add endpoint**
3. Endpoint URL: `https://yourapp.base44.app/functions/handleStripeWebhook`
4. Select events: `invoice.payment_succeeded`, `invoice.payment_failed`, `invoice.voided`, `charge.refunded`
5. Copy the **Signing Secret** (starts with `whsec_`)
6. Go back to Base44 → Create new secret: `STRIPE_WEBHOOK_SECRET`
7. Paste signing secret
8. Save

**Done!** Billing is now live.

---

## Using the Billing Dashboard

### For Admins

**Access:** Sidebar → Quotes & Invoices → **Billing Dashboard** (or `/billing`)

**What you can see:**
- 💰 Total outstanding invoices
- ✅ Total paid invoices (last 30 days)
- ⚠️ Overdue invoices
- ❌ Failed payments
- 📊 Invoice breakdown by status
- 👥 Client balance summary

### For Project Managers

**On each Project** (ShowDetail page):
1. Open a project
2. Click the **Billing** tab
3. See invoice status and payment info
4. Click **Send to Stripe** to create payment link
5. Click **Record Payment** to log manual payments
6. Download PDF and receipt

### For Clients

**Access:** `/client-billing` (if you have a portal account)

**What they see:**
- 📄 Active invoices due
- 💳 Click to pay with Stripe
- 📥 Download invoice and receipt
- 📅 Due dates and amounts

---

## Common Tasks

### Send an Invoice to Client
1. Create project and invoice
2. Go to project → **Billing** tab
3. Click **Send to Stripe**
4. System creates Stripe invoice and emails client
5. Payment link appears → copy and send to client

### Record a Manual Payment (Check/Bank Transfer)
1. Go to project → **Billing** tab
2. Click **Record Payment**
3. Enter amount, select method, add notes
4. Click **Record Payment**
5. Invoice status updates automatically

### Track Deposit Payments
1. Invoice has `deposit_required: $5,000`
2. Client pays deposit via Stripe
3. Stripe webhook updates: `deposit_paid: $5,000`
4. Remaining balance shows: `$20,000 due`
5. When final payment received → `Paid`

### View Payment History
1. Go to project → **Billing** tab
2. Scroll to **Payment History**
3. See all payments, refunds, and credits
4. Each entry shows date, amount, method, notes

---

## Testing with Stripe Test Mode

### Use Test Cards
- **Success:** `4242 4242 4242 4242` + any future date
- **Decline:** `4000 0000 0000 0002`
- **Incomplete:** `4000 0025 0000 3155` (triggers 3D Secure)
- Any CVC: `123`
- Any expiry: `12/25` (or later)

### Test Webhook
1. Create test invoice
2. Click "Send to Stripe"
3. Use test card to pay
4. Stripe webhook fires automatically
5. Invoice status updates to "Paid" within 5 seconds

---

## Troubleshooting

### "I don't see the Billing Dashboard"
- Are you admin or director? Check sidebar
- Billing appears in: Sidebar → Quotes & Invoices section
- Need director role or higher

### "Send to Stripe button isn't working"
- Check Stripe API key is set (Dashboard → Settings → Environment Variables)
- Check invoice has required fields (show_name, client, total)
- Check browser console for errors

### "Client isn't seeing payment link"
- Click "Send to Stripe" on project (invoice must be created in Stripe)
- Check `stripe_hosted_invoice_url` has a value
- Link appears in client portal at `/client-billing`

### "Payment not showing up after client paid"
- Wait 5 seconds (webhook processing)
- Refresh page
- Check Stripe dashboard to confirm payment went through
- If stuck, admin can "Record Payment" manually

### "Webhook isn't updating invoices"
1. Check webhook URL is correct in Stripe
2. Check `STRIPE_WEBHOOK_SECRET` is set
3. Check function logs: Dashboard → Code → Functions → handleStripeWebhook
4. Use Stripe's test button to trigger a fake webhook

---

## Quick Reference

| Task | Location | Steps |
|------|----------|-------|
| View billing dashboard | `/billing` | Sidebar → Billing Dashboard |
| Send invoice to Stripe | Project → Billing tab | Click "Send to Stripe" |
| Record manual payment | Project → Billing tab | Click "Record Payment" |
| Download PDF | Project → Billing tab | Click "Download PDF" |
| Copy payment link | Project → Billing tab | Click "Copy Payment Link" |
| See client payments | Project → Billing tab | Scroll to "Payment History" |
| Client pays invoice | `/client-billing` | Click "Pay Now" on invoice |

---

## Status Indicators

| Status | Meaning | Action |
|--------|---------|--------|
| 🟡 Draft | Not sent yet | Click "Send to Stripe" |
| 🔵 Sent | Waiting for payment | Share payment link |
| 🟢 Paid | Full payment received | Invoice complete |
| 🟠 Partially Paid | Some payment received | Record final payment |
| 🔴 Overdue | Past due date, unpaid | Follow up with client |
| ⚠️ Failed | Payment declined | Record manual payment |

---

## Need Help?

- **Setup issues:** See `BILLING_SETUP.md`
- **Feature details:** See `BILLING_FEATURES.md`
- **Complete reference:** See `BILLING_IMPLEMENTATION_SUMMARY.md`
- **Stripe support:** [stripe.com/support](https://stripe.com/support)