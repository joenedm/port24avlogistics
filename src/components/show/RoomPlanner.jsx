import React, { useState } from 'react';
import { Plus, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RoomCard from './RoomCard';
import { nanoid } from '@/lib/nanoid';

export default function RoomPlanner({ 
  showId,
  showName,
  show,                // full Show record — forwarded to RoomCard for conflict checking
  subLocations = [], 
  onUpdateRooms,
}) {
  const queryClient = useQueryClient();
  const [expandedRooms, setExpandedRooms] = useState(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', type: 'room' });

  // Fetch subrents for this show so they appear inline in room cards
  const { data: subrents = [] } = useQuery({
    queryKey: ['roundtable_subrents', showId],
    queryFn: () => base44.entities.RoundtableSubrent.filter({ show_id: showId }, '-created_date'),
    enabled: !!showId,
  });

  const handleAddRoom = () => {
    if (!newRoom.name.trim()) return;
    const updated = [...subLocations, { id: nanoid(), name: newRoom.name, type: newRoom.type }];
    onUpdateRooms(updated);
    setShowAddDialog(false);
    setNewRoom({ name: '', type: 'room' });
  };

  const handleRenameRoom = (roomId, newName) => {
    const updated = subLocations.map(r => r.id === roomId ? { ...r, name: newName } : r);
    onUpdateRooms(updated);
  };

  const handleDeleteRoom = async (roomId) => {
    // 1. Remove room from show's sub_locations
    const updated = subLocations.filter(r => r.id !== roomId);
    onUpdateRooms(updated);
    setExpandedRooms(prev => { const next = new Set(prev); next.delete(roomId); return next; });

    // 2. Delete all ShowRequirements that belonged to this room so the quote doesn't show stale items
    const reqs = await base44.entities.ShowRequirement.filter({ show_id: showId, room_id: roomId });
    await Promise.all(reqs.map(r => base44.entities.ShowRequirement.delete(r.id)));

    // 3. Invalidate all requirement + quote caches so everything re-syncs immediately
    queryClient.invalidateQueries({ queryKey: ['showRequirements', showId] });
    queryClient.invalidateQueries({ queryKey: ['show_requirements_detail', showId] });
    queryClient.invalidateQueries({ queryKey: ['show_requirements_all', showId] });
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
  };

  const handleToggleExpand = (roomId) => {
    setExpandedRooms(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId); else next.add(roomId);
      return next;
    });
  };

  const getSubrentsForRoom = (roomId) => subrents.filter(s => s.room_id === roomId);
  const unassignedSubrents = subrents.filter(s => !s.room_id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Room Planning</h2>
          <p className="text-sm text-muted-foreground">Define required gear by room — actual serial assignment happens during scan/pick</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Room
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Plan the <strong className="text-foreground">products and quantities</strong> needed per room.
          Specific serial numbers are assigned during the <strong className="text-foreground">Scan / Pick</strong> workflow.
        </p>
      </div>

      {/* Rooms List */}
      {subLocations.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No rooms yet. Create your first room to get started.</p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create First Room
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {subLocations.map(room => (
            <RoomCard
              key={room.id}
              room={room}
              showId={showId}
              showName={showName}
              show={show}
              subrents={getSubrentsForRoom(room.id)}
              onRenameRoom={handleRenameRoom}
              onDeleteRoom={handleDeleteRoom}
              isExpanded={expandedRooms.has(room.id)}
              onToggleExpand={handleToggleExpand}
            />
          ))}

          {/* Unassigned subrents section */}
          {unassignedSubrents.length > 0 && (
            <div className="border border-dashed border-amber-500/30 rounded-lg p-4 bg-amber-500/5">
              <p className="text-sm font-medium text-amber-500 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Unassigned Subrented Items ({unassignedSubrents.length})
              </p>
              <div className="space-y-2">
                {unassignedSubrents.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 bg-amber-500/10 rounded text-sm">
                    <span className="flex-1 font-medium">{s.item_name}</span>
                    {s.partner_name && <span className="text-xs text-muted-foreground">{s.partner_name}</span>}
                    <span className="text-xs text-amber-600">×{s.quantity || 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Room Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Room or Space</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Room Type</Label>
              <Select value={newRoom.type} onValueChange={v => setNewRoom({ ...newRoom, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">Room</SelectItem>
                  <SelectItem value="area">General Session / Area</SelectItem>
                  <SelectItem value="stage">Stage</SelectItem>
                  <SelectItem value="truck">Truck / Case</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Room Name</Label>
              <Input
                placeholder="e.g., Ballroom A, GS, Breakout Room 1"
                value={newRoom.name}
                onChange={e => setNewRoom({ ...newRoom, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleAddRoom()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddRoom} disabled={!newRoom.name.trim()}>Add Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}