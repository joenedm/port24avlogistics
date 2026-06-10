import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, X, List, LayoutList } from 'lucide-react';

/**
 * PickListPrint — supports two modes:
 *   'master'   — Master Show Pick List: all gear combined, grouped by product name, quantities summed
 *   'detailed' — Detailed Room Pick List: current room-by-room view (unchanged)
 */
export default function PickListPrint({ show, requirements, fulfillments, rooms, onClose }) {
  const [mode, setMode] = useState('master');

  // ── Detailed (room-based) grouping ──────────────────────────────────────────
  const detailedGrouped = {};
  for (const req of requirements) {
    const roomId = req.room_id || '__unassigned__';
    if (!detailedGrouped[roomId]) {
      const room = rooms.find(r => r.id === roomId) || { name: 'Unassigned', id: roomId };
      detailedGrouped[roomId] = { room, items: [] };
    }
    const active = fulfillments.filter(f => f.requirement_id === req.id && f.movement_state !== 'returned');
    const needed = req.quantity_needed || 1;
    const scanned = active.length;
    detailedGrouped[roomId].items.push({ req, active, needed, scanned, remaining: Math.max(0, needed - scanned) });
  }

  // ── Master (aggregated) grouping ─────────────────────────────────────────────
  const masterMap = {};
  for (const req of requirements) {
    const key = req.product_name || '—';
    if (!masterMap[key]) {
      masterMap[key] = {
        product_name: req.product_name || '—',
        category: req.category || '',
        total_quantity: 0,
        total_scanned: 0,
        notes: req.notes || '',
      };
    }
    masterMap[key].total_quantity += (req.quantity_needed || 1);
    const active = fulfillments.filter(f => f.requirement_id === req.id && f.movement_state !== 'returned');
    masterMap[key].total_scanned += active.length;
    if (req.notes && !masterMap[key].notes.includes(req.notes)) {
      masterMap[key].notes = masterMap[key].notes
        ? masterMap[key].notes + '; ' + req.notes
        : req.notes;
    }
  }
  const masterItems = Object.values(masterMap).sort((a, b) => {
    const catCmp = (a.category || '').localeCompare(b.category || '');
    return catCmp !== 0 ? catCmp : a.product_name.localeCompare(b.product_name);
  });

  // ── Totals ───────────────────────────────────────────────────────────────────
  const totalRequired = requirements.reduce((s, r) => s + (r.quantity_needed || 1), 0);
  const totalScanned = Object.values(detailedGrouped).reduce(
    (s, g) => s + g.items.reduce((ss, i) => ss + Math.min(i.scanned, i.needed), 0), 0
  );
  const masterTotalQty = masterItems.reduce((s, i) => s + i.total_quantity, 0);

  // ── Print: Detailed ──────────────────────────────────────────────────────────
  const printDetailed = () => {
    const el = document.getElementById('pick-list-detailed-content');
    const html = el ? el.innerHTML : '';
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(buildPrintDoc(`Detailed Room Pick List — ${show?.name}`, SHARED_STYLES, html));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  // ── Print: Master ────────────────────────────────────────────────────────────
  const printMaster = () => {
    const el = document.getElementById('pick-list-master-content');
    const html = el ? el.innerHTML : '';
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(buildPrintDoc(`Master Show Pick List — ${show?.name}`, SHARED_STYLES, html));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  // ── Print Both ───────────────────────────────────────────────────────────────
  // Note: both divs are always rendered in the DOM (just hidden via display:none)
  // so innerHTML is always available regardless of active mode.
  const printBoth = () => {
    const masterEl = document.getElementById('pick-list-master-content');
    const detailedEl = document.getElementById('pick-list-detailed-content');
    const masterHtml = masterEl ? masterEl.innerHTML : '';
    const detailedHtml = detailedEl ? detailedEl.innerHTML : '';
    const combined = masterHtml + `<div style="page-break-before:always;"></div>` + detailedHtml;
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(buildPrintDoc(`Pick Lists — ${show?.name}`, SHARED_STYLES, combined));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  // ── CSV download ─────────────────────────────────────────────────────────────
  const downloadCSV = () => {
    if (mode === 'master') {
      const rows = [['Item Name', 'Category', 'Total Quantity', 'Total Scanned', 'Remaining', 'Notes']];
      masterItems.forEach(item => {
        rows.push([item.product_name, item.category, item.total_quantity, item.total_scanned,
          Math.max(0, item.total_quantity - item.total_scanned), item.notes]);
      });
      downloadCSVFile(rows, `master-pick-list-${show?.name?.replace(/\s+/g, '-') || 'show'}.csv`);
    } else {
      const rows = [['Room', 'Product', 'Category', 'Needed', 'Scanned', 'Remaining']];
      for (const g of Object.values(detailedGrouped)) {
        for (const item of g.items) {
          rows.push([g.room.name, item.req.product_name, item.req.category || '', item.needed, item.scanned, item.remaining]);
        }
      }
      downloadCSVFile(rows, `detailed-pick-list-${show?.name?.replace(/\s+/g, '-') || 'show'}.csv`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 overflow-auto p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-background border-b pb-4 no-print">
        <div>
          <h2 className="text-xl font-bold">Pick List — {show?.name}</h2>
          <p className="text-sm text-muted-foreground">{totalScanned} of {totalRequired} items scanned</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={downloadCSV}>
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
          {mode === 'master' && (
            <Button variant="outline" onClick={printMaster}>
              <Printer className="w-4 h-4 mr-2" /> Print Master
            </Button>
          )}
          {mode === 'detailed' && (
            <Button variant="outline" onClick={printDetailed}>
              <Printer className="w-4 h-4 mr-2" /> Print Detailed
            </Button>
          )}
          <Button onClick={printBoth}>
            <Printer className="w-4 h-4 mr-2" /> Print Both
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Type Selector */}
      <div className="flex gap-3 mb-6 no-print max-w-4xl mx-auto">
        <button
          onClick={() => setMode('master')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            mode === 'master'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border hover:bg-muted text-muted-foreground'
          }`}
        >
          <List className="w-4 h-4" />
          Master Show Pick List
        </button>
        <button
          onClick={() => setMode('detailed')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            mode === 'detailed'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border hover:bg-muted text-muted-foreground'
          }`}
        >
          <LayoutList className="w-4 h-4" />
          Detailed Room Pick List
        </button>
      </div>

      {/* ── MASTER CONTENT ── */}
      <div
        id="pick-list-master-content"
        className="max-w-4xl mx-auto"
        style={{ display: mode === 'master' ? 'block' : 'none' }}
      >
        <h1>{show?.name || 'Master Show Pick List'}</h1>
        <p className="meta">
          Date: {show?.start_date || '—'} |
          Venue: {show?.venue || '—'} |
          Generated: {new Date().toLocaleString()} |
          {masterItems.length} line items · {masterTotalQty} total units
        </p>

        <div className="summary">
          <div className="summary-grid">
            <div className="summary-item"><label>Line Items</label><strong>{masterItems.length}</strong></div>
            <div className="summary-item"><label>Total Units</label><strong>{masterTotalQty}</strong></div>
            <div className="summary-item"><label>Scanned</label><strong className="status-ok">{totalScanned}</strong></div>
            <div className="summary-item"><label>Remaining</label><strong className={totalRequired - totalScanned > 0 ? 'status-partial' : 'status-ok'}>{totalRequired - totalScanned}</strong></div>
          </div>
          <p style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
            ⚡ Master Pick List — All rooms combined, quantities summed by product type
          </p>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item Name</th>
              <th>Category</th>
              <th style={{ textAlign: 'center' }}>Total Qty</th>
              <th style={{ textAlign: 'center' }}>Scanned</th>
              <th style={{ textAlign: 'center' }}>Remaining</th>
              <th>Notes</th>
              <th style={{ textAlign: 'center', width: '36px' }}>✓</th>
            </tr>
          </thead>
          <tbody>
            {masterItems.map((item, i) => {
              const remaining = Math.max(0, item.total_quantity - item.total_scanned);
              return (
                <tr key={item.product_name}>
                  <td style={{ textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                  <td>{item.category || '—'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '14px' }}>{item.total_quantity}</td>
                  <td style={{ textAlign: 'center' }} className={item.total_scanned >= item.total_quantity ? 'status-ok' : item.total_scanned > 0 ? 'status-partial' : 'status-empty'}>
                    {item.total_scanned}
                  </td>
                  <td style={{ textAlign: 'center' }} className={remaining > 0 ? 'status-partial' : 'status-ok'}>
                    {remaining}
                  </td>
                  <td style={{ fontSize: '11px', color: '#888' }}>{item.notes || ''}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ width: '18px', height: '18px', border: '2px solid #cbd5e1', borderRadius: '4px', margin: 'auto' }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── DETAILED CONTENT ── */}
      <div
        id="pick-list-detailed-content"
        className="max-w-4xl mx-auto"
        style={{ display: mode === 'detailed' ? 'block' : 'none' }}
      >
        <h1>{show?.name || 'Detailed Room Pick List'}</h1>
        <p className="meta">
          Date: {show?.start_date || '—'} |
          Venue: {show?.venue || '—'} |
          Generated: {new Date().toLocaleString()} |
          Progress: {totalScanned}/{totalRequired} items ({totalRequired > 0 ? Math.round((totalScanned / totalRequired) * 100) : 0}%)
        </p>

        <div className="summary">
          <div className="summary-grid">
            <div className="summary-item"><label>Line Items</label><strong>{requirements.length}</strong></div>
            <div className="summary-item"><label>Total Required</label><strong>{totalRequired}</strong></div>
            <div className="summary-item"><label>Scanned</label><strong className="status-ok">{totalScanned}</strong></div>
            <div className="summary-item"><label>Remaining</label><strong className={totalRequired - totalScanned > 0 ? 'status-partial' : 'status-ok'}>{totalRequired - totalScanned}</strong></div>
          </div>
        </div>

        {Object.values(detailedGrouped).map(({ room, items }) => (
          <div key={room.id} className="room">
            <div className="room-header">{room.name} {room.type ? `(${room.type})` : ''}</div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Needed</th>
                  <th style={{ textAlign: 'center' }}>Scanned</th>
                  <th style={{ textAlign: 'center' }}>Remaining</th>
                  <th>Assigned Serials</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ req, active, needed, scanned, remaining }) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 600 }}>{req.product_name}</td>
                    <td>{req.category || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{needed}</td>
                    <td style={{ textAlign: 'center' }} className={scanned >= needed ? 'status-ok' : scanned > 0 ? 'status-partial' : 'status-empty'}>{scanned}</td>
                    <td style={{ textAlign: 'center' }} className={remaining > 0 ? 'status-partial' : 'status-ok'}>{remaining}</td>
                    <td className="serials">
                      {active.length === 0 ? '—' : active.map(f => f.asset_barcode || f.asset_serial || f.asset_id).join(', ')}
                    </td>
                    <td className={scanned >= needed ? 'status-ok' : scanned > 0 ? 'status-partial' : 'status-empty'}>
                      {scanned >= needed ? '✓ Complete' : scanned > 0 ? `${scanned}/${needed} partial` : 'Not started'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SHARED_STYLES = `
  body { font-family: Arial, sans-serif; font-size: 13px; padding: 20px; color: #111; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 20px; }
  .room { margin-bottom: 20px; page-break-inside: avoid; }
  .room-header { background: #f0f0f0; padding: 8px 12px; font-weight: bold; font-size: 14px; border-left: 4px solid #333; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #e8e8e8; text-align: left; padding: 6px 10px; font-size: 12px; border-bottom: 1px solid #ccc; }
  td { padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 12px; vertical-align: top; }
  .status-ok { color: #16a34a; font-weight: bold; }
  .status-partial { color: #d97706; font-weight: bold; }
  .status-empty { color: #6b7280; }
  .serials { font-family: monospace; font-size: 11px; color: #555; }
  .summary { background: #f9f9f9; padding: 12px; margin-bottom: 20px; border: 1px solid #ddd; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .summary-item label { font-size: 11px; color: #888; display: block; }
  .summary-item strong { font-size: 18px; }
  @media print { .no-print { display: none !important; } }
`;

function buildPrintDoc(title, styles, body) {
  return `<html><head><title>${title}</title><style>${styles}</style></head><body>${body}</body></html>`;
}

function downloadCSVFile(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}