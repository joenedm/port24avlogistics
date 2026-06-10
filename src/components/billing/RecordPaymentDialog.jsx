import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/api/db';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DollarSign, Plus } from 'lucide-react';

export default function RecordPaymentDialog({ invoice, trigger }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'check',
    reference_number: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  const handleRecordPayment = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await db.functions.invoke('recordInvoicePayment', {
        invoice_id: invoice.id,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        source_provider: 'manual',
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined
      });

      if (response.data.success) {
        toast.success(`Payment recorded: $${formData.amount}`);
        queryClient.invalidateQueries({ queryKey: ['invoices-billing'] });
        queryClient.invalidateQueries({ queryKey: ['payments-all'] });
        setOpen(false);
        setFormData({
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'check',
          reference_number: '',
          notes: ''
        });
      } else {
        toast.error(response.data.error || 'Failed to record payment');
      }
    } catch (error) {
      toast.error('Error recording payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const remainingBalance = (invoice.amount_due || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Record Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invoice Summary */}
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <div className="text-sm font-medium">{invoice.invoice_number}</div>
            <div className="text-xs text-muted-foreground">{invoice.client}</div>
            <div className="text-xs mt-2">
              <div className="flex justify-between">
                <span>Balance Due:</span>
                <span className="font-semibold text-red-600">${remainingBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount" className="text-xs">Payment Amount *</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="pl-7"
              />
            </div>
            {formData.amount && (
              <p className="text-xs text-muted-foreground mt-1">
                {parseFloat(formData.amount) > remainingBalance
                  ? `Overpayment: $${(parseFloat(formData.amount) - remainingBalance).toFixed(2)}`
                  : `Remaining after: $${(remainingBalance - parseFloat(formData.amount)).toFixed(2)}`}
              </p>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <Label htmlFor="date" className="text-xs">Payment Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Payment Method */}
          <div>
            <Label htmlFor="method" className="text-xs">Payment Method *</Label>
            <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="ach">ACH Transfer</SelectItem>
                <SelectItem value="wire">Wire Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="external_card">External Card</SelectItem>
                <SelectItem value="credit_comp">Credit/Comp</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <div>
            <Label htmlFor="ref" className="text-xs">Reference Number</Label>
            <Input
              id="ref"
              placeholder={formData.payment_method === 'check' ? 'Check #' : 'e.g. confirmation #'}
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-xs">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Internal notes about this payment..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 h-20"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={loading || !formData.amount}>
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}