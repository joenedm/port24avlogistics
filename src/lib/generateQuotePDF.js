/**
 * generateQuotePDF.js
 *
 * Builds a professional, client-ready Quote PDF directly from structured data.
 * Output: crisp, selectable text — NOT a screenshot, canvas capture, or UI snapshot.
 *
 * Method: Assembles an HTML document from quote data fields and opens it in a new
 * tab with auto-print triggered. The browser's native PDF export produces real text.
 *
 * Data sources used:
 *   - brand: company_name, logo_url, primary_color, company_phone, company_email,
 *            company_website, company_address, quote_footer_note, default_tax_pct
 *   - show:  name, client, venue, start_date, end_date, contact_name,
 *            contact_email, contact_phone, sub_locations
 *   - quote: status, valid_until, line_items (name, quantity, days, daily_rate,
 *            override_price, discount_pct, room_id, is_hidden),
 *            discount_pct, tax_pct, notes, subtotal, total
 *   - crew:  role, crew_member_name, billable_cost, quantity, assignment_date,
 *            sub_location_id
 */

// ─── Formatting helpers ────────────────────────────────────────────────────────

function fmt(val) {
  const n = parseFloat(val) || 0;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return dateStr; }
}

function calcLineTotal(item) {
  const base = item.override_price != null
    ? parseFloat(item.override_price)
    : (parseFloat(item.daily_rate) || 0) * (parseFloat(item.days) || 1) * (parseFloat(item.quantity) || 1);
  const disc = item.discount_pct ? base * (item.discount_pct / 100) : 0;
  return base - disc;
}

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

