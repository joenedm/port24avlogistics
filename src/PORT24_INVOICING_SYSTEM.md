# Port 24 Invoicing & Payment System

Complete unified invoicing and payment management system for Port 24 AV operations platform.

## System Architecture

### Core Principle: Unified Payment Layer

Port 24 does not care where a payment came from once it is normalized into the system.

All payments from any source (Stripe, QuickBooks, manual, check, ACH, wire, cash, etc.) feed into the same invoice balance and payment history through normalized `Payment` entity records.

```
Payment Sources → Normalized Payment Records → Invoice Balance & History
```

## Entities

### Invoice
The main invoice record with:
- Simplified main status (Draft, Sent, Partially Paid, Paid, Overdue, Voided, Needs Review)
- Supporting badges for additional context (Viewed, Payment Failed, Refund Issued, etc.)
- Unified payment history
- Stripe and QuickBooks sync fields
- Line items, discounts, taxes, totals

### Payment
Normalized payment record for unified tracking:
- Links to invoice, show, and client
- Amount and payment date
- Payment method (check, ACH, wire, cash, Stripe, etc.)
- Source provider (Stripe, QuickBooks, manual, etc.)
- Status and sync status
- Reference numbers, receipts, notes

### InvoiceSettings
Admin configuration for invoicing behavior:
- Default payment terms
- Deposit settings
- Role-based permissions
- Billing flow choice (Port24/Stripe primary vs QB primary vs manual)
- Integration toggles (Stripe, QB, manual payments)

## Invoice Statuses

Only 7 main statuses represent the billing lifecycle:

| Status | Description | Can Receive Payments |
|--------|-------------|----------------------|
| **Draft** | Being built, not sent | No |
| **Sent** | Sent to client, outstanding balance | Yes |
| **Partially Paid** | Payment received, balance remaining | Yes |
| **Paid** | Balance due = 0 | No |
| **Overdue** | Due date passed, balance outstanding | Yes |
| **Voided** | Canceled, no longer payable | No |
| **Needs Review** | Requires manager/admin attention | No |

## Supporting Badges

Additional context flags (separate from main status):
- `viewed` - Client opened invoice
- `payment_failed` - Stripe/QB payment failed
- `refund_issued` - Refund processed
- `client_disputed` - Client disputed invoice
- `manual_payment_recorded` - Manual payment recorded
- `stripe_synced` - Synced to Stripe
- `stripe_sync_error` - Stripe sync failed
- `quickbooks_synced` - Synced to QB
- `quickbooks_sync_error` - QB sync failed
- `change_order_pending` - Change order awaiting approval
- `payment_link_created` - Stripe payment link generated
- `credit_applied` - Credit applied to invoice
- `check_payment` - Check received
- `ach_payment` - ACH transfer received
- `wire_payment` - Wire transfer received
- `cash_payment` - Cash received

## Invoice Types

When creating an invoice:

1. **Full Invoice** - Complete project total
2. **Deposit Invoice** - Deposit amount/percentage only
3. **Balance Invoice** - Remaining balance after deposit
4. **Milestone Invoice** - Based on project milestones
5. **Post-Show Final Invoice** - For adjustments, damages, extras after event
6. **Manual Custom Invoice** - Admin-created with custom line items

## Workflow

### Standard Invoicing Workflow

1. Project created
2. Quote built and confirmed (locks pricing baseline)
3. Admin clicks "Create Invoice"
4. Chooses invoice type
5. Invoice created as Draft (editable)
6. Invoice reviewed
7. Invoice sent:
   - Sent status applied
   - Pushed to Stripe (if enabled)
   - Pushed to QB (if enabled)
   - Email sent to client
8. Payments received from any source
9. Payment records normalized and recorded
10. Invoice updated (amount_paid, amount_due, status, payment_history)
11. QB synced if enabled
12. Dashboard shows correct status

### Payment Recording Flow

```
Payment Received
↓
recordInvoicePayment() function
↓
Create Payment record (normalized)
↓
Update Invoice (amount_paid, amount_due, status)
↓
Update payment_history array
↓
Update supporting_badges
↓
Invoice queries invalidated in UI
↓
Dashboard reflects new state
```

## Backend Functions

