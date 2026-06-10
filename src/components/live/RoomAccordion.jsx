import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronDown, MapPin, Package, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function RoomAccordion({ locations, assets, onAssetMove }) {
  const [expandedRooms, setExpandedRooms] = useState(new Set());

  const toggleRoom = (roomId) => {
    setExpandedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) newSet.delete(roomId);
      else newSet.add(roomId);
      return newSet;
    });
  };

  const assetsByRoom = {};
  locations.forEach(loc => {
    assetsByRoom[loc.id] = { room: loc, assets: [] };
  });
  assetsByRoom['_unassigned'] = { room: { name: 'Unassigned', id: '_unassigned' }, assets: [] };

  assets.forEach(asset => {
    const roomId = asset.current_sub_location_id && assetsByRoom[asset.current_sub_location_id] ? asset.current_sub_location_id : '_unassigned';
    assetsByRoom[roomId].assets.push(asset);
  });

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const assetId = draggableId;
    const targetRoomId = destination.droppableId === '_unassigned' ? null : destination.droppableId;
    onAssetMove(assetId, targetRoomId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-2">
        {Object.entries(assetsByRoom).map(([roomId, { room, assets: roomAssets }]) => {
          const isExpanded = expandedRooms.has(roomId);
          const packedCount = roomAssets.filter(a => a.status === 'checked_out').length;

          return (
            <Card key={roomId} className="overflow-hidden">
              <button
                onClick={() => toggleRoom(roomId)}
                className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors"
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium flex-1 text-left">{room.name}</span>
                <Badge variant="outline" className="text-xs">{roomAssets.length} items</Badge>
                <span className={cn("text-xs font-semibold", packedCount === roomAssets.length ? 'text-emerald-600' : 'text-amber-600')}>
                  {packedCount}/{roomAssets.length}
                </span>
              </button>

              {isExpanded && roomAssets.length > 0 && (
                <CardContent className="pt-0 pb-3 px-4">
                  <Droppable droppableId={roomId}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn("space-y-1.5 p-2 rounded border-2 border-dashed", snapshot.isDraggingOver ? "border-primary bg-primary/5" : "border-transparent")}
                      >
                        {roomAssets.map((asset, idx) => (
                          <Draggable key={asset.id} draggableId={asset.id} index={idx}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing transition-colors", 
                                  snapshot.isDragging ? "bg-primary/10 shadow-md" : asset.status === 'checked_out' ? 'bg-emerald-500/5' : 'bg-amber-500/5',
                                  "border border-transparent hover:border-border"
                                )}
                              >
                                {asset.status === 'checked_out' ? 
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : 
                                  <Package className="w-4 h-4 text-amber-500 shrink-0" />
                                }
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{asset.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{asset.barcode}</p>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </DragDropContext>
  );
}