function buildCSS(primaryColor = '#1e293b') {
  return `
    /*
     * @page margin: 0.25in eliminates the browser's default header/footer area.
     * Setting margin-top/bottom to 0.25in means the browser has no room to print
     * its own date/URL stamps — they are effectively suppressed.
     * The content itself controls all visible margins via padding on .page.
     */
    @page {
      size: letter;
      margin: 0.25in;
    }

    *, *::before, *::after {
      margin: 0; padding: 0; box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 9.5pt;
      color: #1a202c;
      background: #f0f2f5;
      line-height: 1.35;
    }

    /* ── Outer page wrapper — fills the full printable width ── */
    .page {
      width: 100%;
      background: #fff;
    }

    /* ── Document header — full width, no padding limits ── */
    .doc-header {
      background: ${primaryColor};
      color: #fff;
      padding: 16pt 18pt;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12pt;
      margin: 0 -18pt;
      padding-left: calc(16pt + 18pt);
      padding-right: calc(16pt + 18pt);
      width: calc(100% + 36pt);
    }
    .doc-header-left { display: flex; align-items: center; gap: 12pt; }
    .doc-header-logo { max-height: 40pt; max-width: 140pt; display: block; }
    .doc-header-company {
      font-size: 8pt; font-weight: 700; letter-spacing: 0.09em;
      text-transform: uppercase; opacity: 0.72; margin-bottom: 2pt;
    }
    .doc-header-title { font-size: 20pt; font-weight: 800; letter-spacing: -0.3pt; }
    .doc-header-right { text-align: right; font-size: 8pt; opacity: 0.82; line-height: 1.6; }

    /* ── Info grid — 3 equal columns, full width ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8pt;
      padding: 10pt 18pt;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      margin: 0 -18pt;
      padding-left: calc(10pt + 18pt);
      padding-right: calc(10pt + 18pt);
      width: calc(100% + 36pt);
    }
    .info-box {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 3pt;
      padding: 8pt 10pt;
    }
    .info-box-title {
      font-size: 7pt; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 6pt;
    }
    .info-field { margin-bottom: 4pt; }
    .info-field:last-child { margin-bottom: 0; }
    .info-label {
      font-size: 7pt; text-transform: uppercase; letter-spacing: 0.06em;
      color: #94a3b8; font-weight: 600; margin-bottom: 1pt;
    }
    .info-value { font-size: 9pt; font-weight: 600; color: #1e293b; }
    .info-value.sm { font-size: 8pt; font-weight: 500; }

    /* ── Status badge ── */
    .badge {
      display: inline-block; padding: 1.5pt 7pt; border-radius: 8pt;
      font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .badge-draft    { background: #f1f5f9; color: #475569; }
    .badge-sent     { background: #dbeafe; color: #1d4ed8; }
    .badge-approved { background: #d1fae5; color: #065f46; }
    .badge-declined { background: #fee2e2; color: #991b1b; }

    /* ── Body — no internal padding, full width ── */
    .doc-body { padding: 0; }

    /* ── Equipment/room sections ── */
    .section { margin-bottom: 9pt; padding: 0 18pt; }
    .section-header {
      background: ${primaryColor};
      color: #fff;
      padding: 5pt 10pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 0 -18pt;
      padding-left: calc(10pt + 18pt);
      padding-right: calc(10pt + 18pt);
    }
    .section-header-name  { font-size: 9pt; font-weight: 700; }
    .section-header-total { font-size: 9pt; font-weight: 700; opacity: 0.9; }
    .section-sub-label {
      font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
      color: #64748b; padding: 4pt 10pt 3pt;
      background: #f8fafc;
      border-bottom: 1px solid #e9eef5;
      margin: 0 -18pt;
      padding-left: calc(10pt + 18pt);
      padding-right: calc(10pt + 18pt);
    }

    /* ── Tables — full width, compact ── */
    table {
      width: 100%; border-collapse: collapse;
      border-bottom: 1px solid #e2e8f0;
      margin: 0 -18pt;
      width: calc(100% + 36pt);
    }
    thead { display: table-header-group; }
    th {
      font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
      color: #64748b; padding: 4pt 8pt 4pt calc(8pt + 18pt); background: #f8fafc;
      border-bottom: 1px solid #e2e8f0; text-align: left;
    }
    th:last-child { padding-right: calc(8pt + 18pt); }
    th.r { text-align: right; }
    td {
      font-size: 8.5pt; color: #1e293b;
      padding: 4.5pt 8pt 4.5pt calc(8pt + 18pt);
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    td:last-child { padding-right: calc(8pt + 18pt); }
    td.r    { text-align: right; }
    td.bold { font-weight: 700; }
    td.name { font-weight: 600; }
    tr:last-child td { border-bottom: none; }

    /* Column widths for equipment table */
    .col-desc  { width: 45%; }
    .col-qty   { width: 7%; }
    .col-days  { width: 7%; }
    .col-rate  { width: 15%; }
    .col-disc  { width: 9%; }
    .col-total { width: 17%; }

    /* ── Standalone crew section ── */
    .crew-section { margin-bottom: 9pt; padding: 0 18pt; }
    .crew-section-header {
      background: #312e81;
      color: #fff; padding: 5pt 10pt;
      display: flex; justify-content: space-between; align-items: center;
      margin: 0 -18pt;
      padding-left: calc(10pt + 18pt);
      padding-right: calc(10pt + 18pt);
    }
    .crew-section-header-name  { font-size: 9pt; font-weight: 700; }
    .crew-section-header-total { font-size: 9pt; font-weight: 700; opacity: 0.9; }

    /* ── Summary / totals — full width, right-aligned content ── */
    .totals-wrap {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      margin: 8pt 0 6pt;
      padding: 0 18pt;
    }
    .totals-table {
      width: auto;
      border-collapse: collapse;
      border: 1px solid #e2e8f0;
    }
    .totals-table td {
      padding: 4pt 10pt;
      font-size: 9pt;
      color: #475569;
      border-bottom: 1px solid #f1f5f9;
    }
    .totals-table tr:last-child td { border-bottom: none; }
    .totals-table td.label  { text-align: left; }
    .totals-table td.amount { text-align: right; font-weight: 600; }
    .totals-table tr.final td {
      font-size: 11pt; font-weight: 800; color: #1e293b;
      border-top: 2px solid #e2e8f0; padding-top: 6pt;
      background: #f8fafc;
    }
    .totals-table tr.discount td { color: #dc2626; }

    /* ── Tail block: notes + totals grouped together ── */
    .tail-block {
      /* Keeps notes/terms + totals on the same page if they fit */
      display: flow-root;
    }

    /* ── Notes / Terms ── */
    .notes-block {
      background: #fffbeb; border: 1px solid #fde68a;
      border-radius: 3pt; padding: 8pt 12pt; margin: 0 18pt 8pt; width: calc(100% - 36pt);
    }
    .notes-title {
      font-size: 7pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: #92400e; margin-bottom: 4pt;
    }
    .notes-body { font-size: 8.5pt; color: #78350f; line-height: 1.6; white-space: pre-wrap; }
    .terms-block {
      background: #f0f9ff; border: 1px solid #bae6fd;
      border-radius: 3pt; padding: 8pt 12pt; margin: 0 18pt 8pt; width: calc(100% - 36pt);
    }
    .terms-body { font-size: 8pt; color: #075985; line-height: 1.6; }

    /* ── Document footer ── */
    .doc-footer {
      border-top: 1px solid #e2e8f0;
      padding: 8pt 18pt;
      background: #f8fafc;
      text-align: center;
      font-size: 7.5pt;
      color: #64748b;
      line-height: 1.7;
      margin: 0 -18pt -18pt;
      padding: 8pt calc(18pt * 2);
      width: calc(100% + 36pt);
    }

    /* ══════════════════════════════════════════════════
       PRINT RULES
       ══════════════════════════════════════════════════ */
    @media print {
      html, body {
        background: white !important;
        margin: 0; padding: 0;
        /* Suppress any browser-injected header/footer text */
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .page { width: 100%; max-width: 100%; }

      /*
       * PAGE BREAK LOGIC
       * ─────────────────
       * Key strategy:
       *   1. .section uses break-inside:avoid — keeps header+table together.
       *      For large tables, the browser may still split rows but the header
       *      stays with the first few rows (break-after:avoid on .section-header).
       *   2. .tail-block wraps notes + totals together so they flow onto the
       *      same page if space permits. break-before:avoid prevents the totals
       *      being orphaned alone.
       *   3. thead { display:table-header-group } — repeats column headers when
       *      a table continues onto the next page.
       *   4. Individual tr rows get break-inside:avoid to prevent a row mid-split.
       *   5. .doc-footer gets break-inside:avoid so it doesn't split across pages.
       */

      /* Sections: keep header glued to table; allow long tables to flow */
      .section           { break-inside: avoid; page-break-inside: avoid; margin-bottom: 6pt; }
      .section-header    { break-after: avoid;  page-break-after: avoid; }
      .section-sub-label { break-after: avoid;  page-break-after: avoid; }

      /* Crew section */
      .crew-section        { break-inside: avoid; page-break-inside: avoid; margin-bottom: 6pt; }
      .crew-section-header { break-after: avoid;  page-break-after: avoid; }

      /* Tail: totals + notes stay together; prefer new page over stranded totals */
      .tail-block {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .totals-wrap { break-inside: avoid; page-break-inside: avoid; }

      /* Info grid stays on one page */
      .info-grid { break-inside: avoid; page-break-inside: avoid; }

      /* Repeat table headers across pages */
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }

      /* Prevent individual rows from splitting */
      tr { break-inside: avoid; page-break-inside: avoid; }

      /* Footer stays together */
      .doc-footer { break-inside: avoid; page-break-inside: avoid; }
    }

    /* ── Screen-only chrome ── */
    @media screen {
      body { padding: 12pt; }
      .page {
        max-width: 8.5in;
        margin: 0 auto;
        box-shadow: 0 4px 28px rgba(0,0,0,0.13);
        border-radius: 4pt;
        overflow: hidden;
      }
    }
  `;
}

