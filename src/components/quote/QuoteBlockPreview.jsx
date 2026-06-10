/**
 * Visual React preview of each block type.
 * This is what the user sees in the builder canvas — no HTML visible.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { SAMPLE_DATA } from '@/lib/quoteTemplateRenderer';

const TRAVEL_TYPE_LABELS = {
  flight: 'Flight / Plane', train: 'Train', rental_car: 'Rental Car',
  mileage: 'Mileage', parking: 'Parking', tolls: 'Tolls', hotel: 'Hotel / Lodging', other: 'Other',
};

function fmt(val) {
  const n = parseFloat(val) || 0;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try { return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return dateStr; }
}

function calcLineTotal(item) {
  const base = (parseFloat(item.daily_rate) || 0) * (parseFloat(item.days) || 1) * (parseFloat(item.quantity) || 1);
  const disc = item.discount_pct ? base * (item.discount_pct / 100) : 0;
  return base - disc;
}

function CardShell({ block, children, className }) {
  const s = block.style || {};
  return (
    <div
      className={cn('mb-4', className)}
      style={{
        background: s.bgColor || '#ffffff',
        border: `${s.borderWidth || 2}px solid ${s.borderColor || '#e2e8f0'}`,
        borderRadius: `${s.radius || 14}px`,
        padding: `${s.padding || 20}px`,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children, color = '#94a3b8' }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function FieldRow({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export default function QuoteBlockPreview({ block, brand }) {
  const show = SAMPLE_DATA.show;
  const quote = SAMPLE_DATA.quote;
  const rooms = SAMPLE_DATA.rooms;
  const crew = SAMPLE_DATA.crew;
  const travel = SAMPLE_DATA.travel;
  const s = block.style || {};
  const cfg = block.config || {};

  // Header
  if (block.type === 'header') {
    const textColor = cfg.textColor || '#ffffff';
    const isImage = cfg.bgType === 'image' && cfg.bgImage;
    const minHeight = `${(cfg.paddingV || 28) * 2 + 60}px`;
    // For image type: use position:relative with an absolutely-positioned img for cover behavior
    const bgStyle = cfg.bgType === 'gradient'
      ? { background: cfg.bgGradient || 'linear-gradient(135deg,#1e293b,#334155)' }
      : isImage
        ? {}  // handled separately below
        : { backgroundColor: cfg.bgColor || '#1e293b' };
    const align = cfg.logoPosition === 'right' ? 'right' : cfg.logoPosition === 'left' ? 'left' : 'center';
    const logoUrl = cfg.logoUrl || '';
    const showLogo = cfg.showLogo !== false && logoUrl;
    return (
      <div style={{
        ...bgStyle,
        position: 'relative',
        overflow: 'hidden',
        minHeight,
        color: textColor,
        padding: `${cfg.paddingV || 28}px 32px`,
        textAlign: align,
        borderRadius: 0,
      }}>
        {/* Cover image — absolutely fills the container, cropped with object-cover */}
        {isImage && (
          <img
            src={cfg.bgImage}
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              display: 'block', pointerEvents: 'none',
            }}
          />
        )}
        {/* Content sits above the image */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {showLogo && (
            <img src={logoUrl} alt="Logo" style={{ maxHeight: 48, maxWidth: 160, display: 'block', margin: align === 'center' ? '0 auto 10px' : align === 'right' ? '0 0 10px auto' : '0 0 10px 0' }} />
          )}
          {cfg.companyName && (
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7 }}>{cfg.companyName}</p>
          )}
          {cfg.customField && (
            <h1 style={{ margin: cfg.companyName ? '4px 0 0' : 0, fontSize: cfg.titleSize || 28, fontWeight: 800, letterSpacing: -0.5 }}>{cfg.customField}</h1>
          )}
          {!showLogo && !cfg.companyName && !cfg.customField && (
            <p style={{ margin: 0, fontSize: 13, opacity: 0.5 }}>Add logo, company name, or custom text in the settings panel →</p>
          )}
        </div>
      </div>
    );
  }

  // Info row (3 cards side by side)
  if (block.type === 'info_row') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: s.bgColor || '#fff', border: `${s.borderWidth || 2}px solid ${s.borderColor || '#e2e8f0'}`, borderRadius: s.radius || 14, padding: s.padding || 18 }}>
          <SectionLabel>Client</SectionLabel>
          <FieldRow label="Company / Name" value={show.client} />
          <FieldRow label="Contact" value={show.contact_name} />
        </div>
        <div style={{ background: s.bgColor || '#fff', border: `${s.borderWidth || 2}px solid ${s.borderColor || '#e2e8f0'}`, borderRadius: s.radius || 14, padding: s.padding || 18 }}>
          <SectionLabel>Project Details</SectionLabel>
          <FieldRow label="Project" value={show.name} />
          <FieldRow label="Venue" value={show.venue} />
          <FieldRow label="Dates" value={`${fmtDate(show.start_date)} — ${fmtDate(show.end_date)}`} />
        </div>
        <div style={{ background: s.bgColor || '#fff', border: `${s.borderWidth || 2}px solid ${s.borderColor || '#e2e8f0'}`, borderRadius: s.radius || 14, padding: s.padding || 18 }}>
          <SectionLabel>Quote Info</SectionLabel>
          <FieldRow label="Status" value={<span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, background: '#f1f5f9', color: '#475569', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Draft</span>} />
          <FieldRow label="Valid Until" value={fmtDate(quote.valid_until)} />
        </div>
      </div>
    );
  }

  // Customer info
  if (block.type === 'customer_info') {
    return (
      <CardShell block={block}>
        <SectionLabel>{block.title || 'Client'}</SectionLabel>
        {cfg.showName !== false && <FieldRow label="Company / Name" value={show.client} />}
        {cfg.showContact !== false && <FieldRow label="Contact" value={show.contact_name} />}
        {cfg.showEmail !== false && <FieldRow label="Email" value={show.contact_email} />}
        {cfg.showPhone !== false && <FieldRow label="Phone" value={show.contact_phone} />}
      </CardShell>
    );
  }

  // Project details
  if (block.type === 'project_details') {
    return (
      <CardShell block={block}>
        <SectionLabel>{block.title || 'Project Details'}</SectionLabel>
        {cfg.showName !== false && <FieldRow label="Project Name" value={show.name} />}
        {cfg.showVenue !== false && <FieldRow label="Venue" value={show.venue} />}
        {cfg.showDates !== false && <FieldRow label="Dates" value={`${fmtDate(show.start_date)} — ${fmtDate(show.end_date)}`} />}
      </CardShell>
    );
  }

  // Quote info
  if (block.type === 'quote_info') {
    return (
      <CardShell block={block}>
        <SectionLabel>{block.title || 'Quote Info'}</SectionLabel>
        {cfg.showStatus !== false && <FieldRow label="Status" value={<span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, background: '#f1f5f9', color: '#475569', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Draft</span>} />}
        {cfg.showValidUntil !== false && <FieldRow label="Valid Until" value={fmtDate(quote.valid_until)} />}
        {cfg.showDate !== false && <FieldRow label="Quote Date" value={fmtDate(new Date().toISOString().split('T')[0])} />}
      </CardShell>
    );
  }

  // Room Section (equipment only)
  if (block.type === 'room_section') {
    const showRoomTotal = cfg.showRoomTotal !== false;
    const roomHeaderBg = cfg.roomHeaderBg || 'linear-gradient(135deg,#1e293b,#334155)';
    const roomHeaderColor = cfg.roomHeaderColor || '#ffffff';

    return (
      <div>
        {rooms.map(room => {
          const rItems = room.items || [];
          if (rItems.length === 0) return null;
          const roomTotal = rItems.reduce((t, i) => t + calcLineTotal(i), 0);

          return (
            <div key={room.id} style={{ background: s.bgColor || '#fff', border: `${s.borderWidth || 2}px solid ${s.borderColor || '#dde3ed'}`, borderRadius: s.radius || 16, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ background: roomHeaderBg, color: roomHeaderColor, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>{room.name}</span>
                {showRoomTotal && <span style={{ fontWeight: 700, fontSize: 13, opacity: 0.9 }}>{fmt(roomTotal)}</span>}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  {['Description', 'Qty', 'Days', 'Rate/Day', 'Total'].map((h, i) => (
                    <th key={h} style={{ padding: '7px 14px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f3f6fa' }}>
                      <td style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>{item.name}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12.5, color: '#475569' }}>{item.quantity}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12.5, color: '#475569' }}>{item.days}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12.5, color: '#475569' }}>{fmt(item.daily_rate)}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>{fmt(calcLineTotal(item))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  }

  // Crew Section
  if (block.type === 'crew_section') {
    const headerBg = cfg.headerBg || 'linear-gradient(135deg,#1e293b,#334155)';
    const headerColor = cfg.headerColor || '#ffffff';
    const crewTotal = crew.reduce((t, c) => t + (parseFloat(c.billable_cost) || 0), 0);
    return (
      <div style={{ background: s.bgColor || '#fff', border: `${s.borderWidth || 2}px solid ${s.borderColor || '#dde3ed'}`, borderRadius: s.radius || 16, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ background: headerBg, color: headerColor, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{block.title || 'Crew / Labor'}</span>
          <span style={{ fontWeight: 700, fontSize: 13, opacity: 0.9 }}>{fmt(crewTotal)}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e9eef5' }}>
            {['Role', 'Crew Member', 'Qty', 'Billable'].map((h, i) => (
              <th key={h} style={{ padding: '7px 14px', textAlign: i >= 2 ? 'right' : 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {crew.map((c, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f3f6fa' }}>
                <td style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>{c.role}</td>
                <td style={{ padding: '8px 14px', fontSize: 12.5, color: '#1e293b' }}>{c.crew_member_name}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12.5, color: '#1e293b' }}>{c.quantity || 1}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>{fmt(c.billable_cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Travel & Transport Section
  if (block.type === 'travel_section') {
    const headerBg = cfg.headerBg || 'linear-gradient(135deg,#1e293b,#334155)';
    const headerColor = cfg.headerColor || '#ffffff';
    const travelTotal = travel.reduce((t, i) => t + (parseFloat(i.billable_amount) || 0), 0);
    return (
      <div style={{ background: s.bgColor || '#fff', border: `${s.borderWidth || 2}px solid ${s.borderColor || '#dde3ed'}`, borderRadius: s.radius || 16, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ background: headerBg, color: headerColor, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{block.title || 'Travel & Transport'}</span>
          <span style={{ fontWeight: 700, fontSize: 13, opacity: 0.9 }}>{fmt(travelTotal)}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e9eef5' }}>
            {['Description', 'Type', 'Vendor', 'Qty', 'Amount'].map((h, i) => (
              <th key={h} style={{ padding: '7px 14px', textAlign: i >= 3 ? 'right' : 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {travel.map((t, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f3f6fa' }}>
                <td style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>{t.description}</td>
                <td style={{ padding: '8px 14px', fontSize: 12.5, color: '#1e293b', textTransform: 'capitalize' }}>{TRAVEL_TYPE_LABELS[t.travel_type] || t.travel_type}</td>
                <td style={{ padding: '8px 14px', fontSize: 12.5, color: '#1e293b' }}>{t.vendor || '—'}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12.5, color: '#1e293b' }}>{t.quantity || 1}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>{fmt(t.billable_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Totals
  if (block.type === 'totals') {
    const allItems = rooms.flatMap(r => r.items || []);
    const subtotal = allItems.reduce((t, i) => t + calcLineTotal(i), 0)
      + crew.reduce((t, c) => t + (parseFloat(c.billable_cost) || 0), 0)
      + travel.reduce((t, ti) => t + (parseFloat(ti.billable_amount) || 0), 0);
    const discAmt = subtotal * ((quote.discount_pct || 0) / 100);
    const taxAmt = (subtotal - discAmt) * ((quote.tax_pct || 0) / 100);
    const total = subtotal - discAmt + taxAmt;
    const align = cfg.align || 'right';
    return (
      <div style={{ display: 'flex', justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start', marginTop: 16 }}>
        <div style={{ background: s.bgColor || '#fff', border: `${s.borderWidth || 2}px solid ${s.borderColor || '#e2e8f0'}`, borderRadius: s.radius || 14, padding: s.padding || 20, minWidth: 280 }}>
          <SectionLabel>{block.title || 'Summary'}</SectionLabel>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569', padding: '4px 0' }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          {discAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#dc2626', padding: '4px 0' }}><span>Discount ({quote.discount_pct}%)</span><span>−{fmt(discAmt)}</span></div>}
          {taxAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569', padding: '4px 0' }}><span>Tax ({quote.tax_pct}%)</span><span>+{fmt(taxAmt)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 800, color: '#1e293b', borderTop: '2px solid #e2e8f0', marginTop: 8, paddingTop: 12 }}><span>Total</span><span>{fmt(total)}</span></div>
        </div>
      </div>
    );
  }

  // Notes
  if (block.type === 'notes') {
    const text = cfg.staticText || quote.notes;
    return (
      <div style={{ background: s.bgColor || '#ffffff', border: `${s.borderWidth || 2}px solid ${s.borderColor || '#e2e8f0'}`, borderRadius: s.radius || 14, padding: `${s.padding || 18}px`, marginTop: 12 }}>
        <SectionLabel color={cfg.textColor || '#94a3b8'}>{block.title || 'Notes & Terms'}</SectionLabel>
        <p style={{ fontSize: 12.5, color: cfg.textColor || '#1e293b', lineHeight: 1.7, margin: 0 }}>{text}</p>
      </div>
    );
  }

  // Page Break
  if (block.type === 'page_break') {
    return (
      <div style={{ margin: '8px -32px', position: 'relative' }}>
        <div style={{ background: '#f1f5f9', borderTop: '2px dashed #94a3b8', borderBottom: '2px dashed #94a3b8', padding: '6px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>✂ Page Break — new page starts here</span>
        </div>
      </div>
    );
  }

  // Divider
  if (block.type === 'divider') {
    return <div style={{ borderTop: `${s.borderWidth || 1}px solid ${s.borderColor || '#e2e8f0'}`, margin: `${s.padding || 16}px 0` }} />;
  }

  // Spacer
  if (block.type === 'spacer') {
    return <div style={{ height: cfg.height || 24, background: 'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 4px, #eef2f7 4px, #eef2f7 8px)', border: '1px dashed #e2e8f0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spacer — {cfg.height || 24}px</span>
    </div>;
  }

  // ── Invoice blocks ──────────────────────────────────────────────────────────

  const SAMPLE_INVOICE = {
    invoice_number: 'INV-240001',
    status: 'sent',
    client: 'Acme Corporation',
    client_email: 'billing@acme.com',
    show_name: 'Annual Conference 2026',
    issue_date: '2026-04-14',
    due_date: '2026-05-14',
    payment_terms: 'Net 30',
    line_items: [
      { name: 'Line Array Speaker System', quantity: 2, days: 3, unit_price: 450 },
      { name: 'Digital Mixing Console', quantity: 1, days: 3, unit_price: 350 },
      { name: 'Lighting Package', quantity: 1, days: 3, unit_price: 580 },
    ],
    discount_pct: 0, tax_pct: 8.5, amount_paid: 0,
  };

  if (block.type === 'invoice_info_row' || block.type === 'bill_to' || block.type === 'invoice_details') {
    const inv = SAMPLE_INVOICE;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
          <SectionLabel>Bill To</SectionLabel>
          <FieldRow label="Client" value={inv.client} />
          <FieldRow label="Email" value={inv.client_email} />
        </div>
        <div style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
          <SectionLabel>Project</SectionLabel>
          <FieldRow label="Project Name" value={inv.show_name} />
          <FieldRow label="Payment Terms" value={inv.payment_terms} />
        </div>
        <div style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
          <SectionLabel>Invoice Details</SectionLabel>
          <FieldRow label="Invoice #" value={inv.invoice_number} />
          <FieldRow label="Due Date" value={fmtDate(inv.due_date)} />
          <FieldRow label="Status" value={<span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, background: '#dbeafe', color: '#1d4ed8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Sent</span>} />
        </div>
      </div>
    );
  }

  if (block.type === 'invoice_line_items') {
    const inv = SAMPLE_INVOICE;
    const headerBg = cfg.headerBg || '#1e293b';
    const headerColor = cfg.headerColor || '#ffffff';
    const calcInvItem = (i) => (i.unit_price || 0) * (i.quantity || 1) * (i.days || 1);
    return (
      <div style={{ background: s.bgColor || '#fff', border: `${s.borderWidth || 2}px solid ${s.borderColor || '#dde3ed'}`, borderRadius: s.radius || 16, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ background: headerBg, color: headerColor, padding: '12px 18px' }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{block.title || 'Line Items'}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            {['Description', 'Qty', 'Days', 'Unit Price', 'Total'].map((h, i) => (
              <th key={h} style={{ padding: '7px 14px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {inv.line_items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f3f6fa' }}>
                <td style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>{item.name}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12.5, color: '#475569' }}>{item.quantity}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12.5, color: '#475569' }}>{item.days}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12.5, color: '#475569' }}>{fmt(item.unit_price)}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>{fmt(calcInvItem(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === 'invoice_totals') {
    const inv = SAMPLE_INVOICE;
    const calcInvItem = (i) => (i.unit_price || 0) * (i.quantity || 1) * (i.days || 1);
    const subtotal = inv.line_items.reduce((s, i) => s + calcInvItem(i), 0);
    const discAmt = subtotal * ((inv.discount_pct || 0) / 100);
    const taxAmt = (subtotal - discAmt) * ((inv.tax_pct || 0) / 100);
    const total = subtotal - discAmt + taxAmt;
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <div style={{ background: s.bgColor || '#fff', border: `${s.borderWidth || 2}px solid ${s.borderColor || '#e2e8f0'}`, borderRadius: s.radius || 14, padding: s.padding || 20, minWidth: 280 }}>
          <SectionLabel>{block.title || 'Totals'}</SectionLabel>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569', padding: '4px 0' }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          {taxAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569', padding: '4px 0' }}><span>Tax ({inv.tax_pct}%)</span><span>+{fmt(taxAmt)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 800, color: '#1e293b', borderTop: '2px solid #e2e8f0', marginTop: 8, paddingTop: 12 }}><span>Total</span><span>{fmt(total)}</span></div>
        </div>
      </div>
    );
  }

  // ── Pick List blocks ──────────────────────────────────────────────────────

  const SAMPLE_ITEMS = [
    { name: 'Line Array Speaker (L)', barcode: 'SPK-001', category: 'Audio', quantity: 1 },
    { name: 'Line Array Speaker (R)', barcode: 'SPK-002', category: 'Audio', quantity: 1 },
    { name: 'Digital Console (Yamaha CL5)', barcode: 'CON-010', category: 'Audio', quantity: 1 },
    { name: 'LED Moving Head (x8)', barcode: 'LIT-020', category: 'Lighting', quantity: 8 },
    { name: 'Projection Screen 16ft', barcode: 'SCR-001', category: 'Video', quantity: 1 },
  ];

  if (block.type === 'pick_list_info') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
          <SectionLabel>Project</SectionLabel>
          <FieldRow label="Show Name" value={show.name} />
          <FieldRow label="Client" value={show.client} />
        </div>
        <div style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
          <SectionLabel>Details</SectionLabel>
          <FieldRow label="Venue" value={show.venue} />
          <FieldRow label="Date" value={fmtDate(show.start_date)} />
          <FieldRow label="Total Items" value={SAMPLE_ITEMS.length} />
        </div>
      </div>
    );
  }

  if (block.type === 'pick_list_items') {
    const headerBg = cfg.headerBg || '#1e293b';
    const headerColor = cfg.headerColor || '#ffffff';
    return (
      <div style={{ background: s.bgColor || '#fff', border: `${s.borderWidth || 2}px solid ${s.borderColor || '#dde3ed'}`, borderRadius: s.radius || 16, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ background: headerBg, color: headerColor, padding: '12px 18px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>Equipment</span>
          <span style={{ fontWeight: 600, fontSize: 13, opacity: 0.8 }}>{SAMPLE_ITEMS.length} items</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            <th style={{ padding: '7px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Item</th>
            <th style={{ padding: '7px 14px', textAlign: 'right', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Qty</th>
            {cfg.showBarcode !== false && <th style={{ padding: '7px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Barcode</th>}
            {cfg.showCheckbox !== false && <th style={{ padding: '7px 14px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#64748b' }}>✓</th>}
          </tr></thead>
          <tbody>
            {SAMPLE_ITEMS.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f3f6fa' }}>
                <td style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>{item.name}<br /><span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>{item.category}</span></td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12.5, color: '#1e293b' }}>{item.quantity}</td>
                {cfg.showBarcode !== false && <td style={{ padding: '8px 14px', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{item.barcode}</td>}
                {cfg.showCheckbox !== false && <td style={{ padding: '8px 14px', textAlign: 'center' }}><div style={{ width: 16, height: 16, border: '2px solid #cbd5e1', borderRadius: 3, margin: 'auto' }}></div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Footer
  if (block.type === 'footer') {
    const textColor = cfg.textColor || '#64748b';
    const bgColor = s.bgColor || '#f8fafc';
    const align = cfg.align || 'center';
    const parts = [];
    if (cfg.showCompany !== false && brand?.company_name) parts.push(<strong key="co">{brand.company_name}</strong>);
    if (cfg.showPhone !== false && brand?.company_phone) parts.push(<span key="ph">{brand.company_phone}</span>);
    if (cfg.showEmail !== false && brand?.company_email) parts.push(<span key="em">{brand.company_email}</span>);
    if (cfg.showWebsite !== false && brand?.company_website) parts.push(<span key="web">{brand.company_website}</span>);
    const disclaimer = cfg.disclaimer || brand?.email_footer_disclaimer;
    return (
      <div style={{ background: bgColor, color: textColor, padding: '20px 32px', textAlign: align, fontSize: 12, borderTop: '1px solid #e2e8f0' }}>
        <p style={{ margin: 0, lineHeight: 1.8 }}>
          {parts.map((p, i) => <React.Fragment key={i}>{i > 0 && ' • '}{p}</React.Fragment>)}
          {parts.length === 0 && <span style={{ opacity: 0.5 }}>Company info will appear here</span>}
        </p>
        {disclaimer && <p style={{ margin: '6px 0 0', fontSize: 10, opacity: 0.5 }}>{disclaimer}</p>}
      </div>
    );
  }

  return null;
}