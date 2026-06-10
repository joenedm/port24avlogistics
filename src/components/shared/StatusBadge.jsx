import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStatusFlow } from '@/lib/useStatusFlow';

/**
 * StatusBadge — renders a project status badge using the admin-configured
 * label and color from the status flow settings.
 * Also handles asset condition/availability statuses as before.
 */

// Non-project statuses (asset, condition) — these are not managed by the flow engine
const STATIC_STYLES = {
  available:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  checked_out:  'bg-amber-500/10 text-amber-600 border-amber-500/20',
  maintenance:  'bg-orange-500/10 text-orange-600 border-orange-500/20',
  retired:      'bg-slate-500/10 text-slate-500 border-slate-500/20',
  excellent:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  good:         'bg-blue-500/10 text-blue-600 border-blue-500/20',
  fair:         'bg-amber-500/10 text-amber-600 border-amber-500/20',
  poor:         'bg-red-500/10 text-red-600 border-red-500/20',
};
const STATIC_LABELS = {
  available:    'Available',
  checked_out:  'Checked Out',
  maintenance:  'Maintenance',
  retired:      'Retired',
  excellent:    'Excellent',
  good:         'Good',
  fair:         'Fair',
  poor:         'Poor',
};

export default function StatusBadge({ status, forClient = false, className: extraClass }) {
  const { label, className: flowClass, style: flowStyle, normalize } = useStatusFlow();

  // Static (non-project) statuses
  if (STATIC_STYLES[status]) {
    return (
      <Badge variant="outline" className={cn('font-medium text-xs', STATIC_STYLES[status], extraClass)}>
        {STATIC_LABELS[status]}
      </Badge>
    );
  }

  // Project statuses — use the flow engine
  const canonical = normalize(status);
  const tailwindClass = flowClass(canonical);
  const displayLabel = label(canonical, { forClient });

  if (tailwindClass) {
    return (
      <Badge variant="outline" className={cn('font-medium text-xs border', tailwindClass, extraClass)}>
        {displayLabel}
      </Badge>
    );
  }

  // Custom color — use inline style
  const inlineStyle = flowStyle(canonical);
  return (
    <Badge
      variant="outline"
      className={cn('font-medium text-xs border', extraClass)}
      style={inlineStyle}
    >
      {displayLabel}
    </Badge>
  );
}