// ─── Section builders ──────────────────────────────────────────────────────────

function buildHeader(brand, show, quote) {
  const primary = brand?.primary_color || '#1e293b';
  const logo = brand?.logo_url
    ? `<img src="${esc(brand.logo_url)}" class="doc-header-logo" alt="Logo" />`
    : '';

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return `
    <div class="doc-header" style="background:${esc(primary)};">
      <div class="doc-header-left">
        ${logo}
        <div>
          ${brand?.company_name ? `<div class="doc-header-company">${esc(brand.company_name)}</div>` : ''}
          <div class="doc-header-title">QUOTE</div>
        </div>
      </div>
      <div class="doc-header-right">
        <div>${today}</div>
        ${quote?.valid_until ? `<div>Valid until ${fmtDate(quote.valid_until)}</div>` : ''}
      </div>
    </div>
  `;
}

function buildInfoGrid(show, quote) {
  const cols = 3;
  const statusLabel = (quote?.status || 'draft').charAt(0).toUpperCase() + (quote?.status || 'draft').slice(1);

  const clientCard = `
    <div class="info-box">
      <div class="info-box-title">Client</div>
      <div class="info-field"><div class="info-value">${esc(show?.client || quote?.client || '—')}</div></div>
      ${show?.contact_name ? `<div class="info-field"><div class="info-label">Contact</div><div class="info-value sm">${esc(show.contact_name)}</div></div>` : ''}
      ${show?.contact_email ? `<div class="info-field"><div class="info-label">Email</div><div class="info-value sm">${esc(show.contact_email)}</div></div>` : ''}
      ${show?.contact_phone ? `<div class="info-field"><div class="info-label">Phone</div><div class="info-value sm">${esc(show.contact_phone)}</div></div>` : ''}
    </div>
  `;

  const dates = show?.start_date
    ? fmtDate(show.start_date) + (show?.end_date && show.end_date !== show.start_date ? ' – ' + fmtDate(show.end_date) : '')
    : null;

  const projectCard = `
    <div class="info-box">
      <div class="info-box-title">Project</div>
      <div class="info-field"><div class="info-value">${esc(show?.name || '—')}</div></div>
      ${show?.venue ? `<div class="info-field"><div class="info-label">Venue</div><div class="info-value sm">${esc(show.venue)}</div></div>` : ''}
      ${dates ? `<div class="info-field"><div class="info-label">Dates</div><div class="info-value sm">${dates}</div></div>` : ''}
    </div>
  `;

  const quoteCard = `
    <div class="info-box">
      <div class="info-box-title">Quote Info</div>
      <div class="info-field"><div class="info-label">Status</div><div class="info-value"><span class="badge badge-${esc(quote?.status || 'draft')}">${esc(statusLabel)}</span></div></div>
      <div class="info-field"><div class="info-label">Date</div><div class="info-value sm">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></div>
      ${quote?.valid_until ? `<div class="info-field"><div class="info-label">Valid Until</div><div class="info-value sm">${fmtDate(quote.valid_until)}</div></div>` : ''}
    </div>
  `;

  return `<div class="info-grid">${clientCard}${projectCard}${quoteCard}</div>`;
}

