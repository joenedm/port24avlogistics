/**
 * Quote Template Renderer
 * Converts a block-based template config into branded HTML.
 * No HTML is ever shown to the user — this runs under the hood.
 */

const SAMPLE_DATA = {
  show: {
    name: 'Annual Conference 2026',
    client: 'Acme Corporation',
    venue: 'Grand Ballroom, Hilton Hotel',
    start_date: '2026-05-15',
    end_date: '2026-05-17',
    contact_name: 'Sarah Mitchell',
    contact_email: 'sarah@acme.com',
    contact_phone: '(212) 555-0142',
    sub_locations: [
      { id: 'main', name: 'Main Stage' },
      { id: 'breakout', name: 'Breakout Room A' },
    ],
  },
  quote: {
    status: 'draft',
    valid_until: '2026-04-30',
    notes: 'All equipment includes delivery, setup, and strike. A 50% deposit is required to confirm booking.',
    discount_pct: 10,
    tax_pct: 8.5,
  },
  rooms: [
    {
      id: 'main',
      name: 'Main Stage',
      items: [
        { name: 'Line Array Speaker System', quantity: 2, days: 3, daily_rate: 450, discount_pct: 0 },
        { name: 'Digital Mixing Console (Yamaha CL5)', quantity: 1, days: 3, daily_rate: 350, discount_pct: 0 },
        { name: 'Wireless Microphone Kit (4 ch)', quantity: 1, days: 3, daily_rate: 180, discount_pct: 0 },
        { name: 'LED Moving Head Fixtures', quantity: 8, days: 3, daily_rate: 95, discount_pct: 0 },
        { name: 'Projection Screen (16ft)', quantity: 1, days: 3, daily_rate: 220, discount_pct: 0 },
      ],
    },
    {
      id: 'breakout',
      name: 'Breakout Room A',
      items: [
        { name: 'Powered PA Speakers', quantity: 2, days: 3, daily_rate: 120, discount_pct: 0 },
        { name: 'Wireless Lapel Mic', quantity: 1, days: 3, daily_rate: 85, discount_pct: 0 },
        { name: 'LCD Projector (5000 lm)', quantity: 1, days: 3, daily_rate: 175, discount_pct: 0 },
      ],
    },
  ],
  crew: [
    { role: 'A1 Audio Engineer', crew_member_name: 'James Harlow', quantity: 1, assignment_date: '2026-05-15', billable_cost: 1200 },
    { role: 'Lighting Director', crew_member_name: 'Elena Torres', quantity: 1, assignment_date: '2026-05-15', billable_cost: 950 },
    { role: 'A2 Audio Tech', crew_member_name: 'Marcus Webb', quantity: 1, assignment_date: '2026-05-15', billable_cost: 650 },
  ],
  travel: [
    { description: 'Producer Flight — NYC to LAX', travel_type: 'flight', quantity: 2, billable_amount: 1400, vendor: 'Delta Airlines' },
    { description: 'Rental Car — 3 Days', travel_type: 'rental_car', quantity: 1, billable_amount: 360, vendor: 'Enterprise' },
    { description: 'Parking', travel_type: 'parking', quantity: 1, billable_amount: 90 },
    { description: 'Mileage Reimbursement', travel_type: 'mileage', quantity: 1, billable_amount: 75 },
  ],
};

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

function calcLineTotal(item) {
  const base = item.override_price != null
    ? parseFloat(item.override_price)
    : (parseFloat(item.daily_rate) || 0) * (parseFloat(item.days) || 1) * (parseFloat(item.quantity) || 1);
  const disc = item.discount_pct ? base * (item.discount_pct / 100) : 0;
  return base - disc;
}

function getHeaderBg(header) {
  const type = header?.bgType || 'solid';
  if (type === 'gradient' && header?.bgGradient)
    return `background: ${header.bgGradient};`;
  if (type !== 'image')
    return `background-color: ${header?.bgColor || '#1e293b'};`;
  // Image type is handled with a nested <img> tag for true cover/crop behavior
  return '';
}

function cardStyle(block) {
  const s = block.style || {};
  return `background:${s.bgColor || '#ffffff'}; border:${s.borderWidth || 2}px solid ${s.borderColor || '#e2e8f0'}; border-radius:${s.radius || 14}px; padding:${s.padding || 20}px 22px;`;
}

