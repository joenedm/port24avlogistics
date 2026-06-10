import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { QrCode, Save, RefreshCw, Eye, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { CODE_TYPE_DEFAULTS, getMergedSettings, buildCode, previewCode } from '@/lib/useAutoCode';
import RegenerateCodesPanel from '@/components/admin/RegenerateCodesPanel';

const RECORD_TYPES = Object.keys(CODE_TYPE_DEFAULTS);

function CodeSettingRow({ recordType, dbRecord, allRecords, onSave, saving }) {
  const defaults = CODE_TYPE_DEFAULTS[recordType];
  const merged = getMergedSettings(allRecords, recordType);

  const [form, setForm] = useState({
    prefix: merged.prefix,
    separator: merged.separator ?? '-',
    padding: merged.padding ?? 5,
    next_number: merged.next_number ?? 1,
    auto_generate: merged.auto_generate ?? true,
    qr_enabled: merged.qr_enabled ?? true,
  });

  useEffect(() => {
    const m = getMergedSettings(allRecords, recordType);
    setForm({
      prefix: m.prefix,
      separator: m.separator ?? '-',
      padding: m.padding ?? 5,
      next_number: m.next_number ?? 1,
      auto_generate: m.auto_generate ?? true,
      qr_enabled: m.qr_enabled ?? true,
    });
  }, [allRecords, recordType]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const preview = buildCode(form.prefix || '???', form.separator ?? '-', Number(form.padding) || 5, Number(form.next_number) || 1);

  // Warn if prefix could conflict with another type
  const conflict = allRecords.find(r =>
    r.record_type !== recordType &&
    r.prefix &&
    form.prefix &&
    (r.prefix.toLowerCase() === form.prefix.toLowerCase())
  );

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold">{defaults.label}</CardTitle>
            <Badge variant="outline" className="text-xs font-mono">{recordType}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eye className="w-3 h-3" />
              <span className="font-mono font-medium text-foreground">{preview}</span>
            </div>
            {!form.auto_generate && (
              <Badge variant="outline" className="text-xs text-muted-foreground">Auto-gen off</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Prefix</Label>
            <Input
              value={form.prefix}
              onChange={e => set('prefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="e.g. NEDM"
              className="font-mono text-sm h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Separator</Label>
            <Input
              value={form.separator}
              onChange={e => set('separator', e.target.value.slice(0, 3))}
              placeholder="-"
              className="font-mono text-sm h-8"
              maxLength={3}
            />
          </div>
          <div>
            <Label className="text-xs">Number Padding</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.padding}
              onChange={e => set('padding', Number(e.target.value))}
              className="font-mono text-sm h-8"
            />
          </div>
          <div>
            <Label className="text-xs">Next Number</Label>
            <Input
              type="number"
              min={1}
              value={form.next_number}
              onChange={e => set('next_number', Number(e.target.value))}
              className="font-mono text-sm h-8"
            />
          </div>
        </div>

        {conflict && (
          <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Prefix <strong>{form.prefix}</strong> conflicts with <strong>{CODE_TYPE_DEFAULTS[conflict.record_type]?.label}</strong>. Codes may not be unique.</span>
          </div>
        )}

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={!!form.auto_generate}
              onCheckedChange={v => set('auto_generate', v)}
              id={`auto-${recordType}`}
            />
            <Label htmlFor={`auto-${recordType}`} className="text-xs cursor-pointer">Auto-generate enabled</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={!!form.qr_enabled}
              onCheckedChange={v => set('qr_enabled', v)}
              id={`qr-${recordType}`}
            />
            <Label htmlFor={`qr-${recordType}`} className="text-xs cursor-pointer">QR code enabled</Label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => onSave(recordType, form, dbRecord?.id)}
            disabled={saving}
            className="h-7 text-xs gap-1"
          >
            <Save className="w-3 h-3" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function QRCodeSettings() {
  const queryClient = useQueryClient();
  const [showRegenerate, setShowRegenerate] = useState(false);

  const { data: allSettings = [], isLoading } = useQuery({
    queryKey: ['codeSettings'],
    queryFn: () => db.entities.CodeSettings.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ recordType, form, existingId }) => {
      const payload = {
        record_type: recordType,
        label: CODE_TYPE_DEFAULTS[recordType]?.label || recordType,
        prefix: form.prefix,
        separator: form.separator ?? '-',
        padding: Number(form.padding) || 5,
        next_number: Number(form.next_number) || 1,
        auto_generate: !!form.auto_generate,
        qr_enabled: !!form.qr_enabled,
      };
      if (existingId) {
        return db.entities.CodeSettings.update(existingId, payload);
      }
      return db.entities.CodeSettings.create(payload);
    },
    onSuccess: () => {
      toast.success('Code settings saved');
      queryClient.invalidateQueries({ queryKey: ['codeSettings'] });
    },
    onError: (e) => toast.error(`Save failed: ${e.message}`),
  });

  const handleSave = (recordType, form, existingId) => {
    saveMutation.mutate({ recordType, form, existingId });
  };

  // Preview section — shows all current codes
  const previewRows = RECORD_TYPES.map(rt => {
    const settings = getMergedSettings(allSettings, rt);
    return {
      type: rt,
      label: CODE_TYPE_DEFAULTS[rt]?.label,
      code: previewCode(settings),
      autoGen: settings.auto_generate,
      qr: settings.qr_enabled,
    };
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading code settings…</div>;

  return (
    <div className="space-y-6">
      {/* Preview bar */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Code Preview — Current Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {previewRows.filter(r => r.autoGen).map(r => (
              <div key={r.type} className="flex flex-col gap-0.5 p-2 rounded-lg bg-background border border-border/60">
                <span className="text-[10px] text-muted-foreground">{r.label}</span>
                <span className="font-mono text-xs font-semibold text-primary">{r.code}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per-type settings */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Configure Per-Type Settings</p>
        {RECORD_TYPES.map(rt => {
          const dbRecord = allSettings.find(s => s.record_type === rt);
          return (
            <CodeSettingRow
              key={rt}
              recordType={rt}
              dbRecord={dbRecord}
              allRecords={allSettings}
              onSave={handleSave}
              saving={saveMutation.isPending}
            />
          );
        })}
      </div>

      {/* Regenerate section */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-500" /> Admin Tool: Regenerate Codes for Selected Records
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowRegenerate(v => !v)} className="gap-1 text-xs">
              {showRegenerate ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showRegenerate ? 'Hide' : 'Show'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Use this to intentionally regenerate codes for selected items when you are ready to relabel physical gear.
            Changing a prefix does <strong>not</strong> automatically rename existing records — use this tool for that.
          </p>
        </CardHeader>
        {showRegenerate && (
          <CardContent>
            <RegenerateCodesPanel allSettings={allSettings} />
          </CardContent>
        )}
      </Card>
    </div>
  );
}