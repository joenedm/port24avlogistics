/**
 * Document Settings helper
 * Reads DocumentSettings from the DB and provides resolved values with defaults.
 * All document renderers should call getDocSettings() to get consistent config.
 */

export const DOC_DEFAULTS = {
  paper_size: 'letter',
  orientation_default: 'portrait',
  margin_preset: 'normal',
  show_header: true,
  show_footer: true,
  show_logo: true,
  show_page_numbers: true,
  show_printed_date: true,
  header_style: 'full',
  font_family: 'system',
  table_density: 'normal',
  truck_pack_orientation: 'landscape',
  quote_show_signature: true,
  invoice_show_signature: false,
};

export const MARGIN_MAP = {
  narrow: '10mm',
  normal: '14mm 12mm',
  wide: '20mm 18mm',
};

export const FONT_MAP = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif",
  inter: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  courier: "'Courier New', Courier, monospace",
};

export const TABLE_DENSITY_MAP = {
  compact: '5px 10px',
  normal: '8px 14px',
  relaxed: '12px 18px',
};

export function resolveDocSettings(settings) {
  return { ...DOC_DEFAULTS, ...settings };
}

/**
 * Build the @page and base CSS block for a document.
 * orientation: 'portrait' | 'landscape'
 */
export function buildPageCSS(settings, orientation) {
  const s = resolveDocSettings(settings);
  const orient = orientation || s.orientation_default;
  const paper = s.paper_size || 'letter';
  const margin = MARGIN_MAP[s.margin_preset] || MARGIN_MAP.normal;
  const font = FONT_MAP[s.font_family] || FONT_MAP.system;
  const tdPad = TABLE_DENSITY_MAP[s.table_density] || TABLE_DENSITY_MAP.normal;

  return `
    @page {
      size: ${paper} ${orient};
      margin: ${margin};
    }
    * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
    body {
      font-family: ${font};
      background: #eef2f7;
      color: #1e293b;
      font-size: 13px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .doc-wrap { max-width: 960px; margin: 0 auto; background: #fff; box-shadow: 0 8px 40px rgba(0,0,0,0.10); overflow: hidden; }
    .doc-body { padding: 32px 40px; background: #f4f7fb; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    th { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #64748b; padding: ${tdPad}; background: #f8fafc; border-bottom: 1.25px solid #666; text-align: left; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th.r { text-align: right; }
    td { padding: ${tdPad}; font-size: 12px; color: #1e293b; border-bottom: 1px solid #777; vertical-align: middle; word-wrap: break-word; }
    td.r { text-align: right; }
    td.name { font-weight: 600; }
    td.sub { font-size: 11px; color: #94a3b8; font-weight: 400; }
    tr:last-child td { border-bottom: none; }

    @media print {
      @page {
        size: ${paper} ${orient};
        margin: ${margin};
      }
      html, body { background: white !important; margin: 0; padding: 0; orphans: 3; widows: 3; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
      .doc-wrap { box-shadow: none !important; max-width: 100% !important; width: 100% !important; border-radius: 0 !important; margin: 0 !important; overflow: visible !important; }
      .doc-body { padding: 16px 0 0 0 !important; background: white !important; }
      .page-break-sim { display: none !important; }
      .no-print { display: none !important; }

      /* Prevent content clipping */
      .room-card { page-break-inside: avoid; break-inside: avoid; margin-bottom: 12px; }
      .totals-wrap { page-break-inside: avoid; break-inside: avoid; }
      .totals-card { page-break-inside: avoid; break-inside: avoid; }
      .notes-card { page-break-inside: avoid; break-inside: avoid; }
      .info-row { page-break-inside: avoid; break-inside: avoid; }
      .card { page-break-inside: avoid; break-inside: avoid; }
      .sig-block { page-break-inside: avoid; break-inside: avoid; }

      /* Repeat table headers */
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; break-inside: avoid; }

      /* No orphaned section headers */
      .room-header { page-break-after: avoid; break-after: avoid; }
      .room-section-label { page-break-after: avoid; break-after: avoid; }
      .doc-header-block { page-break-after: avoid; break-after: avoid; }

      /* Page number counter */
      .page-num::after { content: counter(page); }
      .page-total::after { content: counter(pages); }
    }
  `;
}

/**
 * Build the full BASE_STYLES string used by documentRenderer.
 * Drop-in replacement for the hardcoded BASE_STYLES constant.
 */
