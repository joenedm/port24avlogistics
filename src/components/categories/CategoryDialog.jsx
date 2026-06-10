import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6b7280',
];

export default function CategoryDialog({ open, onOpenChange, category, parentId, categories, onSave }) {
  const [form, setForm] = useState({ name: '', parent_id: '', color: '', description: '' });

  useEffect(() => {
    if (category) {
      setForm({ name: category.name, parent_id: category.parent_id || '', color: category.color || '', description: category.description || '' });
    } else {
      setForm({ name: '', parent_id: parentId || '', color: '', description: '' });
    }
  }, [category, parentId, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, parent_id: form.parent_id || null });
  };

  // Flat list excluding the category being edited and its children (prevent circular)
  const eligibleParents = categories.filter(c => c.id !== category?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{category ? 'Edit Category' : 'Add Category'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Audio, Speakers" required />
          </div>
          <div>
            <Label>Parent Category (optional)</Label>
            <Select value={form.parent_id || '__root'} onValueChange={v => setForm(f => ({ ...f, parent_id: v === '__root' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Root level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__root">— Root level —</SelectItem>
                {eligibleParents.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap mt-1">
              {COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: form.color === c ? '#fff' : c, outline: form.color === c ? `2px solid ${c}` : 'none' }}
                />
              ))}
              <button type="button" onClick={() => setForm(f => ({ ...f, color: '' }))} className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/40 text-xs text-muted-foreground">✕</button>
            </div>
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{category ? 'Save' : 'Add Category'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}