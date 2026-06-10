import React, { useState, useEffect, useRef, useCallback } from 'react';
import { buildPrintHTML } from '@/lib/printQRLabel';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Printer, QrCode, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import FreeDragCanvas from '@/components/qr/FreeDragCanvas';
import QRDataBuilder from '@/components/qr/QRDataBuilder';

export const LABEL_SIZES = [
  { id: 'dymo_30336', label: 'Dymo Square (51×51mm)', w: 51, h: 51 },
  { id: 'dymo_30252', label: 'Dymo Address (89×28mm)', w: 89, h: 28 },
  { id: 'dymo_30330', label: 'Dymo Multi (54×25mm)', w: 54, h: 25 },
  { id: 'medium_60x40', label: 'Medium Label (60×40mm)', w: 60, h: 40 },
  { id: 'large_100x60', label: 'Large Label (100×60mm)', w: 100, h: 60 },
  { id: 'card_85x54', label: 'Card (85×54mm)', w: 85, h: 54 },
  { id: 'custom', label: 'Custom…', w: 70, h: 40 },
];

export const SAMPLE_ASSET = {
  name: 'Sony FX6 Camera',
  barcode: 'CAM-0042',
  serial_numbers: 'SN-987654',
  category: 'Camera',
  location: 'Warehouse A',
};

const ADD_ELEMENTS = [
  { type: 'qr',           label: 'QR Code',       field: null,             defaultProps: { w: 40, h: 40, fontSize: 12, fontWeight: 'normal' } },
  { type: 'asset_name',   label: 'Asset Name',     field: 'name',           defaultProps: { w: 120, h: 18, fontSize: 10, fontWeight: 'bold' } },
  { type: 'barcode',      label: 'Asset Number',   field: 'barcode',        defaultProps: { w: 100, h: 14, fontSize: 8, fontWeight: 'normal', mono: true } },
  { type: 'serial',       label: 'Serial No.',     field: 'serial_numbers', defaultProps: { w: 100, h: 14, fontSize: 8, fontWeight: 'normal', mono: true } },
  { type: 'category',     label: 'Category',       field: 'category',       defaultProps: { w: 80, h: 12, fontSize: 7, fontWeight: 'normal' } },
  { type: 'logo',         label: 'Logo',           field: null,             defaultProps: { w: 30, h: 30 } },
  { type: 'text',         label: 'Custom Text',    field: null,             defaultProps: { w: 80, h: 14, fontSize: 8, fontWeight: 'normal', value: 'Label Text' } },
];

let _idCounter = 0;
function uid() { return `el_${Date.now()}_${++_idCounter}`; }

export function makeElement(type, canvasW, canvasH) {
  const meta = ADD_ELEMENTS.find(e => e.type === type) || ADD_ELEMENTS[0];
  const w = meta.defaultProps.w;
  const h = meta.defaultProps.h;
  return {
    id: uid(),
    type,
    field: meta.field,
    x: Math.round((canvasW - w) / 2),
    y: Math.round((canvasH - h) / 2),
    w,
    h,
    ...meta.defaultProps,
  };
}

export { buildPrintHTML } from '@/lib/printQRLabel';

