import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Build nested tree from flat list
export function buildTree(categories) {
  const map = {};
  const roots = [];
  categories.forEach(c => { map[c.id] = { ...c, children: [] }; });
  categories.forEach(c => {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  });
  const sort = arr => arr.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const sortDeep = nodes => { sort(nodes); nodes.forEach(n => sortDeep(n.children)); return nodes; };
  return sortDeep(roots);
}

// Get all category ids under a node (inclusive)
export function getDescendantIds(node) {
  const ids = [node.id];
  (node.children || []).forEach(c => ids.push(...getDescendantIds(c)));
  return ids;
}

function CategoryNode({ node, selectedId, onSelect, onAdd, onEdit, onDelete, assetCounts, depth = 0 }) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.children?.length > 0;
  const isSelected = selectedId === node.id;
  const count = assetCounts[node.id] || 0;

  const colorDot = node.color
    ? <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: node.color }} />
    : null;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer group select-none transition-colors",
          isSelected ? "bg-primary/15 text-primary" : "hover:bg-muted/60"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(node.id)}
      >
        <button
          className="w-4 h-4 flex items-center justify-center shrink-0 text-muted-foreground"
          onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        >
          {hasChildren
            ? open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
            : <span className="w-3" />}
        </button>
        {colorDot}
        {open && hasChildren
          ? <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          : <Folder className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
        <span className="text-sm flex-1 truncate font-medium">{node.name}</span>
        <span className="text-xs text-muted-foreground shrink-0">{count > 0 ? count : ''}</span>
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => onAdd(node.id)} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Add subcategory">
            <Plus className="w-3 h-3" />
          </button>
          <button onClick={() => onEdit(node)} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Rename">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={() => onDelete(node.id)} className="p-0.5 rounded hover:bg-muted text-red-500 hover:text-red-600" title="Delete">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {open && hasChildren && (
        <div>
          {node.children.map(child => (
            <CategoryNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              assetCounts={assetCounts}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryTree({ categories, selectedId, onSelect, onAdd, onEdit, onDelete, assets = [] }) {
  const tree = buildTree(categories);

  // Count assets per category (including descendants)
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = { ...c, children: [] }; });
  categories.forEach(c => { if (c.parent_id && catMap[c.parent_id]) catMap[c.parent_id].children.push(catMap[c.id]); });

  const assetCounts = {};
  categories.forEach(cat => {
    const node = catMap[cat.id];
    if (node) {
      const ids = getDescendantIds(node);
      const names = ids.map(id => categories.find(c => c.id === id)?.name).filter(Boolean);
      assetCounts[cat.id] = assets.filter(a => names.includes(a.category)).length;
    }
  });

  const totalAssets = assets.length;

  return (
    <div className="select-none">
      {/* All items */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors mb-1",
          selectedId === '__all' ? "bg-primary/15 text-primary" : "hover:bg-muted/60"
        )}
        onClick={() => onSelect('__all')}
      >
        <Folder className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-sm font-semibold flex-1">All Equipment</span>
        <span className="text-xs text-muted-foreground">{totalAssets}</span>
      </div>

      {/* Uncategorized */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors mb-2",
          selectedId === '__none' ? "bg-primary/15 text-primary" : "hover:bg-muted/60"
        )}
        onClick={() => onSelect('__none')}
      >
        <Folder className="w-3.5 h-3.5 text-muted-foreground/50" />
        <span className="text-sm text-muted-foreground flex-1">Uncategorized</span>
        <span className="text-xs text-muted-foreground">{assets.filter(a => !a.category).length}</span>
      </div>

      <div className="border-t pt-2 mb-1">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</span>
          <button onClick={() => onAdd(null)} className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted" title="Add root category">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {tree.map(node => (
          <CategoryNode
            key={node.id}
            node={node}
            selectedId={selectedId}
            onSelect={onSelect}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            assetCounts={assetCounts}
          />
        ))}
      </div>
    </div>
  );
}