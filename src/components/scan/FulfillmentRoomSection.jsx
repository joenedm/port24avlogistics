import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import FulfillmentPickRow from './FulfillmentPickRow';

export default function FulfillmentRoomSection({ room, requirements, fulfillments }) {
  const [collapsed, setCollapsed] = useState(false);

  const roomReqs = room.id === null
    ? requirements.filter(r => !r.room_id)
    : requirements.filter(r => r.room_id === room.id);
  const totalNeeded = roomReqs.reduce((s, r) => s + (r.quantity_needed || 1), 0);
  const totalScanned = roomReqs.reduce((s, r) => {
    const count = fulfillments.filter(f => f.requirement_id === r.id && f.movement_state !== 'returned').length;
    return s + Math.min(count, r.quantity_needed || 1);
  }, 0);
  const isComplete = totalNeeded > 0 && totalScanned >= totalNeeded;
  const isStarted = totalScanned > 0;

  if (roomReqs.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between p-3 bg-secondary/40 hover:bg-secondary/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={cn("w-4 h-4 transition-transform text-muted-foreground", collapsed && "-rotate-90")} />
          <span className="font-semibold text-sm">{room.name}</span>
          <span className="text-xs text-muted-foreground capitalize">{room.type}</span>
        </div>
        <Badge className={cn(
          "text-xs",
          isComplete ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" :
          isStarted ? "bg-amber-500/15 text-amber-500 border-amber-500/30" :
          "bg-muted text-muted-foreground"
        )}>
          {totalScanned}/{totalNeeded} picked
        </Badge>
      </button>

      {!collapsed && (
        <div className="p-3 space-y-2">
          {roomReqs.map(req => (
            <FulfillmentPickRow
              key={req.id}
              requirement={req}
              fulfillments={fulfillments}
            />
          ))}
        </div>
      )}
    </div>
  );
}