### recordInvoicePayment()
Records a payment from any source and updates invoice accordingly.

**Input:**
```javascript
{
  invoice_id: "...",
  amount: 5000.00,
  payment_date: "2024-01-15T10:30:00Z",
  payment_method: "check", // or ach, wire, cash, stripe, etc.
  source_provider: "manual", // or stripe, quickbooks, other
  reference_number: "CHK-12345",
  receipt_url: "...",
  notes: "Check received from client"
}
```

**Output:**
```javascript
{
  success: true,
  payment_id: "payment_uuid",
  invoice_updated: {
    amount_paid: 5000.00,
    amount_due: 5000.00,
    status: "partially_paid"
  }
}
```

### updateOverdueInvoices()
Scheduled function (runs daily) to mark invoices as Overdue when due date passes.

**Logic:**
- Check all non-paid, non-voided invoices
- If due_date < now AND amount_due > 0 → mark Overdue
- If amount_paid >= total → mark Paid

### syncStripePayments()
Syncs completed Stripe payments into Port 24 payment system.

**Logic:**
- Fetch invoices with stripe_payment_intent_id
- For each, retrieve PaymentIntent from Stripe
- If succeeded and not already recorded:
  - Create Payment record
  - Update Invoice (amount_paid, status, badges)
  - Update payment_history

**Also update badges:**
- Add `stripe_synced` on success
- Add `stripe_sync_error` on failure
- Remove sync error badge on successful re-sync

## Billing Flow Options

Admin can choose one of 3 billing flow models via InvoiceSettings:

### 1. Port24/Stripe Primary (Recommended Default)
- Port 24 sends invoice to client via email
- Stripe handles online payment collection
- Stripe webhooks sync payments back to Port 24
- Port 24 syncs invoice/payment to QB for accounting

Flow: Port24 → Stripe Payment Link → Client Pays → Stripe → Port24 ↔ QB

Advantages:
- Client-facing invoicing in Port 24
- Stripe handles secure payments
- QB remains accounting system
- No duplicate invoices

### 2. QuickBooks Primary
- Port 24 invoice pushed to QB
- QB sends invoice to client
- QB payments synced back to Port 24

Flow: QB → Client → QB → Port24

Use when: Client prefers QB invoicing, QB is primary system

### 3. Manual with Optional QB Sync
- Admin creates invoice in Port 24
- Manual payment recording
- Optional push to QB for accounting

Flow: Port24 → Manual Record → Optional QB Sync

Use when: Manual invoicing preferred or custom workflows

## Integration Points

### Stripe Integration

**Fields on Invoice:**
- `stripe_customer_id` - Stripe customer record
- `stripe_invoice_id` - Stripe invoice ID
- `stripe_payment_intent_id` - Payment intent for charging
- `stripe_checkout_session_id` - Session if using Checkout
- `stripe_hosted_invoice_url` - Link to hosted invoice
- `stripe_payment_link` - Link for payment collection
- `stripe_payment_status` - Status from Stripe (draft, open, paid, void, uncollectible)
- `stripe_pdf_url` - PDF invoice from Stripe
- `stripe_receipt_url` - Payment receipt from Stripe
- `stripe_last_sync` - Last sync timestamp
- `stripe_sync_error` - Last error if any

**Webhook Events to Handle:**
- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Refund processed
- `invoice.payment_succeeded` - Invoice paid

### QuickBooks Integration

**Fields on Invoice:**
- `quickbooks_invoice_id` - QB invoice ID
- `quickbooks_customer_id` - QB customer ID
- `quickbooks_invoice_number` - QB invoice number
- `quickbooks_invoice_total` - QB total for validation
- `quickbooks_invoice_balance` - QB balance
- `qb_payment_status` - Sync status (not_synced, pending, synced, needs_review, error)
- `quickbooks_sync_error` - Last sync error
- `qb_last_synced_at` - Last successful sync

**QB Sync Behavior:**
- Connect via OAuth (no manual credential entry)
- Pull/sync customer records
- Push invoices to QB
- Pull QB payments back to Port 24
- Validate totals match

**QB Webhooks:**
- Subscribe to invoice and payment changes
- Fetch updated data and sync to Port 24

## Admin Dashboard

