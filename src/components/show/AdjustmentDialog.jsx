import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

const ADJUSTMENT_TYPES = {
  crew: { label: 'Crew', feeTypes: ['overtime', 'bonus', 'travel', 'accommodation', 'other'] },
  equipment: { label: 'Equipment', feeTypes: ['upgrade', 'additional_fee', 'discount', 'other'] },
  other: { label: 'Other', feeTypes: ['misc_charge', 'misc_discount'] }
};

export default function AdjustmentDialog({ showId, show }) {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [feeType, setFeeType] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const { data: projectCrew = [] } = useQuery({
    queryKey: ['projectCrew', showId],
    queryFn: () => db.entities.ProjectCrew.filter({ show_id: showId })
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', showId],
    queryFn: async () => {
      const show = await db.entities.Show.read(showId);
      if (!show?.sub_locations) return [];
      const allAssets = await db.entities.Asset.list();
      return allAssets.filter(a => a.current_show_id === showId);
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => db.entities.User.list()
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: async (data) => {
      return db.entities.PostEventCost.create({
        show_id: showId,
        show_name: show?.name,
        cost_name: `${data.adjustmentType.charAt(0).toUpperCase() + data.adjustmentType.slice(1)} Adjustment: ${description}`,
        category: data.adjustmentType === 'crew' ? 'crew_addition' : 'miscellaneous',
        quantity: 1,
        unit_cost: Math.abs(parseFloat(data.amount)) || 0,
        unit_sell_price: Math.abs(parseFloat(data.amount)) || 0,
        total_internal_cost: Math.abs(parseFloat(data.amount)) || 0,
        total_billable_cost: parseFloat(data.amount) || 0,
        is_billable: true,
        notes: `${data.feeType} - ${data.adjustmentType === 'crew' ? users.find(u => u.id === data.selectedItem)?.full_name : assets.find(a => a.id === data.selectedItem)?.name} | Original amount: $${Math.abs(parseFloat(data.amount)).toFixed(2)}`,
        date_added: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postEventCosts', showId] });
      resetForm();
      setOpenDialog(false);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adjustmentType || !selectedItem || !feeType || !amount || !description) {
      alert('Please fill in all fields');
      return;
    }
    createAdjustmentMutation.mutate({
      adjustmentType,
      selectedItem,
      feeType,
      amount,
      description
    });
  };

  const resetForm = () => {
    setAdjustmentType('');
    setSelectedItem('');
    setFeeType('');
    setAmount('');
    setDescription('');
  };

  const currentFeeTypes = adjustmentType ? ADJUSTMENT_TYPES[adjustmentType]?.feeTypes : [];

  return (
    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" onClick={() => resetForm()}>
          <Plus className="w-4 h-4 mr-1" /> Add Adjustment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Quote Adjustment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select value={adjustmentType} onValueChange={setAdjustmentType}>
            <SelectTrigger><SelectValue placeholder="Select adjustment type" /></SelectTrigger>
            <SelectContent>
              {Object.entries(ADJUSTMENT_TYPES).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {adjustmentType === 'crew' && (
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger><SelectValue placeholder="Select crew member" /></SelectTrigger>
              <SelectContent>
                {projectCrew.map(crew => {
                  const user = users.find(u => u.id === crew.crew_member_name);
                  return (
                    <SelectItem key={crew.id} value={crew.crew_member_name}>
                      {user?.full_name || crew.crew_member_name} - {crew.role}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {adjustmentType === 'equipment' && (
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
              <SelectContent>
                {assets.map(asset => (
                  <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {adjustmentType && (
            <Select value={feeType} onValueChange={setFeeType}>
              <SelectTrigger><SelectValue placeholder="Select fee type" /></SelectTrigger>
              <SelectContent>
                {currentFeeTypes.map(type => (
                  <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (positive = charge, negative = credit)"
            required
          />

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit">Add Adjustment</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}