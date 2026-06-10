# Port 24 Invoicing - Quick Start Guide

## Getting Started

### 1. Configure Invoice Settings
Navigate to **Admin → Invoice Settings** (add this soon) and configure:
- Default payment terms (Net 30, Due on Receipt, etc.)
- Default deposit percentage (50% recommended)
- Billing flow (Port24/Stripe primary recommended)
- Enable integrations (Stripe, QB, manual payments)

### 2. Access Billing Dashboard
Go to **Billing → Administration** → Invoices tab

## Common Tasks

### Creating an Invoice (When Implemented)
1. Go to Project → Click "Create Invoice"
2. Choose invoice type:
   - **Full Invoice** - Entire project total
   - **Deposit** - 50% upfront
   - **Balance** - Remaining after deposit
   - **Post-Show** - Adjustments, damages, extras
3. Review line items from quote/project
4. Add discounts, taxes if needed
5. Set due date
6. Save as Draft
7. Preview → Send to Client

### Recording a Manual Payment
1. Go to **Billing → Administration**
2. Find invoice in table
3. Click **View** to open detail panel
4. Click **Record Payment**
5. Enter:
   - Amount
   - Payment date
   - Payment method (Check, ACH, Wire, Cash, etc.)
   - Reference # (check #, wire ref, etc.)
   - Notes
6. Submit

**What happens automatically:**
- Payment recorded
- Invoice amount_paid updated
- Invoice amount_due updated
- Invoice status updated (Sent → Partially Paid → Paid)
- Payment added to history
- UI refreshes

### Connecting Stripe (When Ready)
1. Go to **Billing → Administration → Sidebar**
2. Click **Connect Stripe**
3. Redirected to Stripe login
4. Authorize Port 24
5. Stripe connected, payment links now available

### Connecting QuickBooks (When Ready)
1. Go to **Admin Settings** (create this)
2. Click **Connect QuickBooks**
3. Redirected to Intuit OAuth
4. Log into your QB Online account
5. Select company
6. Authorize Port 24
7. QB connected, invoices will sync

## Invoice Status Reference

| Status | Meaning | Can Receive Payments |
|--------|---------|----------------------|
| **Draft** | Being created, not sent | No |
| **Sent** | Sent to client, waiting for payment | Yes |
| **Partially Paid** | Partial payment received | Yes |
| **Paid** | Fully paid | No |
| **Overdue** | Past due date, still owed | Yes |
| **Voided** | Canceled | No |
| **Needs Review** | Flagged for manager review | No |

## Dashboard Overview

**Key Metrics:**
- **Outstanding** - Total amount waiting for payment
- **Overdue** - Past due but unpaid
- **Paid (30 days)** - Revenue collected this month
- **Deposits Collected** - Total deposits received

**Status Breakdown:**
- Count of invoices in each status
- Quick way to see what needs attention

**Issues Alert:**
- Shows if any invoices marked "Needs Review"
- Shows failed payment count

## Badges Explained

Additional flags that appear on invoices:

**Sync Status:**
- 🟢 **Stripe Synced** - Synced to Stripe successfully
- 🔴 **Stripe Error** - Stripe sync failed
- 🟢 **QB Synced** - Synced to QuickBooks successfully
- 🔴 **QB Error** - QB sync failed

**Payment Method:**
- ✓ Check Payment
- ✓ ACH Payment
- ✓ Wire Payment
- ✓ Cash Payment

**Other:**
- 👁️ **Viewed** - Client opened the invoice
- ❌ **Payment Failed** - Stripe payment failed
- 💳 **Payment Link Created** - Stripe payment link ready
- 🛑 **Payment Failed** - Payment declined

## Invoice Detail View

When you click **View** on an invoice:

**Top Section:**
- Client, Project, Invoice dates
- Due date

**Financials:**
- Subtotal
- Discounts
- Taxes
- **Total** - Full amount
- **Amount Paid** - Received so far
- **Balance Due** - Still owed

**Status & Badges:**
- Main status (Draft, Sent, Paid, etc.)
- Supporting badges

