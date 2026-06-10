import React, { useState } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WIDGET_REGISTRY, WIDGET_CATEGORIES, getWidgetsByCategory } from '@/lib/dashboardWidgetRegistry';
import { cn } from '@/lib/utils';

export default function WidgetLibrary({ currentLayout, onAddWidget, onClose, userRole }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const currentWidgetIds = new Set(currentLayout.map(item => item.i));
  const availableWidgets = Object.values(WIDGET_REGISTRY).filter(
    w => !currentWidgetIds.has(w.id) && w.roles.includes(userRole)
  );

  const filteredWidgets = availableWidgets.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         w.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || w.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const widgetsByCategory = getWidgetsByCategory(userRole);
  const availableCategories = WIDGET_CATEGORIES.filter(
    cat => !currentWidgetIds.has(...(widgetsByCategory[cat] || []).map(w => w.id))
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full h-[90vh] bg-background border-t border-border flex flex-col rounded-t-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold">Add Widget</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="px-6 py-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search widgets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={!selectedCategory ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {WIDGET_CATEGORIES.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Widget Grid */}
        <div className="flex-1 overflow-auto p-6">
          {filteredWidgets.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No widgets available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWidgets.map(widget => (
                <div
                  key={widget.id}
                  className="group p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                  onClick={() => onAddWidget(widget.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {widget.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">{widget.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">{widget.category}</p>
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}