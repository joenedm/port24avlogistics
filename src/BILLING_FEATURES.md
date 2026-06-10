# Gear Flow Billing Dashboard — Feature Summary

## What's Included

### 1. Admin Billing Dashboard (`/billing`)
A comprehensive billing control center for administrators.

**Overview Tab:**
- Total outstanding invoices (unpaid + partially paid)
- Total paid invoices (last 30 days)
- Total overdue invoices with amount due
- Failed payment tracking
- Invoice status breakdown (Draft, Sent, Partially Paid, Paid, Overdue, Failed, etc.)
- Key metrics cards with real-time calculations

**Invoices Tab:**
- Searchable, filterable invoice table
- Filter by status (all, draft, sent, viewed, partially paid, paid, overdue, failed)
- Columns: Invoice #, Client, Project, Total, Paid, Due, Due Date, Status
- Click through to edit individual invoices

**Client Balances Tab:**
- Summary of what each client owes
- Total paid vs. total due
- Overdue amounts highlighted
- Easy to identify high-risk accounts

---

### 2. Project Billing Tab (in Show Detail)
Every project now has a **Billing** tab showing complete financial details.

**Invoice Status Section:**
- Current invoice status
- Invoice number
- Due date
- Payment summary (total, paid, due)

**Billing Information:**
- Client company and contact
- Billing contact name
- Project dates
- Payment terms (due on receipt, net 30, custom, etc.)
- PO number
- Tax exempt status

**Deposit Tracking (if applicable):**
- Deposit required amount
- Deposit paid amount
- Deposit remaining

**Admin Actions:**
- **Send to Stripe** — Creates Stripe invoice and sends to client
- **Copy Payment Link** — Copies Stripe payment URL to clipboard
- **Record Payment** — Records manual payments (bank transfer, check, etc.)
- **Download PDF** — Downloads invoice from Stripe

**Payment History:**
- Complete audit trail of all transactions
- Shows: Date, Type (Payment/Refund/Credit), Amount, Method, Notes
- Records Stripe charge IDs for reference

---

### 3. Client Portal Billing (`/client-billing`)
Secure, client-facing billing portal with payment capabilities.

**For Clients:**
- View active invoices due
- View past paid invoices
- See invoice totals, due dates, and remaining balance
- Pay invoices directly via Stripe payment link
- Download invoice PDFs
- Download receipts
- Deposit tracking (if applicable)
- Client-visible billing notes

**Security:**
- Clients cannot see internal costs
- No access to crew wages, subrent costs, or profit margins
- No access to internal notes
- Only invoice information for their projects
- Time-limited PDF and receipt URLs

---

## Invoice Statuses & Transitions

```
Draft
  ↓ (admin sends to Stripe)
Sent → Viewed (client opens invoice)
  ↓ (payment received)
Partially Paid (partial payment)
  ↓ (final payment)
Paid

Alternative paths:
Sent → Overdue (past due date, no payment)
       ↓ (payment eventually made)
       → Partially Paid → Paid

Payment fails:
Sent → Failed (Stripe payment declined)

Admin actions:
Sent → Voided (cancelled by admin)
     → Disputed (flagged for review)
     → Refunded (refund issued)
```

---

## Payment Workflows

### Workflow 1: Standard Full Payment
1. Admin clicks "Send to Stripe" on Project Billing tab
2. System creates Stripe customer (if new client)
3. System creates Stripe invoice with all line items
4. Client receives payment link
5. Client pays in full
6. Stripe webhook updates invoice to "Paid"

### Workflow 2: Deposit + Final Balance
1. Invoice has `deposit_required: $5,000` and `total: $25,000`
2. Admin sends invoice to Stripe
3. Client pays $5,000 deposit (status: Partially Paid)
4. Admin records deposit payment in Project Billing tab
5. Invoice now shows `$20,000` due
6. Client pays final $20,000
7. Invoice status → Paid

### Workflow 3: Manual Payment (Check/Wire)
1. Invoice sent to Stripe
2. Client pays via check or bank transfer (not Stripe)
3. Admin clicks "Record Payment" in Project Billing tab
4. Admin enters amount, method (Check/Bank Transfer), optional notes
5. System records payment in history
6. Invoice status updates automatically to Partially Paid or Paid

### Workflow 4: Refund Processing
1. Admin issues refund in Stripe dashboard
2. Stripe sends webhook to Gear Flow
3. System automatically:
   - Records refund in payment history
   - Adjusts `amount_paid` downward
   - Updates invoice status (if fully refunded, status → Sent)
   - Logs Stripe charge ID

### Workflow 5: Credit Adjustments
1. Client deserves a credit (damaged equipment, adjustment, etc.)
2. Admin clicks "Record Payment" → Records credit as negative amount
3. System reduces amount due without Stripe refund
4. Shows in payment history as "Credit" not "Refund"