function renderBlock(block, data, brand) {
  const { show, quote, rooms } = data;
  const s = block.style || {};
  const bStyle = cardStyle(block);

  switch (block.type) {
    case 'header': {
      const h = block.config || {};
      const textColor = h.textColor || '#ffffff';
      const align = h.logoPosition === 'right' ? 'right' : h.logoPosition === 'left' ? 'left' : 'center';
      const logoUrl = h.logoUrl || '';
      const showLogo = h.showLogo !== false && logoUrl;
      const isImage = h.bgType === 'image' && h.bgImage;
      const minHeight = `${(h.paddingV || 36) * 2 + 60}px`;
      const logoTag = showLogo ? `<img src="${logoUrl}" alt="Logo" style="max-height:60px; max-width:200px; display:block; ${align === 'center' ? 'margin:0 auto 12px;' : align === 'right' ? 'margin:0 0 12px auto;' : 'margin:0 0 12px 0;'}" />` : '';
      const companyTag = h.companyName ? `<p style="margin:0 0 4px; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; opacity:0.7;">${h.companyName}</p>` : '';
      const customTag = h.customField ? `<h1 style="margin:0; font-size:${h.titleSize || 34}px; font-weight:800; letter-spacing:-1px;">${h.customField}</h1>` : '';
      // For image backgrounds: use a cover <img> absolutely positioned inside a relative container
      const coverImg = isImage
        ? `<img src="${h.bgImage}" alt="" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; object-position:center; display:block;" />`
        : '';
      return `
        <div style="${getHeaderBg(h)} color:${textColor}; padding:${h.paddingV || 36}px 48px; text-align:${align}; position:relative; overflow:hidden; min-height:${minHeight}; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
          ${coverImg}
          <div style="position:relative; z-index:1;">
            ${logoTag}
            ${companyTag}
            ${customTag}
          </div>
        </div>`;
    }

    case 'customer_info': {
      const cfg = block.config || {};
      const fields = [];
      if (cfg.showName !== false) fields.push({ label: 'Company / Name', value: show?.client || '—' });
      if (cfg.showContact !== false && show?.contact_name) fields.push({ label: 'Contact', value: show.contact_name });
      if (cfg.showEmail !== false && show?.contact_email) fields.push({ label: 'Email', value: show.contact_email });
      if (cfg.showPhone !== false && show?.contact_phone) fields.push({ label: 'Phone', value: show.contact_phone });
      return `
        <div style="${bStyle} margin-bottom:16px;">
          <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#94a3b8; margin-bottom:12px;">${block.title || 'Client'}</div>
          ${fields.map(f => `<div style="margin-bottom:8px;"><div style="font-size:10px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px;">${f.label}</div><div style="font-size:13px; color:#1e293b; font-weight:600;">${f.value}</div></div>`).join('')}
        </div>`;
    }

    case 'project_details': {
      const cfg = block.config || {};
      const fields = [];
      if (cfg.showName !== false) fields.push({ label: 'Project Name', value: show?.name || '—' });
      if (cfg.showVenue !== false && show?.venue) fields.push({ label: 'Venue', value: show.venue });
      if (cfg.showDates !== false && show?.start_date) fields.push({ label: 'Dates', value: fmtDate(show.start_date) + (show.end_date ? ' — ' + fmtDate(show.end_date) : '') });
      return `
        <div style="${bStyle} margin-bottom:16px;">
          <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#94a3b8; margin-bottom:12px;">${block.title || 'Project Details'}</div>
          ${fields.map(f => `<div style="margin-bottom:8px;"><div style="font-size:10px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px;">${f.label}</div><div style="font-size:13px; color:#1e293b; font-weight:600;">${f.value}</div></div>`).join('')}
        </div>`;
    }

    case 'quote_info': {
      const cfg = block.config || {};
      const statusColors = { draft: '#475569', sent: '#1d4ed8', approved: '#065f46', declined: '#991b1b' };
      const statusBg = { draft: '#f1f5f9', sent: '#dbeafe', approved: '#d1fae5', declined: '#fee2e2' };
      const status = quote?.status || 'draft';
      const fields = [];
      if (cfg.showStatus !== false) fields.push({ label: 'Status', value: `<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;background:${statusBg[status]};color:${statusColors[status]};">${status}</span>` });
      if (cfg.showValidUntil !== false && quote?.valid_until) fields.push({ label: 'Valid Until', value: fmtDate(quote.valid_until) });
      if (cfg.showDate !== false) fields.push({ label: 'Quote Date', value: fmtDate(new Date().toISOString().split('T')[0]) });
      return `
        <div style="${bStyle} margin-bottom:16px;">
          <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#94a3b8; margin-bottom:12px;">${block.title || 'Quote Info'}</div>
          ${fields.map(f => `<div style="margin-bottom:8px;"><div style="font-size:10px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:3px;">${f.label}</div><div style="font-size:13px; color:#1e293b; font-weight:600;">${f.value}</div></div>`).join('')}
        </div>`;
    }

    case 'info_row': {
      // Renders customer_info + project_details + quote_info side by side
      const childBlocks = [
        { type: 'customer_info', title: 'Client', config: {}, style: s },
        { type: 'project_details', title: 'Project Details', config: {}, style: s },
        { type: 'quote_info', title: 'Quote Info', config: {}, style: s },
      ];
      return `<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:20px;">
        ${childBlocks.map(b => renderBlock(b, data, brand)).join('')}
      </div>`;
    }

    case 'room_section': {
      const cfg = block.config || {};
      const roomHeaderBg = cfg.roomHeaderBg || 'linear-gradient(135deg,#1e293b,#334155)';
      const roomHeaderColor = cfg.roomHeaderColor || '#ffffff';
      const showRoomTotal = cfg.showRoomTotal !== false;

      return rooms.map(room => {
        const rItems = room.items || [];
        if (rItems.length === 0) return '';

        const roomTotal = rItems.reduce((s, i) => s + calcLineTotal(i), 0);

        const equipHTML = `
          <table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:#f8fafc; border-bottom:1px solid #e9eef5;">
              <th style="padding:8px 16px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Description</th>
              <th style="padding:8px 16px; text-align:right; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Qty</th>
              <th style="padding:8px 16px; text-align:right; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Days</th>
              <th style="padding:8px 16px; text-align:right; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Rate/Day</th>
              <th style="padding:8px 16px; text-align:right; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Total</th>
            </tr></thead>
            <tbody>
              ${rItems.map(item => `
                <tr style="border-bottom:1px solid #f3f6fa;">
                  <td style="padding:9px 16px; font-size:12.5px; font-weight:600; color:#1e293b;">${item.name}</td>
                  <td style="padding:9px 16px; text-align:right; font-size:12.5px; color:#1e293b;">${item.quantity}</td>
                  <td style="padding:9px 16px; text-align:right; font-size:12.5px; color:#1e293b;">${item.days}</td>
                  <td style="padding:9px 16px; text-align:right; font-size:12.5px; color:#1e293b;">${fmt(item.daily_rate)}</td>
                  <td style="padding:9px 16px; text-align:right; font-size:12.5px; font-weight:700; color:#1e293b;">${fmt(calcLineTotal(item))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`;

        return `
          <div class="avoidbreak" style="background:${s.bgColor || '#fff'}; border:${s.borderWidth || 2}px solid ${s.borderColor || '#dde3ed'}; border-radius:${s.radius || 16}px; margin-bottom:20px; overflow:hidden;">
            <div style="background:${roomHeaderBg}; color:${roomHeaderColor}; padding:14px 22px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:14px; font-weight:800;">${room.name}</span>
              ${showRoomTotal ? `<span style="font-size:14px; font-weight:700; opacity:0.9;">${fmt(roomTotal)}</span>` : ''}
            </div>
            ${equipHTML}
          </div>`;
      }).join('');
    }

    case 'crew_section': {
      const crewList = data.crew || [];
      if (crewList.length === 0) return '';
      const cfg = block.config || {};
      const showTotal = cfg.showTotal !== false;
      const crewTotal = crewList.reduce((sum, c) => sum + (parseFloat(c.billable_cost) || 0), 0);
      const headerBg = cfg.headerBg || 'linear-gradient(135deg,#1e293b,#334155)';
      const headerColor = cfg.headerColor || '#ffffff';
      return `
        <div class="avoidbreak" style="background:${s.bgColor || '#ffffff'}; border:${s.borderWidth || 2}px solid ${s.borderColor || '#dde3ed'}; border-radius:${s.radius || 16}px; margin-bottom:20px; overflow:hidden;">
          <div style="background:${headerBg}; color:${headerColor}; padding:14px 22px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:14px; font-weight:800;">${block.title || 'Crew / Labor'}</span>
            ${showTotal ? `<span style="font-size:14px; font-weight:700; opacity:0.9;">${fmt(crewTotal)}</span>` : ''}
          </div>
          <table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:#f8fafc; border-bottom:1px solid #e9eef5;">
              <th style="padding:8px 16px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Role</th>
              <th style="padding:8px 16px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Crew Member</th>
              <th style="padding:8px 16px; text-align:right; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Qty</th>
              <th style="padding:8px 16px; text-align:right; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Billable</th>
            </tr></thead>
            <tbody>
              ${crewList.map(c => `
                <tr style="border-bottom:1px solid #f3f6fa;">
                  <td style="padding:9px 16px; font-size:12.5px; font-weight:600; color:#1e293b;">${c.role}</td>
                  <td style="padding:9px 16px; font-size:12.5px; color:#1e293b;">${c.crew_member_name || '—'}</td>
                  <td style="padding:9px 16px; text-align:right; font-size:12.5px; color:#1e293b;">${c.quantity || 1}</td>
                  <td style="padding:9px 16px; text-align:right; font-size:12.5px; font-weight:700; color:#1e293b;">${fmt(c.billable_cost)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }

    case 'travel_section': {
      const travelList = data.travel || [];
      if (travelList.length === 0) return '';
      const cfg = block.config || {};
      const showTotal = cfg.showTotal !== false;
      const travelTotal = travelList.reduce((sum, t) => sum + (parseFloat(t.billable_amount) || 0), 0);
      const headerBg = cfg.headerBg || 'linear-gradient(135deg,#1e293b,#334155)';
      const headerColor = cfg.headerColor || '#ffffff';
      return `
        <div class="avoidbreak" style="background:${s.bgColor || '#ffffff'}; border:${s.borderWidth || 2}px solid ${s.borderColor || '#dde3ed'}; border-radius:${s.radius || 16}px; margin-bottom:20px; overflow:hidden;">
          <div style="background:${headerBg}; color:${headerColor}; padding:14px 22px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:14px; font-weight:800;">${block.title || 'Travel & Transport'}</span>
            ${showTotal ? `<span style="font-size:14px; font-weight:700; opacity:0.9;">${fmt(travelTotal)}</span>` : ''}
          </div>
          <table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:#f8fafc; border-bottom:1px solid #e9eef5;">
              <th style="padding:8px 16px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Description</th>
              <th style="padding:8px 16px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Type</th>
              <th style="padding:8px 16px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Vendor</th>
              <th style="padding:8px 16px; text-align:right; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Qty</th>
              <th style="padding:8px 16px; text-align:right; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#64748b;">Amount</th>
            </tr></thead>
            <tbody>
              ${travelList.map(t => `
                <tr style="border-bottom:1px solid #f3f6fa;">
                  <td style="padding:9px 16px; font-size:12.5px; font-weight:600; color:#1e293b;">${t.description}</td>
                  <td style="padding:9px 16px; font-size:12.5px; color:#475569; text-transform:capitalize;">${(t.travel_type || '').replace(/_/g, ' ')}</td>
                  <td style="padding:9px 16px; font-size:12.5px; color:#1e293b;">${t.vendor || '—'}</td>
                  <td style="padding:9px 16px; text-align:right; font-size:12.5px; color:#1e293b;">${t.quantity || 1}</td>
                  <td style="padding:9px 16px; text-align:right; font-size:12.5px; font-weight:700; color:#1e293b;">${fmt(t.billable_amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }

    case 'totals': {
      const cfg = block.config || {};
      const allItems = rooms.flatMap(r => r.items || []);
      const allCrew = data.crew || [];
      const allTravel = data.travel || [];
      const subtotal = allItems.reduce((s, i) => s + calcLineTotal(i), 0)
        + allCrew.reduce((s, c) => s + (parseFloat(c.billable_cost) || 0), 0)
        + allTravel.reduce((s, t) => s + (parseFloat(t.billable_amount) || 0), 0);
      const discAmt = subtotal * ((quote?.discount_pct || 0) / 100);
      const taxAmt = (subtotal - discAmt) * ((quote?.tax_pct || 0) / 100);
      const total = subtotal - discAmt + taxAmt;
      const align = cfg.align || 'right';
      return `
        <div class="totals-section" style="display:flex; justify-content:${align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start'}; margin-top:${s.padding || 20}px;">
          <div style="${bStyle} min-width:320px;">
            <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#94a3b8; margin-bottom:12px;">${block.title || 'Summary'}</div>
            <div style="display:flex; justify-content:space-between; font-size:13px; color:#475569; padding:5px 0;"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
            ${discAmt > 0 ? `<div style="display:flex; justify-content:space-between; font-size:13px; color:#dc2626; padding:5px 0;"><span>Discount (${quote?.discount_pct || 0}%)</span><span>−${fmt(discAmt)}</span></div>` : ''}
            ${taxAmt > 0 ? `<div style="display:flex; justify-content:space-between; font-size:13px; color:#475569; padding:5px 0;"><span>Tax (${quote?.tax_pct || 0}%)</span><span>+${fmt(taxAmt)}</span></div>` : ''}
            <div style="display:flex; justify-content:space-between; font-size:20px; font-weight:800; color:#1e293b; border-top:2px solid #e2e8f0; margin-top:10px; padding-top:14px;"><span>Total</span><span>${fmt(total)}</span></div>
          </div>
        </div>`;
    }

    case 'notes': {
      const cfg = block.config || {};
      const text = cfg.staticText || quote?.notes || 'All prices include delivery and setup. A 50% deposit is required to confirm.';
      if (!text) return '';
      const noteBg = s.bgColor || '#ffffff';
      const noteBorder = s.borderColor || '#e2e8f0';
      const noteColor = cfg.textColor || '#1e293b';
      return `
        <div class="notes-section" style="background:${noteBg}; border:${s.borderWidth || 2}px solid ${noteBorder}; border-radius:${s.radius || 14}px; padding:${s.padding || 18}px 22px; margin-top:20px;">
          <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:${noteColor}; opacity:0.6; margin-bottom:8px;">${block.title || 'Notes & Terms'}</div>
          <p style="font-size:12.5px; color:${noteColor}; line-height:1.7; margin:0;">${text}</p>
        </div>`;
    }

    case 'page_break':
      return `
        <div class="page-break-block">
          <div class="page-break-sim">— Page Break —</div>
          <div class="page-break-label">Page Break</div>
        </div>`;

    case 'divider':
      return `<div style="border-top:${s.borderWidth || 1}px solid ${s.borderColor || '#e2e8f0'}; margin:${s.padding || 16}px 0;"></div>`;

    case 'spacer':
      return `<div style="height:${(block.config?.height || 24)}px;"></div>`;

    case 'footer': {
      const cfg = block.config || {};
      const textColor = cfg.textColor || '#64748b';
      const bgColor = s.bgColor || '#f8fafc';
      const align = cfg.align || 'center';
      const parts = [];
      if (cfg.showCompany !== false && brand?.company_name) parts.push(`<strong>${brand.company_name}</strong>`);
      if (cfg.showPhone !== false && brand?.company_phone) parts.push(brand.company_phone);
      if (cfg.showEmail !== false && brand?.company_email) parts.push(brand.company_email);
      if (cfg.showWebsite !== false && brand?.company_website) parts.push(brand.company_website);
      if (cfg.showAddress !== false && brand?.company_address) parts.push(brand.company_address.replace(/\n/g, ', '));
      const disclaimer = cfg.disclaimer || brand?.email_footer_disclaimer || '';
      return `
        <div class="footer-section" style="background:${bgColor}; color:${textColor}; padding:28px 48px; text-align:${align}; font-size:12px; border-top:1px solid #e2e8f0;">
          ${parts.length > 0 ? `<p style="margin:0 0 6px; line-height:1.8;">${parts.join(' &nbsp;•&nbsp; ')}</p>` : ''}
          ${disclaimer ? `<p style="margin:6px 0 0; font-size:10px; opacity:0.5;">${disclaimer}</p>` : ''}
        </div>`;
    }

    default:
      return '';
  }
}

const PAGE_STYLES = `
  /* ── Screen view ── */
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Arial, sans-serif;
    background: #e8edf5;
    color: #1e293b;
    font-size: 14px;
  }
  .doc-wrap {
    max-width: 900px;
    margin: 0 auto;
    background: #ffffff;
    box-shadow: 0 8px 40px rgba(0,0,0,0.12);
    border-radius: 0 0 16px 16px;
    overflow: visible;
  }
  .doc-body {
    padding: 36px 44px;
    background: #f4f7fb;
  }

  /* ── Avoid breaking cards across pages ── */
  .avoidbreak { break-inside: avoid; page-break-inside: avoid; }
  .breakbefore { break-before: page; page-break-before: always; }

  /* ── Page break markers (screen only) ── */
  .page-break-block {
    break-before: page;
    page-break-before: always;
    position: relative;
    height: 0;
    border: none;
    overflow: visible;
  }
  .page-break-block .page-break-sim {
    background: #f1f5f9;
    border-top: 2px solid #e2e8f0;
    border-bottom: 2px solid #e2e8f0;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    color: #94a3b8;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .page-break-block .page-break-label {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin: 20px 0 16px;
  }
  .page-break-block .page-break-label::before,
  .page-break-block .page-break-label::after {
    content: '';
    flex: 1;
    border-top: 1px dashed #cbd5e1;
  }

  /* ── Print / Save as PDF ── */
  @page {
    size: letter portrait;
    margin: 14mm 12mm 14mm 12mm;
    /* Blank browser-injected date/title headers/footers */
    @top-left { content: ''; }
    @top-center { content: ''; }
    @top-right { content: ''; }
    @bottom-left { content: ''; }
    @bottom-center { content: ''; }
    @bottom-right { content: ''; }
  }

  /* Always hidden — we never use fixed repeat headers */
  .print-page-header { display: none !important; }

  @media print {
    @page {
      size: letter portrait;
      margin: 14mm 12mm 14mm 12mm;
      @top-left { content: ''; }
      @top-center { content: ''; }
      @top-right { content: ''; }
      @bottom-left { content: ''; }
      @bottom-center { content: ''; }
      @bottom-right { content: ''; }
    }

    html, body {
      background: white !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      orphans: 3;
      widows: 3;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    /* Strip all screen-only chrome — overflow:visible prevents page 2 clipping */
    .doc-wrap {
      box-shadow: none !important;
      border-radius: 0 !important;
      max-width: 100% !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      overflow: visible !important;
    }
    .doc-body {
      padding: 16px 0 0 0 !important;
      background: white !important;
      margin: 0 !important;
      overflow: visible !important;
    }

    /* Hide repeat header entirely */
    .print-page-header { display: none !important; }

    /* Main header only on page 1 */
    .doc-header-first-page {
      page-break-after: avoid;
      break-after: avoid;
      overflow: visible !important;
    }

    /* Page break rules */
    .avoidbreak {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      margin-bottom: 14px !important;
      overflow: visible !important;
      border-radius: 0 !important;
    }
    .breakbefore {
      break-before: page !important;
      page-break-before: always !important;
    }
    .page-break-block {
      break-before: page !important;
      page-break-before: always !important;
      height: 0 !important;
      margin: 0 !important;
    }
    .page-break-block .page-break-sim,
    .page-break-block .page-break-label {
      display: none !important;
    }

    /* Tables */
    table {
      border-collapse: collapse !important;
      width: 100% !important;
      table-layout: fixed !important;
    }
    thead { display: table-header-group !important; }
    tbody { display: table-row-group !important; }
    tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    /* Keep totals, notes, footer together */
    .totals-section, .notes-section, .footer-section {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
  }
`;

/**
 * Render full HTML from a block-based template config.
 * @param {Array} blocks - the template blocks array
 * @param {Object} data - { show, quote, rooms } (real or sample)
 * @param {Object} brand - BrandSettings record
 */
export function renderQuoteTemplate(blocks, data = null, brand = {}) {
  // If no real data passed (or show has no name), use full sample data for the template builder preview
  const usesSampleData = !data || !data.show || !data.show.name;
  const src = usesSampleData ? SAMPLE_DATA : data;
  const mergedData = {
    show: usesSampleData ? SAMPLE_DATA.show : { ...src.show },
    quote: usesSampleData ? SAMPLE_DATA.quote : { ...SAMPLE_DATA.quote, ...src.quote },
    rooms: usesSampleData ? SAMPLE_DATA.rooms : (src.rooms ?? []),
    crew: usesSampleData ? SAMPLE_DATA.crew : (src.crew ?? []),
    travel: usesSampleData ? SAMPLE_DATA.travel : (src.travel ?? []),
  };

  const hasHeader = blocks.some(b => b.type === 'header');
  const hasFooter = blocks.some(b => b.type === 'footer');
  const bodyBlocks = blocks.filter(b => b.type !== 'header' && b.type !== 'footer');

  const headerHTML = hasHeader ? renderBlock(blocks.find(b => b.type === 'header'), mergedData, brand) : '';
  const footerHTML = hasFooter ? renderBlock(blocks.find(b => b.type === 'footer'), mergedData, brand) : '';
  const bodyHTML = bodyBlocks.map(b => renderBlock(b, mergedData, brand)).join('');

  const companyName = brand?.company_name || '';
  const repeatHeader = `
    <div class="print-page-header" style="background:#1e293b; color:#fff; padding:8px 24px; display:flex; justify-content:space-between; align-items:center; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      <span style="font-size:12px; font-weight:700; opacity:0.85;">${companyName}</span>
      <span style="font-size:11px; font-weight:600; opacity:0.7;">Quote — ${mergedData.show?.name || 'Project'}</span>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Quote — ${mergedData.show?.name || 'Project'}</title>
  <style>${PAGE_STYLES}</style>
</head>
<body>
  ${repeatHeader}
  <div class="doc-wrap">
    <div class="doc-header-first-page">${headerHTML}</div>
    <div class="doc-body">${bodyHTML}</div>
    ${footerHTML}
  </div>
</body>
</html>`;
}

export { SAMPLE_DATA };

// ─── SAMPLE INVOICE / PICKLIST DATA ──────────────────────────────────────────

const SAMPLE_INVOICE_DATA = {
  invoice: {
    invoice_number: 'INV-240001',
    status: 'sent',
    client: 'Acme Corporation',
    client_email: 'billing@acme.com',
    client_address: '123 Business Ave, New York, NY 10001',
    show_name: 'Annual Conference 2026',
    issue_date: '2026-04-14',
    due_date: '2026-05-14',
    payment_terms: 'Net 30',
    notes: 'Payment due within 30 days. Late fees may apply.',
    discount_pct: 0,
    tax_pct: 8.5,
    amount_paid: 0,
    line_items: [
      { name: 'Line Array Speaker System', description: 'L-Acoustics K2 x4', quantity: 2, days: 3, unit_price: 450 },
      { name: 'Digital Mixing Console', description: 'Yamaha CL5', quantity: 1, days: 3, unit_price: 350 },
      { name: 'Lighting Package', description: 'LED Moving Heads x8', quantity: 1, days: 3, unit_price: 580 },
      { name: 'A1 Audio Engineer', description: 'Full day rate', quantity: 1, days: 3, unit_price: 400 },
    ],
  },
};

const SAMPLE_PICK_LIST_DATA = {
  show: SAMPLE_DATA.show,
  items: [
    { name: 'Line Array Speaker (L)', barcode: 'SPK-001', category: 'Audio', quantity: 1, current_sub_location_id: 'main' },
    { name: 'Line Array Speaker (R)', barcode: 'SPK-002', category: 'Audio', quantity: 1, current_sub_location_id: 'main' },
    { name: 'Digital Console (Yamaha CL5)', barcode: 'CON-010', category: 'Audio', quantity: 1, current_sub_location_id: 'main' },
    { name: 'LED Moving Head Fixture', barcode: 'LIT-020', category: 'Lighting', quantity: 8, current_sub_location_id: 'main' },
    { name: 'Projection Screen 16ft', barcode: 'SCR-001', category: 'Video', quantity: 1, current_sub_location_id: 'breakout' },
    { name: 'Powered PA Speaker', barcode: 'SPK-030', category: 'Audio', quantity: 2, current_sub_location_id: 'breakout' },
  ],
};

// ─── INVOICE BLOCK RENDERER ──────────────────────────────────────────────────

function renderInvoiceBlock(block, data, brand) {
  const { invoice, show } = data;
  const s = block.style || {};
  const cfg = block.config || {};

  const calcInvItem = (i) => (parseFloat(i.unit_price) || 0) * (parseFloat(i.quantity) || 1) * (parseFloat(i.days) || 1);
  const items = invoice?.line_items || [];
  const subtotal = items.reduce((sum, i) => sum + calcInvItem(i), 0);
  const discAmt = subtotal * ((invoice?.discount_pct || 0) / 100);
  const taxAmt = (subtotal - discAmt) * ((invoice?.tax_pct || 0) / 100);
  const total = subtotal - discAmt + taxAmt;
  const balanceDue = Math.max(0, total - (parseFloat(invoice?.amount_paid) || 0));

  function cs(block) {
    const s = block.style || {};
    return `background:${s.bgColor||'#fff'};border:${s.borderWidth||2}px solid ${s.borderColor||'#e2e8f0'};border-radius:${s.radius||14}px;padding:${s.padding||20}px 22px;`;
  }

  switch (block.type) {
    case 'header': return renderBlock(block, data, brand);
    case 'footer': return renderBlock(block, data, brand);
    case 'divider': return renderBlock(block, data, brand);
    case 'spacer': return renderBlock(block, data, brand);
    case 'page_break': return renderBlock(block, data, brand);
    case 'notes': {
      const text = cfg.staticText || invoice?.notes || invoice?.payment_terms || '';
      if (!text) return '';
      return `<div class="notes-section" style="background:${s.bgColor||'#fff'};border:${s.borderWidth||2}px solid ${s.borderColor||'#e2e8f0'};border-radius:${s.radius||14}px;padding:${s.padding||18}px 22px;margin-top:20px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:8px;">${block.title||'Notes & Terms'}</div>
        <p style="font-size:12.5px;color:#1e293b;line-height:1.7;margin:0;">${text}</p>
      </div>`;
    }
    case 'invoice_info_row':
    case 'bill_to':
    case 'invoice_details': {
      const statusColors = { draft:'#475569',sent:'#1d4ed8',paid:'#065f46',partially_paid:'#92400e',overdue:'#991b1b' };
      const statusBgs = { draft:'#f1f5f9',sent:'#dbeafe',paid:'#d1fae5',partially_paid:'#fef3c7',overdue:'#fee2e2' };
      const st = invoice?.status || 'draft';
      return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px;">
        <div style="${cs(block)}"><div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:12px;">Bill To</div>
          <div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Client</div><div style="font-size:13px;color:#1e293b;font-weight:600;">${invoice?.client||'—'}</div></div>
          ${invoice?.client_email?`<div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Email</div><div style="font-size:12px;color:#1e293b;font-weight:500;">${invoice.client_email}</div></div>`:''}
          ${invoice?.client_address?`<div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Address</div><div style="font-size:12px;color:#1e293b;font-weight:500;">${invoice.client_address}</div></div>`:''}
        </div>
        <div style="${cs(block)}"><div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:12px;">Project</div>
          <div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Name</div><div style="font-size:13px;color:#1e293b;font-weight:600;">${invoice?.show_name||'—'}</div></div>
          ${invoice?.payment_terms?`<div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Payment Terms</div><div style="font-size:12px;color:#1e293b;font-weight:500;">${invoice.payment_terms}</div></div>`:''}
        </div>
        <div style="${cs(block)}"><div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:12px;">Invoice Details</div>
          <div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Invoice #</div><div style="font-size:13px;color:#1e293b;font-weight:600;">${invoice?.invoice_number||'—'}</div></div>
          <div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Status</div><div><span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;background:${statusBgs[st]||'#f1f5f9'};color:${statusColors[st]||'#475569'};">${st}</span></div></div>
          ${invoice?.issue_date?`<div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Issue Date</div><div style="font-size:12px;color:#1e293b;font-weight:500;">${fmtDate(invoice.issue_date)}</div></div>`:''}
          ${invoice?.due_date?`<div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Due Date</div><div style="font-size:12px;color:#1e293b;font-weight:500;">${fmtDate(invoice.due_date)}</div></div>`:''}
        </div>
      </div>`;
    }
    case 'invoice_line_items': {
      const headerBg = cfg.headerBg || '#1e293b';
      const headerColor = cfg.headerColor || '#ffffff';
      const rows = items.map(item => `
        <tr style="border-bottom:1px solid #f3f6fa;">
          <td style="padding:9px 16px;font-size:12.5px;font-weight:600;color:#1e293b;">${item.name||'—'}${item.description?`<br/><span style="font-size:11px;color:#94a3b8;font-weight:400;">${item.description}</span>`:''}</td>
          <td style="padding:9px 16px;text-align:right;font-size:12.5px;color:#1e293b;">${item.quantity||1}</td>
          <td style="padding:9px 16px;text-align:right;font-size:12.5px;color:#1e293b;">${item.days||1}</td>
          <td style="padding:9px 16px;text-align:right;font-size:12.5px;color:#1e293b;">${fmt(item.unit_price||0)}</td>
          <td style="padding:9px 16px;text-align:right;font-size:12.5px;font-weight:700;color:#1e293b;">${fmt(calcInvItem(item))}</td>
        </tr>`).join('');
      return `<div class="avoidbreak" style="background:${s.bgColor||'#fff'};border:${s.borderWidth||2}px solid ${s.borderColor||'#dde3ed'};border-radius:${s.radius||16}px;margin-bottom:20px;overflow:hidden;">
        <div style="background:${headerBg};color:${headerColor};padding:14px 22px;"><span style="font-size:14px;font-weight:800;">${block.title||'Line Items'}</span></div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#f8fafc;border-bottom:1px solid #e9eef5;">
            <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#64748b;">Description</th>
            <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#64748b;">Qty</th>
            <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#64748b;">Days</th>
            <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#64748b;">Unit Price</th>
            <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#64748b;">Total</th>
          </tr></thead>
          <tbody>${rows||`<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:32px;">No line items</td></tr>`}</tbody>
        </table>
      </div>`;
    }
    case 'invoice_totals': {
      const align = cfg.align || 'right';
      return `<div class="totals-section" style="display:flex;justify-content:${align==='right'?'flex-end':align==='center'?'center':'flex-start'};margin-top:20px;">
        <div style="${cs(block)} min-width:320px;">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:12px;">${block.title||'Totals'}</div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#475569;padding:5px 0;"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
          ${discAmt>0?`<div style="display:flex;justify-content:space-between;font-size:13px;color:#dc2626;padding:5px 0;"><span>Discount (${invoice?.discount_pct||0}%)</span><span>−${fmt(discAmt)}</span></div>`:''}
          ${taxAmt>0?`<div style="display:flex;justify-content:space-between;font-size:13px;color:#475569;padding:5px 0;"><span>Tax (${invoice?.tax_pct||0}%)</span><span>+${fmt(taxAmt)}</span></div>`:''}
          <div style="display:flex;justify-content:space-between;font-size:20px;font-weight:800;color:#1e293b;border-top:2px solid #e2e8f0;margin-top:10px;padding-top:14px;"><span>Total</span><span>${fmt(total)}</span></div>
          ${invoice?.amount_paid>0?`<div style="display:flex;justify-content:space-between;font-size:13px;color:#10b981;padding:5px 0;"><span>Amount Paid</span><span>−${fmt(invoice.amount_paid)}</span></div>`:''}
          ${balanceDue>0?`<div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#dc2626;border-top:1px solid #e2e8f0;margin-top:8px;padding-top:10px;"><span>Balance Due</span><span>${fmt(balanceDue)}</span></div>`:''}
        </div>
      </div>`;
    }
    default: return '';
  }
}

// ─── PICK LIST BLOCK RENDERER ─────────────────────────────────────────────────

function renderPickListBlock(block, data, brand) {
  const { show, items } = data;
  const s = block.style || {};
  const cfg = block.config || {};

  switch (block.type) {
    case 'header': return renderBlock(block, { show: show || {}, quote: {}, rooms: [] }, brand);
    case 'footer': return renderBlock(block, { show: show || {}, quote: {}, rooms: [] }, brand);
    case 'divider': return renderBlock(block, {}, brand);
    case 'spacer': return renderBlock(block, {}, brand);
    case 'page_break': return renderBlock(block, {}, brand);
    case 'notes': {
      const text = cfg.staticText || '';
      if (!text) return '';
      return `<div class="notes-section" style="background:${s.bgColor||'#fffbeb'};border:${s.borderWidth||2}px solid ${s.borderColor||'#fde68a'};border-radius:${s.radius||14}px;padding:${s.padding||18}px 22px;margin-top:20px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:8px;">${block.title||'Notes'}</div>
        <p style="font-size:12.5px;color:#78350f;line-height:1.7;margin:0;">${text}</p>
      </div>`;
    }
    case 'pick_list_info': {
      return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
        <div style="background:#fff;border:2px solid #e2e8f0;border-radius:14px;padding:20px 22px;">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:12px;">Project</div>
          <div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Show Name</div><div style="font-size:16px;color:#1e293b;font-weight:700;">${show?.name||'—'}</div></div>
          ${show?.client?`<div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Client</div><div style="font-size:12px;color:#1e293b;font-weight:500;">${show.client}</div></div>`:''}
        </div>
        <div style="background:#fff;border:2px solid #e2e8f0;border-radius:14px;padding:20px 22px;">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:12px;">Details</div>
          ${show?.venue?`<div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Venue</div><div style="font-size:12px;color:#1e293b;font-weight:500;">${show.venue}</div></div>`:''}
          ${show?.start_date?`<div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Date</div><div style="font-size:12px;color:#1e293b;font-weight:500;">${fmtDate(show.start_date)}</div></div>`:''}
          <div style="margin-bottom:8px;"><div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:3px;">Total Items</div><div style="font-size:14px;color:#1e293b;font-weight:700;">${(items||[]).length}</div></div>
        </div>
      </div>`;
    }
    case 'pick_list_items': {
      const headerBg = cfg.headerBg || '#1e293b';
      const headerColor = cfg.headerColor || '#ffffff';
      const showBarcode = cfg.showBarcode !== false;
      const showCheckbox = cfg.showCheckbox !== false;

      // Group by sub_location or all together
      const subLocations = show?.sub_locations || [];
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

      const renderGroup = (groupName, groupItems) => {
        if (groupItems.length === 0) return '';
        const rows = groupItems.map((item, idx) => `
          <tr style="border-bottom:1px solid #f3f6fa;">
            <td style="padding:9px 16px;font-size:12.5px;font-weight:600;color:#1e293b;">${item.name||'—'}${item.category?`<br/><span style="font-size:11px;color:#94a3b8;">${item.category}</span>`:''}</td>
            <td style="padding:9px 16px;text-align:right;font-size:12.5px;color:#1e293b;">${item.quantity||1}</td>
            ${showBarcode?`<td style="padding:9px 16px;font-size:11px;color:#64748b;font-family:monospace;">${item.barcode||item.serial_numbers||'—'}</td>`:''}
            ${showCheckbox?`<td style="padding:9px 16px;text-align:center;"><div style="width:20px;height:20px;border:2px solid #cbd5e1;border-radius:4px;margin:auto;"></div></td>`:''}
          </tr>`).join('');
        return `
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;padding:10px 16px 6px;background:#f8fafc;border-bottom:1px solid #e9eef5;">${groupName} — ${groupItems.length} item${groupItems.length!==1?'s':''}</div>
          ${rows}`;
      };

      const groups = [
        ...subLocations.map(r => renderGroup(r.name, roomMap[r.id]?.items || [])),
        renderGroup('General / Unassigned', unassigned),
      ].join('');

      return `<div class="avoidbreak" style="background:${s.bgColor||'#fff'};border:${s.borderWidth||2}px solid ${s.borderColor||'#dde3ed'};border-radius:${s.radius||16}px;margin-bottom:20px;overflow:hidden;">
        <div style="background:${headerBg};color:${headerColor};padding:14px 22px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:14px;font-weight:800;">${block.title||'Equipment'}</span>
          <span style="font-size:13px;font-weight:600;opacity:0.8;">${(items||[]).length} items</span>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#f8fafc;border-bottom:1px solid #e9eef5;">
            <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;">Item</th>
            <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;">Qty</th>
            ${showBarcode?`<th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;">Barcode / Serial</th>`:''}
            ${showCheckbox?`<th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;color:#64748b;">✓</th>`:''}
          </tr></thead>
          <tbody>${groups||`<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:32px;">No items</td></tr>`}</tbody>
        </table>
      </div>`;
    }
    default: return '';
  }
}

/**
 * Render an invoice template from blocks + data.
 */
export function renderInvoiceTemplate(blocks, data = null, brand = {}) {
  const usesSample = !data || !data.invoice;
  const src = usesSample ? SAMPLE_INVOICE_DATA : data;

  const hasHeader = blocks.some(b => b.type === 'header');
  const hasFooter = blocks.some(b => b.type === 'footer');
  const bodyBlocks = blocks.filter(b => b.type !== 'header' && b.type !== 'footer');

  const headerBlock = hasHeader ? blocks.find(b => b.type === 'header') : { type: 'header', config: { title: 'INVOICE', bgColor: '#1e293b', textColor: '#ffffff', showLogo: true, logoPosition: 'center', paddingV: 36 }, style: {} };
  const footerBlock = hasFooter ? blocks.find(b => b.type === 'footer') : null;

  // For header, pass show data for logo lookup
  const headerData = { show: src.invoice ? { name: src.invoice.show_name } : {}, quote: {}, rooms: [] };

  const headerHTML = renderBlock({ ...headerBlock, config: { ...headerBlock.config, logoUrl: brand?.logo_url || headerBlock.config?.logoUrl || '' } }, headerData, brand);
  const footerHTML = footerBlock ? renderBlock(footerBlock, headerData, brand) : '';
  const bodyHTML = bodyBlocks.map(b => renderInvoiceBlock(b, src, brand)).join('');

  const invCompany = brand?.company_name || '';
  const invRepeatHeader = `
    <div class="print-page-header" style="background:#1e293b; color:#fff; padding:8px 24px; display:flex; justify-content:space-between; align-items:center; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      <span style="font-size:12px; font-weight:700; opacity:0.85;">${invCompany}</span>
      <span style="font-size:11px; font-weight:600; opacity:0.7;">Invoice${src.invoice?.invoice_number ? ' #' + src.invoice.invoice_number : ''}</span>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice${src.invoice?.invoice_number ? ' #' + src.invoice.invoice_number : ''}</title>
  <style>${PAGE_STYLES}</style>
</head>
<body>
  ${invRepeatHeader}
  <div class="doc-wrap">
    <div class="doc-header-first-page">${headerHTML}</div>
    <div class="doc-body">${bodyHTML}</div>
    ${footerHTML}
  </div>
</body>
</html>`;
}

/**
 * Render a pick list template from blocks + data.
 */
export function renderPickListTemplate(blocks, data = null, brand = {}) {
  const usesSample = !data || !data.show;
  const src = usesSample ? SAMPLE_PICK_LIST_DATA : data;

  const hasHeader = blocks.some(b => b.type === 'header');
  const hasFooter = blocks.some(b => b.type === 'footer');
  const bodyBlocks = blocks.filter(b => b.type !== 'header' && b.type !== 'footer');

  const headerBlock = hasHeader ? blocks.find(b => b.type === 'header') : { type: 'header', config: { title: 'PICK LIST', bgColor: '#1e293b', textColor: '#ffffff', showLogo: true, logoPosition: 'center', paddingV: 36 }, style: {} };
  const footerBlock = hasFooter ? blocks.find(b => b.type === 'footer') : null;

  const headerData = { show: src.show || {}, quote: {}, rooms: [] };
  const headerHTML = renderBlock({ ...headerBlock, config: { ...headerBlock.config, logoUrl: brand?.logo_url || headerBlock.config?.logoUrl || '' } }, headerData, brand);
  const footerHTML = footerBlock ? renderBlock(footerBlock, headerData, brand) : '';
  const bodyHTML = bodyBlocks.map(b => renderPickListBlock(b, src, brand)).join('');

  const plCompany = brand?.company_name || '';
  const plRepeatHeader = `
    <div class="print-page-header" style="background:#1e293b; color:#fff; padding:8px 24px; display:flex; justify-content:space-between; align-items:center; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      <span style="font-size:12px; font-weight:700; opacity:0.85;">${plCompany}</span>
      <span style="font-size:11px; font-weight:600; opacity:0.7;">Pick List — ${src.show?.name || 'Project'}</span>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pick List — ${src.show?.name || 'Project'}</title>
  <style>${PAGE_STYLES}</style>
</head>
<body>
  ${plRepeatHeader}
  <div class="doc-wrap">
    <div class="doc-header-first-page">${headerHTML}</div>
    <div class="doc-body">${bodyHTML}</div>
    ${footerHTML}
  </div>
</body>
</html>`;
}