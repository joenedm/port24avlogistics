# QuickBooks Sync Service Architecture

## Overview
Port 24 is now a **QB Sync Client** that calls an external **QuickBooks Sync Service** for all OAuth, token management, and API operations. This separates concerns and allows Port 24 to focus on billing/project management while the external service handles accounting integration.

## System Architecture

```
┌─────────────────────────┐
│  Port 24 (Base44 App)   │
│  ✓ Invoices             │
│  ✓ Payments             │
│  ✓ Clients              │
│  ✓ Projects             │
└────────────┬────────────┘
             │ REST calls
             ▼
┌─────────────────────────────────────┐
│ QB Sync Service (External)          │
│ ✓ Intuit OAuth 2.0                  │
│ ✓ Token storage & refresh           │
│ ✓ QB API calls                      │
│ ✓ Webhook handling                  │
│ ✓ Sync logs                         │
└────────────┬────────────────────────┘
             │ API calls
             ▼
┌──────────────────────────┐
│ QuickBooks Online        │
│ ✓ Customers              │
│ ✓ Invoices               │
│ ✓ Payments               │
└──────────────────────────┘
```

## Port 24 Backend Functions

### `qbGetConnectURL`
Opens the QB OAuth flow via the external service.

**Endpoint:** `POST /api/functions/qbGetConnectURL`
**Returns:** `{ connect_url: "https://sync.service.com/quickbooks/connect?..." }`

### `qbGetStatus`
Checks connection status and last sync time.

**Endpoint:** `POST /api/functions/qbGetStatus`
**Returns:**
```json
{
  "is_connected": true,
  "company_name": "Acme Inc",
  "last_sync_at": "2026-06-09T10:30:00Z",
  "error": null
}
```

### `qbSyncInvoice`
Pushes a Port 24 invoice to QuickBooks.

**Endpoint:** `POST /api/functions/qbSyncInvoice`
**Body:**
```json
{
  "invoice_id": "invoice-123"
}
```
**Returns:**
```json
{
  "success": true,
  "quickbooks_invoice_id": "qb-inv-456",
  "quickbooks_customer_id": "qb-cust-789"
}
```

### `qbPullPayments`
Fetches recent payments from QuickBooks and creates Payment records in Port 24.

**Endpoint:** `POST /api/functions/qbPullPayments`
**Returns:**
```json
{
  "success": true,
  "payments_imported": 5
}
```

### `qbDisconnectAccount`
Revokes the QB connection (admin only).

**Endpoint:** `POST /api/functions/qbDisconnectAccount`
**Returns:** `{ "success": true }`

### `qbLinkInvoice`
Links an existing QB invoice to a Port 24 invoice.

**Endpoint:** `POST /api/functions/qbLinkInvoice`
**Body:**
```json
{
  "invoice_id": "port24-inv-123",
  "quickbooks_invoice_id": "qb-inv-456"
}
```
**Returns:** `{ "success": true }`

---

## External QB Sync Service API

Your external service must implement these endpoints:

### `GET /quickbooks/connect?company_id={id}&return_url={url}`
Initiates OAuth flow. Redirects user to Intuit login.

**Response:**
```json
{
  "connect_url": "https://appcenter.intuit.com/connect/oauth2?..."
}
```

### `GET /quickbooks/status?company_id={id}`
Returns connection and sync status.

**Response:**
```json
{
  "is_connected": true,
  "company_name": "Acme Inc",
  "realm_id": "1234567890",
  "last_sync_at": "2026-06-09T10:30:00Z",
  "error": null
}
```

### `POST /quickbooks/sync-invoice`
Receives Port 24 invoice, creates/updates QB invoice.

**Request:**
```json
{
  "company_id": "port24-company-id",
  "invoice": {
    "id": "port24-inv-123",
    "invoice_number": "INV-001",
    "client": "Acme Inc",
    "total": 5000,
    "line_items": [...],
    "due_date": "2026-07-09"
  }
}
```

**Response:**
```json
{
  "quickbooks_invoice_id": "qb-inv-456",
  "quickbooks_customer_id": "qb-cust-789",
  "quickbooks_invoice_number": "1001",
  "status": "synced"
}
```

### `POST /quickbooks/pull-payments`
Fetches recent QB payments for this company.

