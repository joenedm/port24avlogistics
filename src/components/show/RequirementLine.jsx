import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, GripVertical, Package, AlertTriangle, Handshake, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * RequirementLine — renders one ShowRequirement row.
 *
 * Props:
 *   req              — ShowRequirement record
 *   onUpdate         — fn(data)
 *   onDelete         — fn()
 *   onActivateSubrent — fn(req) — called when user clicks "Activate Sub-Rent"
 *   conflictInfo     — null | { showName, level: 'hard'|'soft' }
 *   isNotInInventory — boolean — item name doesn't match any owned asset
 */
export default function RequirementLine({ req, onUpdate, onDelete, onActivateSubrent, conflictInfo, isNotInInventory, dragHandleProps }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ product_name: req.product_name, quantity_needed: req.quantity_needed, notes: req.notes || '' });

  const needed = req.quantity_needed || 1;

  const handleSave = () => {
    if (!draft.product_name.trim()) return;
    onUpdate({ product_name: draft.product_name.trim(), quantity_needed: parseInt(draft.quantity_needed) || 1, notes: draft.notes });
    setEditing(false);
  };

  // Determine visual state
  const isHardConflict = conflictInfo?.level === 'hard';
  const isSoftConflict = conflictInfo?.level === 'soft';
  const isMissing = isNotInInventory && !conflictInfo;

  const rowClass = cn(
    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
    isHardConflict && "border-red-500/40 bg-red-500/8",
    isSoftConflict && "border-red-400/30 bg-red-400/5",
    isMissing && "border-amber-500/40 bg-amber-500/8",
    !isHardConflict && !isSoftConflict && !isMissing && "border-border bg-muted/30"
  );

  return (
    <div className={rowClass}>
      <div {...(dragHandleProps || {})} className="cursor-grab active:cursor-grabbing shrink-0 touch-none">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>

      {editing ? (
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <Input
            value={draft.product_name}
            onChange={e => setDraft(p => ({ ...p, product_name: e.target.value }))}
            className="h-7 text-sm flex-1 min-w-24"
            autoFocus
          />
          <Input
            type="number"
            min="1"
            value={draft.quantity_needed}
            onChange={e => setDraft(p => ({ ...p, quantity_needed: e.target.value }))}
            className="h-7 text-sm w-16"
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave}><Check className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}><X className="w-3 h-3" /></Button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className={cn("font-medium text-sm leading-tight", (isHardConflict || isSoftConflict) && "text-red-400", isMissing && "text-amber-500")}>
                {req.product_name}
              </p>

              {/* Status badges */}
              {isHardConflict && (
                <Badge className="text-xs bg-red-500/15 text-red-500 border-red-500/30 gap-1 shrink-0">
                  <AlertCircle className="w-2.5 h-2.5" /> On Another Show
                </Badge>
              )}
              {isSoftConflict && (
                <Badge className="text-xs bg-red-400/15 text-red-400 border-red-400/30 gap-1 shrink-0">
                  <AlertTriangle className="w-2.5 h-2.5" /> Reserved Elsewhere
                </Badge>
              )}
              {isMissing && (
                <Badge className="text-xs bg-amber-500/15 text-amber-500 border-amber-500/30 gap-1 shrink-0">
                  <AlertTriangle className="w-2.5 h-2.5" /> Not in Inventory
                </Badge>
              )}
              {!isHardConflict && !isSoftConflict && !isMissing && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 border-primary/30 text-primary gap-0.5 shrink-0">
                  <Package className="w-2.5 h-2.5" /> Owned
                </Badge>
              )}
            </div>

            {/* Conflict detail */}
            {(isHardConflict || isSoftConflict) && conflictInfo?.showName && (
              <p className="text-xs text-red-400/80 mt-0.5">
                {isHardConflict ? '🔴 Checked out to' : '🟡 Planned for'}: {conflictInfo.showName}
              </p>
            )}

            {req.category && <span className="text-xs text-muted-foreground">{req.category}</span>}
            {req.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{req.notes}</p>}
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Sub-rent activation for missing/conflicted items */}
            {(isMissing || isHardConflict || isSoftConflict) && onActivateSubrent && (
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-7 text-xs gap-1 shrink-0",
                  isMissing && "border-amber-500/40 text-amber-500 hover:bg-amber-500/10",
                  (isHardConflict || isSoftConflict) && "border-red-500/40 text-red-400 hover:bg-red-500/10"
                )}
                onClick={() => onActivateSubrent(req)}
              >
                <Handshake className="w-3 h-3" /> Sub-Rent
              </Button>
            )}

            {/* Price */}
            {req.daily_rate > 0 && (
              <div className="text-right text-xs leading-tight">
                <p className="font-semibold text-primary">${parseFloat(req.daily_rate).toFixed(2)}<span className="text-muted-foreground font-normal">/day</span></p>
                {needed > 1 && (
                  <p className="text-muted-foreground">${(parseFloat(req.daily_rate) * needed).toFixed(2)} total</p>
                )}
              </div>
            )}

            <Badge variant="outline" className="text-xs">
              ×{needed}
            </Badge>

            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => { setDraft({ product_name: req.product_name, quantity_needed: req.quantity_needed, notes: req.notes || '' }); setEditing(true); }}>
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}