# QB Sync Service Deployment Guide

## Quick Start

### 1. Register Intuit App
1. Go to https://developer.intuit.com
2. Create a new app (Accounting)
3. Get your **Client ID** and **Client Secret**
4. Set **Redirect URI** to: `https://your-service-domain.com/quickbooks/oauth-callback`

### 2. Deploy to Render (Recommended)

**Create GitHub repo and push QB_SYNC_SERVICE folder:**

```bash
git init
git add QB_SYNC_SERVICE/*
git commit -m "Initial QB Sync Service"
git remote add origin https://github.com/your-org/qb-sync-service.git
git push -u origin main
```

**Deploy on Render:**

1. Go to https://render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Set **Name**: `qb-sync-service`
5. Set **Start Command**: `npm start`
6. Add environment variables:
   - `INTUIT_CLIENT_ID` = your client ID
   - `INTUIT_CLIENT_SECRET` = your client secret
   - `SERVICE_URL` = https://qb-sync-service.render.com (from Render dashboard)
   - `PORT24_URL` = https://port24.app
7. Click **Deploy**

### 3. Update Port 24

In Base44 **Settings → Environment Variables**, add:

```
QB_SYNC_SERVICE_URL=https://qb-sync-service.render.com
```

### 4. Test Connection

1. Go to Port 24 Admin → Accounting
2. Click **Connect QuickBooks**
3. Authorize via Intuit
4. Should redirect back and show "Connected"

---

## Alternative Deployments

### Deploy to AWS Lambda

Create `lambda.js` wrapper:

```javascript
const awsServerlessExpress = require('aws-serverless-express');
const app = require('./server');

const server = awsServerlessExpress.createServer(app);

exports.handler = (event, context) => {
  awsServerlessExpress.proxy(server, event, context);
};
```

### Deploy to Vercel

Create `api/index.js`:

```javascript
module.exports = require('../server');
```

### Deploy to Railway

```bash
railway up
```

---

## Production Checklist

- [ ] Use real database (PostgreSQL, MongoDB) instead of in-memory
- [ ] Add request logging and monitoring
- [ ] Set up error alerts (Sentry, etc.)
- [ ] Implement rate limiting
- [ ] Add webhook signature validation
- [ ] Encrypt stored tokens
- [ ] Set up automated backups
- [ ] Use HTTPS everywhere
- [ ] Add request validation
- [ ] Monitor token refresh failures

---

## Local Development

```bash
cd QB_SYNC_SERVICE
cp .env.example .env
# Edit .env with your test credentials
npm install
npm run dev
```

Test locally:
```bash
curl http://localhost:3000/quickbooks/status?company_id=test123
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| OAuth redirect fails | Verify redirect URI matches in Intuit app settings |
| Token refresh fails | Check INTUIT_CLIENT_SECRET is correct |
| Invoice sync fails | Verify QB API response in sync logs |
| Payments not importing | Check QB Payment query format |

Check sync logs:
```
GET https://your-service/sync-logs?company_id=xxx
```

---

## Next Steps

1. **Replace in-memory storage** with PostgreSQL/MongoDB
2. **Add webhook handler** to receive QB payment notifications
3. **Add retry logic** for failed syncs
4. **Implement audit logging** for compliance
5. **Add dashboard** to monitor sync status