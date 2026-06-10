import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  GripVertical, ChevronRight, RotateCcw, Save, Info, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import { DEFAULT_STATUS_FLOW, parseStatusFlow } from '@/lib/projectStatusEngine';

const SETTING_KEY = 'fulfillment_status_flow';

const ROLE_OPTIONS = [
  { value: 'crew',        label: 'Crew' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'manager',     label: 'Manager' },
  { value: 'director',    label: 'Director' },
  { value: 'admin',       label: 'Admin only' },
];

const CRITICAL_KEYS = new Set(['confirmed', 'on_location', 'finished']);
const CRITICAL_RULE_FIELDS = {
  confirmed:   ['require_quote_confirmed'],
  on_location: [],
  finished:    [],
};

function FieldRow({ label, children, description }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function StepEditor({ step, idx, onUpdate, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver }) {
  const [expanded, setExpanded] = useState(false);
  const isCritical = CRITICAL_KEYS.has(step.key);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(idx)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(idx); }}
      onDrop={() => onDrop(idx)}
      onDragEnd={onDragEnd}
      className={`rounded-lg border transition-all ${
        isDragOver ? 'border-primary bg-primary/5' : 'border-border/60 bg-card'
      } ${!step.enabled ? 'opacity-50' : ''}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 p-3">
        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />

        {/* Color swatch */}
        <input
          type="color"
          value={step.color}
          onChange={e => onUpdate(idx, { color: e.target.value })}
          className="w-8 h-8 rounded-md cursor-pointer border border-border shrink-0"
          title="Pick color"
        />

        {/* Internal label */}
        <Input
          value={step.label}
          onChange={e => onUpdate(idx, { label: e.target.value })}
          className="h-8 text-sm w-36 shrink-0"
          placeholder="Internal label"
        />

        {/* Client label */}
        <Input
          value={step.client_label || ''}
          onChange={e => onUpdate(idx, { client_label: e.target.value })}
          className="h-8 text-sm w-36 shrink-0 text-muted-foreground"
          placeholder="Client label"
        />

        {/* Backend key badge */}
        <code className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded hidden md:block shrink-0">
          {step.key}
        </code>

        {isCritical && (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs shrink-0 hidden lg:flex">
            Critical
          </Badge>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <Switch
            checked={step.enabled}
            onCheckedChange={v => onUpdate(idx, { enabled: v })}
          />
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded settings */}
      {expanded && (
        <div className="px-4 pb-4 space-y-1 border-t border-border/40">
          <p className="text-xs text-muted-foreground pt-3 pb-1 font-medium uppercase tracking-wide">Description</p>
          <Input
            value={step.description || ''}
            onChange={e => onUpdate(idx, { description: e.target.value })}
            className="h-8 text-sm"
            placeholder="Internal description"
          />

          <p className="text-xs text-muted-foreground pt-3 pb-1 font-medium uppercase tracking-wide">Visibility</p>
          <FieldRow label="Show internally" description="Visible in admin/staff views">
            <Switch checked={!!step.show_internally} onCheckedChange={v => onUpdate(idx, { show_internally: v })} />
          </FieldRow>
          <FieldRow label="Show to clients" description="Visible in client portal">
            <Switch checked={!!step.show_to_clients} onCheckedChange={v => onUpdate(idx, { show_to_clients: v })} />
          </FieldRow>
          <FieldRow label="Show on dashboard">
            <Switch checked={!!step.show_on_dashboard} onCheckedChange={v => onUpdate(idx, { show_on_dashboard: v })} />
          </FieldRow>
          <FieldRow label="Show in project list">
            <Switch checked={!!step.show_in_list} onCheckedChange={v => onUpdate(idx, { show_in_list: v })} />
          </FieldRow>
          <FieldRow label="Show in scan workflow">
            <Switch checked={!!step.show_in_scan} onCheckedChange={v => onUpdate(idx, { show_in_scan: v })} />
          </FieldRow>
          <FieldRow label="Show in reports / PDFs">
            <Switch checked={!!step.show_in_reports} onCheckedChange={v => onUpdate(idx, { show_in_reports: v })} />
          </FieldRow>

          <p className="text-xs text-muted-foreground pt-3 pb-1 font-medium uppercase tracking-wide">Permissions</p>
          <FieldRow label="Minimum role to move forward">
            <Select value={step.can_move_forward_min_role || 'coordinator'} onValueChange={v => onUpdate(idx, { can_move_forward_min_role: v })}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Minimum role to move backward">
            <Select value={step.can_move_backward_min_role || 'manager'} onValueChange={v => onUpdate(idx, { can_move_backward_min_role: v })}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Minimum role to override blocked move">
            <Select value={step.can_override_min_role || 'admin'} onValueChange={v => onUpdate(idx, { can_override_min_role: v })}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>

          <p className="text-xs text-muted-foreground pt-3 pb-1 font-medium uppercase tracking-wide">Automation</p>
          <FieldRow label="Auto-advance when criteria met">
            <Switch checked={!!step.auto_advance} onCheckedChange={v => onUpdate(idx, { auto_advance: v })} />
          </FieldRow>
          {step.key === 'confirmed' && (
            <FieldRow label="Require quote confirmed before moving here" description="Critical rule — disabling shows a warning">
              <Switch
                checked={step.require_quote_confirmed !== false}
                onCheckedChange={v => {
                  if (!v) {
                    if (!window.confirm('⚠️ Disabling this rule allows projects to be Confirmed without a confirmed quote. Are you sure?')) return;
                  }
                  onUpdate(idx, { require_quote_confirmed: v });
                }}
              />
            </FieldRow>
          )}

          <p className="text-xs text-muted-foreground pt-3 pb-1 font-medium uppercase tracking-wide">Override</p>
          <FieldRow label="Require reason for override">
            <Switch checked={!!step.require_reason_for_override} onCheckedChange={v => onUpdate(idx, { require_reason_for_override: v })} />
          </FieldRow>
          <FieldRow label="Log override in audit history">
            <Switch checked={step.log_override !== false} onCheckedChange={v => onUpdate(idx, { log_override: v })} />
          </FieldRow>
        </div>
      )}
    </div>
  );
}

export default function StatusFlowSettings() {
  const queryClient = useQueryClient();

  const { data: brandSettings = [] } = useQuery({
    queryKey: ['brand_settings'],
    queryFn: () => base44.entities.BrandSettings.list(),
  });

  const settingRecord = brandSettings.find(b => b.setting_key === SETTING_KEY);
  const savedFlow = parseStatusFlow(brandSettings);

  const [flow, setFlow] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const effectiveFlow = flow ?? savedFlow;

  const saveMutation = useMutation({
    mutationFn: async (newFlow) => {
      const payload = { setting_key: SETTING_KEY, setting_value: JSON.stringify(newFlow) };
      if (settingRecord) {
        return base44.entities.BrandSettings.update(settingRecord.id, payload);
      } else {
        return base44.entities.BrandSettings.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand_settings'] });
      toast.success('Status flow saved — all UI areas will now use the updated labels and rules.');
    },
  });

  const handleSave = () => saveMutation.mutate(effectiveFlow);

  const handleReset = () => {
    if (!window.confirm('Reset all status settings to defaults?')) return;
    setFlow(DEFAULT_STATUS_FLOW);
    toast.info('Reset to defaults — click Save to apply');
  };

  const updateStep = (idx, changes) => {
    const next = [...effectiveFlow];
    next[idx] = { ...next[idx], ...changes };
    setFlow(next);
  };

  const handleDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const next = [...effectiveFlow];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setFlow(next);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Project Status Flow</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Configure how project statuses display and behave everywhere in the platform — labels, colors, visibility, permissions, and automation.
              Backend keys (e.g. <code className="font-mono text-xs">on_location</code>) are stable; rename labels freely.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Live preview */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Internal Flow Preview</p>
            <div className="flex items-center gap-1 flex-wrap">
              {effectiveFlow.filter(s => s.enabled).map((s, i, arr) => (
                <React.Fragment key={s.key}>
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-medium border"
                    style={{ backgroundColor: s.color + '22', color: s.color, borderColor: s.color + '55' }}
                  >
                    {s.label}
                  </span>
                  {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
                </React.Fragment>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 mb-1 font-medium uppercase tracking-wide">Client-Facing Preview</p>
            <div className="flex items-center gap-1 flex-wrap">
              {effectiveFlow.filter(s => s.enabled && s.show_to_clients).map((s, i, arr) => (
                <React.Fragment key={s.key}>
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-medium border"
                    style={{ backgroundColor: s.color + '22', color: s.color, borderColor: s.color + '55' }}
                  >
                    {s.client_label || s.label}
                  </span>
                  {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1.5rem_2rem_1fr_1fr_4rem_3.5rem_2.5rem] gap-3 px-3 text-xs text-muted-foreground font-medium hidden md:grid">
            <span />
            <span>Color</span>
            <span>Internal Label</span>
            <span>Client Label</span>
            <span>Key</span>
            <span className="text-center">Active</span>
            <span className="text-center">More</span>
          </div>

          {/* Step list */}
          <div className="space-y-2">
            {effectiveFlow.map((step, idx) => (
              <StepEditor
                key={step.key}
                step={step}
                idx={idx}
                onUpdate={updateStep}
                onDragStart={(i) => setDragIdx(i)}
                onDragOver={(i) => setDragOverIdx(i)}
                onDrop={handleDrop}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                isDragOver={dragOverIdx === idx}
              />
            ))}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              These settings control status labels, colors, and rules across the <strong>entire platform</strong>:
              status bar, admin dropdown, gear status card, project dashboard, project list, scan/pick workflow, client portal, and PDFs.
              Click the expand arrow on any step to configure visibility, permissions, and automation rules.
            </span>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>Backend keys are stable</strong> — the values in grey badges (e.g. <code className="font-mono">on_location</code>) are stored in the database and must not be changed. Rename labels freely.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}