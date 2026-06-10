import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { RefreshCw, Package, Archive, Layers, AlertTriangle } from 'lucide-react';
import { getMergedSettings, buildCode, CODE_TYPE_DEFAULTS } from '@/lib/useAutoCode';

const ENTITY_MAP = {
  physical_item: { entity: 'Asset', filter: { item_type: 'physical_item' }, codeField: 'asset_number', barcodeField: 'barcode', label: 'Physical Items' },
  physical_kit:  { entity: 'Kit',   filter: { kit_type: 'serialized' },     codeField: 'barcode',      barcodeField: 'barcode', label: 'Physical Kits' },
  container:     { entity: 'Container', filter: {},                          codeField: 'asset_number', barcodeField: 'barcode', label: 'Containers' },
  consumable:    { entity: 'Asset', filter: { item_type: 'consumable' },     codeField: 'asset_number', barcodeField: 'barcode', label: 'Consumables' },
  bulk:          { entity: 'Asset', filter: { item_type: 'bulk' },           codeField: 'asset_number', barcodeField: 'barcode', label: 'Bulk Items' },
};

export default function RegenerateCodesPanel({ allSettings }) {
  const [recordType, setRecordType] = useState('physical_kit');
  const [selected, setSelected] = useState(new Set());
  const [running, setRunning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const queryClient = useQueryClient();

  const entityConfig = ENTITY_MAP[recordType];

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['regen-records', recordType],
    queryFn: async () => {
      if (!entityConfig) return [];
      const ent = db.entities[entityConfig.entity];
      if (!ent) return [];
      return Object.keys(entityConfig.filter).length > 0
        ? ent.filter(entityConfig.filter, '-created_date', 200)
        : ent.list('-created_date', 200);
    },
    enabled: !!entityConfig,
  });

  const settings = getMergedSettings(allSettings, recordType);
  const hasConfig = !!ENTITY_MAP[recordType];

  const toggleAll = () => {
    if (selected.size === records.length) setSelected(new Set());
    else setSelected(new Set(records.map(r => r.id)));
  };

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleRegenerate = async () => {
    if (selected.size === 0) return;
    setRunning(true);
    let num = settings.next_number ?? 1;
    const sep = settings.separator ?? '-';
    const pad = settings.padding ?? 5;
    const prefix = settings.prefix;

    const selectedRecords = records.filter(r => selected.has(r.id));
    try {
      for (const rec of selectedRecords) {
        const code = buildCode(prefix, sep, pad, num);
        num++;
        const ent = db.entities[entityConfig.entity];
        await ent.update(rec.id, {
          [entityConfig.codeField]: code,
          [entityConfig.barcodeField]: code,
        });
      }
      // Update next_number in settings
      const settingsRecord = allSettings.find(s => s.record_type === recordType);
      if (settingsRecord) {
        await db.entities.CodeSettings.update(settingsRecord.id, { next_number: num });
      }
      toast.success(`Regenerated ${selectedRecords.length} codes`);
      queryClient.invalidateQueries({ queryKey: ['regen-records', recordType] });
      queryClient.invalidateQueries({ queryKey: ['codeSettings'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      setSelected(new Set());
      setConfirmed(false);
    } catch (e) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const getDisplayCode = (rec) => rec[entityConfig?.codeField] || rec[entityConfig?.barcodeField] || '(no code)';
  const getDisplayName = (rec) => rec.name || '(unnamed)';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs">Record Type</Label>
          <Select value={recordType} onValueChange={v => { setRecordType(v); setSelected(new Set()); setConfirmed(false); }}>
            <SelectTrigger className="w-52 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ENTITY_MAP).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground">
          New prefix: <span className="font-mono font-semibold text-foreground">{buildCode(settings.prefix, settings.separator ?? '-', settings.padding ?? 5, settings.next_number ?? 1)}</span>
        </div>
      </div>

      {!hasConfig && (
        <p className="text-sm text-muted-foreground">Regeneration not supported for this type yet.</p>
      )}

      {hasConfig && (
        <>
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground border-b">
              <span>{records.length} records</span>
              <button type="button" onClick={toggleAll} className="text-primary hover:underline">
                {selected.size === records.length && records.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y">
              {isLoading && <p className="text-xs text-muted-foreground p-3">Loading…</p>}
              {!isLoading && records.length === 0 && <p className="text-xs text-muted-foreground p-3">No records found.</p>}
              {records.map(rec => (
                <div key={rec.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/20 cursor-pointer"
                  onClick={() => toggle(rec.id)}>
                  <input type="checkbox" checked={selected.has(rec.id)} onChange={() => toggle(rec.id)} className="accent-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getDisplayName(rec)}</p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{getDisplayCode(rec)}</span>
                </div>
              ))}
            </div>
          </div>

          {selected.size > 0 && (
            <div className="space-y-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  This will overwrite the codes for <strong>{selected.size} record(s)</strong> using the current prefix <strong>{settings.prefix}</strong>.
                  Existing printed QR labels will no longer match. Only do this when you are ready to physically relabel the gear.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="regen-confirm"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  className="accent-amber-500"
                />
                <label htmlFor="regen-confirm" className="text-xs cursor-pointer">I understand — I am ready to relabel these items</label>
              </div>
              <Button
                size="sm"
                disabled={!confirmed || running}
                onClick={handleRegenerate}
                className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {running ? 'Regenerating…' : `Regenerate ${selected.size} Code(s)`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}