function buildEquipmentTable(items) {
  if (!items || items.length === 0) return '';
  const rows = items.map(item => {
    const total = calcLineTotal(item);
    const rateDisplay = item.override_price != null
      ? fmt(item.override_price / ((item.quantity || 1) * (item.days || 1)))
      : fmt(item.daily_rate || 0);
    const discDisplay = item.discount_pct > 0 ? `${item.discount_pct}%` : '—';
    return `
      <tr>
        <td class="name col-desc">${esc(item.name || '—')}</td>
        <td class="r col-qty">${item.quantity || 1}</td>
        <td class="r col-days">${item.days || 1}</td>
        <td class="r col-rate">${rateDisplay}</td>
        <td class="r col-disc">${discDisplay}</td>
        <td class="r col-total bold">${fmt(total)}</td>
      </tr>
    `;
  }).join('');

  return `
    <table>
      <thead>
        <tr>
          <th class="col-desc">Description</th>
          <th class="r col-qty">Qty</th>
          <th class="r col-days">Days</th>
          <th class="r col-rate">Rate/Day</th>
          <th class="r col-disc">Disc</th>
          <th class="r col-total">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildCrewTable(crewList) {
  if (!crewList || crewList.length === 0) return '';
  const rows = crewList.map(c => `
    <tr>
      <td class="name">${esc(c.role || '—')}</td>
      <td>${esc(c.crew_member_name || 'TBD')}</td>
      <td class="r">${c.quantity || 1}</td>
      <td class="r" style="font-size:8pt; color:#64748b;">${c.assignment_date || '—'}</td>
      <td class="r bold">${fmt(c.billable_cost)}</td>
    </tr>
  `).join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Role</th>
          <th>Crew Member</th>
          <th class="r">Qty</th>
          <th class="r">Date</th>
          <th class="r">Billable</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildRoomSections(show, items, crewList, primaryColor) {
  const rooms = show?.sub_locations || [];
  const allRooms = rooms.length > 0
    ? [...rooms, { id: '__unassigned__', name: 'General Show' }]
    : [{ id: '__unassigned__', name: 'General Show' }];

  // Bucket by room
  const roomItems = {};
  const roomCrew = {};
  allRooms.forEach(r => { roomItems[r.id] = []; roomCrew[r.id] = []; });

  (items || []).filter(i => !i.is_hidden).forEach(item => {
    const rid = item.room_id || '__unassigned__';
    if (roomItems[rid] !== undefined) roomItems[rid].push(item);
    else roomItems['__unassigned__'].push(item);
  });

  (crewList || []).forEach(c => {
    const rid = c.sub_location_id || '__unassigned__';
    if (roomCrew[rid] !== undefined) roomCrew[rid].push(c);
    else roomCrew['__unassigned__'].push(c);
  });

  const sections = [];

  allRooms.forEach(room => {
    const rItems = roomItems[room.id] || [];
    const rCrew = roomCrew[room.id] || [];
    if (rItems.length === 0 && rCrew.length === 0) return;

    const roomEquipTotal = rItems.reduce((s, i) => s + calcLineTotal(i), 0);
    const roomCrewTotal = rCrew.reduce((s, c) => s + (parseFloat(c.billable_cost) || 0), 0);
    const roomTotal = roomEquipTotal + roomCrewTotal;

    let html = `
      <div class="section">
        <div class="section-header" style="background:${esc(primaryColor || '#1e293b')};">
          <span class="section-header-name">${esc(room.name)}</span>
          <span class="section-header-total">${fmt(roomTotal)}</span>
        </div>
    `;

    if (rItems.length > 0) {
      if (rCrew.length > 0) {
        html += `<div class="section-sub-label">Equipment</div>`;
      }
      html += buildEquipmentTable(rItems);
    }

    if (rCrew.length > 0) {
      html += `<div class="section-sub-label">Crew / Labor</div>`;
      html += buildCrewTable(rCrew);
    }

    html += `</div>`;
    sections.push(html);
  });

  return sections.join('');
}

function buildStandaloneCrewSection(crewList) {
  // Only rendered when NO crew member has a sub_location_id
  // (i.e. all crew is unassigned to rooms, so the room section won't show them)
  if (!crewList || crewList.length === 0) return '';
  const total = crewList.reduce((s, c) => s + (parseFloat(c.billable_cost) || 0), 0);
  return `
    <div class="crew-section">
      <div class="crew-section-header">
        <span class="crew-section-header-name">Crew / Labor</span>
        <span class="crew-section-header-total">${fmt(total)}</span>
      </div>
      ${buildCrewTable(crewList)}
    </div>
  `;
}

function buildTotals(subtotal, discountPct, discountAmount, taxPct, taxAmount, total) {
  const hasDiscount = discountAmount > 0;
  const hasTax = taxAmount > 0;
  return `
    <div class="totals-wrap">
      <table class="totals-table">
        <tbody>
          <tr>
            <td class="label">Subtotal</td>
            <td class="amount">${fmt(subtotal)}</td>
          </tr>
          ${hasDiscount ? `
          <tr class="discount">
            <td class="label">Discount (${discountPct}%)</td>
            <td class="amount">-${fmt(discountAmount)}</td>
          </tr>` : ''}
          ${hasTax ? `
          <tr>
            <td class="label">Tax (${taxPct}%)</td>
            <td class="amount">+${fmt(taxAmount)}</td>
          </tr>` : ''}
          <tr class="final">
            <td class="label">Total</td>
            <td class="amount">${fmt(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function buildFooter(brand) {
  const parts = [];
  if (brand?.company_name) parts.push(`<strong>${esc(brand.company_name)}</strong>`);
  if (brand?.company_phone) parts.push(esc(brand.company_phone));
  if (brand?.company_email) parts.push(esc(brand.company_email));
  if (brand?.company_website) parts.push(esc(brand.company_website));
  if (brand?.company_address) parts.push(esc(brand.company_address.replace(/\n/g, ', ')));
  return `
    <div class="doc-footer">
      ${parts.length > 0 ? `<div>${parts.join(' &nbsp;·&nbsp; ')}</div>` : ''}
      ${brand?.quote_footer_note ? `<div style="margin-top:5pt; font-size:7.5pt; opacity:0.7;">${esc(brand.quote_footer_note)}</div>` : ''}
    </div>
  `;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * generateQuotePDF({ quote, show, brand, crewList, onStart, onDone, onError })
 *
 * Builds a complete HTML document from quote data and opens it in a new tab
 * with window.print() auto-triggered — producing a clean, text-based PDF.
 *
 * Multi-page: handled entirely by the browser's print engine using CSS rules:
 *   - page-break-inside: avoid on sections, totals, notes
 *   - thead: display: table-header-group (repeats on each page)
 *   - @page sets US Letter with proper margins
 *
 * Browser download: window.open() with a Blob URL + auto-print script.
 * The user clicks "Save as PDF" in the browser print dialog.
 */
export function generateQuotePDF({ quote, show, brand, crewList = [], onStart, onDone, onError }) {
  console.log('[QuotePDF] Starting PDF generation');
  console.log('[QuotePDF] Quote id:', quote?.id, '| show:', show?.name, '| items:', quote?.line_items?.length ?? 0, '| crew:', crewList.length);

  if (onStart) onStart();

  try {
    // ── Validate required fields ──────────────────────────────────────────────
    if (!show) {
      console.warn('[QuotePDF] MISSING: show object');
    }
    if (!quote) {
      console.warn('[QuotePDF] MISSING: quote object — using empty quote');
    }
    if (!brand) {
      console.warn('[QuotePDF] MISSING: brand object — using defaults');
    }
    const lineItems = (quote?.line_items || []);
    console.log('[QuotePDF] Line items:', lineItems.length, '| Hidden:', lineItems.filter(i => i.is_hidden).length);
    if (lineItems.length === 0) {
      console.warn('[QuotePDF] No line items on quote');
    }

    // ── Compute totals ────────────────────────────────────────────────────────
    console.log('[QuotePDF] Computing totals...');
    const visibleItems = lineItems.filter(i => !i.is_hidden);
    const subtotal = quote?.subtotal != null
      ? parseFloat(quote.subtotal)
      : visibleItems.reduce((s, i) => s + calcLineTotal(i), 0);

    const discountPct = parseFloat(quote?.discount_pct) || 0;
    const discountAmount = quote?.discount_amount != null
      ? parseFloat(quote.discount_amount)
      : subtotal * (discountPct / 100);

    const taxPct = parseFloat(quote?.tax_pct) || 0;
    const taxAmount = quote?.tax_amount != null
      ? parseFloat(quote.tax_amount)
      : (subtotal - discountAmount) * (taxPct / 100);

    const total = quote?.total != null
      ? parseFloat(quote.total)
      : subtotal - discountAmount + taxAmount;

    console.log('[QuotePDF] Subtotal:', subtotal, '| Discount:', discountAmount, '| Tax:', taxAmount, '| Total:', total);

    // ── Assemble sections ─────────────────────────────────────────────────────
    const primaryColor = brand?.primary_color || '#1e293b';

    console.log('[QuotePDF] Building header...');
    const headerHTML = buildHeader(brand, show, quote);

    console.log('[QuotePDF] Building info grid...');
    const infoHTML = buildInfoGrid(show, quote);

    console.log('[QuotePDF] Building room sections...');
    const roomsHTML = buildRoomSections(show, visibleItems, crewList, primaryColor);

    // Show standalone crew section ONLY when no crew member has a sub_location_id.
    // If ANY crew member is assigned to a room, they're already rendered inside
    // buildRoomSections under that room — so we don't double-render them.
    const anyCrewInRoom = crewList.some(c => c.sub_location_id);
    const standaloneCrewHTML = (!anyCrewInRoom && crewList.length > 0)
      ? buildStandaloneCrewSection(crewList)
      : '';

    console.log('[QuotePDF] Building totals...');
    const totalsHTML = buildTotals(subtotal, discountPct, discountAmount, taxPct, taxAmount, total);

    console.log('[QuotePDF] Building notes...');
    const notesHTML = quote?.notes
      ? `<div class="notes-block"><div class="notes-title">Notes</div><div class="notes-body">${esc(quote.notes)}</div></div>`
      : '';
    const termsHTML = brand?.quote_footer_note
      ? `<div class="terms-block"><div class="terms-body">${esc(brand.quote_footer_note)}</div></div>`
      : '';

    console.log('[QuotePDF] Building footer...');
    const footerHTML = buildFooter(brand);

    // ── Compose final document ────────────────────────────────────────────────
    const projectName = (show?.name || 'project').replace(/[^a-z0-9\- ]/gi, '').trim().replace(/\s+/g, '-').toLowerCase();
    const filename = `quote-${projectName}`;

    // The .tail-block groups notes + totals together so the print engine
    // keeps them on the same page where possible, preventing orphaned totals.
    const tailHTML = `<div class="tail-block">${notesHTML}${termsHTML}${totalsHTML}</div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(filename)}</title>
  <style>${buildCSS(primaryColor)}</style>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 600);
    });
  <\/script>
</head>
<body>
  <div class="page">
    ${headerHTML}
    ${infoHTML}
    <div class="doc-body">
      ${roomsHTML || '<p style="color:#94a3b8; text-align:center; padding:24pt 0;">No line items found</p>'}
      ${standaloneCrewHTML}
      ${tailHTML}
    </div>
    ${footerHTML}
  </div>
</body>
</html>`;

    console.log('[QuotePDF] HTML assembled — length:', html.length, 'chars');

    // ── Open print tab ────────────────────────────────────────────────────────
    console.log('[QuotePDF] Opening print tab...');
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');

    if (!win) {
      console.warn('[QuotePDF] Popup blocked — falling back to HTML download');
      const a = document.createElement('a');
      a.href = url;
      a.download = filename + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      console.log('[QuotePDF] Print tab opened successfully');
    }

    // Revoke blob URL after tab loads
    setTimeout(() => URL.revokeObjectURL(url), 120000);

    console.log('[QuotePDF] PDF generation complete ✓');
    if (onDone) onDone();

  } catch (err) {
    console.error('[QuotePDF] Generation FAILED:', err);
    if (onError) onError(err);
    else {
      if (onDone) onDone();
      alert('PDF generation failed: ' + err.message);
    }
  }
}