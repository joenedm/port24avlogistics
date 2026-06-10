/**
 * RoundtableBulkImport
 * Mirrors the ImportInventory flow but saves everything to RoundtableItem
 * instead of Asset/Kit, and always attaches the chosen partner.
 */
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { db } from '@/api/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  FileSpreadsheet, Download, ChevronRight, AlertCircle, CheckCircle2, AlertTriangle, Handshake
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Template columns & example row ──────────────────────────────────────────
const TEMPLATE_COLS = ['name', 'category', 'qty_available', 'daily_rate', 'condition', 'item_type', 'serial_numbers', 'notes'];
const TEMPLATE_EXAMPLE = ['Shure SM58', 'Audio', 2, 85, 'excellent', 'physical', 'SN-001,SN-002', 'Road-worn but solid'];

const CATEGORIES = ['Audio', 'Video', 'Lighting', 'Staging', 'Power', 'Rigging', 'Comms', 'Backline', 'Other'];
const CONDITIONS = ['excellent', 'good', 'fair', 'poor'];
const ITEM_TYPES = ['physical', 'kit'];

// Column header → field key mapping
const HEADER_MAP = {
  name: 'name', item: 'name', 'item name': 'name', description: 'name',
  category: 'category', type: 'category',
  qty: 'qty_available', quantity: 'qty_available', 'qty available': 'qty_available', count: 'qty_available',
  rate: 'daily_rate', 'daily rate': 'daily_rate', price: 'daily_rate', 'day rate': 'daily_rate',
  condition: 'condition', quality: 'condition',
  'item type': 'item_type', 'type': 'item_type',
  serial: 'serial_numbers', 'serial number': 'serial_numbers', 'serial numbers': 'serial_numbers', sn: 'serial_numbers',
  notes: 'notes', note: 'notes', comments: 'notes',
};

const mapHeader = (h) => HEADER_MAP[(h || '').toLowerCase().trim()] || null;

const downloadTemplate = () => {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLS, TEMPLATE_EXAMPLE]);
  ws['!cols'] = TEMPLATE_COLS.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Partner Inventory');
  XLSX.writeFile(wb, 'roundtable_partner_inventory_template.xlsx');
};

const STEPS = ['partner', 'upload', 'preview', 'importing', 'done'];

