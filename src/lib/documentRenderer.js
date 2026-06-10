/**
 * Unified Document Renderer
 * Generates branded, modern HTML for Quote, Invoice, Pick List documents
 * Supports room-based grouping, crew under rooms, full brand header/footer
 */

function fmt(val) {
  const n = parseFloat(val) || 0;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function getHeaderBg(brand) {
  const type = brand?.email_header_background_type || 'solid';
  if (type === 'image' && brand?.email_header_background_url)
    return `background-image: url(${brand.email_header_background_url}); background-size: cover; background-position: center;`;
  if (type === 'gradient' && brand?.email_header_background_gradient)
    return `background: ${brand.email_header_background_gradient};`;
  return `background-color: ${brand?.email_header_background_color || '#1e293b'};`;
}

function getFooterBg(brand) {
  const type = brand?.email_footer_background_type || 'solid';
  if (type === 'image' && brand?.email_footer_background_url)
    return `background-image: url(${brand.email_footer_background_url}); background-size: cover; background-position: center;`;
  if (type === 'gradient' && brand?.email_footer_background_gradient)
    return `background: ${brand.email_footer_background_gradient};`;
  return `background-color: ${brand?.email_footer_background_color || '#f8fafc'};`;
}

function buildHeader(brand, docType) {
  const textColor = brand?.email_header_text_color || '#ffffff';
  const align = brand?.email_header_alignment || 'center';
  const showLogo = brand?.email_header_show_logo !== false && brand?.logo_url;
  const logoPos = brand?.email_header_logo_position || 'top';

  const logoTag = showLogo
    ? `<img src="${brand.logo_url}" alt="Logo" style="max-height:64px; max-width:220px; display:block; margin-bottom:12px; ${align === 'center' ? 'margin-left:auto; margin-right:auto;' : ''}" />`
    : '';

  return `
    <div style="${getHeaderBg(brand)} color:${textColor}; padding:36px 48px; text-align:${align};">
      ${showLogo && logoPos === 'top' ? logoTag : ''}
      <div style="${align === 'left' ? 'display:flex; align-items:center; gap:20px;' : ''}">
        ${showLogo && logoPos !== 'top' ? logoTag : ''}
        <div>
          <p style="margin:0 0 4px 0; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; opacity:0.75; color:${textColor};">${brand?.company_name || ''}</p>
          <h1 style="margin:0; font-size:32px; font-weight:800; letter-spacing:-1px; color:${textColor};">${docType}</h1>
        </div>
      </div>
    </div>
  `;
}

function buildFooter(brand, extraNote) {
  const textColor = brand?.email_footer_text_color || '#64748b';
  const align = brand?.email_footer_alignment || 'center';
  const parts = [];
  if (brand?.company_name && brand?.email_footer_show_company_name !== false) parts.push(`<strong style="color:${textColor};">${brand.company_name}</strong>`);
  if (brand?.company_phone && brand?.email_footer_show_phone !== false) parts.push(brand.company_phone);
  if (brand?.company_email && brand?.email_footer_show_email !== false) parts.push(`<a href="mailto:${brand.company_email}" style="color:${textColor}; text-decoration:none;">${brand.company_email}</a>`);
  if (brand?.company_website && brand?.email_footer_show_website !== false) parts.push(`<a href="${brand.company_website}" style="color:${textColor}; text-decoration:none;">${brand.company_website}</a>`);
  if (brand?.company_address && brand?.email_footer_show_address !== false) parts.push(brand.company_address.replace(/\n/g, ', '));

  return `
    <div style="${getFooterBg(brand)} color:${textColor}; padding:28px 48px; text-align:${align}; font-size:12px; border-top:2px solid #666666;">
      ${parts.length > 0 ? `<p style="margin:0 0 6px 0; line-height:1.8;">${parts.join(' &nbsp;•&nbsp; ')}</p>` : ''}
      ${extraNote ? `<p style="margin:6px 0 0 0; font-size:11px; opacity:0.65;">${extraNote}</p>` : ''}
      ${brand?.email_footer_disclaimer ? `<p style="margin:8px 0 0 0; font-size:10px; opacity:0.5;">${brand.email_footer_disclaimer}</p>` : ''}
    </div>
  `;
}

const BASE_STYLES = `
  /* Suppress browser-injected date/title headers/footers */
  @page {
    size: letter portrait;
    margin: 14mm 12mm;
    /* Blank out all named margin boxes so browser never prints URL/date */
    @top-left { content: ''; }
    @top-center { content: ''; }
    @top-right { content: ''; }
    @bottom-left { content: ''; }
    @bottom-center { content: ''; }
    @bottom-right { content: ''; }
  }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif; background:#eef2f7; color:#1e293b; font-size:13px; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  .doc-wrap { max-width:900px; margin:0 auto; background:#fff; box-shadow:0 8px 40px rgba(0,0,0,0.10); border-radius:0 0 16px 16px; overflow:visible; }
  .doc-body { padding:32px 40px; background:#f4f7fb; }

  /* --- Repeated print header (hidden on screen, shown on every print page) --- */
  .print-repeat-header { display:none; }
  .print-page-header { display:none; }

  /* --- Info Cards --- */
  .info-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px; }
  .info-row.two-col { grid-template-columns:1fr 1fr; }
  .card { background:#fff; border:2px solid #888888; border-radius:12px; padding:16px 18px; }
  .card-title { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#94a3b8; margin-bottom:10px; }
  .field-label { font-size:10px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:2px; }
  .field-value { font-size:13px; color:#1e293b; font-weight:600; line-height:1.4; }
  .field-value.small { font-size:12px; font-weight:500; }
  .field-group { margin-bottom:8px; }
  .field-group:last-child { margin-bottom:0; }

  /* --- Room / Section Cards --- */
  .room-card { background:#fff; border:2px solid #555555; border-radius:12px; margin-bottom:16px; overflow:hidden; }
  .room-header { background:linear-gradient(135deg, #1e293b 0%, #334155 100%); color:#fff; padding:12px 20px; display:flex; justify-content:space-between; align-items:center; }
  .room-header-name { font-size:13px; font-weight:800; letter-spacing:0.01em; }
  .room-header-total { font-size:13px; font-weight:700; opacity:0.9; }
  .room-section-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#64748b; padding:8px 18px 5px; background:#f8fafc; border-bottom:1px solid #777777; }

  /* --- Line Item Table --- */
  table { width:100%; border-collapse:collapse; table-layout:fixed; }
  thead { display:table-header-group; }
  th { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b; padding:8px 14px; background:#f8fafc; border-bottom:1.25px solid #666666; text-align:left; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  th.r { text-align:right; }
  td { padding:8px 14px; font-size:12px; color:#1e293b; border-bottom:1px solid #777777; vertical-align:middle; word-wrap:break-word; }
  td.r { text-align:right; }
  td.name { font-weight:600; }
  td.sub { font-size:11px; color:#94a3b8; font-weight:400; }
  tr:last-child td { border-bottom:none; }

  /* --- Totals --- */
  .totals-wrap { display:flex; justify-content:flex-end; margin-top:20px; }
  .totals-card { background:#fff; border:2px solid #888888; border-radius:12px; padding:18px 24px; min-width:280px; }
  .totals-row { display:flex; justify-content:space-between; font-size:13px; color:#475569; padding:4px 0; }
  .totals-row.discount { color:#dc2626; }
  .totals-row.final { font-size:18px; font-weight:800; color:#1e293b; border-top:2px solid #666666; margin-top:8px; padding-top:12px; }
  .totals-row.balance { font-size:15px; font-weight:700; color:#dc2626; }
  .totals-label { color:#64748b; }

  /* --- Notes --- */
  .notes-card { background:#fffbeb; border:2px solid #fde68a; border-radius:12px; padding:16px 18px; margin-top:16px; }
  .notes-card p { font-size:12px; color:#78350f; line-height:1.7; }

  /* --- Status Badge --- */
  .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; }
  .badge-draft { background:#f1f5f9; color:#475569; }
  .badge-sent { background:#dbeafe; color:#1d4ed8; }
  .badge-approved { background:#d1fae5; color:#065f46; }
  .badge-paid { background:#d1fae5; color:#065f46; }
  .badge-declined { background:#fee2e2; color:#991b1b; }
  .badge-overdue { background:#fef3c7; color:#92400e; }

  /* --- Crew rows --- */
  .crew-row td { background:#fafafa; }
  .crew-tag { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:600; background:#ede9fe; color:#5b21b6; padding:2px 8px; border-radius:10px; }

  /* Page break simulation in preview */
  .page-break-sim {
    margin: 8px -40px;
    background: #f1f5f9;
    border-top: 2px dashed #94a3b8;
    border-bottom: 2px dashed #94a3b8;
    padding: 6px 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    color: #64748b;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
  }

  @media print {
    @page {
      size: letter portrait;
      margin: 14mm 12mm;
      @top-left { content: ''; }
      @top-center { content: ''; }
      @top-right { content: ''; }
      @bottom-left { content: ''; }
      @bottom-center { content: ''; }
      @bottom-right { content: ''; }
    }
    html, body { background: white !important; margin: 0 !important; padding: 0 !important; orphans: 3; widows: 3; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }

    /* Flatten screen chrome */
    .doc-wrap { box-shadow: none !important; max-width: 100% !important; width: 100% !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; background: white !important; }
    .doc-body { padding: 16px 0 0 0 !important; background: white !important; overflow: visible !important; }
    .page-break-sim { display: none !important; }
    .no-print { display: none !important; }
    .print-page-header { display: none !important; }

    /* Prevent doc-header gradient from bleeding onto page 2 */
    .doc-header-block { page-break-after: avoid; break-after: avoid; overflow: visible !important; }

    /* Clean page breaks */
    .room-card { page-break-inside: avoid; break-inside: avoid; margin-bottom: 12px; overflow: visible !important; border-radius: 0 !important; }
    .totals-wrap { page-break-inside: avoid; break-inside: avoid; }
    .totals-card { page-break-inside: avoid; break-inside: avoid; }
    .notes-card { page-break-inside: avoid; break-inside: avoid; }
    .info-row { page-break-inside: avoid; break-inside: avoid; }

    /* Tables: always repeat thead on every new page */
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }

    /* Keep room header glued to its first row */
    .room-header { page-break-after: avoid; break-after: avoid; }
    .room-section-label { page-break-after: avoid; break-after: avoid; }
  }
`;

function calcLineTotal(item) {
  const base = item.override_price != null
    ? parseFloat(item.override_price)
    : (parseFloat(item.daily_rate) || 0) * (parseFloat(item.days) || 1) * (parseFloat(item.quantity) || 1);
  const disc = item.discount_pct ? base * (item.discount_pct / 100) : 0;
  return base - disc;
}

/**
 * Build room-based sections for a quote.
 * rooms: array of { id, name } from show.sub_locations
 * items: quote line_items, each may have room_id or group_name
 * crewList: projectCrew array, each may have sub_location_id or room_name
 */
function buildRoomSections(rooms, items, crewList) {
  // Bucket items by room
  const roomItems = {};
  const roomCrew = {};

  const allRooms = rooms && rooms.length > 0
    ? [...rooms, { id: '__unassigned__', name: 'General Show' }]
    : [{ id: '__unassigned__', name: 'General Show' }];

  allRooms.forEach(r => { roomItems[r.id] = []; roomCrew[r.id] = []; });

  (items || []).filter(i => !i.is_hidden).forEach(item => {
    const rid = item.room_id || '__unassigned__';
    if (roomItems[rid] !== undefined) {
      roomItems[rid].push(item);
    } else {
      roomItems['__unassigned__'].push(item);
    }
  });

  (crewList || []).forEach(crew => {
    const rid = crew.sub_location_id || '__unassigned__';
    if (roomCrew[rid] !== undefined) {
      roomCrew[rid].push(crew);
    } else {
      roomCrew['__unassigned__'].push(crew);
    }
  });

  let totalGrand = 0;
  const sections = allRooms.map(room => {
    const rItems = roomItems[room.id] || [];
    const rCrew = roomCrew[room.id] || [];
    if (rItems.length === 0 && rCrew.length === 0) return null;

    const roomTotal = rItems.reduce((s, i) => s + calcLineTotal(i), 0)
      + rCrew.reduce((s, c) => s + (parseFloat(c.billable_cost) || 0), 0);
    totalGrand += roomTotal;

    const equipRows = rItems.length > 0 ? `
      <div class="room-section-label">Equipment</div>
      <table>
        <thead><tr>
          <th>Description</th>
          <th class="r">Qty</th>
          <th class="r">Days</th>
          <th class="r">Rate/Day</th>
          <th class="r">Total</th>
        </tr></thead>
        <tbody>
          ${rItems.map(item => `
            <tr>
              <td class="name">${item.name || '—'}</td>
              <td class="r">${item.quantity || 1}</td>
              <td class="r">${item.days || 1}</td>
              <td class="r">${fmt(item.override_price != null ? (item.override_price / ((item.quantity || 1) * (item.days || 1))) : (item.daily_rate || 0))}</td>
              <td class="r"><strong>${fmt(calcLineTotal(item))}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '';

    const crewRows = rCrew.length > 0 ? `
      <div class="room-section-label">Crew / Labor</div>
      <table>
        <thead><tr>
          <th>Role</th>
          <th>Crew Member</th>
          <th class="r">Qty</th>
          <th class="r">Date</th>
          <th class="r">Billable</th>
        </tr></thead>
        <tbody>
          ${rCrew.map(c => `
            <tr class="crew-row">
              <td class="name">${c.role || '—'}</td>
              <td>${c.crew_member_name || '—'}</td>
              <td class="r">${c.quantity || 1}</td>
              <td class="r" style="font-size:11px;">${c.assignment_date || '—'}</td>
              <td class="r"><strong>${fmt(c.billable_cost)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '';

    return `
      <div class="room-card">
        <div class="room-header">
          <span class="room-header-name">${room.name}</span>
          <span class="room-header-total">${fmt(roomTotal)}</span>
        </div>
        ${equipRows}
        ${crewRows}
      </div>
    `;
  }).filter(Boolean);

  return { sectionsHTML: sections.join(''), totalGrand };
}

export function generateQuoteHTML(quote, show, brand, crewList = []) {
  const rooms = show?.sub_locations || [];
  const { sectionsHTML, totalGrand } = buildRoomSections(rooms, quote?.line_items || [], crewList);

  const discountAmt = totalGrand * ((quote?.discount_pct || 0) / 100);
  const taxAmt = (totalGrand - discountAmt) * ((quote?.tax_pct || 0) / 100);
  const total = totalGrand - discountAmt + taxAmt;

  const statusBadge = `<span class="badge badge-${quote?.status || 'draft'}">${(quote?.status || 'Draft').charAt(0).toUpperCase() + (quote?.status || 'draft').slice(1)}</span>`;

  const qRepeatHdr = `<div class="print-page-header" style="background:#1e293b;color:#fff;padding:8px 24px;display:flex;justify-content:space-between;align-items:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;"><span style="font-weight:700;opacity:0.85;">${brand?.company_name||''}</span><span style="opacity:0.7;">Quote — ${show?.name||'Project'}</span></div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Quote — ${show?.name || 'Project'}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  ${qRepeatHdr}
  <div class="doc-wrap">
    <div class="doc-header-block">${buildHeader(brand, 'QUOTE')}</div>
    <div class="doc-body">
      <div class="info-row">
        <div class="card">
          <div class="card-title">Client</div>
          <div class="field-group"><div class="field-label">Company / Name</div><div class="field-value">${show?.client || quote?.client || '—'}</div></div>
          ${show?.contact_name ? `<div class="field-group"><div class="field-label">Contact</div><div class="field-value small">${show.contact_name}</div></div>` : ''}
          ${show?.contact_email ? `<div class="field-group"><div class="field-label">Email</div><div class="field-value small">${show.contact_email}</div></div>` : ''}
          ${show?.contact_phone ? `<div class="field-group"><div class="field-label">Phone</div><div class="field-value small">${show.contact_phone}</div></div>` : ''}
        </div>
        <div class="card">
          <div class="card-title">Project Details</div>
          <div class="field-group"><div class="field-label">Project Name</div><div class="field-value">${show?.name || '—'}</div></div>
          ${show?.venue ? `<div class="field-group"><div class="field-label">Venue</div><div class="field-value small">${show.venue}</div></div>` : ''}
          ${show?.start_date ? `<div class="field-group"><div class="field-label">Dates</div><div class="field-value small">${fmtDate(show.start_date)}${show.end_date ? ' — ' + fmtDate(show.end_date) : ''}</div></div>` : ''}
        </div>
        <div class="card">
          <div class="card-title">Quote Info</div>
          <div class="field-group"><div class="field-label">Status</div><div class="field-value">${statusBadge}</div></div>
          ${quote?.valid_until ? `<div class="field-group"><div class="field-label">Valid Until</div><div class="field-value small">${fmtDate(quote.valid_until)}</div></div>` : ''}
          <div class="field-group"><div class="field-label">Date</div><div class="field-value small">${fmtDate(new Date().toISOString().split('T')[0])}</div></div>
        </div>
      </div>

      ${sectionsHTML || `<div class="card" style="text-align:center; padding:40px; color:#94a3b8;">No line items added yet</div>`}

      <div class="totals-wrap">
        <div class="totals-card">
          <div class="totals-row"><span class="totals-label">Subtotal</span><span>${fmt(totalGrand)}</span></div>
          ${discountAmt > 0 ? `<div class="totals-row discount"><span class="totals-label">Discount (${quote?.discount_pct || 0}%)</span><span>-${fmt(discountAmt)}</span></div>` : ''}
          ${taxAmt > 0 ? `<div class="totals-row"><span class="totals-label">Tax (${quote?.tax_pct || 0}%)</span><span>+${fmt(taxAmt)}</span></div>` : ''}
          <div class="totals-row final"><span>Total</span><span>${fmt(total)}</span></div>
        </div>
      </div>

      ${quote?.notes ? `<div class="notes-card"><p><strong>Notes:</strong> ${quote.notes}</p></div>` : ''}
      ${brand?.quote_footer_note ? `<div class="notes-card" style="background:#f0f9ff; border-color:#bae6fd; margin-top:12px;"><p style="color:#075985;">${brand.quote_footer_note}</p></div>` : ''}
    </div>
    ${buildFooter(brand, brand?.invoice_footer_note)}
  </div>
</body>
</html>`;
}

export function generateInvoiceHTML(invoice, brand) {
  const items = invoice?.line_items || [];
  const calcItem = (i) => (parseFloat(i.unit_price) || 0) * (parseFloat(i.quantity) || 1) * (parseFloat(i.days) || 1);
  const subtotal = items.reduce((s, i) => s + calcItem(i), 0);
  const discountAmt = subtotal * ((invoice?.discount_pct || 0) / 100);
  const taxAmt = (subtotal - discountAmt) * ((invoice?.tax_pct || 0) / 100);
  const total = subtotal - discountAmt + taxAmt;
  const balanceDue = Math.max(0, total - (parseFloat(invoice?.amount_paid) || 0));

  const groups = {};
  items.forEach(i => {
    const g = i.group_name || 'General';
    if (!groups[g]) groups[g] = [];
    groups[g].push(i);
  });

  const hasGroups = Object.keys(groups).length > 1;
  const tableRows = Object.entries(groups).map(([groupName, groupItems]) => {
    const header = hasGroups ? `
      <tr><td colspan="5" style="padding:10px 16px 6px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#64748b; background:#f8fafc; border-bottom:1.25px solid #666666;">${groupName}</td></tr>
    ` : '';
    const rows = groupItems.map(item => `
      <tr>
        <td class="name">${item.name || '—'}${item.description ? `<br/><span class="sub">${item.description}</span>` : ''}</td>
        <td class="r">${item.quantity || 1}</td>
        <td class="r">${item.days || 1}</td>
        <td class="r">${fmt(item.unit_price || 0)}</td>
        <td class="r"><strong>${fmt(calcItem(item))}</strong></td>
      </tr>
    `).join('');
    return header + rows;
  }).join('');

  const statusBadge = `<span class="badge badge-${invoice?.status || 'draft'}">${(invoice?.status || 'Draft').charAt(0).toUpperCase() + (invoice?.status || 'draft').slice(1)}</span>`;

  const iRepeatHdr = `<div class="print-page-header" style="background:#1e293b;color:#fff;padding:8px 24px;display:flex;justify-content:space-between;align-items:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;"><span style="font-weight:700;opacity:0.85;">${brand?.company_name||''}</span><span style="opacity:0.7;">Invoice${invoice?.invoice_number?' #'+invoice.invoice_number:''}</span></div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice #${invoice?.invoice_number || 'New'}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  ${iRepeatHdr}
  <div class="doc-wrap">
    <div class="doc-header-block">${buildHeader(brand, `INVOICE${invoice?.invoice_number ? ' #' + invoice.invoice_number : ''}`)}</div>
    <div class="doc-body">
      <div class="info-row">
        <div class="card">
          <div class="card-title">Bill To</div>
          <div class="field-group"><div class="field-label">Client</div><div class="field-value">${invoice?.client || '—'}</div></div>
          ${invoice?.client_email ? `<div class="field-group"><div class="field-label">Email</div><div class="field-value small">${invoice.client_email}</div></div>` : ''}
          ${invoice?.client_address ? `<div class="field-group"><div class="field-label">Address</div><div class="field-value small">${invoice.client_address}</div></div>` : ''}
        </div>
        <div class="card">
          <div class="card-title">Project</div>
          <div class="field-group"><div class="field-label">Name</div><div class="field-value">${invoice?.show_name || '—'}</div></div>
          ${invoice?.payment_terms ? `<div class="field-group"><div class="field-label">Payment Terms</div><div class="field-value small">${invoice.payment_terms}</div></div>` : ''}
        </div>
        <div class="card">
          <div class="card-title">Invoice Details</div>
          <div class="field-group"><div class="field-label">Status</div><div class="field-value">${statusBadge}</div></div>
          ${invoice?.issue_date ? `<div class="field-group"><div class="field-label">Issue Date</div><div class="field-value small">${fmtDate(invoice.issue_date)}</div></div>` : ''}
          ${invoice?.due_date ? `<div class="field-group"><div class="field-label">Due Date</div><div class="field-value small">${fmtDate(invoice.due_date)}</div></div>` : ''}
        </div>
      </div>

      <div class="room-card">
        <table>
          <thead><tr>
            <th>Description</th>
            <th class="r">Qty</th>
            <th class="r">Days</th>
            <th class="r">Unit Price</th>
            <th class="r">Total</th>
          </tr></thead>
          <tbody>
            ${tableRows || `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:32px;">No line items</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="totals-wrap">
        <div class="totals-card">
          <div class="totals-row"><span class="totals-label">Subtotal</span><span>${fmt(subtotal)}</span></div>
          ${discountAmt > 0 ? `<div class="totals-row discount"><span class="totals-label">Discount (${invoice?.discount_pct || 0}%)</span><span>-${fmt(discountAmt)}</span></div>` : ''}
          ${taxAmt > 0 ? `<div class="totals-row"><span class="totals-label">Tax (${invoice?.tax_pct || 0}%)</span><span>+${fmt(taxAmt)}</span></div>` : ''}
          <div class="totals-row final"><span>Total</span><span>${fmt(total)}</span></div>
          ${invoice?.amount_paid > 0 ? `<div class="totals-row" style="color:#10b981;"><span class="totals-label">Amount Paid</span><span>-${fmt(invoice.amount_paid)}</span></div>` : ''}
          ${balanceDue > 0 ? `<div class="totals-row balance"><span>Balance Due</span><span>${fmt(balanceDue)}</span></div>` : ''}
        </div>
      </div>

      ${invoice?.notes ? `<div class="notes-card"><p><strong>Notes:</strong> ${invoice.notes}</p></div>` : ''}
    </div>
    ${buildFooter(brand, brand?.invoice_footer_note)}
  </div>
</body>
</html>`;
}

export function generateMasterPickListHTML(show, requirements, brand) {
  // Aggregate all requirements by product_name — sum quantities
  const masterMap = {};
  (requirements || []).forEach(req => {
    const key = req.product_name || '—';
    if (!masterMap[key]) {
      masterMap[key] = {
        product_name: req.product_name || '—',
        category: req.category || '',
        total_quantity: 0,
        notes: req.notes || '',
      };
    }
    masterMap[key].total_quantity += (req.quantity_needed || 1);
    // Merge notes if different
    if (req.notes && !masterMap[key].notes.includes(req.notes)) {
      masterMap[key].notes = masterMap[key].notes
        ? masterMap[key].notes + '; ' + req.notes
        : req.notes;
    }
  });

  const masterItems = Object.values(masterMap).sort((a, b) => {
    const catCmp = (a.category || '').localeCompare(b.category || '');
    if (catCmp !== 0) return catCmp;
    return a.product_name.localeCompare(b.product_name);
  });

  const totalQty = masterItems.reduce((s, i) => s + i.total_quantity, 0);
  const totalLines = masterItems.length;

  const tableRows = masterItems.map((item, i) => `
    <tr>
      <td style="width:32px; text-align:center; color:#94a3b8; font-size:11px;">${i + 1}</td>
      <td><strong>${item.product_name}</strong></td>
      <td style="color:#64748b; font-size:12px;">${item.category || '—'}</td>
      <td style="text-align:center; font-weight:700; font-size:14px;">${item.total_quantity}</td>
      <td style="font-size:11px; color:#94a3b8;">${item.notes || ''}</td>
      <td style="width:36px; text-align:center;"><div style="width:20px; height:20px; border:2px solid #555555; border-radius:4px; margin:auto;"></div></td>
    </tr>
  `).join('');

  const plRepeatHdr = `<div class="print-page-header" style="background:#1e293b;color:#fff;padding:8px 24px;display:flex;justify-content:space-between;align-items:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;"><span style="font-weight:700;opacity:0.85;">${brand?.company_name||''}</span><span style="opacity:0.7;">Master Show Pick List — ${show?.name||'Project'}</span></div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Master Show Pick List — ${show?.name || 'Project'}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  ${plRepeatHdr}
  <div class="doc-wrap">
    <div class="doc-header-block">${buildHeader(brand, 'MASTER SHOW PICK LIST')}</div>
    <div class="doc-body">
      <div class="info-row two-col">
        <div class="card">
          <div class="card-title">Project</div>
          <div class="field-group"><div class="field-value" style="font-size:16px;">${show?.name || '—'}</div></div>
          ${show?.client ? `<div class="field-group"><div class="field-label">Client</div><div class="field-value small">${show.client}</div></div>` : ''}
        </div>
        <div class="card">
          <div class="card-title">Summary</div>
          ${show?.venue ? `<div class="field-group"><div class="field-label">Venue</div><div class="field-value small">${show.venue}</div></div>` : ''}
          ${show?.start_date ? `<div class="field-group"><div class="field-label">Date</div><div class="field-value small">${fmtDate(show.start_date)}</div></div>` : ''}
          <div class="field-group"><div class="field-label">Line Items</div><div class="field-value">${totalLines}</div></div>
          <div class="field-group"><div class="field-label">Total Units</div><div class="field-value">${totalQty}</div></div>
        </div>
      </div>
      <div class="room-card">
        <div class="room-header">
          <span class="room-header-name">All Equipment — Combined</span>
          <span class="room-header-total">${totalLines} items · ${totalQty} units total</span>
        </div>
        <table>
          <thead><tr>
            <th style="width:32px">#</th>
            <th>Item Name</th>
            <th>Category</th>
            <th style="text-align:center">Total Qty</th>
            <th>Notes</th>
            <th style="width:36px; text-align:center;">✓</th>
          </tr></thead>
          <tbody>
            ${tableRows || `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:32px;">No requirements on this show</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
    ${buildFooter(brand)}
  </div>
</body>
</html>`;
}

export function generatePickListHTML(show, items, brand) {
  const subLocations = show?.sub_locations || [];

  // Group items by room
  const roomMap = {};
  subLocations.forEach(r => { roomMap[r.id] = { name: r.name, items: [] }; });
  const unassigned = [];

  (items || []).forEach(item => {
    if (item.current_sub_location_id && roomMap[item.current_sub_location_id]) {
      roomMap[item.current_sub_location_id].items.push(item);
    } else {
      unassigned.push(item);
    }
  });

  const renderItems = (itemList, startIdx = 1) => itemList.map((item, i) => `
    <tr>
      <td style="width:32px; text-align:center; color:#94a3b8; font-size:11px;">${startIdx + i}</td>
      <td><strong>${item.name || '—'}</strong>${item.category ? `<br/><span style="font-size:11px; color:#94a3b8;">${item.category}</span>` : ''}</td>
      <td class="r">${item.quantity || 1}</td>
      <td style="font-family:monospace; font-size:11px; color:#64748b;">${item.barcode || item.serial_numbers || '—'}</td>
      <td style="width:36px; text-align:center;"><div style="width:20px; height:20px; border:2px solid #555555; border-radius:4px; margin:auto;"></div></td>
    </tr>
  `).join('');

  const allRoomsHTML = [
    ...subLocations.map(r => {
      const rItems = roomMap[r.id]?.items || [];
      if (rItems.length === 0) return '';
      return `
        <div class="room-card">
          <div class="room-header">
            <span class="room-header-name">${r.name}</span>
            <span class="room-header-total">${rItems.length} item${rItems.length !== 1 ? 's' : ''}</span>
          </div>
          <table>
            <thead><tr>
              <th style="width:32px">#</th><th>Item</th><th class="r">Qty</th><th>Barcode / Serial</th><th style="width:36px; text-align:center;">✓</th>
            </tr></thead>
            <tbody>${renderItems(rItems)}</tbody>
          </table>
        </div>
      `;
    }),
    unassigned.length > 0 ? `
      <div class="room-card">
        <div class="room-header" style="background:linear-gradient(135deg,#475569,#64748b);">
          <span class="room-header-name">General / Unassigned</span>
          <span class="room-header-total">${unassigned.length} item${unassigned.length !== 1 ? 's' : ''}</span>
        </div>
        <table>
          <thead><tr>
            <th style="width:32px">#</th><th>Item</th><th class="r">Qty</th><th>Barcode / Serial</th><th style="width:36px; text-align:center;">✓</th>
          </tr></thead>
          <tbody>${renderItems(unassigned)}</tbody>
        </table>
      </div>
    ` : ''
  ].join('');

  const plRepeatHdr = `<div class="print-page-header" style="background:#1e293b;color:#fff;padding:8px 24px;display:flex;justify-content:space-between;align-items:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;"><span style="font-weight:700;opacity:0.85;">${brand?.company_name||''}</span><span style="opacity:0.7;">Pick List — ${show?.name||'Project'}</span></div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pick List — ${show?.name || 'Project'}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  ${plRepeatHdr}
  <div class="doc-wrap">
    <div class="doc-header-block">${buildHeader(brand, 'PICK LIST')}</div>
    <div class="doc-body">
      <div class="info-row two-col">
        <div class="card">
          <div class="card-title">Project</div>
          <div class="field-group"><div class="field-value" style="font-size:16px;">${show?.name || '—'}</div></div>
          ${show?.client ? `<div class="field-group"><div class="field-label">Client</div><div class="field-value small">${show.client}</div></div>` : ''}
        </div>
        <div class="card">
          <div class="card-title">Details</div>
          ${show?.venue ? `<div class="field-group"><div class="field-label">Venue</div><div class="field-value small">${show.venue}</div></div>` : ''}
          ${show?.start_date ? `<div class="field-group"><div class="field-label">Date</div><div class="field-value small">${fmtDate(show.start_date)}</div></div>` : ''}
          <div class="field-group"><div class="field-label">Total Items</div><div class="field-value">${(items || []).length}</div></div>
        </div>
      </div>
      ${allRoomsHTML || `<div class="card" style="text-align:center; padding:40px; color:#94a3b8;">No items on this show</div>`}
    </div>
    ${buildFooter(brand)}
  </div>
</body>
</html>`;
}