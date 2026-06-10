import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Shared category dropdown — fetches from the Category entity and renders
 * a <Select> that stores the category NAME (not ID) as the value, matching
 * the pattern used in Step2ProductDetails / AssetFormDialog.
 */
export default function CategorySelect({ value, onChange, placeholder = 'Select category' }) {
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => db.entities.Category.list(),
  });

  return (
    <Select value={value || '__none'} onValueChange={v => onChange(v === '__none' ? '' : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">— None —</SelectItem>
        {categories.map(c => (
          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}