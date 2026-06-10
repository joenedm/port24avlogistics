import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Universal badge for Roundtable / subrented items.
 * Use wherever subrented gear appears to distinguish it from owned inventory.
 */
export default function RoundtableBadge({ partnerName, size = 'default', className }) {
  if (size === 'sm') {
    return (
      <Badge
        variant="outline"
        className={cn('text-xs border-amber-500/40 text-amber-500 bg-amber-500/8 gap-1 shrink-0', className)}
      >
        <Handshake className="w-2.5 h-2.5" />
        {partnerName ? partnerName : 'Subrent'}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn('border-amber-500/40 text-amber-500 bg-amber-500/8 gap-1.5 shrink-0', className)}
    >
      <Handshake className="w-3 h-3" />
      {partnerName ? partnerName : 'Roundtable'}
    </Badge>
  );
}