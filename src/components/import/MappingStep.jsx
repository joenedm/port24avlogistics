import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, X, AlertCircle, HelpCircle, Wand2, Save, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { detectFieldWithConfidence, IMPORT_FIELDS } from '@/lib/equipmentFields';

const CONFIDENCE_CONFIG = {
  high:   { badge: null },   // silent — no badge shown
  medium: { badge: { label: 'Suggested',  class: 'bg-blue-500/10 text-blue-600 border-blue-500/20' } },
  low:    { badge: { label: 'Needs review', class: 'bg-amber-500/10 text-amber-600 border-amber-500/20' } },
  none:   { badge: null },
};

/**
 * ConfirmPopup — shown for low-confidence columns.
 * "We couldn't confidently identify this column. What should it map to?"
 */
function ConfirmPopup({ header, sampleValue, currentKey, allMappableFields, onConfirm, onSkip, onClose }) {
  const [chosen, setChosen] = useState(currentKey || '_skip');
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            What is this column?
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            We couldn't confidently identify:
          </p>
          <div className="bg-muted/60 rounded-lg px-3 py-2">
            <p className="font-semibold text-sm">"{header}"</p>
            {sampleValue && <p className="text-xs text-muted-foreground mt-0.5">Sample: {sampleValue}</p>}
          </div>
          <p className="text-sm">What field should this map to?</p>
          <Select value={chosen} onValueChange={setChosen}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allMappableFields.map(f => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}{f.required ? ' *' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onSkip}>Skip column</Button>
          <Button onClick={() => onConfirm(chosen)} disabled={chosen === '_skip'}>
            Confirm mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * MappingStep — full mapping UI with confidence indicators and low-confidence popup flow.
 */
export default function MappingStep({
  extractedData,
  fieldMap,
  setFieldMap,
  confidenceMap,        // { [colIndex]: 'high'|'medium'|'low'|'none' }
  duplicateAction,
  setDuplicateAction,
  dupeMatchBy,
  setDupeMatchBy,
  allMappableFields,
  templates,
  onAutoMap,
  onApplyTemplate,
  onSaveTemplate,
  onNext,
  nextLabel,
  nextDisabled,
  rowCount,
}) {
  const [pendingPopupIdx, setPendingPopupIdx] = useState(null);

  const allRows = extractedData?.rows || [];
  const headers = extractedData?.headers || [];
  const mappedKeys = Object.values(fieldMap);
  const hasName = mappedKeys.includes('name');
  // normalise fieldMap access – keys may be stored as numbers or strings
  const getMapping = (i) => fieldMap[i] ?? fieldMap[String(i)] ?? '_skip';
  const mappedCount = mappedKeys.filter(v => v !== '_skip').length;
  const skippedCount = mappedKeys.filter(v => v === '_skip').length;

  // Count columns needing review (low/none confidence that aren't yet confirmed)
  const needsReviewCount = headers.filter((h, i) => {
    const conf = confidenceMap?.[i] ?? confidenceMap?.[String(i)];
    return (conf === 'low' || conf === 'none') && getMapping(i) === '_skip';
  }).length;

  const DUPE_MATCH_BY = [
    { value: 'barcode',        label: 'QR Code / RFID' },
    { value: 'serial_numbers', label: 'Serial Number' },
    { value: 'name',           label: 'Name' },
  ];
  const DUPLICATE_ACTIONS = [
    { value: 'skip',        label: 'Skip duplicates' },
    { value: 'update',      label: 'Update existing' },
    { value: 'create',      label: 'Always create new' },
    { value: 'flag_review', label: 'Flag for review' },
  ];

  return (
    <div className="space-y-4 max-w-3xl">

      {/* ── Summary banner ── */}
      <div className={cn("flex items-start gap-3 p-3 rounded-xl border text-sm",
        hasName ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20')}>
        {hasName
          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
        <div className="flex-1">
          {hasName ? (
            <p className="font-medium">
              Auto-detected <strong>{mappedCount}</strong> of <strong>{headers.length}</strong> columns.
              {needsReviewCount > 0 && <span className="text-amber-600"> {needsReviewCount} need{needsReviewCount === 1 ? 's' : ''} your review.</span>}
              {skippedCount > 0 && <span className="text-muted-foreground"> {skippedCount} will be skipped.</span>}
            </p>
          ) : (
            <div>
              <p className="font-medium text-amber-700">Required field "Name" is not mapped yet.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Map your equipment name column below or click Auto-map.</p>
            </div>
          )}
        </div>
        <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={onAutoMap}>
          <Wand2 className="w-3.5 h-3.5" /> Auto-map
        </Button>
      </div>

      {/* ── Template quick-apply ── */}
      {templates.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Apply saved template:</span>
          {templates.map(t => (
            <Button key={t.id} size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={() => onApplyTemplate(t)}>
              <BookOpen className="w-3 h-3" />{t.name}
            </Button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Column Mappings</CardTitle>
            <Badge variant="outline">{rowCount} rows</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">

          {headers.map((header, i) => {
            const mapped = getMapping(i);
            const conf = confidenceMap?.[i] ?? confidenceMap?.[String(i)] ?? 'none';
            const isMapped = mapped !== '_skip';
            const confCfg = CONFIDENCE_CONFIG[conf];
            const sampleValue = allRows[0]?.[i] || '';
            const isLowConf = (conf === 'low' || conf === 'none') && !isMapped;
            const isMissingRequired = !isMapped &&
              IMPORT_FIELDS.some(f => f.required &&
                detectFieldWithConfidence(header).key === f.key);

            return (
              <div key={i} className={cn("rounded-lg border p-2.5 transition-colors",
                isMissingRequired ? 'border-destructive/30 bg-destructive/5' :
                isLowConf ? 'border-amber-500/30 bg-amber-500/5' :
                isMapped && conf === 'medium' ? 'border-blue-500/20 bg-blue-500/3' :
                isMapped ? 'border-emerald-500/20 bg-emerald-500/3' :
                'border-transparent bg-muted/20')}>

                <div className="flex items-center gap-2">
                  {/* Column name + sample */}
                  <div className="w-40 shrink-0">
                    <p className="text-sm font-medium truncate">{header}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">{sampleValue}</p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />

                  {/* Field selector */}
                  <Select value={mapped} onValueChange={v => setFieldMap(prev => ({ ...prev, [String(i)]: v }))}>
                    <SelectTrigger className="flex-1 text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allMappableFields.map(f => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}{f.required ? ' *' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Confidence badge */}
                  {confCfg?.badge && isMapped && (
                    <Badge variant="outline" className={cn("text-xs shrink-0 hidden sm:flex", confCfg.badge.class)}>
                      {confCfg.badge.label}
                    </Badge>
                  )}

                  {/* Status icon */}
                  {isMapped
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : isLowConf
                      ? <button className="shrink-0" onClick={() => setPendingPopupIdx(i)} title="Assign this column">
                          <HelpCircle className="w-4 h-4 text-amber-400 hover:text-amber-600 transition-colors" />
                        </button>
                      : <X className="w-4 h-4 text-muted-foreground/30 shrink-0" />}
                </div>

                {/* Inline suggestion for medium confidence */}
                {isMapped && conf === 'medium' && (
                  <p className="text-xs text-blue-600 mt-1 pl-1">
                    Suggested mapping — change if incorrect
                  </p>
                )}

                {/* Inline prompt for low-confidence unresolved */}
                {isLowConf && (
                  <div className="flex items-center gap-2 mt-1.5 pl-1">
                    <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-600">Couldn't identify this column.</span>
                    <button className="text-xs text-primary underline hover:no-underline"
                      onClick={() => setPendingPopupIdx(i)}>
                      Assign it →
                    </button>
                  </div>
                )}

                {/* Missing required field warning */}
                {isMissingRequired && (
                  <div className="flex items-center gap-2 mt-1.5 pl-1">
                    <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
                    <span className="text-xs text-destructive">
                      This looks like it should be{' '}
                      <strong>{allMappableFields.find(f => f.key === detectFieldWithConfidence(header).key)?.label}</strong>
                    </span>
                    <button className="text-xs text-primary underline hover:no-underline"
                      onClick={() => setFieldMap(prev => ({ ...prev, [i]: detectFieldWithConfidence(header).key }))}>
                      Fix it
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Duplicate settings ── */}
          <div className="pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Match duplicates by</p>
              <Select value={dupeMatchBy} onValueChange={setDupeMatchBy}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{DUPE_MATCH_BY.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">When duplicate found</p>
              <Select value={duplicateAction} onValueChange={setDuplicateAction}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{DUPLICATE_ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <div>
              {!hasName && (
                <p className="text-xs text-destructive font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Map the "Name" column to continue
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onSaveTemplate}>
                <Save className="w-3.5 h-3.5" /> Save Template
              </Button>
              <Button onClick={onNext} disabled={!hasName || nextDisabled}>
                {nextLabel || 'Preview Import →'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Low-confidence popup ── */}
      {pendingPopupIdx !== null && (
        <ConfirmPopup
          header={headers[pendingPopupIdx]}
          sampleValue={allRows[0]?.[pendingPopupIdx] || ''}
          currentKey={fieldMap[pendingPopupIdx] || '_skip'}
          allMappableFields={allMappableFields}
          onConfirm={(key) => {
            setFieldMap(prev => ({ ...prev, [pendingPopupIdx]: key }));
            setPendingPopupIdx(null);
          }}
          onSkip={() => {
            setFieldMap(prev => ({ ...prev, [pendingPopupIdx]: '_skip' }));
            setPendingPopupIdx(null);
          }}
          onClose={() => setPendingPopupIdx(null)}
        />
      )}
    </div>
  );
}