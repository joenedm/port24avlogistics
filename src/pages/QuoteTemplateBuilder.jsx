/**
 * Universal Document Template Builder
 * Supports: quote, invoice, pick_list template types.
 * Shares the same block-canvas system — type param controls available blocks + default layout.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Printer, LayoutTemplate, FileText, User, Building2,
  Info, Package, DollarSign, StickyNote, Minus, AlignJustify,
  Plus, Eye, Layers, Users, Plane, Scissors, ClipboardList, FileCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import QuoteBlockCanvas from '@/components/quote/QuoteBlockCanvas';
import QuoteBlockSettings from '@/components/quote/QuoteBlockSettings';
import { renderQuoteTemplate, renderInvoiceTemplate, renderPickListTemplate } from '@/lib/quoteTemplateRenderer';

// ─── Block libraries per document type ──────────────────────────────────────

const SHARED_LAYOUT_BLOCKS = [
  { type: 'page_break', label: 'Page Break', icon: Scissors, description: 'Force a new page', defaultConfig: {}, defaultStyle: {} },
  { type: 'divider', label: 'Divider', icon: Minus, description: 'Horizontal separator', defaultConfig: {}, defaultStyle: { borderColor: '#e2e8f0', borderWidth: 1, padding: 16 } },
  { type: 'spacer', label: 'Spacer', icon: AlignJustify, description: 'Vertical whitespace', defaultConfig: { height: 24 }, defaultStyle: {} },
];

const QUOTE_BLOCKS = [
  {
    group: 'Header & Footer',
    blocks: [
      { type: 'header', label: 'Header', icon: LayoutTemplate, description: 'Logo, title, background', defaultConfig: { title: 'QUOTE', bgType: 'solid', bgColor: '#1e293b', textColor: '#ffffff', showLogo: true, logoPosition: 'center', paddingV: 36, titleSize: 34 }, defaultStyle: {} },
      { type: 'footer', label: 'Footer', icon: Building2, description: 'Company info, disclaimer', defaultConfig: { showCompany: true, showPhone: true, showEmail: true, showWebsite: true, align: 'center' }, defaultStyle: { bgColor: '#f8fafc' } },
    ],
  },
  {
    group: 'Info Cards',
    blocks: [
      { type: 'info_row', label: 'Info Row (3-col)', icon: Layers, description: 'Client + Project + Quote side by side', defaultConfig: {}, defaultStyle: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
      { type: 'customer_info', label: 'Customer Info', icon: User, description: 'Client name, contact, email', defaultConfig: { showName: true, showContact: true, showEmail: true, showPhone: true }, defaultStyle: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
      { type: 'project_details', label: 'Project Details', icon: Building2, description: 'Project name, venue, dates', defaultConfig: { showName: true, showVenue: true, showDates: true }, defaultStyle: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
      { type: 'quote_info', label: 'Quote Info', icon: Info, description: 'Status, valid until, date', defaultConfig: { showStatus: true, showValidUntil: true, showDate: true }, defaultStyle: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
    ],
  },
  {
    group: 'Content',
    blocks: [
      { type: 'room_section', label: 'Equipment (Rooms)', icon: Package, description: 'Equipment per room', defaultConfig: { showRoomTotal: true, roomHeaderBg: 'linear-gradient(135deg,#1e293b,#334155)', roomHeaderColor: '#ffffff' }, defaultStyle: { bgColor: '#ffffff', borderColor: '#dde3ed', borderWidth: 2, radius: 16 } },
      { type: 'crew_section', label: 'Crew / Labor', icon: Users, description: 'Crew/labor section', defaultConfig: { headerBg: '#5b21b6', headerColor: '#ffffff' }, defaultStyle: { bgColor: '#ffffff', borderColor: '#ede9fe', borderWidth: 2, radius: 16 } },
      { type: 'travel_section', label: 'Travel & Transport', icon: Plane, description: 'Flights, cars, hotels, mileage', defaultConfig: { headerBg: '#b45309', headerColor: '#ffffff' }, defaultStyle: { bgColor: '#ffffff', borderColor: '#fde68a', borderWidth: 2, radius: 16 } },
      { type: 'totals', label: 'Totals', icon: DollarSign, description: 'Subtotal, discount, tax, total', defaultConfig: { align: 'right' }, defaultStyle: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
      { type: 'notes', label: 'Notes', icon: StickyNote, description: 'Notes, terms & conditions', defaultConfig: { staticText: '' }, defaultStyle: { bgColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 2, radius: 14, padding: 18 } },
    ],
  },
  { group: 'Layout', blocks: SHARED_LAYOUT_BLOCKS },
];

const INVOICE_BLOCKS = [
  {
    group: 'Header & Footer',
    blocks: [
      { type: 'header', label: 'Header', icon: LayoutTemplate, description: 'Logo, title, background', defaultConfig: { title: 'INVOICE', bgType: 'solid', bgColor: '#1e293b', textColor: '#ffffff', showLogo: true, logoPosition: 'center', paddingV: 36, titleSize: 34 }, defaultStyle: {} },
      { type: 'footer', label: 'Footer', icon: Building2, description: 'Company info, disclaimer', defaultConfig: { showCompany: true, showPhone: true, showEmail: true, showWebsite: true, align: 'center' }, defaultStyle: { bgColor: '#f8fafc' } },
    ],
  },
  {
    group: 'Info Cards',
    blocks: [
      { type: 'invoice_info_row', label: 'Invoice Info Row', icon: Layers, description: 'Bill To + Project + Invoice Details', defaultConfig: {}, defaultStyle: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
      { type: 'bill_to', label: 'Bill To', icon: User, description: 'Client name, address, email', defaultConfig: {}, defaultStyle: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
      { type: 'invoice_details', label: 'Invoice Details', icon: FileCheck, description: 'Invoice #, dates, status', defaultConfig: {}, defaultStyle: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
    ],
  },
  {
    group: 'Content',
    blocks: [
      { type: 'invoice_line_items', label: 'Line Items Table', icon: Package, description: 'All invoice line items', defaultConfig: { headerBg: '#1e293b', headerColor: '#ffffff' }, defaultStyle: { bgColor: '#ffffff', borderColor: '#dde3ed', borderWidth: 2, radius: 16 } },
      { type: 'invoice_totals', label: 'Totals', icon: DollarSign, description: 'Subtotal, discount, tax, total, balance', defaultConfig: { align: 'right' }, defaultStyle: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
      { type: 'notes', label: 'Notes', icon: StickyNote, description: 'Payment terms, notes', defaultConfig: { staticText: '' }, defaultStyle: { bgColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 2, radius: 14, padding: 18 } },
    ],
  },
  { group: 'Layout', blocks: SHARED_LAYOUT_BLOCKS },
];

const PICK_LIST_BLOCKS = [
  {
    group: 'Header & Footer',
    blocks: [
      { type: 'header', label: 'Header', icon: LayoutTemplate, description: 'Logo, title, background', defaultConfig: { title: 'PICK LIST', bgType: 'solid', bgColor: '#1e293b', textColor: '#ffffff', showLogo: true, logoPosition: 'center', paddingV: 36, titleSize: 34 }, defaultStyle: {} },
      { type: 'footer', label: 'Footer', icon: Building2, description: 'Company info, disclaimer', defaultConfig: { showCompany: true, showPhone: true, showEmail: true, showWebsite: true, align: 'center' }, defaultStyle: { bgColor: '#f8fafc' } },
    ],
  },
  {
    group: 'Info Cards',
    blocks: [
      { type: 'pick_list_info', label: 'Project Info', icon: Info, description: 'Show name, client, dates', defaultConfig: {}, defaultStyle: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
    ],
  },
  {
    group: 'Content',
    blocks: [
      { type: 'pick_list_items', label: 'Equipment List', icon: ClipboardList, description: 'Full pick list with checkboxes', defaultConfig: { headerBg: '#1e293b', headerColor: '#ffffff', showBarcode: true, showCheckbox: true }, defaultStyle: { bgColor: '#ffffff', borderColor: '#dde3ed', borderWidth: 2, radius: 16 } },
      { type: 'notes', label: 'Notes', icon: StickyNote, description: 'Load-out notes', defaultConfig: { staticText: '' }, defaultStyle: { bgColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 2, radius: 14, padding: 18 } },
    ],
  },
  { group: 'Layout', blocks: SHARED_LAYOUT_BLOCKS },
];

// ─── Default blocks per type ─────────────────────────────────────────────────

const DEFAULT_BLOCKS_BY_TYPE = {
  quote: [
    { id: 'header_1', type: 'header', title: 'Header', config: { title: 'QUOTE', bgType: 'solid', bgColor: '#1e293b', textColor: '#ffffff', showLogo: true, logoPosition: 'center', paddingV: 36, titleSize: 34 }, style: {} },
    { id: 'info_row_1', type: 'info_row', title: 'Info Row', config: {}, style: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
    { id: 'room_1', type: 'room_section', title: 'Equipment', config: { showRoomTotal: true, roomHeaderBg: 'linear-gradient(135deg,#1e293b,#334155)', roomHeaderColor: '#ffffff' }, style: { bgColor: '#ffffff', borderColor: '#dde3ed', borderWidth: 2, radius: 16 } },
    { id: 'totals_1', type: 'totals', title: 'Summary', config: { align: 'right' }, style: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
    { id: 'notes_1', type: 'notes', title: 'Notes & Terms', config: { staticText: '' }, style: { bgColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 2, radius: 14, padding: 18 } },
    { id: 'footer_1', type: 'footer', title: 'Footer', config: { showCompany: true, showPhone: true, showEmail: true, showWebsite: true, align: 'center' }, style: { bgColor: '#f8fafc' } },
  ],
  invoice: [
    { id: 'header_1', type: 'header', title: 'Header', config: { title: 'INVOICE', bgType: 'solid', bgColor: '#1e293b', textColor: '#ffffff', showLogo: true, logoPosition: 'center', paddingV: 36, titleSize: 34 }, style: {} },
    { id: 'invoice_info_row_1', type: 'invoice_info_row', title: 'Invoice Info', config: {}, style: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
    { id: 'line_items_1', type: 'invoice_line_items', title: 'Line Items', config: { headerBg: '#1e293b', headerColor: '#ffffff' }, style: { bgColor: '#ffffff', borderColor: '#dde3ed', borderWidth: 2, radius: 16 } },
    { id: 'inv_totals_1', type: 'invoice_totals', title: 'Totals', config: { align: 'right' }, style: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
    { id: 'notes_1', type: 'notes', title: 'Payment Terms & Notes', config: { staticText: '' }, style: { bgColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 2, radius: 14, padding: 18 } },
    { id: 'footer_1', type: 'footer', title: 'Footer', config: { showCompany: true, showPhone: true, showEmail: true, showWebsite: true, align: 'center' }, style: { bgColor: '#f8fafc' } },
  ],
  pick_list: [
    { id: 'header_1', type: 'header', title: 'Header', config: { title: 'PICK LIST', bgType: 'solid', bgColor: '#1e293b', textColor: '#ffffff', showLogo: true, logoPosition: 'center', paddingV: 36, titleSize: 34 }, style: {} },
    { id: 'pick_info_1', type: 'pick_list_info', title: 'Project Info', config: {}, style: { bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 2, radius: 14, padding: 20 } },
    { id: 'pick_items_1', type: 'pick_list_items', title: 'Equipment List', config: { headerBg: '#1e293b', headerColor: '#ffffff', showBarcode: true, showCheckbox: true }, style: { bgColor: '#ffffff', borderColor: '#dde3ed', borderWidth: 2, radius: 16 } },
    { id: 'notes_1', type: 'notes', title: 'Notes', config: { staticText: '' }, style: { bgColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 2, radius: 14, padding: 18 } },
    { id: 'footer_1', type: 'footer', title: 'Footer', config: { showCompany: true, showPhone: true, showEmail: true, showWebsite: true, align: 'center' }, style: { bgColor: '#f8fafc' } },
  ],
};

const TYPE_META = {
  quote:     { label: 'Quote',     icon: FileText,      color: 'text-blue-500',   defaultName: 'My Quote Template' },
  invoice:   { label: 'Invoice',   icon: FileCheck,     color: 'text-emerald-500', defaultName: 'My Invoice Template' },
  pick_list: { label: 'Pick List', icon: ClipboardList, color: 'text-violet-500', defaultName: 'My Pick List Template' },
};

function getRenderer(type) {
  if (type === 'invoice') return renderInvoiceTemplate;
  if (type === 'pick_list') return renderPickListTemplate;
  return renderQuoteTemplate;
}

function getBlockLibrary(type) {
  if (type === 'invoice') return INVOICE_BLOCKS;
  if (type === 'pick_list') return PICK_LIST_BLOCKS;
  return QUOTE_BLOCKS;
}

export default function QuoteTemplateBuilder() {
  const urlParams = new URLSearchParams(window.location.search);
  const templateId = urlParams.get('id');
  const typeParam = urlParams.get('type') || 'quote'; // quote | invoice | pick_list
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [docType, setDocType] = useState(typeParam);
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS_BY_TYPE[typeParam] || DEFAULT_BLOCKS_BY_TYPE.quote);
  const [selectedId, setSelectedId] = useState(null);
  const [templateName, setTemplateName] = useState(TYPE_META[typeParam]?.defaultName || 'My Template');
  const [templateDesc, setTemplateDesc] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  const { data: brandList = [] } = useQuery({ queryKey: ['brand'], queryFn: () => base44.entities.BrandSettings.list() });
  // Load ALL templates — used both for finding the current one and for cache coherence with PrintTemplates page
  const { data: allTemplates = [] } = useQuery({
    queryKey: ['printTemplates'],
    queryFn: () => base44.entities.PrintTemplate.list(),
  });

  const brand = brandList[0] || {};

  // Find the specific template from the shared cache
  const existingTemplate = templateId ? allTemplates.find(t => t.id === templateId) : null;

  useEffect(() => {
    if (existingTemplate) {
      setTemplateName(existingTemplate.name || TYPE_META[existingTemplate.template_type]?.defaultName || 'My Template');
      setTemplateDesc(existingTemplate.description || '');
      setIsDefault(existingTemplate.is_default || false);
      if (existingTemplate.template_type) setDocType(existingTemplate.template_type);
      if (existingTemplate.block_config && Array.isArray(existingTemplate.block_config)) {
        setBlocks(existingTemplate.block_config);
      }
    }
  }, [existingTemplate?.id]);

  const saveMutation = useMutation({
    mutationFn: (data) => templateId
      ? base44.entities.PrintTemplate.update(templateId, data)
      : base44.entities.PrintTemplate.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['invoiceTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['pickListTemplates'] });
      setSaveDialogOpen(false);
      const savedId = result?.id || templateId;
      if (savedId && !templateId) {
        navigate(`/quote-template-builder?id=${savedId}&type=${docType}`, { replace: true });
      }
    },
    onError: (err) => {
      alert(`Failed to save template: ${err?.message || 'Unknown error'}`);
    },
  });

  const selectedBlock = blocks.find(b => b.id === selectedId);
  const renderer = getRenderer(docType);
  const blockLibrary = getBlockLibrary(docType);
  const TypeIcon = TYPE_META[docType]?.icon || FileText;

  const updateBlock = (updated) => setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b));

  const addBlock = (blockDef) => {
    const newBlock = {
      id: `${blockDef.type}_${Date.now()}`,
      type: blockDef.type,
      title: blockDef.label,
      config: { ...blockDef.defaultConfig },
      style: { ...blockDef.defaultStyle },
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  };

  const handleSave = () => {
    if (!templateName.trim()) return;
    // body_html is intentionally omitted — it's too large for an entity field
    // and is regenerated at render time from block_config
    saveMutation.mutate({
      name: templateName.trim(),
      description: templateDesc,
      template_type: docType,
      block_config: blocks,
      is_default: isDefault,
    });
  };

  const openPDFPreview = () => {
    const html = renderer(blocks, undefined, brand);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top toolbar */}
      <div className="border-b bg-card flex items-center gap-3 px-4 py-2.5 shrink-0 shadow-sm">
        <Link to="/print-templates" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Templates
        </Link>
        <div className="w-px h-5 bg-border" />
        <TypeIcon className={cn('w-4 h-4', TYPE_META[docType]?.color)} />
        <span className="font-semibold text-sm">{templateName}</span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">{TYPE_META[docType]?.label}</span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={openPDFPreview}>
          <Printer className="w-3.5 h-3.5 mr-1.5" /> Preview
        </Button>
        <Button size="sm" onClick={() => setSaveDialogOpen(true)}>
          <Save className="w-3.5 h-3.5 mr-1.5" /> Save Template
        </Button>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT: Block library */}
        <div className="w-56 border-r bg-card overflow-y-auto shrink-0 flex flex-col">
          <div className="p-3 border-b">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Blocks</p>
            <p className="text-xs text-muted-foreground mt-0.5">Click to add</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {blockLibrary.map(group => (
              <div key={group.group}>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">{group.group}</p>
                <div className="space-y-1">
                  {group.blocks.map(blockDef => {
                    const Icon = blockDef.icon;
                    return (
                      <button
                        key={blockDef.type}
                        onClick={() => addBlock(blockDef)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 text-left transition-colors group"
                      >
                        <div className="p-1.5 rounded-md bg-muted group-hover:bg-blue-100 transition-colors shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-none mb-0.5">{blockDef.label}</p>
                          <p className="text-xs text-muted-foreground leading-none truncate">{blockDef.description}</p>
                        </div>
                        <Plus className="w-3 h-3 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Canvas */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-card/80 backdrop-blur-sm shrink-0">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Live Preview — sample data</span>
            <span className="ml-auto text-xs text-muted-foreground">{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-auto">
            <div className="py-8 px-8 flex justify-center" style={{ minWidth: 900 }}>
              <QuoteBlockCanvas
                blocks={blocks}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onChange={setBlocks}
                brand={brand}
                docType={docType}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Settings panel */}
        <div className={cn('border-l bg-card flex flex-col shrink-0 transition-all duration-200', selectedBlock ? 'w-72' : 'w-0 overflow-hidden')}>
          {selectedBlock && (
            <QuoteBlockSettings
              block={selectedBlock}
              onChange={updateBlock}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save {TYPE_META[docType]?.label} Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Template Name *</Label>
              <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Standard Invoice" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} placeholder="What is this template for?" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                id="is_default_check"
                type="checkbox"
                checked={isDefault}
                onChange={e => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="is_default_check" className="cursor-pointer font-normal">Set as default {TYPE_META[docType]?.label} template</Label>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!templateName.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}