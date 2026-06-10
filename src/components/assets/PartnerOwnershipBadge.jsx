import React from 'react';
import { Building2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Displays a compact ownership badge for partner-stored assets.
 * Shows nothing for standard owned assets.
 */
export default function PartnerOwnershipBadge({ asset, size = 'sm' }) {
  if (!asset || asset.ownership_type !== 'partner_stored') return null;

  const partnerName = asset.partner_owner_name || 'Roundtable Partner';
  const approvalRequired = asset.partner_approval_required;
  const useAllowed = asset.partner_use_allowed !== false;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1">
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/8 text-amber-400 text-xs gap-1 cursor-default"
            >
              <Building2 className="w-3 h-3" />
              {size === 'sm' ? 'Partner Owned' : `Stored for ${partnerName}`}
            </Badge>
            {approvalRequired && (
              <Badge
                variant="outline"
                className="border-orange-500/40 bg-orange-500/8 text-orange-400 text-xs gap-1 cursor-default"
              >
                <AlertCircle className="w-3 h-3" />
                Approval Req'd
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-semibold text-xs mb-1">Partner-Owned Inventory</p>
          <p className="text-xs text-muted-foreground">Stored for: {partnerName}</p>
          {!useAllowed && <p className="text-xs text-destructive mt-1">⚠ Not available for our shows</p>}
          {approvalRequired && <p className="text-xs text-orange-400 mt-1">⚠ Requires partner approval before use</p>}
          {asset.partner_agreement_notes && (
            <p className="text-xs text-muted-foreground mt-1 border-t border-border pt-1">{asset.partner_agreement_notes}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}