The admin billing dashboard shows:

### Overview Tab
- **Outstanding** - Total sent/partially_paid invoices due
- **Overdue** - Total overdue amount
- **Paid (30 days)** - Revenue in last month
- **Deposits Collected** - Total deposits received
- **Status Breakdown** - Count of invoices by status
- **Issues** - Alerts for needs_review and failed payments

### Invoices Tab
- **Search** - By invoice number, client, project
- **Filter** - By status (All, Draft, Sent, Partially Paid, Paid, Overdue, Voided, Needs Review)
- **Table** - Shows:
  - Invoice number
  - Client
  - Total amount
  - Amount paid
  - Amount due
  - Days until due / OVERDUE
  - Status badge
  - View/manage action

### Invoice Detail View
- Basic info (client, project, dates)
- Financials (subtotal, discounts, tax, total, paid, balance)
- Status and supporting badges
- Full payment history
- Record Payment button (if unpaid)

## Admin Settings

`InvoiceSettings` entity controls:

**Payment Terms**
- default_payment_terms
- custom_due_days

**Deposit Requirements**
- default_deposit_percentage (e.g., 50 for 50%)
- default_deposit_flat_amount (overrides percentage if set)

**Payment Rules**
- allow_partial_payments
- require_deposit_before_picking
- require_final_payment_before_loadin

**Billing Flow**
- billing_flow (port24_stripe_primary, quickbooks_primary, manual_with_optional_qb)

**Integrations**
- stripe_enabled
- quickbooks_enabled
- manual_payments_enabled
- auto_send_on_confirm

**Permissions** (role-based)
- roles_can_create_invoice
- roles_can_record_payment
- roles_can_void_or_refund

**Client Portal**
- client_can_download_pdf
- client_can_view_payment_history
- client_portal_pay_enabled

## Manual Payment Recording

From admin UI, click "Record Payment" on any sent/partially_paid/overdue invoice:

1. Enter amount
2. Select payment date
3. Choose payment method:
   - Check (shows reference field)
   - ACH Transfer
   - Wire Transfer
   - Cash
   - External Card
   - Credit/Comp
   - Other