function LogoPanel({ element, uploading, onUpload }) {
  const fileInputRef = useRef(null);
  return (
    <div className="w-52 border-l bg-card flex flex-col shrink-0 overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="p-3 border-b">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Logo Properties</p>
      </div>
      <div className="p-3 space-y-3">
        {element.logoUrl ? (
          <div className="space-y-2">
            <img src={element.logoUrl} alt="Logo" className="w-full h-20 object-contain border rounded bg-white" />
            <p className="text-xs text-muted-foreground">Uploaded from file</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No logo uploaded yet.</p>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
        <Button variant="outline" size="sm" className="w-full" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          {uploading ? 'Uploading…' : element.logoUrl ? 'Replace Logo' : 'Upload Logo'}
        </Button>
      </div>
    </div>
  );
}

export default function QRLabelBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('id');
  const queryClient = useQueryClient();

  const [templateName, setTemplateName] = useState('New QR Label');
  const [sizeId, setSizeId] = useState('dymo_30336');
  const [customW, setCustomW] = useState(70);
  const [customH, setCustomH] = useState(40);
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showCustom, setShowCustom] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [qrDataConfig, setQRDataConfig] = useState({});

  const size = sizeId === 'custom'
    ? { w: customW, h: customH }
    : LABEL_SIZES.find(s => s.id === sizeId) || LABEL_SIZES[0];

  // Load existing template
  const { data: existingTemplate } = useQuery({
    queryKey: ['printTemplate', templateId],
    queryFn: () => db.entities.PrintTemplate.filter({ id: templateId }),
    enabled: !!templateId,
  });

  useEffect(() => {
    if (existingTemplate?.[0]) {
      const t = existingTemplate[0];
      setTemplateName(t.name);
      
      // Load size from root level (new way) or fall back to block_config (old way)
      if (t.label_size_id) {
        setSizeId(t.label_size_id);
      } else if (t.label_width_mm && t.label_height_mm) {
        setCustomW(t.label_width_mm);
        setCustomH(t.label_height_mm);
        setSizeId('custom');
      } else {
        // Fallback to old block_config format
        const cfg = t.block_config?.[0];
        if (cfg?.sizeId) setSizeId(cfg.sizeId);
        if (cfg?.customW) setCustomW(cfg.customW);
        if (cfg?.customH) setCustomH(cfg.customH);
      }
      
      // Load elements from block_config
      const elements = t.block_config?.[0]?.elements || [];
      if (elements.length) setElements(elements);
      
      // Load QR data config
      if (t.qr_data_config) {
        setQRDataConfig(t.qr_data_config);
      }
    } else if (!templateId) {
      // Default starter layout
      const s = LABEL_SIZES[0];
      setElements([
        { ...makeElement('qr', s.w, s.h), x: 2, y: 2, w: 20, h: 20 },
        { ...makeElement('asset_name', s.w, s.h), x: 25, y: 4, w: 24, h: 10 },
        { ...makeElement('barcode', s.w, s.h), x: 25, y: 16, w: 24, h: 8 },
      ]);
    }
  }, [existingTemplate, templateId]);

  const { data: brandList = [] } = useQuery({
    queryKey: ['brand'],
    queryFn: () => db.entities.BrandSettings.list(),
    staleTime: 10 * 60 * 1000,
  });
  const brand = brandList[0] || {};

  const saveMutation = useMutation({
    mutationFn: (data) => {
      console.log('[QRLabelBuilder] Save initiated. Payload:', {
        name: data.name,
        template_type: data.template_type,
        block_config_type: Array.isArray(data.block_config) ? 'array' : 'object',
        block_config_length: data.block_config?.length || 0,
        elements_count: data.block_config?.[0]?.elements?.length || 0,
        templateId: templateId || 'NEW',
      });
      
      const savePromise = templateId
        ? db.entities.PrintTemplate.update(templateId, data)
        : db.entities.PrintTemplate.create(data);
      
      return savePromise.then(result => {
        console.log('[QRLabelBuilder] Save successful. Created/Updated ID:', result?.id || templateId);
        return result;
      }).catch(err => {
        console.error('[QRLabelBuilder] Save error:', err);
        throw err;
      });
    },
    onSuccess: (result) => {
      console.log('[QRLabelBuilder] onSuccess fired. Invalidating printTemplates query.');
      queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
      toast.success('✓ QR template saved to Document Templates');
      setTimeout(() => {
        console.log('[QRLabelBuilder] Navigating to /print-templates');
        navigate('/print-templates');
      }, 800);
    },
    onError: (err) => {
      console.error('[QRLabelBuilder] Mutation error:', err);
      toast.error(err?.message || 'Failed to save template');
    },
  });

  // Keyboard delete
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        setElements(prev => prev.filter(el => el.id !== selectedId));
        setSelectedId(null);
      }
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  const handleSave = () => {
    console.log('[QRLabelBuilder] handleSave called. Template name:', templateName);
    if (!templateName || templateName.trim() === '') {
      toast.error('Please enter a template name');
      return;
    }
    // Store the actual size dimensions on the template
    const templateSize = sizeId === 'custom'
      ? { label_width_mm: customW, label_height_mm: customH, label_size_id: 'custom' }
      : { label_width_mm: size.w, label_height_mm: size.h, label_size_id: sizeId };
    
    saveMutation.mutate({
      name: templateName.trim(),
      template_type: 'qr_label',
      block_config: [{ elements }], // Keep elements in block_config for backwards compatibility
      body_html: '',
      qr_data_config: qrDataConfig,
      ...templateSize, // Add size fields to root level
    });
  };

  const handlePrint = async () => {
    const html = buildPrintHTML(elements, size, SAMPLE_ASSET, brand);
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
  };

  const addElement = (type) => {
    const el = makeElement(type, size.w, size.h);
    setElements(prev => [...prev, el]);
    setSelectedId(el.id);
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    setLogoUploading(true);
    const { file_url } = await db.integrations.Core.UploadFile({ file });
    updateElement(selectedId, { logoUrl: file_url });
    setLogoUploading(false);
  };

  const updateElement = useCallback((id, patch) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...patch } : el));
  }, []);

  const deleteElement = useCallback((id) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedId(null);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden" onClick={() => setSelectedId(null)}>
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-card shrink-0" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/print-templates')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <QrCode className="w-4 h-4 text-amber-500" />
        <span className="font-bold text-sm text-foreground">QR Label Builder</span>
        <Separator orientation="vertical" className="h-4" />
        <Input
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          className="h-8 w-44 text-sm font-medium"
        />
        <div className="ml-auto flex items-center gap-2">
          <Select value={sizeId} onValueChange={setSizeId}>
            <SelectTrigger className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LABEL_SIZES.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {sizeId === 'custom' && (
            <div className="flex items-center gap-1">
              <Input type="number" value={customW} onChange={e => setCustomW(+e.target.value)} className="h-8 w-14 text-xs" placeholder="W" />
              <span className="text-muted-foreground text-xs">×</span>
              <Input type="number" value={customH} onChange={e => setCustomH(+e.target.value)} className="h-8 w-14 text-xs" placeholder="H" />
              <span className="text-xs text-muted-foreground">mm</span>
            </div>
          )}
          <Button variant="outline" size="sm" className="h-8" onClick={(e) => { e.stopPropagation(); handlePrint(); }}>
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
          </Button>
          <Button size="sm" className="h-8" onClick={(e) => { e.stopPropagation(); handleSave(); }} disabled={saveMutation.isPending}>
            <Save className="w-3.5 h-3.5 mr-1.5" /> {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Add Panel */}
        <div className="w-44 border-r bg-card flex flex-col shrink-0 overflow-hidden overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-3 border-b shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Element</p>
          </div>
          <div className="p-2 space-y-1">
            {ADD_ELEMENTS.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => addElement(type)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-primary/5 hover:text-primary border border-transparent hover:border-primary/20 transition-colors text-left"
              >
                <Plus className="w-3 h-3 shrink-0 opacity-50" />
                {label}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t text-xs text-muted-foreground space-y-1 shrink-0">
            <p className="font-medium">Tips</p>
            <p>Drag to move</p>
            <p>Drag corners to resize</p>
            <p>Delete / ⌫ to remove</p>
            <p>Double-click text to edit</p>
          </div>
          <div className="px-3 py-3 border-t shrink-0">
            <QRDataBuilder config={qrDataConfig} onChange={setQRDataConfig} />
          </div>
        </div>

        {/* Canvas Area */}
        <div
          className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 flex items-center justify-center"
          style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        >
          <div className="flex flex-col items-center gap-4 py-12">
            <FreeDragCanvas
              elements={elements}
              size={size}
              asset={SAMPLE_ASSET}
              brand={brand}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdate={updateElement}
              onDelete={deleteElement}
            />
            <p className="text-xs text-slate-400 font-medium">Sample preview · {size.w}×{size.h} mm</p>
          </div>
        </div>

        {/* Right Properties Panel — shown when a logo element is selected */}
        {selectedElement?.type === 'logo' && (
          <LogoPanel
            element={selectedElement}
            uploading={logoUploading}
            onUpload={handleLogoUpload}
          />
        )}
      </div>
    </div>
  );
}