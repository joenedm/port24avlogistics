import React, { useState } from 'react';
import { ChevronDown, CheckCircle2, AlertCircle, Clock, Hash, MinusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function FulfillmentPickRow({ requirement, fulfillments = [] }) {
  const needed = requirement.quantity_needed || 1;
  const active = fulfillments.filter(f => f.requirement_id === requirement.id && f.movement_state !== 'returned');
  const scanned = active.length;
  const remaining = Math.max(0, needed - scanned);
  const isFulfilled = scanned >= needed;
  const isPartial = scanned > 0 && scanned < needed;
  const isEmpty = scanned === 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "rounded-lg border transition-all",
      isFulfilled ? "border-emerald-500/30 bg-emerald-500/5" :
      isPartial   ? "border-amber-500/30 bg-amber-500/5" :
                    "border-border bg-muted/20"
    )}>
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Status icon */}
        {isFulfilled ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        ) : isPartial ? (
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
        ) : (
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
        )}

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium text-sm leading-tight", isFulfilled && "line-through text-muted-foreground opacity-70")}>
            {requirement.product_name}
          </p>
          {requirement.category && <p className="text-xs text-muted-foreground mt-0.5">{requirement.category}</p>}
          {requirement.notes && <p className="text-xs text-muted-foreground/70 italic mt-0.5">{requirement.notes}</p>}
        </div>

        {/* Count pills */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Dot progress */}
          <div className="flex gap-1 items-center">
            {Array.from({ length: Math.min(needed, 8) }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2.5 h-2.5 rounded-full border transition-all",
                  i < scanned ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40 bg-transparent"
                )}
              />
            ))}
            {needed > 8 && <span className="text-xs text-muted-foreground">+{needed - 8}</span>}
          </div>

          {/* Counts */}
          <div className="text-right min-w-[48px]">
            <p className={cn(
              "font-bold text-sm tabular-nums",
              isFulfilled ? "text-emerald-500" : isPartial ? "text-amber-500" : "text-muted-foreground"
            )}>
              {scanned}/{needed}
            </p>
            {remaining > 0 && (
              <p className="text-xs text-muted-foreground">{remaining} left</p>
            )}
          </div>

          {/* Expand toggle */}
          {scanned > 0 && (
            <button onClick={() => setExpanded(e => !e)} className="p-1 rounded hover:bg-secondary/60 transition-colors">
              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
            </button>
          )}
        </div>
      </div>

      {/* Serial list */}
      {expanded && scanned > 0 && (
        <div className="px-3 pb-3 space-y-1 border-t border-border/40 pt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Assigned serials:</p>
          {active.map(f => {
            const serial = f.asset_serial || f.asset_name || f.asset_id;
            const stateColor = {
              picked: 'text-emerald-500 border-emerald-500/30',
              on_truck: 'text-blue-500 border-blue-500/30',
              on_location: 'text-primary border-primary/30',
              returning: 'text-orange-500 border-orange-500/30',
            }[f.movement_state] || 'text-muted-foreground';
            return (
              <div key={f.id} className="flex items-center gap-2 p-2 rounded bg-secondary/40 text-xs">
                <Hash className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="font-mono font-semibold">{serial}</span>
                <span className="text-muted-foreground flex-1 truncate">{f.asset_name}</span>
                <Badge variant="outline" className={cn("text-xs capitalize", stateColor)}>
                  {f.movement_state?.replace(/_/g, ' ')}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}