4. Enter reference number (check #, confirmation #, etc.)
5. Add internal notes
6. Submit

System automatically:
- Creates Payment record
- Updates invoice amount_paid and amount_due
- Updates invoice status (sent → partially_paid, or partially_paid → paid)
- Adds payment to payment_history
- Adds appropriate badge (manual_payment_recorded, check_payment, etc.)
- Invalidates related queries so UI updates immediately

## Overdue Management

### Automatic Overdue Detection
`updateOverdueInvoices()` runs daily:
- Finds invoices with due_date < today
- Where amount_due > 0
- Sets status to `overdue`

### Overdue Display
- Invoice table highlights overdue row
- Overdue badge shows on invoice
- Dashboard alerts on admin overview
- Project page flags overdue balance

### Overdue Invoice Rules
- Can still receive payments
- Shows alert to admin
- Client notified (future: email reminders)
- Cannot be edited unless marked Needs Review

## Invoice Locking & Changes

### Draft Invoices
- Fully editable
- No restrictions

### Sent Invoices
- Should NOT be silently changed
- If changes needed:
  - Mark `Needs Review`
  - Create revision
  - Create credit
  - Create adjustment
  - Create change order
  - Void and recreate if necessary

### When to Mark Needs Review
- Project pricing changed post-invoice
- Quote changed post-invoice
- Picklist/gear changed affecting billable items
- Adjustment Mode impacts billing
- Stripe ↔ Port24 totals don't match
- QB ↔ Port24 totals don't match
- Manual correction needed
- Invoice edited after sending
- Payment or sync issue requiring review

### Paid Invoices
- No direct edits
- Use:
  - Credit memo
  - Refund
  - Adjustment invoice
  - Change order invoice

## Payment History Record

Each payment in `payment_history` array contains:
```javascript
{
  id: "payment_uuid",
  payment_id: "reference_to_payment_entity",
  date: "2024-01-15T10:30:00Z",
  amount: 5000.00,
  method: "check",
  source: "manual", // or stripe, quickbooks, other
  reference_number: "CHK-12345",
  receipt_url: "...",
  recorded_by: "user@example.com",
  notes: "Check from client"
}
```

This mirrors Payment entity for denormalization so payment history is always available on invoice without join query.

## Client Portal

Client can view invoices and payments:
- List of open, partially paid, and paid invoices
- Download invoice PDF
- View payment history
- Check balance due
- Click "Pay Now" if Stripe enabled
- Download receipt
- Submit billing question

Clients see:
- Total, amount due, due date, payment terms
- Line items (but NOT internal costs)
- Payment history
- Terms and conditions

Clients DON'T see:
- Internal costs (equipment cost, crew pay, subrent cost)
- Profit margins
- Internal notes
- Admin-only adjustments
- Sync error details

## Sync Status Management

### Stripe Sync
- `stripe_synced` badge added on successful sync
- `stripe_sync_error` badge added if fails
- `stripe_sync_error` removed on successful re-sync
- Never use "Stripe Sync Error" as main invoice status

### QuickBooks Sync
- `qb_payment_status`: not_synced → pending → synced
- `quickbooks_synced` badge added on success
- `quickbooks_sync_error` badge added if fails
- `quickbooks_sync_error` removed on successful re-sync
- Never use "QB Sync Error" as main invoice status

## Permissions

Only certain roles can perform billing actions:

**Create/Edit Invoice:**
- admin
- managing_director
- project_manager

**Record Manual Payment:**
- admin
- project_manager

**Void/Refund:**
- admin

**Push to QB / Sync QB:**
- admin

**Connect/Disconnect QB:**
- admin

**Connect/Disconnect Stripe:**
- admin

## Audit Log

Log events:
- Invoice created
- Invoice edited
- Invoice sent
- Payment received
- Manual payment recorded
- Invoice voided
- Credit/refund issued
- QB sync executed
- QB sync error
- Stripe payment updated
- Invoice marked Needs Review
- Change order created
- Payment source connected/disconnected

## Implementation Roadmap

### Phase 1: Core (Complete)
✅ Entities: Invoice, Payment, InvoiceSettings
✅ Simplified statuses (7 main statuses)
✅ Supporting badges
✅ recordInvoicePayment() function
✅ Admin billing dashboard
✅ Manual payment recording UI

### Phase 2: Automation (Next)
⚠️ updateOverdueInvoices() scheduled automation
⚠️ Stripe webhook handling
⚠️ syncStripePayments() function

### Phase 3: QuickBooks Integration
☐ QB OAuth connect
☐ QB sync function
☐ QB webhook handler
☐ QB customer/invoice push
☐ QB payment pull

### Phase 4: Client Portal
☐ Invoice list view
☐ Download PDF
☐ Pay Now button (Stripe)
☐ Payment history view

### Phase 5: Invoicing UI
☐ Create invoice wizard
☐ Invoice type selection
☐ Line item builder
☐ Preview & send
☐ Edit draft
☐ Create revision
☐ Create credit
☐ Create adjustment

## Key Design Decisions

1. **Normalized Payment Records** - All payments stored in unified Payment entity so any source (Stripe, QB, manual, etc.) can contribute to invoice balance

2. **Simplified Statuses** - Only 7 main statuses for clarity, supporting badges for details

3. **No Direct Payment Total Calculation** - amount_paid and amount_due stored on Invoice (denormalized) for performance; updated when payment recorded

4. **payment_history Denormalized** - Mirrored on Invoice so full history available without join query

5. **Badges Not Statuses** - Sync status, payment method, etc. are badges, not main statuses, for simplicity

6. **Port24 as Operational Hub** - QB remains accounting system, Stripe remains payment processor, Port 24 is the project/billing operations center

7. **One Click Stripe Connect** - User clicks "Connect Stripe" button, not entering API keys manually

8. **One Click QB Connect** - User clicks "Connect QB" button, redirected to Intuit OAuth (not manual token entry)

## Future Enhancements

- Invoice revisions tracking
- Automatic email reminders for overdue invoices
- Partial payment installment plans
- Multi-currency support
- PDF email delivery
- ACH batch processing
- Invoice templates customization
- Custom payment terms
- Dunning workflows
- Payment plans / subscription invoicing
- Finance reporting dashboards
- Aging reports