export function buildBaseStyles(settings, orientation) {
  const s = resolveDocSettings(settings);
  return buildPageCSS(s, orientation) + `
    /* Info Cards */
    .info-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px; }
    .info-row.two-col { grid-template-columns:1fr 1fr; }
    .card { background:#fff; border:2px solid #888; border-radius:12px; padding:16px 18px; }
    .card-title { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#94a3b8; margin-bottom:10px; }
    .field-label { font-size:10px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:2px; }
    .field-value { font-size:13px; color:#1e293b; font-weight:600; line-height:1.4; }
    .field-value.small { font-size:12px; font-weight:500; }
    .field-group { margin-bottom:8px; }
    .field-group:last-child { margin-bottom:0; }

    /* Room / Section Cards */
    .room-card { background:#fff; border:2px solid #555; border-radius:12px; margin-bottom:16px; overflow:hidden; }
    .room-header { background:linear-gradient(135deg,#1e293b 0%,#334155 100%); color:#fff; padding:12px 20px; display:flex; justify-content:space-between; align-items:center; }
    .room-header-name { font-size:13px; font-weight:800; letter-spacing:0.01em; }
    .room-header-total { font-size:13px; font-weight:700; opacity:0.9; }
    .room-section-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#64748b; padding:8px 18px 5px; background:#f8fafc; border-bottom:1px solid #777; }

    /* Totals */
    .totals-wrap { display:flex; justify-content:flex-end; margin-top:20px; }
    .totals-card { background:#fff; border:2px solid #888; border-radius:12px; padding:18px 24px; min-width:280px; }
    .totals-row { display:flex; justify-content:space-between; font-size:13px; color:#475569; padding:4px 0; }
    .totals-row.discount { color:#dc2626; }
    .totals-row.final { font-size:18px; font-weight:800; color:#1e293b; border-top:2px solid #666; margin-top:8px; padding-top:12px; }
    .totals-row.balance { font-size:15px; font-weight:700; color:#dc2626; }
    .totals-label { color:#64748b; }

    /* Notes */
    .notes-card { background:#fffbeb; border:2px solid #fde68a; border-radius:12px; padding:16px 18px; margin-top:16px; }
    .notes-card p { font-size:12px; color:#78350f; line-height:1.7; }

    /* Status Badge */
    .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; }
    .badge-draft { background:#f1f5f9; color:#475569; }
    .badge-sent { background:#dbeafe; color:#1d4ed8; }
    .badge-approved { background:#d1fae5; color:#065f46; }
    .badge-paid { background:#d1fae5; color:#065f46; }
    .badge-declined { background:#fee2e2; color:#991b1b; }
    .badge-overdue { background:#fef3c7; color:#92400e; }

    /* Crew rows */
    .crew-row td { background:#fafafa; }
    .crew-tag { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:600; background:#ede9fe; color:#5b21b6; padding:2px 8px; border-radius:10px; }

    /* Signature block */
    .sig-block { margin-top:32px; display:grid; grid-template-columns:1fr 1fr; gap:32px; }
    .sig-line { border-top:2px solid #334155; padding-top:8px; margin-top:32px; }
    .sig-label { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; }
    .sig-name { font-size:12px; color:#1e293b; margin-top:4px; }

    /* Truck pack layout */
    .truck-layout-img { width:100%; height:auto; display:block; border-radius:6px; border:1px solid #ddd; }
    .truck-info-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
    .truck-stat { background:#fff; border:1px solid #ddd; border-radius:8px; padding:10px 12px; }
    .truck-stat-val { font-size:16px; font-weight:800; color:#1e293b; }
    .truck-stat-label { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.07em; margin-top:2px; }

    /* Page break utility */
    .page-break { page-break-before:always; break-before:page; }
    .avoid-break { page-break-inside:avoid; break-inside:avoid; }

    /* Print-only / no-print */
    .print-only { display:none; }
    @media print { .print-only { display:block; } .no-print { display:none !important; } }

    /* Page number (print only) */
    .print-page-header { display:none; }
    @media print {
      .print-page-header {
        display:block !important;
        position:fixed;
        top:0; left:0; right:0;
        z-index:1000;
      }
    }

    /* Page break simulation (screen only) */
    .page-break-sim {
      margin:8px -40px;
      background:#f1f5f9;
      border-top:2px dashed #94a3b8;
      border-bottom:2px dashed #94a3b8;
      padding:6px 40px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:9px;
      color:#64748b;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:0.15em;
    }
  `;
}

/**
 * Generate a truck pack PDF HTML document.
 */
