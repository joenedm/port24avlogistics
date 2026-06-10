import React, { useState, useMemo } from 'react';
import { Search, X, Plus, Cloud, Box, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

const scoreMatch = (str, query) => {
  if (!str || !query) return 0;
  const lower = str.toLowerCase();
  const q = query.toLowerCase();

  if (lower === q) return 1000;
  if (lower.startsWith(q)) return 500;
  if (lower.includes(q)) return 250;

  // Token-level match: any word in the name starts with or contains any query token
  const nameTokens = lower.split(/[\s\-_/]+/);
  const queryTokens = q.split(/[\s\-_/]+/);
  let tokenScore = 0;
  queryTokens.forEach(qt => {
    nameTokens.forEach(nt => {
      if (nt === qt) tokenScore += 80;
      else if (nt.startsWith(qt)) tokenScore += 50;
      else if (nt.includes(qt)) tokenScore += 25;
    });
  });
  if (tokenScore > 0) return tokenScore;

  // Fuzzy character sequence
  let j = 0;
  let fuzzy = 0;
  for (let i = 0; i < lower.length && j < q.length; i++) {
    if (lower[i] === q[j]) { fuzzy += 5; j++; }
  }
  return j === q.length ? fuzzy : 0;
};

export default function InventoryPanel({ assets, kits = [], categories, onClose, onAddEquipment, selectedRoom, showId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [quantities, setQuantities] = useState({});
  const [expandedKits, setExpandedKits] = useState({});

  // Filter out items in AV Hospital or not available
  const availableAssets = assets.filter(a => 
    a.status !== 'maintenance' && 
    a.location !== 'AV Hospital' &&
    a.condition !== 'poor'
  );

  // Filter available kits
  const availableKits = kits.filter(k =>
    k.status !== 'maintenance' &&
    (!k.current_show_id || k.current_show_id === showId)
  );

  // Combine assets and kits for searching
  const combinedItems = [
    ...availableAssets.map(a => ({ ...a, type: 'asset' })),
    ...availableKits.map(k => ({ ...k, type: 'kit' }))
  ];

  const filtered = useMemo(() => {
    let results = combinedItems;

    // Apply category filter
    if (categoryFilter !== 'all') {
      results = results.filter(item => {
        if (item.type === 'kit') return categoryFilter === 'Kit';
        return item.category === categoryFilter;
      });
    }

    // If no search, return filtered results (show all — search narrows)
    if (!searchQuery.trim()) {
      return results;
    }

    // Score and sort results — broad first, narrows as query grows
    const scored = results.map(item => ({
      item,
      score: Math.max(
        scoreMatch(item.name, searchQuery),
        scoreMatch(item.barcode, searchQuery),
        scoreMatch(item.serial_number, searchQuery),
        scoreMatch(item.serial_numbers, searchQuery),
        scoreMatch(item.category, searchQuery)
      )
    }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.item);

    return scored;
  }, [searchQuery, categoryFilter, combinedItems]);

  const handleAddEquipment = (itemId, isKit = false) => {
    if (isKit) {
      // For kits, add the kit itself to the project
      onAddEquipment(itemId, 1);
    } else {
      const qty = parseInt(quantities[itemId] || 1);
      onAddEquipment(itemId, qty);
      // Reset quantity after adding
      setQuantities(prev => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });
    }
  };

  const toggleKitExpand = (kitId) => {
    setExpandedKits(prev => ({
      ...prev,
      [kitId]: !prev[kitId]
    }));
  };

  const getKitContents = (kitId) => {
    return availableAssets.filter(a => a.kit_id === kitId);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="w-96 bg-card border-r border-border flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Add Equipment</h3>
            <p className="text-xs text-muted-foreground mt-1">to {selectedRoom?.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="border-b border-border p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, category, barcode… (showing all)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Equipment List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {searchQuery || categoryFilter !== 'all' 
                    ? 'No equipment found matching your search'
                    : 'No equipment available'
                  }
                </p>
              </div>
            ) : (
              filtered.map(item => (
                <div key={item.id}>
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{item.name}</p>
                          {item.type === 'kit' && (
                            item.kit_type === 'cloud' ? (
                              <Cloud className="w-3 h-3 text-blue-400" />
                            ) : (
                              <Box className="w-3 h-3 text-amber-400" />
                            )
                          )}
                        </div>
                        <div className="flex gap-2 mt-1 flex-wrap text-xs">
                          {item.type === 'kit' && (
                            <Badge variant="outline" className="text-xs">
                              {item.kit_type === 'cloud' ? 'Cloud Kit' : 'Physical Kit'}
                            </Badge>
                          )}
                          {item.category && !item.type && (
                            <Badge variant="outline">{item.category}</Badge>
                          )}
                          {item.quantity && <Badge variant="secondary">Qty: {item.quantity}</Badge>}
                          {item.barcode && <Badge variant="outline" className="font-mono text-xs">{item.barcode}</Badge>}
                        </div>
                      </div>
                      {item.type === 'kit' && item.kit_type === 'cloud' && (
                        <button
                          onClick={() => toggleKitExpand(item.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors mt-1"
                        >
                          <ChevronDown 
                            className={`w-4 h-4 transition-transform ${expandedKits[item.id] ? 'rotate-180' : ''}`}
                          />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2 items-end">
                      {item.type === 'kit' ? (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAddEquipment(item.id, true)}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Kit
                        </Button>
                      ) : (
                        <>
                          <Input
                            type="number"
                            min="1"
                            max={item.quantity || 1}
                            value={quantities[item.id] || 1}
                            onChange={(e) => setQuantities(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="h-8 text-xs w-16"
                          />
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleAddEquipment(item.id)}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Cloud Kit Items */}
                  {item.type === 'kit' && item.kit_type === 'cloud' && expandedKits[item.id] && (
                    <div className="ml-4 mt-2 space-y-2 border-l-2 border-muted pl-2">
                      <p className="text-xs text-muted-foreground font-medium">Contents:</p>
                      {(() => {
                        const kitContents = getKitContents(item.id);
                        return kitContents.length > 0 ? (
                          <div className="space-y-1.5">
                            {kitContents.map(asset => (
                              <div key={asset.id} className="bg-muted/30 rounded p-2 text-xs space-y-1">
                                <div className="font-medium text-foreground">{asset.name}</div>
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={quantities[`cloud-${asset.id}`] || 1}
                                    onChange={(e) => setQuantities(prev => ({ ...prev, [`cloud-${asset.id}`]: e.target.value }))}
                                    className="h-7 text-xs w-12 flex-shrink-0"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-7 text-xs"
                                    onClick={() => {
                                      const qty = parseInt(quantities[`cloud-${asset.id}`] || 1);
                                      onAddEquipment(asset.id, qty);
                                      setQuantities(prev => {
                                        const updated = { ...prev };
                                        delete updated[`cloud-${asset.id}`];
                                        return updated;
                                      });
                                    }}
                                  >
                                    <Plus className="w-3 h-3 mr-0.5" /> Add
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground italic">No items in this kit</div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Overlay */}
      <div className="flex-1 bg-black/20" onClick={onClose} />
    </div>
  );
}