**Payment History:**
- Date, amount, method received
- Check #, wire reference, etc.

**Action Buttons:**
- **Record Payment** - Add manual payment
- (Download PDF, Send Email - coming soon)

## When to Mark "Needs Review"

Mark an invoice `Needs Review` if:
- ⚠️ Project pricing changed after invoice sent
- ⚠️ Quote changed after invoice sent
- ⚠️ Gear/picklist changed affecting billing
- ⚠️ Stripe payment amount doesn't match
- ⚠️ QB total doesn't match Port 24 total
- ⚠️ Damage charges or extras need approval
- ⚠️ Client disputed invoice amount
- ⚠️ Manual correction needed
- ⚠️ Any sync error occurred

## Payment Flow Examples

### Example 1: Invoice → Payment → Closed
```
1. Create $10,000 invoice → Status: Draft
2. Send to client → Status: Sent
3. Client pays $10,000 → Status: Paid
```

### Example 2: Deposit + Balance
```
1. Create $10,000 invoice for 50% deposit → Status: Draft
2. Send deposit invoice → Status: Sent
3. Client pays $5,000 → Status: Partially Paid
4. Create balance invoice for $5,000 → Status: Draft
5. Send balance invoice → Status: Sent
6. Client pays $5,000 → Status: Paid
```

### Example 3: Overdue Recovery
```
1. Create $10,000 invoice → Status: Draft
2. Send with Net 30 terms → Status: Sent (due Jan 15)
3. Jan 16: Auto-updated → Status: Overdue
4. Jan 18: Client pays $10,000 → Status: Paid
```

### Example 4: Partial Payment Recovery
```
1. Create $10,000 invoice → Status: Draft
2. Send → Status: Sent
3. Client pays $3,000 → Status: Partially Paid ($7,000 due)
4. 2 days later: Client pays $4,000 → Status: Partially Paid ($3,000 due)
5. Final payment $3,000 → Status: Paid
```

## Settings & Configuration

**Available in InvoiceSettings:**
- Default terms (Net 30, Net 15, etc.)
- Default deposit % (50% typical)
- Allow partial payments? (Yes/No)
- Require deposit before picking? (Yes/No)
- Require final payment before load-in? (Yes/No)

**Integration Toggles:**
- Stripe payment collection? (Yes/No)
- QuickBooks sync? (Yes/No)
- Manual payments? (Yes/No)

**Role Permissions:**
- Who can create invoices?
- Who can record manual payments?
- Who can void/refund?

## Troubleshooting

### Payment not showing up?
1. Check payment amount entered correctly
2. Check payment date is correct
3. Click **Refresh** button on dashboard
4. Invoice should update within 5 seconds

### Status not updating?
1. Click **Refresh** button
2. Reload page
3. Check payment was actually recorded

### Stripe connection failed?
1. Verify you have Stripe account set up
2. Try connecting again
3. Check error message for details

### QB connection failed?
1. Verify QB account exists
2. Have valid QB Online subscription
3. Try connecting again
4. Allow popup for OAuth redirect

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Payment recorded but invoice still says "Sent" | Click Refresh, reload page |
| Overdue invoices not updating | Scheduled task runs daily, manual update coming |
| Payment disappeared | Check payment history, may have sync error |
| Stripe sync error on invoice | Check Stripe account, try manual sync |
| QB sync error on invoice | Check QB connection, verify user permissions |

## What's Coming Soon

✅ **Done:**
- Invoice entities and statuses
- Payment tracking
- Manual payment recording
- Admin dashboard

📋 **In Progress:**
- Invoice creation wizard
- Deposit workflows
- Stripe payment link generation
- Stripe webhook handling

🔄 **Next:**
- QuickBooks integration
- Email sending
- PDF generation
- Client portal
- Invoice revisions

## Support & Resources

**Full Documentation:** `PORT24_INVOICING_SYSTEM.md`

**API Reference:** See backend function docs in code

**Admin Settings:** `/admin/invoice-settings` (when created)

**Billing Dashboard:** `/billing` (current page)