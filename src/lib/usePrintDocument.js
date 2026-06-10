/**
 * usePrintDocument — opens a print-ready HTML document in a new tab
 * and auto-triggers the browser's native print dialog (Save as PDF).
 *
 * This produces crisp, text-based, selectable PDF output — NOT a screenshot.
 * The HTML from quoteTemplateRenderer already has full print CSS (@page, @media print).
 */
import { generateQuoteHTML, generateInvoiceHTML, generatePickListHTML, generateMasterPickListHTML } from '@/lib/documentRenderer';
import { renderQuoteTemplate, renderInvoiceTemplate, renderPickListTemplate } from '@/lib/quoteTemplateRenderer';

/**
 * Opens an HTML string in a new tab and triggers window.print().
 * The browser's "Save as PDF" produces crisp, real-text PDF output.
 */
function openPrintTab(html, filename = 'document') {
  // Inject title and auto-print script into the <head>
  // Use a blank title — prevents browser from showing it as a page header when printing
  const printHtml = html.replace(
    /<title>[^<]*<\/title>/,
    `<title> </title>`
  ).replace(
    '</head>',
    `<script>
      window.addEventListener('load', function() {
        setTimeout(function() { window.print(); }, 500);
      });
    <\/script>
    </head>`
  );

  const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');

  if (!win) {
    // Popup blocked — download as HTML fallback
    console.warn('[PDF] Popup blocked, falling back to HTML download');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Revoke blob URL after enough time for the tab to load
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

function safeFilename(str) {
  return (str || 'document').replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '-').toLowerCase();
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Main export function. Opens HTML in a print tab.
 * onStart / onDone / onError are called synchronously since this is not async.
 */
export function downloadPdf(html, filename, onStart, onDone, onError) {
  console.log('[PDF] downloadPdf called for:', filename);
  try {
    if (onStart) onStart();
    if (!html || html.trim().length === 0) throw new Error('HTML content is empty');
    openPrintTab(html, (filename || 'document').replace('.pdf', ''));
    console.log('[PDF] Print tab opened ✓');
    if (onDone) onDone();
  } catch (err) {
    console.error('[PDF] downloadPdf FAILED:', err);
    if (onError) onError(err);
    else {
      if (onDone) onDone();
      alert('PDF export failed: ' + err.message);
    }
  }
}

// Legacy aliases
export async function openPdfInNewTab(html, onStart, onDone, onError) {
  return downloadPdf(html, 'document', onStart, onDone, onError);
}
export function openPrintWindow(html) {
  downloadPdf(html, 'document');
}

// ─── Quote ─────────────────────────────────────────────────────────────────────

export async function printQuote({ quote, show, brand, projectCrewList = [], crewList = [], templates = [], onStart, onDone, onError }) {
  // Accept either param name
  const crew = projectCrewList.length ? projectCrewList : crewList;
  const template = templates.find(t => t.id === quote?.template_id)
    || templates.find(t => t.is_default)
    || templates[0]
    || null;

  const rooms = show?.sub_locations || [];
  const allRoomIds = [...rooms.map(r => r.id), '__unassigned__'];
  const itemsByRoom = {};
  allRoomIds.forEach(id => { itemsByRoom[id] = []; });
  (quote?.line_items || []).filter(i => !i.is_hidden).forEach(item => {
    const rid = item.room_id || '__unassigned__';
    if (itemsByRoom[rid]) itemsByRoom[rid].push(item);
    else itemsByRoom['__unassigned__'].push(item);
  });

  const roomsData = [...rooms, { id: '__unassigned__', name: 'General Show' }]
    .map(r => ({ id: r.id, name: r.name, items: itemsByRoom[r.id] || [] }))
    .filter(r => r.items.length > 0 || (crew || []).some(c => (c.sub_location_id || '__unassigned__') === r.id));

  const subtotal = (quote?.line_items || []).filter(i => !i.is_hidden).reduce((s, i) => {
    const base = i.override_price != null
      ? parseFloat(i.override_price)
      : (parseFloat(i.daily_rate) || 0) * (parseFloat(i.days) || 1) * (parseFloat(i.quantity) || 1);
    return s + base - (i.discount_pct ? base * (i.discount_pct / 100) : 0);
  }, 0);
  const discountAmount = subtotal * ((quote?.discount_pct || 0) / 100);
  const taxAmount = (subtotal - discountAmount) * ((quote?.tax_pct || 0) / 100);
  const total = subtotal - discountAmount + taxAmount;

  const templateData = {
    show: show || {},
    quote: { ...quote, subtotal, discount_amount: discountAmount, tax_amount: taxAmount, total },
    rooms: roomsData,
    crew,
    travel: quote?.travel_items || [],
  };

  const blockConfig = template?.block_config?.length > 0 ? template.block_config : [
    { type: 'header', config: { companyName: brand?.company_name || '', logoUrl: brand?.logo_url || '', bgColor: '#1e293b', textColor: '#ffffff', paddingV: 36 }, style: {} },
    { type: 'info_row', style: {} },
    { type: 'room_section', config: { roomHeaderBg: 'linear-gradient(135deg,#1e293b,#334155)', roomHeaderColor: '#ffffff', showRoomTotal: true }, style: {} },
    { type: 'crew_section', title: 'Crew / Labor', config: {}, style: {} },
    { type: 'travel_section', title: 'Travel & Transport', config: {}, style: {} },
    { type: 'totals', title: 'Summary', config: { align: 'right' }, style: {} },
    { type: 'notes', title: 'Notes & Terms', config: {}, style: {} },
    { type: 'footer', config: {}, style: {} },
  ];

  let html;
  try {
    html = renderQuoteTemplate(blockConfig, templateData, brand);
  } catch (e) {
    console.error('[PDF] Template render failed, using fallback:', e);
    html = generateQuoteHTML(quote, show, brand, projectCrewList);
  }

  const name = safeFilename(`quote-${show?.name || 'project'}`);
  downloadPdf(html, name, onStart, onDone, onError);
}

// ─── Invoice ───────────────────────────────────────────────────────────────────

export async function printInvoice({ invoice, brand, templates = [], onStart, onDone, onError }) {
  const template = templates.find(t => t.id === invoice?.template_id)
    || templates.find(t => t.is_default && t.template_type === 'invoice')
    || templates.find(t => t.template_type === 'invoice')
    || null;

  let html;
  if (template?.block_config?.length > 0) {
    try { html = renderInvoiceTemplate(template.block_config, { invoice }, brand); }
    catch { html = generateInvoiceHTML(invoice, brand); }
  } else {
    html = generateInvoiceHTML(invoice, brand);
  }

  const num = invoice?.invoice_number ? `-${invoice.invoice_number}` : '';
  downloadPdf(html, `invoice${num}`, onStart, onDone, onError);
}

// ─── Pick List ─────────────────────────────────────────────────────────────────

/**
 * mode: 'detailed' (default) | 'master' | 'both'
 * For 'master' and 'both', pass requirements (ShowRequirement records) as well.
 */
export async function printPickList({ show, items, requirements = [], brand, templates = [], mode = 'detailed', onStart, onDone, onError }) {
  const template = templates.find(t => t.is_default && t.template_type === 'pick_list')
    || templates.find(t => t.template_type === 'pick_list')
    || null;

  let detailedHtml = null;
  let masterHtml = null;

  if (mode === 'detailed' || mode === 'both') {
    if (template?.block_config?.length > 0) {
      try { detailedHtml = renderPickListTemplate(template.block_config, { show, items }, brand); }
      catch { detailedHtml = generatePickListHTML(show, items, brand); }
    } else {
      detailedHtml = generatePickListHTML(show, items, brand);
    }
  }

  if (mode === 'master' || mode === 'both') {
    masterHtml = generateMasterPickListHTML(show, requirements, brand);
  }

  let html;
  if (mode === 'both' && masterHtml && detailedHtml) {
    // Combine: master first, then detailed, separated by a page break
    // Inject page break between the two bodies
    const masterBody = masterHtml.replace(/^[\s\S]*<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '');
    const detailedBody = detailedHtml.replace(/^[\s\S]*<body[^>]*>/, '').replace(/<\/body>[\s\S]*$/, '');
    html = masterHtml.replace(masterBody, masterBody + `<div style="page-break-before:always;"></div>` + detailedBody);
  } else {
    html = masterHtml || detailedHtml;
  }

  const suffix = mode === 'master' ? 'master-pick-list' : mode === 'both' ? 'pick-lists' : 'pick-list';
  const name = safeFilename(`${suffix}-${show?.name || 'project'}`);
  downloadPdf(html, name, onStart, onDone, onError);
}