export default function RoundtableBulkImport({ partners, defaultPartnerId, onClose, onDone }) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(defaultPartnerId ? 'upload' : 'partner');
  const [partnerId, setPartnerId] = useState(defaultPartnerId || '');
  const [rows, setRows] = useState([]);       // { mappedData, action, errors }
  const [uploadError, setUploadError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);

  const partner = partners.find(p => p.id === partnerId);

  // ── Parse file ──────────────────────────────────────────────────────────────
  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadError(null);
    setIsUploading(true);

    try {
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (!raw || raw.length < 2) {
        setUploadError('File appears empty. Make sure row 1 has column headers and row 2+ has data.');
        return;
      }

      const headers = (raw[0] || []).map(h => String(h).trim());
      const colMap = headers.map(h => mapHeader(h)); // index → field key or null

      const parsed = raw.slice(1)
        .map((row, ri) => {
          const data = {};
          headers.forEach((_, ci) => {
            const field = colMap[ci];
            if (!field) return;
            const val = String(row[ci] ?? '').trim();
            if (val) data[field] = val;
          });
          return data;
        })
        .filter(d => d.name);

      if (parsed.length === 0) {
        setUploadError('No valid rows found. Make sure each row has at least a "name" column value.');
        return;
      }

      // Validate + normalise
      const staged = parsed.map((d, ri) => {
        const errors = [];
        if (!d.name) errors.push('Missing name');

        // Normalise qty
        const qty = parseInt(d.qty_available) || 1;
        // Normalise rate
        const rate = parseFloat(String(d.daily_rate || '').replace(/[^0-9.]/g, '')) || 0;
        // Normalise condition
        const condition = CONDITIONS.includes((d.condition || '').toLowerCase()) ? d.condition.toLowerCase() : 'good';
        // Normalise item_type
        const item_type = ITEM_TYPES.includes((d.item_type || '').toLowerCase()) ? d.item_type.toLowerCase() : 'physical';
        // Normalise category
        const cat = CATEGORIES.find(c => c.toLowerCase() === (d.category || '').toLowerCase()) || (d.category || '');

        return {
          rowIndex: ri,
          mappedData: {
            name: d.name,
            category: cat,
            qty_available: qty,
            daily_rate: rate,
            condition,
            item_type,
            serial_numbers: d.serial_numbers || '',
            notes: d.notes || '',
          },
          errors,
          action: errors.length === 0 ? 'create' : 'error',
        };
      });

      setRows(staged);
      setStep('preview');
    } catch {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadError('Could not read the file. Please upload a valid .csv or .xlsx.');
    }
  };

  // ── Run import ──────────────────────────────────────────────────────────────
  const runImport = async () => {
    setStep('importing');
    setProgress(0);
    let success = 0, failed = 0;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const toImport = rows.filter(r => r.action === 'create');

    for (let i = 0; i < toImport.length; i++) {
      const staged = toImport[i];
      setProgress(Math.round(((i + 1) / toImport.length) * 100));
      try {
        await db.entities.RoundtableItem.create({
          ...staged.mappedData,
          partner_id: partnerId,
          partner_name: partner?.company_name || '',
          is_available: true,
        });
        success++;
      } catch {
        failed++;
      }
      await sleep(150);
    }

    setImportResult({ success, failed, total: toImport.length });
    setStep('done');
  };

  const stepIndex = STEPS.indexOf(step);
  const readyRows = rows.filter(r => r.action === 'create');
  const errorRows = rows.filter(r => r.action === 'error');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Partner Inventory</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 text-xs mb-4 flex-wrap">
          {['Partner', 'Upload', 'Preview', 'Importing', 'Done'].map((label, i) => (
            <React.Fragment key={label}>
              <span className={cn(
                'flex items-center gap-1 px-2 py-1 rounded',
                stepIndex === i ? 'text-primary font-semibold' : stepIndex > i ? 'text-muted-foreground' : 'text-muted-foreground/40'
              )}>
                <span className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center font-bold',
                  stepIndex === i ? 'bg-primary text-primary-foreground' : stepIndex > i ? 'bg-emerald-500 text-white' : 'bg-muted'
                )}>{i + 1}</span>
                <span className="hidden sm:inline">{label}</span>
              </span>
              {i < 4 && <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP 1: Choose Partner ─────────────────────────────────────── */}
        {step === 'partner' && (
          <div className="space-y-4 max-w-sm">
            <div>
              <Label>Select Partner Company *</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose partner…" /></SelectTrigger>
                <SelectContent>
                  {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!partnerId} onClick={() => setStep('upload')} className="gap-1.5">
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* ── STEP 2: Upload ─────────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className="space-y-4 max-w-xl">
            {partner && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                <Handshake className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium">Importing for: {partner.company_name}</span>
                {!defaultPartnerId && (
                  <button onClick={() => setStep('partner')} className="ml-auto text-xs text-primary hover:underline">Change</button>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
            <Card>
              <CardContent className="pt-6">
                <div
                  className={cn(
                    'flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors',
                    isUploading ? 'border-primary/40 bg-primary/5' : 'hover:border-primary/40 hover:bg-muted/30'
                  )}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2" /><p className="font-medium text-sm">Reading file…</p></>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-10 h-10 text-muted-foreground/50 mb-2" />
                      <p className="font-semibold text-sm">Drop your spreadsheet here</p>
                      <p className="text-xs text-muted-foreground mt-1">Supports .csv, .xlsx — columns auto-detected</p>
                      <Button variant="outline" size="sm" className="mt-3" type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>Browse Files</Button>
                    </>
                  )}
                </div>

                {uploadError && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />{uploadError}
                  </div>
                )}

                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-700">Download Import Template</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pre-formatted .xlsx with the right columns</p>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={downloadTemplate}>
                    <Download className="w-3.5 h-3.5" /> .xlsx
                  </Button>
                </div>

                <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Expected columns:</p>
                  <p className="leading-relaxed">{TEMPLATE_COLS.join(' · ')}</p>
                </div>
              </CardContent>
            </Card>

            {!defaultPartnerId && <Button variant="outline" onClick={() => setStep('partner')}>← Back</Button>}
          </div>
        )}

        {/* ── STEP 3: Preview ────────────────────────────────────────────── */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-700 rounded-full text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {readyRows.length} ready to import
              </div>
              {errorRows.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-full text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> {errorRows.length} errors (will be skipped)
                </div>
              )}
              {partner && (
                <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 gap-1">
                  <Handshake className="w-3 h-3" /> {partner.company_name}
                </Badge>
              )}
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto max-h-72">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs">Qty</TableHead>
                      <TableHead className="text-xs">Rate/Day</TableHead>
                      <TableHead className="text-xs">Condition</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i} className={r.action === 'error' ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-xs text-muted-foreground">{r.rowIndex + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{r.mappedData.name}</TableCell>
                        <TableCell className="text-xs">{r.mappedData.category || '—'}</TableCell>
                        <TableCell className="text-xs">{r.mappedData.qty_available}</TableCell>
                        <TableCell className="text-xs font-mono">{r.mappedData.daily_rate ? `$${r.mappedData.daily_rate}` : '—'}</TableCell>
                        <TableCell className="text-xs capitalize">{r.mappedData.condition}</TableCell>
                        <TableCell className="text-xs capitalize">{r.mappedData.item_type}</TableCell>
                        <TableCell>
                          {r.action === 'create'
                            ? <Badge className="bg-emerald-500/10 text-emerald-700 text-xs border-0">create</Badge>
                            : <Badge className="bg-destructive/10 text-destructive text-xs border-0">error</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {errorRows.length > 0 && (
              <div className="text-xs text-destructive space-y-0.5">
                {errorRows.map((r, i) => <p key={i}>Row {r.rowIndex + 1}: {r.errors.join('; ')}</p>)}
              </div>
            )}

            <div className="flex justify-between flex-wrap gap-3">
              <Button variant="outline" onClick={() => setStep('upload')}>← Re-upload</Button>
              <Button disabled={readyRows.length === 0} onClick={runImport}>
                Import {readyRows.length} item{readyRows.length !== 1 ? 's' : ''} →
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Importing ──────────────────────────────────────────── */}
        {step === 'importing' && (
          <div className="py-10 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-semibold text-sm">Importing partner inventory…</p>
            <Progress value={progress} className="h-2 max-w-xs mx-auto" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* ── STEP 5: Done ───────────────────────────────────────────────── */}
        {step === 'done' && importResult && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div>
              <h3 className="font-bold text-lg">Import Complete</h3>
              <p className="text-sm text-muted-foreground mt-1">{importResult.success} item{importResult.success !== 1 ? 's' : ''} added to {partner?.company_name}</p>
              {importResult.failed > 0 && <p className="text-xs text-destructive mt-1">{importResult.failed} failed</p>}
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => { setStep('upload'); setRows([]); setImportResult(null); setProgress(0); }}>Import More</Button>
              <Button onClick={() => { toast.success(`${importResult.success} items imported!`); onDone(); }}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}