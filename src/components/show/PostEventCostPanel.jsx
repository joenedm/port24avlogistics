import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import AdjustmentDialog from './AdjustmentDialog';

const CATEGORIES = ['crew_hours', 'crew_addition', 'overtime', 'meal_penalties', 'rush_charges', 'purchased_items', 'expendables', 'rentals', 'miscellaneous'];

export default function PostEventCostPanel({ showId, show }) {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    cost_name: '',
    category: 'miscellaneous',
    quantity: 1,
    unit_cost: '',
    unit_sell_price: '',
    is_billable: true,
    notes: '',
  });

  const { data: postEventCosts = [] } = useQuery({
    queryKey: ['postEventCosts', showId],
    queryFn: () => db.entities.PostEventCost.filter({ show_id: showId })
  });

  const createCostMutation = useMutation({
    mutationFn: async (data) => {
      const quantity = parseInt(data.quantity) || 1;
      const unitCost = parseFloat(data.unit_cost) || 0;
      const unitSellPrice = parseFloat(data.unit_sell_price) || unitCost;
      const user = await db.auth.me();
      return db.entities.PostEventCost.create({
        ...data,
        show_id: showId,
        show_name: show?.name,
        quantity,
        unit_cost: unitCost,
        unit_sell_price: unitSellPrice,
        total_internal_cost: unitCost * quantity,
        total_billable_cost: unitSellPrice * quantity,
        date_added: new Date().toISOString(),
        added_by: user.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postEventCosts', showId] });
      resetForm();
      setOpenDialog(false);
    }
  });

  const deleteCostMutation = useMutation({
    mutationFn: (id) => db.entities.PostEventCost.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['postEventCosts', showId] })
  });

  const toggleBillableMutation = useMutation({
    mutationFn: ({ id, is_billable }) => db.entities.PostEventCost.update(id, { is_billable }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['postEventCosts', showId] })
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    createCostMutation.mutate(formData);
  };

  const resetForm = () => {
    setFormData({
      cost_name: '',
      category: 'miscellaneous',
      quantity: 1,
      unit_cost: '',
      unit_sell_price: '',
      is_billable: true,
      notes: '',
    });
  };

  const billableCosts = postEventCosts.filter(c => c.is_billable);
  const totalInternal = postEventCosts.reduce((sum, c) => sum + (c.total_internal_cost || 0), 0);
  const totalBillable = billableCosts.reduce((sum, c) => sum + (c.total_billable_cost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Post-Event Costs</h3>
        <div className="flex gap-2">
          <AdjustmentDialog showId={showId} show={show} />
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-1" /> Add Cost
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Post-Event Cost</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Cost name"
                value={formData.cost_name}
                onChange={(e) => setFormData({ ...formData, cost_name: e.target.value })}
                required
              />

              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Qty"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                  placeholder="Unit Cost"
                  required
                />
              </div>

              <Input
                type="number"
                step="0.01"
                value={formData.unit_sell_price}
                onChange={(e) => setFormData({ ...formData, unit_sell_price: e.target.value })}
                placeholder="Sell Price (optional)"
              />

              <Input
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
                <Button type="submit">Add Cost</Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {postEventCosts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No post-event costs added</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Internal Total</p>
              <p className="text-2xl font-bold">${totalInternal.toFixed(2)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Billable Total</p>
              <p className="text-2xl font-bold">${totalBillable.toFixed(2)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="text-2xl font-bold">{postEventCosts.length}</p>
            </Card>
          </div>

          <div className="space-y-2">
            {postEventCosts.map(cost => (
              <Card key={cost.id} className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleBillableMutation.mutate({ id: cost.id, is_billable: !cost.is_billable })}
                      >
                        {cost.is_billable ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                      <p className="font-semibold">{cost.cost_name}</p>
                    </div>
                    <div className="flex gap-2 mt-1 flex-wrap ml-8">
                      <Badge variant="outline" className="text-xs">{cost.category.replace(/_/g, ' ')}</Badge>
                      <Badge variant="outline" className="text-xs">x{cost.quantity}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 ml-8">
                      ${parseFloat(cost.unit_cost || 0).toFixed(2)} → ${parseFloat(cost.unit_sell_price || 0).toFixed(2)} = ${parseFloat(cost.total_billable_cost || 0).toFixed(2)}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteCostMutation.mutate(cost.id)}>
                    ×
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}