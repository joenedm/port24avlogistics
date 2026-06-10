# Gear Flow Stripe Billing Dashboard

Complete, production-ready billing system for project-based equipment rentals, live events, AV production, crew services, and logistics.

## 📖 Documentation

Choose your guide based on your needs:

### Getting Started (5 minutes)
→ **[BILLING_QUICK_START.md](./BILLING_QUICK_START.md)**
- Stripe API key setup
- Webhook configuration
- Common tasks and quick reference
- Testing with test cards

### Feature Details
→ **[BILLING_FEATURES.md](./BILLING_FEATURES.md)**
- Feature walkthroughs (Admin Dashboard, Project Tab, Client Portal)
- Payment workflows explained
- Invoice statuses and transitions
- Field reference
- Permission matrix

### Complete Setup Guide
→ **[BILLING_SETUP.md](./BILLING_SETUP.md)**
- Detailed Stripe configuration
- Webhook event reference
- Status reference table
- Payment term options
- Admin actions
- Security model
- Troubleshooting

### Technical Implementation
→ **[BILLING_IMPLEMENTATION_SUMMARY.md](./BILLING_IMPLEMENTATION_SUMMARY.md)**
- Files created and modified
- Code statistics
- API integration points
- Security architecture
- Performance optimizations
- Future enhancement roadmap

---

## 🎯 What's Included

### Pages (2)
- **Admin Billing Dashboard** (`/billing`) — Overview, invoices, client balances
- **Client Billing Portal** (`/client-billing`) — View and pay invoices

### Components (1)
- **Project Billing Panel** (in Show Detail → Billing tab) — Full invoice management

### Backend Functions (2)
- `createStripeInvoice` — Create Stripe invoices from Gear Flow invoices
- `handleStripeWebhook` — Process Stripe payment events in real-time

### Database
- Expanded `Invoice` entity with Stripe fields, deposit tracking, payment history

---

## 🚀 Features

### Workflows
✅ Full payment via Stripe  
✅ Deposit + final balance  
✅ Partial payments  
✅ Manual payment recording (check, bank transfer)  
✅ Refund processing  
✅ Credit adjustments  
✅ Overdue invoice tracking  
✅ Failed payment handling  

### Statuses
✅ Draft, Sent, Viewed  
✅ Partially Paid, Paid  
✅ Overdue, Failed, Refunded  
✅ Voided, Disputed  

### Payment Terms
✅ Due on receipt  
✅ Due before load-in / event  
✅ Net 15, 30, 45, 60  
✅ Custom due dates  

### Admin Actions
✅ Send invoice to Stripe  
✅ Copy payment link  
✅ Record manual payment  
✅ Download PDF  
✅ View payment history  
✅ Mark as disputed  
✅ Add internal & client-visible notes  

### Client Access
✅ View active invoices due  
✅ View paid invoices  
✅ Pay via Stripe  
✅ Download invoice & receipt  
✅ Deposit tracking  
✅ Secure (no internal costs visible)  

---

## 🔧 Quick Setup

