import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Archive } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';

/**
 * Reusable Storage / Container section for Asset form dialogs.
 * formData keys used:
 *   home_container_id, home_container_name,
 *   current_container_id, current_container_name,
 *   permanent_container, can_move_to_show_container, storage_notes
 */
export default function AssetContainerSection({ formData, set }) {
  const { data: containers = [] } = useQuery({
    queryKey: ['containers'],
    queryFn: () => db.entities.Container.list('-created_date', 2000),
  });

  const available = containers.filter(c => c.status === 'available' || c.id === formData.home_container_id || c.id === formData.current_container_id);

  const setHomeContainer = (id) => {
    const c = containers.find(x => x.id === id);
    set('home_container_id', id === 'none' ? '' : id);
    set('home_container_name', c?.name || '');
  };

  const setCurrentContainer = (id) => {
    const c = containers.find(x => x.id === id);
    set('current_container_id', id === 'none' ? '' : id);
    set('current_container_name', c?.name || '');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Archive className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">Storage / Container</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label>Normal Home Container
            <span className="text-xs text-muted-foreground font-normal ml-1">(where it usually lives)</span>
          </Label>
          <Select value={formData.home_container_id || 'none'} onValueChange={setHomeContainer}>
            <SelectTrigger><SelectValue placeholder="Select container…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— No container —</SelectItem>
              {containers.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {c.home_location ? `(${c.home_location})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Current Show Container
            <span className="text-xs text-muted-foreground font-normal ml-1">(packed for current project)</span>
          </Label>
          <Select value={formData.current_container_id || 'none'} onValueChange={setCurrentContainer}>
            <SelectTrigger><SelectValue placeholder="Same as home / none" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Same as home / none —</SelectItem>
              {containers.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Permanent Container</p>
            <p className="text-xs text-muted-foreground">Always lives in this specific container</p>
          </div>
          <Switch checked={!!formData.permanent_container} onCheckedChange={v => set('permanent_container', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Can Move to Show Container</p>
            <p className="text-xs text-muted-foreground">Allow packing into a temporary show-specific container</p>
          </div>
          <Switch checked={formData.can_move_to_show_container !== false} onCheckedChange={v => set('can_move_to_show_container', v)} />
        </div>
      </div>

      <div>
        <Label>Storage Notes</Label>
        <Textarea value={formData.storage_notes || ''} onChange={e => set('storage_notes', e.target.value)}
          rows={2} placeholder="Packing notes, special handling, position in container…" />
      </div>
    </div>
  );
}