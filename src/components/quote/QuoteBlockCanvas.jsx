/**
 * Drag-and-drop canvas for the visual quote builder.
 * Renders blocks inside paginated A4 sheets — auto page-breaks when content overflows.
 * Header/footer blocks are pinned to top/bottom of EVERY page.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, Copy, Settings2 } from 'lucide-react';
import QuoteBlockPreview from './QuoteBlockPreview';
import { cn } from '@/lib/utils';

const PAGE_WIDTH_PX = 794;    // A4 width @ 96dpi
const PAGE_HEIGHT_PX = 1050;  // usable content height per page

function paginateBlocks(contentBlocks, heightMap, reservedHeight) {
  const usable = PAGE_HEIGHT_PX - reservedHeight;
  const pages = [];
  let currentPage = [];
  let currentHeight = 0;

  for (const block of contentBlocks) {
    if (block.type === 'page_break') {
      if (currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }
      continue;
    }

    const blockH = heightMap[block.id] ?? 80;

    if (currentHeight + blockH > usable && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [block];
      currentHeight = blockH;
    } else {
      currentPage.push(block);
      currentHeight += blockH;
    }
  }

  if (currentPage.length > 0) pages.push(currentPage);
  if (pages.length === 0) pages.push([]);

  return pages;
}

function BlockWrapper({ block, selectedId, onSelect, dragProvided, dragSnapshot, onDuplicate, onRemove, children }) {
  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      onClick={() => onSelect(block.id === selectedId ? null : block.id)}
      className={cn(
        'relative group transition-all cursor-pointer mb-3',
        dragSnapshot.isDragging && 'shadow-2xl ring-2 ring-blue-500 rotate-1 z-50',
        selectedId === block.id
          ? 'ring-2 ring-inset ring-blue-500'
          : 'hover:ring-2 hover:ring-inset hover:ring-blue-200'
      )}
    >
      {/* Drag handle */}
      <div
        {...dragProvided.dragHandleProps}
        className={cn(
          'absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-20 bg-white/80 shadow',
          selectedId === block.id && 'opacity-100'
        )}
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Block actions */}
      <div className={cn(
        'absolute top-1 right-2 flex items-center gap-1 bg-white border border-border rounded-full shadow-md px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20',
        selectedId === block.id && 'opacity-100'
      )}>
        <button
          onClick={e => { e.stopPropagation(); onSelect(block.id === selectedId ? null : block.id); }}
          className="p-1 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
          title="Settings"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={e => onDuplicate(e, block)}
          className="p-1 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
          title="Duplicate"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={e => onRemove(e, block.id)}
          className="p-1 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Selected left-bar indicator */}
      {selectedId === block.id && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 z-10" />
      )}

      {children}
    </div>
  );
}

/** A non-draggable pinned block (header/footer repeated on every page) */
function PinnedBlock({ block, selectedId, onSelect, brand }) {
  return (
    <div
      onClick={() => onSelect(block.id === selectedId ? null : block.id)}
      className={cn(
        'relative group cursor-pointer transition-all',
        selectedId === block.id
          ? 'ring-2 ring-inset ring-blue-500'
          : 'hover:ring-2 hover:ring-inset hover:ring-blue-200'
      )}
    >
      {selectedId === block.id && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 z-10" />
      )}
      <QuoteBlockPreview block={block} brand={brand} />
    </div>
  );
}