### Workflow 6: Overdue Invoices
1. Invoice due date passes with no payment
2. Status automatically changes to "Overdue"
3. Overdue amount appears in Admin Billing Dashboard "Overdue" card
4. Admin can:
   - Add internal note (staff only)
   - Add client-visible note
   - Mark as disputed
   - Record manual payment

---

## Field Reference

### Core Invoice Fields
| Field | Type | Purpose |
|-------|------|---------|
| `invoice_number` | String | Human-readable invoice # (e.g., INV-2025-001) |
| `status` | Enum | Current status (draft, sent, paid, etc.) |
| `total` | Number | Total invoice amount (after tax/discount) |
| `amount_paid` | Number | Total received to date |
| `amount_due` | Number | Remaining balance (total - amount_paid) |
| `due_date` | Date | Payment due date |
| `payment_terms` | Enum | Terms (due on receipt, net 30, etc.) |

### Deposit Fields
| Field | Type | Purpose |
|-------|------|---------|
| `deposit_required` | Number | Deposit amount due upfront |
| `deposit_paid` | Number | Deposit amount received |

### Stripe Integration Fields
| Field | Type | Purpose |
|-------|------|---------|
| `stripe_customer_id` | String | Stripe customer ID |
| `stripe_invoice_id` | String | Stripe invoice ID |
| `stripe_payment_intent_id` | String | Stripe payment intent (for payments) |
| `stripe_hosted_invoice_url` | String | URL for client to pay |
| `stripe_payment_status` | Enum | Stripe status (open, paid, void, uncollectible) |
| `stripe_pdf_url` | String | Invoice PDF from Stripe |
| `stripe_receipt_url` | String | Receipt URL (after payment) |

### Tracking Fields
| Field | Type | Purpose |
|-------|------|---------|
| `sent_date` | DateTime | When invoice was sent |
| `viewed_date` | DateTime | When client opened invoice |
| `payment_history` | Array | All payments, credits, refunds with timestamps |
| `refund_amount` | Number | Total refunded |
| `credits_applied` | Number | Total credits (non-refund adjustments) |

### Admin Notes
| Field | Type | Purpose |
|-------|------|---------|
| `notes` | String | Internal notes (staff only) |
| `client_visible_notes` | String | Notes client can see |
| `is_disputed` | Boolean | Flagged for manual review |
| `dispute_notes` | String | Reason for dispute |

---

## Stripe Webhook Events

The billing system listens for these Stripe events:

| Event | Action |
|-------|--------|
| `invoice.payment_succeeded` | Mark invoice as Paid, record payment |
| `invoice.payment_failed` | Mark invoice as Failed |
| `invoice.payment_action_required` | Flag for admin review |
| `invoice.marked_uncollectible` | Mark as Failed (uncollectible) |
| `invoice.voided` | Mark as Voided |
| `charge.refunded` | Record refund, adjust amount_paid |

Each webhook update includes:
- Latest Stripe invoice data
- PDF and receipt URLs
- Payment status confirmation
- Timestamp sync

---

## Admin Permissions

Only **admin**, **manager**, and **coordinator** roles can:
- Send invoices to Stripe
- Copy payment links
- Record manual payments
- Download invoice PDFs
- Mark as disputed
- Add internal notes
- View client balance summaries

**Crew** and **Director** roles can:
- View invoices (read-only)
- See client-visible notes only

---

## Client Portal Rules

Clients accessing `/client-billing` see:
- ✅ Their invoices
- ✅ Due dates and amounts
- ✅ Payment links (Stripe)
- ✅ PDF downloads
- ✅ Client-visible notes
- ✅ Receipt URLs (after payment)
- ✅ Deposit tracking

Clients do NOT see:
- ❌ Internal costs
- ❌ Crew wages
- ❌ Subrent costs
- ❌ Profit margins
- ❌ Internal notes
- ❌ Admin-only adjustments

---

## Testing Checklist

- [ ] Create invoice for a project
- [ ] Click "Send to Stripe" on Project Billing tab
- [ ] Verify Stripe invoice created and payment link appears
- [ ] Use Stripe test card to pay from Admin Billing page
- [ ] Verify invoice status changes to "Paid"
- [ ] Check payment appears in payment history
- [ ] Log in as client and verify `/client-billing` shows invoice
- [ ] Client clicks "Pay Now" and pays test invoice
- [ ] Verify webhook synced payment within 5 seconds
- [ ] Record manual payment (check) and verify history
- [ ] Create invoice with deposit, record deposit payment
- [ ] Verify deposit tracking works correctly
- [ ] Test refund in Stripe, verify it syncs
- [ ] Mark invoice as disputed, verify status changes

---

## Quick Links

- **Admin Billing Dashboard:** `/billing`
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Setup Instructions:** See BILLING_SETUP.md
- **Project Billing Tab:** Show Detail → Billing tab
- **Client Billing Portal:** `/client-billing