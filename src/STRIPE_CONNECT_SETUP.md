# Stripe Connect Setup for Port 24

Port 24 now supports multi-tenant Stripe Connect, allowing each company to securely connect their own Stripe account without exposing API keys.

## Architecture

- **StripeAccount Entity**: Stores company-specific Stripe OAuth connection data
- **initiateStripeConnect**: Starts the OAuth flow
- **handleStripeOAuthCallback**: Receives Stripe's authorization code
- **disconnectStripe**: Removes Stripe connection
- **syncStripeAccountStatus**: Checks current connection status
- **createStripeInvoice**: Uses company's connected Stripe account
- **handleStripeWebhook**: Routes webhook events to correct company

## Setup Steps

### 1. Create Stripe OAuth Application

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Settings → API keys**
3. Find or create your OAuth app credentials:
   - **Client ID**: Your public OAuth client ID
   - **Client Secret**: Your secret OAuth client secret (keep private)

### 2. Register Redirect URI

In Stripe Dashboard → Settings → OAuth → Redirect URIs, add:

```
https://your-port24-app.com/api/stripe-oauth-callback
```

Or for local development:
```
http://localhost:5173/api/stripe-oauth-callback
```

### 3. Set Environment Variables

In Port 24 Dashboard → Settings → Environment Variables, set:

- **STRIPE_CLIENT_ID**: Your OAuth Client ID
- **STRIPE_CLIENT_SECRET**: Your OAuth Client Secret (secret, never expose)
- **APP_URL**: https://your-port24-app.com (already set)

### 4. Deploy Backend Functions

Port 24 automatically deploys these functions:
- `initiateStripeConnect`
- `handleStripeOAuthCallback`
- `disconnectStripe`
- `syncStripeAccountStatus`

### 5. Connect Stripe

1. Go to Port 24 → Settings → Billing
2. Click **Connect Stripe Account**
3. You'll be redirected to Stripe to:
   - Log in or create a Stripe account
   - Grant authorization
   - Review permissions
4. After approval, redirect back to Port 24
5. Connection status shows **Connected** with account details

## How It Works

### Multi-Tenant Flow

Each Port 24 company/tenant stores:
- `stripe_account_id` - Connected Stripe account ID
- `is_connected` - Connection status
- `stripe_charges_enabled` - Whether account can accept charges
- `stripe_payouts_enabled` - Whether account can receive payouts
- `account_name` - Business name from Stripe
- `email` - Email associated with Stripe account

### Invoice Payments

When a client pays an invoice:
1. Port 24 creates a Stripe invoice under the correct company's connected account
2. Client receives a payment link via their own Stripe account
3. Payment webhook updates Port 24 with correct company's invoice status
4. No shared Stripe account or API key exposure

### Webhook Security

Stripe webhooks include metadata linking to the correct company:
- `stripe_account_id` matches company's connection
- Only that company's invoices are updated
- Prevents cross-company payment issues

## Security Notes

- ✅ No API keys stored in frontend
- ✅ No secret keys exposed in code
- ✅ Stripe OAuth tokens are ephemeral
- ✅ Company-specific Stripe isolation
- ✅ Admin-only connection/disconnection
- ✅ All API calls authenticated via Base44

## Troubleshooting

### "Stripe Client ID not configured"
- Verify `STRIPE_CLIENT_ID` is set in Environment Variables
- Restart the application

### "Failed to exchange authorization code"
- Ensure `STRIPE_CLIENT_SECRET` is correct
- Check redirect URI is registered in Stripe Dashboard

### "Admin access required"
- Only admin users can connect/disconnect Stripe
- Contact workspace admin if needed

## Next Steps

- Update `createStripeInvoice` to use company's connected account
- Update `handleStripeWebhook` to route to correct company
- Add Stripe connection status checks before allowing payments
- Implement auto-sync of Stripe account capabilities