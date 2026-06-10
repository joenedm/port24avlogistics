/* eslint-disable no-undef */
/* global process, Buffer, require, fetch */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// In-memory storage (replace with DB in production)
const connections = new Map();
const syncLogs = [];

// ═══════════════════════════════════════════════════════════════════
// INTUIT OAUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

app.get('/quickbooks/connect', (req, res) => {
  const { company_id, return_url } = req.query;

  if (!company_id || !return_url) {
    return res.status(400).json({ error: 'Missing company_id or return_url' });
  }

  // Generate OAuth URL (Intuit Discovery endpoint)
  const oauthUrl = new URL('https://appcenter.intuit.com/connect/oauth2');
  oauthUrl.searchParams.append('client_id', process.env.INTUIT_CLIENT_ID);
  oauthUrl.searchParams.append('response_type', 'code');
  oauthUrl.searchParams.append('scope', 'com.intuit.quickbooks.accounting');
  oauthUrl.searchParams.append('redirect_uri', `${process.env.SERVICE_URL}/quickbooks/oauth-callback`);
  oauthUrl.searchParams.append('state', Buffer.from(JSON.stringify({ company_id, return_url })).toString('base64'));

  res.json({ connect_url: oauthUrl.toString() });
});

app.get('/quickbooks/oauth-callback', async (req, res) => {
  const { code, state, realmId } = req.query;

  try {
    if (!code || !state || !realmId) {
      throw new Error('Missing OAuth parameters');
    }

    const { company_id, return_url } = JSON.parse(Buffer.from(state, 'base64').toString());

    // Exchange code for tokens via Intuit
    const tokenRes = await fetch('https://oauth.platform.intuit.com/oauth2/tokens/bearer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.SERVICE_URL}/quickbooks/oauth-callback`,
      }).toString(),
      auth: {
        username: process.env.INTUIT_CLIENT_ID,
        password: process.env.INTUIT_CLIENT_SECRET,
      },
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.statusText}`);
    }

    const tokens = await tokenRes.json();

    // Store connection
    connections.set(company_id, {
      realm_id: realmId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
      company_name: null, // Will fetch on next sync
      connected_at: new Date(),
      last_sync_at: null,
    });

    logSync(company_id, 'connection', 'success', 'Connected to QuickBooks');

    // Redirect back to Port 24
    res.redirect(`${return_url}&qb_status=success`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    logSync(company_id, 'connection', 'error', err.message);
    res.redirect(`${return_url}&qb_status=error&error=${encodeURIComponent(err.message)}`);
  }
});

// ═══════════════════════════════════════════════════════════════════
// STATUS & CONNECTION
// ═══════════════════════════════════════════════════════════════════

app.get('/quickbooks/status', (req, res) => {
  const { company_id } = req.query;

  if (!company_id) {
    return res.status(400).json({ error: 'Missing company_id' });
  }

  const conn = connections.get(company_id);

  res.json({
    is_connected: !!conn,
    company_name: conn?.company_name || null,
    realm_id: conn?.realm_id || null,
    connected_at: conn?.connected_at || null,
    last_sync_at: conn?.last_sync_at || null,
    error: conn?.error || null,
  });
});

// ═══════════════════════════════════════════════════════════════════
// SYNC INVOICE (Port 24 → QuickBooks)
// ═══════════════════════════════════════════════════════════════════

app.post('/quickbooks/sync-invoice', async (req, res) => {
  const { company_id, invoice } = req.body;

  try {
    if (!company_id || !invoice) {
      throw new Error('Missing company_id or invoice');
    }

    const conn = connections.get(company_id);
    if (!conn) {
      throw new Error('Not connected to QuickBooks');
    }

    // Refresh token if expired
    if (new Date() > conn.token_expires_at) {
      await refreshAccessToken(company_id);
    }

    // Create or update QB customer
    const customer = await createOrUpdateQBCustomer(conn, invoice);

    // Create QB invoice
    const qbInvoice = await createQBInvoice(conn, invoice, customer);

    logSync(company_id, 'invoice', 'success', `Invoice ${invoice.invoice_number} synced`);

    res.json({
      quickbooks_invoice_id: qbInvoice.id,
      quickbooks_customer_id: customer.id,
      quickbooks_invoice_number: qbInvoice.docNumber,
      status: 'synced',
    });
  } catch (err) {
    console.error('Sync invoice error:', err);
    logSync(company_id, 'invoice', 'error', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PULL PAYMENTS (QuickBooks → Port 24)
// ═══════════════════════════════════════════════════════════════════

app.post('/quickbooks/pull-payments', async (req, res) => {
  const { company_id } = req.body;

  try {
    if (!company_id) {
      throw new Error('Missing company_id');
    }

    const conn = connections.get(company_id);
    if (!conn) {
      throw new Error('Not connected to QuickBooks');
    }

    // Refresh token if expired
    if (new Date() > conn.token_expires_at) {
      await refreshAccessToken(company_id);
    }

    // Query QB for recent payments
    const payments = await getQBPayments(conn);

    logSync(company_id, 'payment', 'success', `Pulled ${payments.length} payments`);

    res.json({ payments });
  } catch (err) {
    console.error('Pull payments error:', err);
    logSync(company_id, 'payment', 'error', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// LINK INVOICE
// ═══════════════════════════════════════════════════════════════════

app.post('/quickbooks/link-invoice', async (req, res) => {
  const { company_id, invoice_id, quickbooks_invoice_id } = req.body;

  try {
    if (!company_id || !invoice_id || !quickbooks_invoice_id) {
      throw new Error('Missing required fields');
    }

    const conn = connections.get(company_id);
    if (!conn) {
      throw new Error('Not connected to QuickBooks');
    }

    // Fetch QB invoice details
    const qbInvoice = await getQBInvoice(conn, quickbooks_invoice_id);

    logSync(company_id, 'link', 'success', `Linked invoice ${invoice_id}`);

    res.json({
      quickbooks_invoice_id: qbInvoice.id,
      quickbooks_customer_id: qbInvoice.customerRef.value,
      quickbooks_invoice_number: qbInvoice.docNumber,
    });
  } catch (err) {
    console.error('Link invoice error:', err);
    logSync(company_id, 'link', 'error', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// DISCONNECT
// ═══════════════════════════════════════════════════════════════════

app.post('/quickbooks/disconnect', (req, res) => {
  const { company_id } = req.body;

  try {
    if (!company_id) {
      throw new Error('Missing company_id');
    }

    connections.delete(company_id);
    logSync(company_id, 'disconnect', 'success', 'Disconnected from QuickBooks');

    res.json({ success: true });
  } catch (err) {
    console.error('Disconnect error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// SYNC LOGS (Debug)
// ═══════════════════════════════════════════════════════════════════

app.get('/sync-logs', (req, res) => {
  const { company_id, limit = 50 } = req.query;

  let logs = syncLogs;
  if (company_id) {
    logs = logs.filter(l => l.company_id === company_id);
  }

  res.json(logs.slice(-limit));
});

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

async function refreshAccessToken(company_id) {
  const conn = connections.get(company_id);
  if (!conn) throw new Error('Connection not found');

  const tokenRes = await fetch('https://oauth.platform.intuit.com/oauth2/tokens/bearer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
    }).toString(),
    auth: {
      username: process.env.INTUIT_CLIENT_ID,
      password: process.env.INTUIT_CLIENT_SECRET,
    },
  });

  if (!tokenRes.ok) {
    throw new Error(`Token refresh failed: ${tokenRes.statusText}`);
  }

  const tokens = await tokenRes.json();
  conn.access_token = tokens.access_token;
  conn.token_expires_at = new Date(Date.now() + tokens.expires_in * 1000);
}

async function createOrUpdateQBCustomer(conn, invoice) {
  // Query QB for customer by name
  const query = `select * from Customer where DisplayName = '${invoice.client}'`;
  const qbRes = await callQBAPI(conn, 'query', query);

  if (qbRes.queryResponse.Customer?.length > 0) {
    return qbRes.queryResponse.Customer[0];
  }

  // Create new customer
  const customerData = {
    displayName: invoice.client,
    primaryEmailAddr: { address: invoice.client_email || 'noemail@example.com' },
    billingAddr: {
      line1: invoice.client_address || '',
      city: '',
      state: '',
      postalCode: '',
      country: 'USA',
    },
  };

  const createRes = await callQBAPI(conn, 'create', 'Customer', customerData);
  return createRes.Customer;
}

async function createQBInvoice(conn, invoice, customer) {
  const invoiceData = {
    docNumber: invoice.invoice_number,
    customerRef: { value: customer.id },
    dueDate: invoice.due_date,
    billEmail: { address: invoice.client_email || 'noemail@example.com' },
    line: (invoice.line_items || []).map(item => ({
      description: item.name,
      amount: item.total,
      detailType: 'SalesItemLineDetail',
      salesItemLineDetail: {
        itemRef: { value: '1' }, // Use default item or create one
        qty: item.quantity,
        unitPrice: item.unit_price,
      },
    })),
    totalAmt: invoice.total,
  };

  const res = await callQBAPI(conn, 'create', 'Invoice', invoiceData);
  return res.Invoice;
}

async function getQBInvoice(conn, invoiceId) {
  const query = `select * from Invoice where id = '${invoiceId}'`;
  const res = await callQBAPI(conn, 'query', query);
  return res.queryResponse.Invoice?.[0];
}

async function getQBPayments(conn) {
  // Query recent payments (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const query = `select * from Payment where MetaData.CreateTime >= '${thirtyDaysAgo}'`;
  const res = await callQBAPI(conn, 'query', query);

  return (res.queryResponse.Payment || []).map(p => ({
    quickbooks_payment_id: p.id,
    quickbooks_invoice_id: p.lineEx?.lineExtDetail?.[0]?.invoiceRef?.value,
    amount: p.totalAmt,
    payment_date: p.txnDate,
    reference_number: p.referenceNumber || p.id,
    method: p.paymentMethodRef?.name || 'unknown',
  }));
}

async function callQBAPI(conn, operation, ...args) {
  const method = operation === 'query' ? 'GET' : 'POST';
  const entityType = args[0];
  const data = args[1];

  let url = `https://quickbooks.api.intuit.com/v2/company/${conn.realm_id}`;

  if (operation === 'query') {
    url += `/query?query=${encodeURIComponent(entityType)}`;
  } else if (operation === 'create') {
    url += `/${entityType}`;
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      'Content-Type': 'application/json',
    },
    body: operation === 'create' ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`QB API error: ${err}`);
  }

  return res.json();
}

function logSync(company_id, type, status, message) {
  syncLogs.push({
    company_id,
    type,
    status,
    message,
    timestamp: new Date(),
  });

  // Keep only last 1000 logs
  if (syncLogs.length > 1000) {
    syncLogs.shift();
  }
}

// ═══════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`QB Sync Service running on port ${PORT}`);
  console.log(`OAuth callback: ${process.env.SERVICE_URL}/quickbooks/oauth-callback`);
});