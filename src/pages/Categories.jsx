import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Folder, FolderOpen, ChevronRight, Package, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import CategoryTree, { buildTree, getDescendantIds } from '@/components/categories/CategoryTree';
import CategoryDialog from '@/components/categories/CategoryDialog';

export default function Categories() {
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [newCatParentId, setNewCatParentId] = useState(null);
  const [selectedId, setSelectedId] = useState('__all');
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => db.entities.Category.list() });
  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => db.entities.Asset.list('-created_date', 5000) });
  const { data: movements = [] } = useQuery({ queryKey: ['movements'], queryFn: () => db.entities.AssetMovement.list('-created_date', 1000) });

  const saveMutation = useMutation({
    mutationFn: (data) => editingCat
      ? db.entities.Category.update(editingCat.id, data)
      : db.entities.Category.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); setCatDialogOpen(false); setEditingCat(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Category.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const openAdd = (parentId) => { setEditingCat(null); setNewCatParentId(parentId); setCatDialogOpen(true); };
  const openEdit = (cat) => { setEditingCat(cat); setNewCatParentId(cat.parent_id); setCatDialogOpen(true); };

  // Build category stats
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = { ...c, children: [] }; });
  categories.forEach(c => { if (c.parent_id && catMap[c.parent_id]) catMap[c.parent_id].children.push(catMap[c.id]); });

  const getCatStats = (cat) => {
    const node = catMap[cat.id];
    if (!node) return { assetCount: 0, revenue: 0, utilization: 0 };
    const ids = getDescendantIds(node);
    const names = ids.map(id => categories.find(c => c.id === id)?.name).filter(Boolean);
    const catAssets = assets.filter(a => names.includes(a.category));
    const rentals = movements.filter(m => m.action === 'check_out' && catAssets.some(a => a.id === m.asset_id));
    const revenue = catAssets.reduce((s, a) => s + (a.daily_rate || 0) * rentals.filter(r => r.asset_id === a.id).length, 0);
    const outCount = catAssets.filter(a => a.status === 'checked_out').length;
    const utilization = catAssets.length ? Math.round((outCount / catAssets.length) * 100) : 0;
    return { assetCount: catAssets.length, revenue, utilization };
  };

  const tree = buildTree(categories);

  const renderTree = (nodes, depth = 0) => nodes.map(node => {
    const stats = getCatStats(node);
    return (
      <div key={node.id}>
        <div className={cn("flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/40 group transition-colors border-b last:border-0", selectedId === node.id && "bg-primary/5")}
          style={{ paddingLeft: `${12 + depth * 20}px` }}>
          <div className="w-4 h-4 shrink-0">
            {node.children?.length > 0 ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-amber-400" />}
          </div>
          {node.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: node.color }} />}
          <span className="font-medium flex-1">{node.name}</span>
          <span className="text-sm text-muted-foreground w-16 text-right">{stats.assetCount} items</span>
          <span className="text-sm text-muted-foreground w-20 text-right hidden md:block">{stats.utilization}% util</span>
          <span className="text-sm text-muted-foreground w-20 text-right hidden lg:block">{stats.revenue > 0 ? `$${stats.revenue.toLocaleString()}` : '—'}</span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAdd(node.id)} title="Add subcategory"><Plus className="w-3 h-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(node)} title="Edit"><span className="text-xs">✎</span></Button>
          </div>
        </div>
        {node.children?.length > 0 && renderTree(node.children, depth + 1)}
      </div>
    );
  });

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Folder-style equipment organization"
        actions={
          <div className="flex gap-2">
            <Link to="/assets"><Button variant="outline">View Equipment</Button></Link>
            <Button onClick={() => openAdd(null)}><Plus className="w-4 h-4 mr-2" /> Add Category</Button>
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Categories</p>
          <p className="text-2xl font-bold">{categories.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Items</p>
          <p className="text-2xl font-bold">{assets.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Uncategorized</p>
          <p className="text-2xl font-bold text-amber-600">{assets.filter(a => !a.category).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Currently Out</p>
          <p className="text-2xl font-bold">{assets.filter(a => a.status === 'checked_out').length}</p>
        </Card>
      </div>

      {categories.length === 0 ? (
        <Card className="p-12 text-center">
          <Folder className="w-12 h-12 mx-auto text-amber-400/50 mb-3" />
          <p className="font-semibold mb-1">No categories yet</p>
          <p className="text-muted-foreground text-sm mb-4">Create categories to organize your equipment like folders</p>
          <Button onClick={() => openAdd(null)}><Plus className="w-4 h-4 mr-2" /> Create First Category</Button>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
            <span className="text-sm font-semibold">Category</span>
            <div className="flex gap-0">
              <span className="text-xs text-muted-foreground w-16 text-right">Items</span>
              <span className="text-xs text-muted-foreground w-20 text-right hidden md:block">Util.</span>
              <span className="text-xs text-muted-foreground w-20 text-right hidden lg:block">Revenue</span>
              <span className="w-16" />
            </div>
          </div>
          <div>
            {renderTree(tree)}
          </div>
        </Card>
      )}

      <CategoryDialog
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        category={editingCat}
        parentId={newCatParentId}
        categories={categories}
        onSave={(data) => saveMutation.mutate(data)}
      />
    </div>
  );
}