export function generateTruckPackHTML({ pack, show, vehicle, packItems, totalWeight, imgDataUrl, settings, brand }) {
  const s = resolveDocSettings(settings);
  const styles = buildBaseStyles(s, 'landscape');

  const headerBg = brand?.email_header_background_color || '#1e293b';
  const headerText = brand?.email_header_text_color || '#ffffff';
  const companyName = brand?.company_name || '';
  const logoUrl = s.show_logo && brand?.logo_url ? brand.logo_url : null;

  const fmtDate = (d) => {
    if (!d) return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); } catch { return d; }
  };

  const headerSection = s.header_style !== 'minimal' ? `
    <div class="doc-header-block" style="background:${headerBg}; color:${headerText}; padding:${s.header_style === 'compact' ? '16px 32px' : '28px 40px'}; display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:16px;">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height:48px; max-width:160px; display:block;" />` : ''}
        <div>
          ${companyName ? `<p style="margin:0 0 2px; font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; opacity:0.75; color:${headerText};">${companyName}</p>` : ''}
          <h1 style="margin:0; font-size:22px; font-weight:800; letter-spacing:-0.5px; color:${headerText};">TRUCK PACK</h1>
        </div>
      </div>
      <div style="text-align:right; font-size:12px; opacity:0.85; color:${headerText};">
        <p style="margin:0; font-weight:700; font-size:15px;">${show?.name || ''}</p>
        ${s.show_printed_date ? `<p style="margin:4px 0 0; opacity:0.7;">Printed ${fmtDate()}</p>` : ''}
      </div>
    </div>
  ` : '';

  const overWeight = vehicle?.weight_cap && totalWeight > vehicle.weight_cap;

  const statsSection = `
    <div class="truck-info-grid avoid-break">
      <div class="truck-stat">
        <div class="truck-stat-val">${vehicle?.name || '—'}</div>
        <div class="truck-stat-label">Vehicle</div>
      </div>
      <div class="truck-stat">
        <div class="truck-stat-val">${packItems?.length || 0}</div>
        <div class="truck-stat-label">Items</div>
      </div>
      <div class="truck-stat" style="${overWeight ? 'border-color:#ef4444;' : ''}">
        <div class="truck-stat-val" style="${overWeight ? 'color:#ef4444;' : ''}">${totalWeight?.toLocaleString() || 0} lbs</div>
        <div class="truck-stat-label">${overWeight ? '⚠ Over Capacity' : 'Total Weight'}</div>
      </div>
      <div class="truck-stat">
        <div class="truck-stat-val">${vehicle?.weight_cap?.toLocaleString() || '—'} lbs</div>
        <div class="truck-stat-label">Weight Capacity</div>
      </div>
    </div>
  `;

  const layoutSection = imgDataUrl ? `
    <div class="avoid-break" style="margin-bottom:16px;">
      <p style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#64748b; margin-bottom:8px;">Truck Layout</p>
      <img class="truck-layout-img" src="${imgDataUrl}" alt="Truck Layout" />
    </div>
  ` : '';

  const loadOrderRows = (packItems || []).map((item, i) => `
    <tr>
      <td style="width:32px; text-align:center; font-weight:700; color:#1e293b;">${item.load_order || i + 1}</td>
      <td><strong>${item.name || '—'}</strong>${item.room_name ? `<br/><span style="font-size:11px; color:#94a3b8;">${item.room_name}</span>` : ''}</td>
      <td style="color:#64748b; font-size:11px;">${item.department || '—'}</td>
      <td style="text-align:right; font-weight:600;">${item.weight_lbs ? item.weight_lbs + ' lbs' : '—'}</td>
      <td style="font-size:11px; color:#64748b;">${item.length_in ? `${item.length_in}" × ${item.width_in}" × ${item.height_in || '?'}"` : '—'}</td>
      <td style="text-align:center; font-size:11px;">
        ${item.flags?.map(f => f.replace(/_/g, ' ')).join(', ') || '—'}
      </td>
    </tr>
  `).join('');

  const loadOrderSection = `
    <div class="room-card avoid-break" style="margin-top:16px;">
      <div class="room-header">
        <span class="room-header-name">Load Order</span>
        <span class="room-header-total">${packItems?.length || 0} items · ${totalWeight?.toLocaleString() || 0} lbs total</span>
      </div>
      <table>
        <thead><tr>
          <th style="width:32px">#</th>
          <th>Item</th>
          <th>Department</th>
          <th class="r">Weight</th>
          <th>Dimensions</th>
          <th style="text-align:center;">Flags</th>
        </tr></thead>
        <tbody>
          ${loadOrderRows || `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:32px;">No items in pack</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  const footerSection = s.show_footer ? `
    <div style="background:#f8fafc; color:#64748b; padding:16px 40px; text-align:center; font-size:11px; border-top:2px solid #e2e8f0;">
      ${companyName ? `<strong style="color:#475569;">${companyName}</strong>` : ''}
      ${brand?.company_phone ? ` &nbsp;•&nbsp; ${brand.company_phone}` : ''}
      ${brand?.company_email ? ` &nbsp;•&nbsp; ${brand.company_email}` : ''}
      ${s.show_page_numbers ? `<span style="float:right;">Page <span class="page-num"></span></span>` : ''}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Truck Pack — ${show?.name || 'Pack'}</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  <div class="doc-wrap">
    ${headerSection}
    <div class="doc-body">
      ${statsSection}
      ${layoutSection}
      ${loadOrderSection}
      ${pack?.notes ? `<div class="notes-card avoid-break" style="margin-top:16px;"><p><strong>Notes:</strong> ${pack.notes}</p></div>` : ''}
    </div>
    ${footerSection}
  </div>
</body>
</html>`;
}