**Request:**
```json
{
  "company_id": "port24-company-id"
}
```

**Response:**
```json
{
  "payments": [
    {
      "quickbooks_payment_id": "qb-pay-123",
      "quickbooks_invoice_id": "qb-inv-456",
      "amount": 5000,
      "payment_date": "2026-06-09T10:00:00Z",
      "reference_number": "CHK-001",
      "method": "check"
    }
  ]
}
```

### `POST /quickbooks/disconnect`
Revokes OAuth token and clears connection.

**Request:**
```json
{
  "company_id": "port24-company-id"
}
```

**Response:**
```json
{
  "success": true
}
```

### `POST /quickbooks/link-invoice`
Links an existing QB invoice to Port 24.

**Request:**
```json
{
  "company_id": "port24-company-id",
  "invoice_id": "port24-inv-123",
  "quickbooks_invoice_id": "qb-inv-456"
}
```

**Response:**
```json
{
  "quickbooks_invoice_id": "qb-inv-456",
  "quickbooks_customer_id": "qb-cust-789",
  "quickbooks_invoice_number": "1001"
}
```

---

## QB Webhook Flow (Service Side)

When QuickBooks sends a webhook (via the external service):

1. QB sends payment/invoice update to external service
2. External service validates webhook signature
3. External service updates QB records in database
4. External service posts to Port 24 webhook endpoint (optional):
   ```
   POST https://port24.app/api/functions/zapierWebhook
   ```
   (Or use a dedicated webhook endpoint if you build one)

---

## Port 24 Invoice Fields for QB Sync

Invoice records now store:

| Field | Purpose |
|-------|---------|
| `quickbooks_customer_id` | QB Customer ID |
| `quickbooks_invoice_id` | QB Invoice ID |
| `quickbooks_invoice_number` | QB Invoice # |
| `quickbooks_sync_status` | `not_synced`, `pending`, `synced`, `error` |
| `quickbooks_sync_error` | Error message if sync failed |
| `last_quickbooks_sync_at` | Timestamp of last sync |

Invoice **status** remains simple (Draft, Sent, Paid, etc.) and is **independent** of QB sync status.

---

## Port 24 Payment Fields for QB Sync

Payment records now store:

| Field | Purpose |
|-------|---------|
| `source_provider` | `stripe`, `quickbooks`, `manual`, `other` |
| `source_payment_id` | QB transaction ID if from QB |
| `source_invoice_id` | QB invoice ID if from QB |
| `reference_number` | Check #, wire ref, etc. |
| `sync_status` | `synced`, `error`, `manual`, etc. |

---

## Setup Instructions

### 1. Deploy External QB Sync Service
Host the service somewhere accessible (AWS, Render, etc.).

### 2. Set QB_SYNC_SERVICE_URL in Port 24
In Base44 **Settings → Environment Variables**, add:
```
QB_SYNC_SERVICE_URL=https://your-sync-service.com
```

### 3. Configure Intuit App
In your external service, register an Intuit app at https://developer.intuit.com:
- Set OAuth redirect URI to: `https://your-sync-service.com/quickbooks/oauth-callback`
- Store `client_id` and `client_secret` securely in the service

### 4. Test Connection
1. Go to Port 24 Admin → Accounting
2. Click **Connect QuickBooks**
3. Authorize via Intuit
4. Service redirects back to Port 24

### 5. Test Invoice Sync
1. Create an invoice in Port 24
2. Click **Push to QuickBooks** button (you'll add this to InvoiceDetail UI)
3. Verify invoice appears in QB

### 6. Test Payment Pull
1. Receive payment in QB
2. Click **Pull Payments** in Port 24 Admin
3. Payment appears in Port 24 Payment list

---

## Security Considerations

- **OAuth tokens:** Stored securely in external service (never in Port 24)
- **Token refresh:** Handled by external service
- **Webhooks:** Sign and validate all incoming webhooks
- **QB API calls:** Rate-limit to avoid QB throttling
- **Error logging:** Log all sync failures for debugging

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "QB_SYNC_SERVICE_URL not configured" | Set env var in Base44 Settings |
| OAuth fails | Verify redirect URI matches in Intuit app config |
| Invoices won't sync | Check QB customer exists or auto-create in service |
| Payments not pulling | Verify webhook secret matches in service |