1. **Get Stripe Secret Key** from [stripe.com](https://stripe.com)
2. **Set in Base44:** Dashboard → Settings → Environment Variables
   ```
   STRIPE_API_KEY: sk_live_...
   STRIPE_WEBHOOK_SECRET: whsec_...
   ```
3. **Create Webhook:** Stripe → Developers → Webhooks
   - URL: `https://yourapp.base44.app/functions/handleStripeWebhook`
   - Events: invoice.payment_succeeded, invoice.payment_failed, charge.refunded, invoice.voided

**Done!** Full billing system is live.

For detailed setup → **[BILLING_QUICK_START.md](./BILLING_QUICK_START.md)**

---

## 📊 Admin Dashboard (`/billing`)

**Overview Tab**
- Outstanding invoices (unpaid + partially paid)
- Paid invoices (last 30 days)
- Overdue invoices
- Failed payments
- Invoice count breakdown

**Invoices Tab**
- Searchable/filterable invoice table
- Filter by status (draft, sent, paid, overdue, etc.)
- Quick view: Invoice #, Client, Project, Total, Paid, Due, Status

**Client Balances Tab**
- How much each client owes
- Total paid vs. due
- Overdue amounts highlighted

---

## 💳 Project Billing Tab

Found in: **Project Detail** → **Billing tab**

**Status & Summary**
- Current invoice status
- Payment summary (total, paid, due)

**Billing Details**
- Client and contact info
- Project dates
- Payment terms & PO
- Tax exempt status

**Deposit Tracking** (if applicable)
- Deposit required
- Deposit paid
- Remaining deposit

**Admin Actions**
- Send to Stripe
- Copy payment link
- Record manual payment
- Download PDF
- View payment history

---

## 🛡️ Client Portal (`/client-billing`)

**For Clients**
- View invoices due
- View paid invoices
- Pay with Stripe
- Download PDFs
- Download receipts
- See deposit status

**Security**
- Clients see only their invoices
- No internal costs, crew wages, or profit margins
- Internal notes hidden
- Time-limited URLs

---

## 🔐 Security

✅ Role-based access (director+ for dashboard)  
✅ Admin-only actions (send, record payment, download)  
✅ Client portal authentication  
✅ Clients see only their data  
✅ Internal costs hidden from clients  
✅ Stripe webhook signature verification  
✅ Time-limited PDF/receipt URLs  

---

## 💡 Workflows Example

### Scenario: $25k Project with $5k Deposit

1. **Day 1:** Admin clicks "Send to Stripe"
   - Stripe invoice created
   - Client receives payment link
   - Invoice status: **Sent**

2. **Day 2:** Client pays $5k deposit
   - Stripe webhook fires
   - Status: **Partially Paid**
   - Shows: $5k paid, $20k due
   - Invoice date: auto-recorded

3. **Day 7:** Admin sends payment link reminder
   - Admin clicks "Copy Payment Link"
   - Sends URL to client

4. **Day 10:** Client pays final $20k
   - Stripe webhook fires
   - Status: **Paid**
   - Invoice complete
   - Receipt URL available

### Alternative: Manual Check Payment
1. Admin clicks "Record Payment"
2. Enters: $20,000, method "Check", notes "Check #1234"
3. System updates: $25k paid, status **Paid**
4. Payment appears in history with timestamp

---

## 🧪 Test Mode

Use these Stripe test cards:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- Any CVC: `123`
- Any future expiry: `12/25`

Webhooks fire automatically on test payments.

---

## 📋 Invoice Statuses

| Status | Meaning |
|--------|---------|
| Draft | Not yet sent |
| Sent | Sent to client, awaiting payment |
| Viewed | Client opened invoice |
| Partially Paid | Some payment received |
| Paid | Full payment complete |
| Overdue | Past due date, unpaid |
| Failed | Stripe payment failed |
| Refunded | Full refund issued |
| Voided | Cancelled by admin |
| Disputed | Under review |

---

## 🆘 Support & Troubleshooting

**Setup not working?**
→ [BILLING_SETUP.md](./BILLING_SETUP.md) Troubleshooting section

**Want to know more about features?**
→ [BILLING_FEATURES.md](./BILLING_FEATURES.md)

**Need technical details?**
→ [BILLING_IMPLEMENTATION_SUMMARY.md](./BILLING_IMPLEMENTATION_SUMMARY.md)

**Quick task reference?**
→ [BILLING_QUICK_START.md](./BILLING_QUICK_START.md) Quick Reference table

---

## 🎓 Key Concepts

### Deposit Tracking
- Set `deposit_required` on invoice
- Track `deposit_paid` separately from total payment
- System shows remaining deposit due
- Final balance due = total - deposit_paid

### Payment History
- Complete audit trail of all transactions
- Each entry: date, type, amount, method, notes
- Includes Stripe charge IDs for reference
- Immutable (for audit purposes)

### Client Portal Security
- Automatic based on ClientContact portal_user_id
- Shows only invoices for client's company
- Hides: internal costs, crew wages, subrent costs, profit margins
- Hides: internal notes, admin-only adjustments

### Real-time Sync
- Stripe webhooks update invoices immediately
- Payment status confirmed before marking paid
- Refunds automatically sync
- PDF and receipt URLs captured from Stripe

---

## 📈 Metrics Tracked

**Dashboard shows:**
- Total outstanding (unpaid + partially paid)
- Total paid (last 30 days)
- Total overdue
- Failed payments
- Monthly revenue
- Invoice count by status

**Per-invoice:**
- Total amount
- Amount paid
- Amount due
- Deposit paid (if applicable)
- Days until/past due
- Payment history

**Per-client:**
- Total owes
- Total paid
- Overdue amount

---

## 🚀 Production Checklist

- [ ] Stripe API key configured
- [ ] Webhook endpoint added and signing secret set
- [ ] Admin can send invoice to Stripe
- [ ] Client can pay and see status update
- [ ] Payment history records correctly
- [ ] Manual payment recording works
- [ ] Refund syncs from Stripe
- [ ] Client portal accessible
- [ ] Client sees only their invoices
- [ ] Internal costs hidden from client
- [ ] Test with all payment methods (Stripe, check, wire)

---

## 📞 Quick Links

- **Dashboard:** `/billing`
- **Client Portal:** `/client-billing`
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Stripe Docs:** https://stripe.com/docs

---

**Status:** ✅ Production Ready (pending Stripe API key configuration)

**Next step:** Follow [BILLING_QUICK_START.md](./BILLING_QUICK_START.md) for 5-minute setup.