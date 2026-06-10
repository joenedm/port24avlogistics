import React, { useState } from 'react';
import { db } from '@/api/db';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Wrench } from 'lucide-react';

const REASONS = [
  { value: 'broken', label: 'Broken' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'needs_inspection', label: 'Needs Inspection' },
  { value: 'needs_repair', label: 'Needs Repair' },
  { value: 'lost_missing', label: 'Lost / Missing' },
];

export default function AVHospitalScanDialog({ open, onOpenChange, asset, show, user }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('broken');
  const [notes, setNotes] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Create AV Hospital record
      await db.entities.AVHospital.create({
        asset_id: asset.id,
        asset_name: asset.name,
        asset_barcode: asset.barcode || '',
        marked_by: user?.email || '',
        marked_reason: reason,
        issue_notes: notes,
        repair_status: 'waiting_inspection',
        show_id: show?.id || null,
        show_name: show?.name || null,
        is_active: true,
      });
      // Update asset status to maintenance
      await db.entities.Asset.update(asset.id, {
        status: 'maintenance',
        condition: 'poor',
      });
      // Log the movement
      await db.entities.AssetMovement.create({
        asset_id: asset.id,
        asset_name: asset.name,
        asset_barcode: asset.barcode || asset.id,
        action: 'maintenance',
        show_id: show?.id || null,
        show_name: show?.name || null,
        from_location: show?.name || 'Field',
        to_location: 'AV Hospital',
        notes: `Reason: ${reason}${notes ? ` — ${notes}` : ''}`,
        scanned_by: user?.email || 'unknown',
        scanned_by_user_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['avhospital'] });
      toast.success(`${asset?.name} sent to AV Hospital`);
      onOpenChange(false);
      setNotes('');
      setReason('broken');
    },
    onError: (err) => toast.error(err.message || 'Failed'),
  });

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-500" />
            Send to AV Hospital
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-muted/40 border">
            <p className="font-semibold">{asset.name}</p>
            {asset.barcode && <p className="text-xs text-muted-foreground font-mono">{asset.barcode}</p>}
            {show && <p className="text-xs text-muted-foreground mt-0.5">From: {show.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Textarea
              placeholder="Describe the issue..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
          >
            <Wrench className="w-4 h-4 mr-2" />
            {submitMutation.isPending ? 'Sending...' : 'Send to Hospital'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}