export default function QuoteBlockCanvas({ blocks, selectedId, onSelect, onChange, brand }) {
  const [heightMap, setHeightMap] = useState({});
  const observersRef = useRef({});

  const measureRef = useCallback((id, node) => {
    if (!node) {
      if (observersRef.current[id]) {
        observersRef.current[id].disconnect();
        delete observersRef.current[id];
      }
      return;
    }
    if (observersRef.current[id]) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        setHeightMap(prev => prev[id] === h ? prev : { ...prev, [id]: h });
      }
    });
    ro.observe(node);
    observersRef.current[id] = ro;
  }, []);

  useEffect(() => {
    const blockIds = new Set(blocks.map(b => b.id));
    for (const id of Object.keys(observersRef.current)) {
      if (!blockIds.has(id)) {
        observersRef.current[id].disconnect();
        delete observersRef.current[id];
        setHeightMap(prev => { const n = { ...prev }; delete n[id]; return n; });
      }
    }
  }, [blocks]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(blocks);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    onChange(reordered);
  };

  const duplicate = (e, block) => {
    e.stopPropagation();
    const idx = blocks.findIndex(b => b.id === block.id);
    const newBlock = { ...block, id: `${block.type}_${Date.now()}` };
    const next = [...blocks];
    next.splice(idx + 1, 0, newBlock);
    onChange(next);
  };

  const remove = (e, id) => {
    e.stopPropagation();
    onChange(blocks.filter(b => b.id !== id));
    if (selectedId === id) onSelect(null);
  };

  // Separate header, footer, and content blocks
  const headerBlock = blocks.find(b => b.type === 'header');
  const footerBlock = blocks.find(b => b.type === 'footer');
  const contentBlocks = blocks.filter(b => b.type !== 'header' && b.type !== 'footer');

  const headerH = headerBlock ? (heightMap[headerBlock.id] ?? 100) : 0;
  const footerH = footerBlock ? (heightMap[footerBlock.id] ?? 60) : 0;
  const reservedHeight = headerH + footerH + 24; // 24px padding buffer

  const pages = paginateBlocks(contentBlocks, heightMap, reservedHeight);

  if (blocks.length === 0) {
    return (
      <div className="flex items-center justify-center text-center p-20" style={{ width: PAGE_WIDTH_PX, minHeight: PAGE_HEIGHT_PX, background: 'white' }}>
        <div>
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <GripVertical className="w-8 h-8 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-400">Your document is empty</p>
          <p className="text-sm text-gray-300 mt-1">Add blocks from the left panel to get started</p>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="quote-canvas">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn('space-y-1', snapshot.isDraggingOver && 'bg-blue-50/10')}
          >
            {/* Hidden measurement layer */}
            <div style={{ position: 'fixed', top: -9999, left: -9999, visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
              {blocks.filter(b => b.type !== 'page_break').map(block => (
                <div key={`measure-${block.id}`} ref={node => measureRef(block.id, node)} style={{ width: PAGE_WIDTH_PX }}>
                  <QuoteBlockPreview block={block} brand={brand} />
                </div>
              ))}
            </div>

            {/* Paginated pages */}
            {pages.map((pageBlocks, pageIdx) => (
              <div key={pageIdx}>
                {/* Page sheet */}
                <div
                  className="relative bg-white shadow-2xl rounded-sm overflow-hidden"
                  style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX }}
                >
                  {/* Page number */}
                  <div className="absolute top-2 right-3 text-[10px] text-gray-300 font-mono select-none z-10">
                    Page {pageIdx + 1}
                  </div>

                  {/* HEADER — absolutely pinned to top */}
                  {headerBlock && (
                    <div className="absolute top-0 left-0 right-0 z-10">
                      <PinnedBlock
                        block={headerBlock}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        brand={brand}
                      />
                    </div>
                  )}

                  {/* FOOTER — absolutely pinned to bottom */}
                  {footerBlock && (
                    <div className="absolute bottom-0 left-0 right-0 z-10">
                      <PinnedBlock
                        block={footerBlock}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        brand={brand}
                      />
                    </div>
                  )}

                  {/* CONTENT — sits between header and footer */}
                  <div
                    className="absolute left-0 right-0 overflow-hidden px-8 pt-4 pb-4"
                    style={{ top: headerH, bottom: footerH }}
                  >
                    {pageBlocks.map((block) => {
                      const globalIndex = blocks.findIndex(b => b.id === block.id);
                      return (
                        <Draggable key={block.id} draggableId={block.id} index={globalIndex}>
                          {(dragProvided, dragSnapshot) => (
                            <BlockWrapper
                              block={block}
                              selectedId={selectedId}
                              onSelect={onSelect}
                              dragProvided={dragProvided}
                              dragSnapshot={dragSnapshot}
                              onDuplicate={duplicate}
                              onRemove={remove}
                            >
                              <QuoteBlockPreview block={block} brand={brand} />
                            </BlockWrapper>
                          )}
                        </Draggable>
                      );
                    })}
                  </div>
                </div>

                {/* Page break divider */}
                {pageIdx < pages.length - 1 && (
                  <div className="flex items-center gap-3 py-4 px-2">
                    <div className="flex-1 border-t-2 border-dashed border-slate-300" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                      Page {pageIdx + 2} starts here
                    </span>
                    <div className="flex-1 border-t-2 border-dashed border-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}