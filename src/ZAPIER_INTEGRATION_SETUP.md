# Zapier Integration Setup Guide

## Overview
This app now syncs invoices, payments, and customers to QuickBooks via **Zapier webhooks** instead of direct OAuth.

## Webhook Endpoint
Your Port 24 webhook URL (share this with Zapier):
```
https://yourapp.com/api/functions/zapierWebhook
```

## Setting Up Zapier

### 1. Create a Zap
- Go to **zapier.com** and create a new Zap
- Choose **Webhooks by Zapier** as the trigger
- Select **Catch Raw Hook**

### 2. Copy Webhook URL
- Zapier will generate a unique webhook URL
- Use this to send test events and verify it works

### 3. Create Actions for Each Sync Type

#### **Action 1: Sync Invoice to Port 24**
- Trigger: Invoice created/updated in QuickBooks
- Action: **POST to** `https://yourapp.com/api/functions/zapierWebhook`
- Body:
```json
{
  "event_type": "invoice.created",
  "data": {
    "qb_invoice_id": "{{invoice_id}}",
    "client_name": "{{customer_name}}",
    "total": {{amount}},
    "status": "{{status}}"
  }
}
```

#### **Action 2: Sync Payment to Port 24**
- Trigger: Payment received in QuickBooks
- Action: **POST to** `https://yourapp.com/api/functions/zapierWebhook`
- Body:
```json
{
  "event_type": "payment.created",
  "data": {
    "qb_payment_id": "{{payment_id}}",
    "invoice_id": "{{invoice_id}}",
    "amount": {{amount}},
    "payment_date": "{{date}}"
  }
}
```

#### **Action 3: Sync Customer to Port 24**
- Trigger: Customer created/updated in QuickBooks
- Action: **POST to** `https://yourapp.com/api/functions/zapierWebhook`
- Body:
```json
{
  "event_type": "customer.created",
  "data": {
    "qb_customer_id": "{{customer_id}}",
    "company_name": "{{company_name}}"
  }
}
```

## Optional Security
To add webhook signature validation, set this secret in your app:
```
ZAPIER_WEBHOOK_SECRET=your-secret-key
```

Then add the header validation in Zapier (requires custom header setup).

## Testing
1. In Zapier, click **Send Test**
2. Check the webhook logs in your app to verify data arrived
3. Verify the data was correctly synced to your database

## Reverse Sync (Port 24 → QuickBooks)
To send invoices from Port 24 to QuickBooks via Zapier:
1. Create another Zap with **Webhooks by Zapier** trigger
2. Listen for a webhook POST from Port 24
3. Add a **Webhook** action that POSTs to your Zapier-forwarding webhook
4. Set up QuickBooks as the final action to create/update records

---

**Need help?** Refer to [Zapier Webhooks Documentation](https://zapier.com/blog/what-is-a-webhook/)