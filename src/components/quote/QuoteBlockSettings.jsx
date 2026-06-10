/**
 * Right-panel settings editor for a selected quote block.
 * All visual — no HTML exposed.
 */
import React, { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { X, Upload, Trash2 } from 'lucide-react';
import { db } from '@/api/db';

function Row({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <span className="text-sm">{label}</span>
      <Switch checked={!!value} onCheckedChange={onChange} />
    </label>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <input type="color" value={value || '#e2e8f0'} onChange={e => onChange(e.target.value)} className="h-8 w-14 rounded cursor-pointer border border-border" />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

export default function QuoteBlockSettings({ block, onChange, onClose }) {
  const cfg = block.config || {};
  const s = block.style || {};
  const setConfig = (patch) => onChange({ ...block, config: { ...cfg, ...patch } });
  const setStyle = (patch) => onChange({ ...block, style: { ...s, ...patch } });
  const setTitle = (title) => onChange({ ...block, title });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await db.integrations.Core.UploadFile({ file });
    setConfig({ logoUrl: file_url });
    setUploading(false);
  };

  const renderStyleSection = () => (
    <Section title="Card Style">
      <ColorRow label="Background" value={s.bgColor || '#ffffff'} onChange={v => setStyle({ bgColor: v })} />
      <ColorRow label="Border Color" value={s.borderColor || '#e2e8f0'} onChange={v => setStyle({ borderColor: v })} />
      <Row label={`Border Width: ${s.borderWidth || 2}px`}>
        <Slider min={0} max={8} step={1} value={[s.borderWidth || 2]} onValueChange={([v]) => setStyle({ borderWidth: v })} />
      </Row>
      <Row label={`Corner Radius: ${s.radius || 14}px`}>
        <Slider min={0} max={32} step={1} value={[s.radius || 14]} onValueChange={([v]) => setStyle({ radius: v })} />
      </Row>
      <Row label={`Padding: ${s.padding || 20}px`}>
        <Slider min={8} max={48} step={4} value={[s.padding || 20]} onValueChange={([v]) => setStyle({ padding: v })} />
      </Row>
    </Section>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div>
          <p className="font-bold text-sm capitalize">{block.type.replace(/_/g, ' ')} Settings</p>
          <p className="text-xs text-muted-foreground">Click to edit properties</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* HEADER */}
        {block.type === 'header' && (
          <>
            <Section title="Logo">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              {cfg.logoUrl ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center" style={{ minHeight: 80 }}>
                    <img src={cfg.logoUrl} alt="Logo preview" className="max-h-20 max-w-full object-contain p-2" />
                    <button
                      onClick={() => setConfig({ logoUrl: '' })}
                      className="absolute top-1 right-1 p-1 rounded-md bg-destructive/90 hover:bg-destructive text-white"
                      title="Remove logo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-xs text-center text-muted-foreground hover:text-foreground py-1 border border-dashed border-border rounded-md hover:border-primary transition-colors"
                  >
                    Replace image
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-xs">{uploading ? 'Uploading...' : 'Click to upload logo'}</span>
                </button>
              )}
              {cfg.logoUrl && (
                <>
                  <Toggle label="Show Logo" value={cfg.showLogo !== false} onChange={v => setConfig({ showLogo: v })} />
                  <Row label="Logo Position">
                    <Select value={cfg.logoPosition || 'center'} onValueChange={v => setConfig({ logoPosition: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </Row>
                </>
              )}
            </Section>
            <Separator />
            <Section title="Company Name">
              <Row label="Text (leave blank to hide)">
                <Input value={cfg.companyName || ''} onChange={e => setConfig({ companyName: e.target.value })} placeholder="e.g. Northeast Digital Media" />
              </Row>
            </Section>
            <Separator />
            <Section title="Custom Field">
              <Row label="Text (leave blank to hide)">
                <Input value={cfg.customField || ''} onChange={e => setConfig({ customField: e.target.value })} placeholder="e.g. Quote, Proposal, Event Name..." />
              </Row>
              <Row label={`Text Size: ${cfg.titleSize || 34}px`}>
                <Slider min={16} max={56} step={2} value={[cfg.titleSize || 34]} onValueChange={([v]) => setConfig({ titleSize: v })} />
              </Row>
            </Section>
            <Separator />
            <Section title="Layout">
              <Row label="Alignment">
                <Select value={cfg.logoPosition || 'center'} onValueChange={v => setConfig({ logoPosition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row label={`Vertical Padding: ${cfg.paddingV || 36}px`}>
                <Slider min={16} max={80} step={4} value={[cfg.paddingV || 36]} onValueChange={([v]) => setConfig({ paddingV: v })} />
              </Row>
            </Section>
            <Separator />
            <Section title="Background">
              <Row label="Type">
                <Select value={cfg.bgType || 'solid'} onValueChange={v => setConfig({ bgType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid Color</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="image">Image URL</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              {(cfg.bgType === 'solid' || !cfg.bgType) && (
                <ColorRow label="Background Color" value={cfg.bgColor || '#1e293b'} onChange={v => setConfig({ bgColor: v })} />
              )}
              {cfg.bgType === 'gradient' && (
                <Row label="CSS Gradient">
                  <Input value={cfg.bgGradient || 'linear-gradient(135deg, #1e293b, #334155)'} onChange={e => setConfig({ bgGradient: e.target.value })} placeholder="linear-gradient(...)" />
                </Row>
              )}
              {cfg.bgType === 'image' && (
                <Row label="Background Image URL">
                  <Input value={cfg.bgImage || ''} onChange={e => setConfig({ bgImage: e.target.value })} placeholder="https://..." />
                </Row>
              )}
              <ColorRow label="Text Color" value={cfg.textColor || '#ffffff'} onChange={v => setConfig({ textColor: v })} />
            </Section>
          </>
        )}

        {/* CUSTOMER INFO */}
        {block.type === 'customer_info' && (
          <>
            <Section title="Section Title">
              <Input value={block.title || 'Client'} onChange={e => setTitle(e.target.value)} />
            </Section>
            <Separator />
            <Section title="Visible Fields">
              <Toggle label="Company / Name" value={cfg.showName !== false} onChange={v => setConfig({ showName: v })} />
              <Toggle label="Contact Person" value={cfg.showContact !== false} onChange={v => setConfig({ showContact: v })} />
              <Toggle label="Email" value={cfg.showEmail !== false} onChange={v => setConfig({ showEmail: v })} />
              <Toggle label="Phone" value={cfg.showPhone !== false} onChange={v => setConfig({ showPhone: v })} />
            </Section>
            <Separator />
            {renderStyleSection()}
          </>
        )}

        {/* PROJECT DETAILS */}
        {block.type === 'project_details' && (
          <>
            <Section title="Section Title">
              <Input value={block.title || 'Project Details'} onChange={e => setTitle(e.target.value)} />
            </Section>
            <Separator />
            <Section title="Visible Fields">
              <Toggle label="Project Name" value={cfg.showName !== false} onChange={v => setConfig({ showName: v })} />
              <Toggle label="Venue" value={cfg.showVenue !== false} onChange={v => setConfig({ showVenue: v })} />
              <Toggle label="Dates" value={cfg.showDates !== false} onChange={v => setConfig({ showDates: v })} />
            </Section>
            <Separator />
            {renderStyleSection()}
          </>
        )}

        {/* QUOTE INFO */}
        {block.type === 'quote_info' && (
          <>
            <Section title="Section Title">
              <Input value={block.title || 'Quote Info'} onChange={e => setTitle(e.target.value)} />
            </Section>
            <Separator />
            <Section title="Visible Fields">
              <Toggle label="Status Badge" value={cfg.showStatus !== false} onChange={v => setConfig({ showStatus: v })} />
              <Toggle label="Valid Until Date" value={cfg.showValidUntil !== false} onChange={v => setConfig({ showValidUntil: v })} />
              <Toggle label="Quote Date" value={cfg.showDate !== false} onChange={v => setConfig({ showDate: v })} />
            </Section>
            <Separator />
            {renderStyleSection()}
          </>
        )}

        {/* INFO ROW (combined 3-col) */}
        {block.type === 'info_row' && (
          <>
            <p className="text-sm text-muted-foreground">This block shows the Client, Project Details, and Quote Info cards side by side in a 3-column layout. Style applies to all three cards.</p>
            <Separator />
            {renderStyleSection()}
          </>
        )}

        {/* ROOM SECTION */}
        {block.type === 'room_section' && (
          <>
            <Section title="Content">
              <Toggle label="Show Equipment" value={cfg.showEquipment !== false} onChange={v => setConfig({ showEquipment: v })} />
              <Toggle label="Show Crew / Labor" value={cfg.showCrew !== false} onChange={v => setConfig({ showCrew: v })} />
              <Toggle label="Show Room Total" value={cfg.showRoomTotal !== false} onChange={v => setConfig({ showRoomTotal: v })} />
            </Section>
            <Separator />
            <Section title="Room Header">
              <Row label="Background">
                <Select value={cfg.roomHeaderStyle || 'dark'} onValueChange={v => {
                  const presets = {
                    dark: { bg: 'linear-gradient(135deg,#1e293b,#334155)', color: '#ffffff' },
                    blue: { bg: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#ffffff' },
                    green: { bg: 'linear-gradient(135deg,#065f46,#059669)', color: '#ffffff' },
                    violet: { bg: 'linear-gradient(135deg,#5b21b6,#7c3aed)', color: '#ffffff' },
                    light: { bg: '#f8fafc', color: '#1e293b' },
                  };
                  const p = presets[v] || presets.dark;
                  setConfig({ roomHeaderStyle: v, roomHeaderBg: p.bg, roomHeaderColor: p.color });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark Slate</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Emerald</SelectItem>
                    <SelectItem value="violet">Violet</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              {cfg.roomHeaderStyle === 'custom' && (
                <>
                  <Row label="Custom Background (CSS)">
                    <Input value={cfg.roomHeaderBg || '#1e293b'} onChange={e => setConfig({ roomHeaderBg: e.target.value })} placeholder="color or gradient" />
                  </Row>
                  <ColorRow label="Text Color" value={cfg.roomHeaderColor || '#ffffff'} onChange={v => setConfig({ roomHeaderColor: v })} />
                </>
              )}
            </Section>
            <Separator />
            <Section title="Card Style">
              <ColorRow label="Background" value={s.bgColor || '#ffffff'} onChange={v => setStyle({ bgColor: v })} />
              <ColorRow label="Border Color" value={s.borderColor || '#dde3ed'} onChange={v => setStyle({ borderColor: v })} />
              <Row label={`Border Width: ${s.borderWidth || 2}px`}>
                <Slider min={0} max={8} step={1} value={[s.borderWidth || 2]} onValueChange={([v]) => setStyle({ borderWidth: v })} />
              </Row>
              <Row label={`Corner Radius: ${s.radius || 16}px`}>
                <Slider min={0} max={32} step={1} value={[s.radius || 16]} onValueChange={([v]) => setStyle({ radius: v })} />
              </Row>
            </Section>
          </>
        )}

        {/* CREW SECTION */}
        {block.type === 'crew_section' && (
          <>
            <Section title="Content">
              <Toggle label="Show Crew Names" value={cfg.showNames !== false} onChange={v => setConfig({ showNames: v })} />
              <Toggle label="Show Dates" value={cfg.showDates !== false} onChange={v => setConfig({ showDates: v })} />
              <Toggle label="Show Billable Cost" value={cfg.showCost !== false} onChange={v => setConfig({ showCost: v })} />
              <Toggle label="Show Section Total" value={cfg.showTotal !== false} onChange={v => setConfig({ showTotal: v })} />
            </Section>
            <Separator />
            <Section title="Section Header">
              <Row label="Background">
                <Select value={cfg.headerPreset || 'dark'} onValueChange={v => {
                  const presets = {
                    dark:   { bg: 'linear-gradient(135deg,#1e293b,#334155)', color: '#ffffff' },
                    blue:   { bg: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#ffffff' },
                    green:  { bg: 'linear-gradient(135deg,#065f46,#059669)', color: '#ffffff' },
                    violet: { bg: 'linear-gradient(135deg,#5b21b6,#7c3aed)', color: '#ffffff' },
                    amber:  { bg: 'linear-gradient(135deg,#b45309,#d97706)', color: '#ffffff' },
                    light:  { bg: '#f8fafc', color: '#1e293b' },
                  };
                  if (v === 'custom') {
                    setConfig({ headerPreset: 'custom' });
                  } else {
                    const p = presets[v] || presets.dark;
                    setConfig({ headerPreset: v, headerBg: p.bg, headerColor: p.color });
                  }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark Slate</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Emerald</SelectItem>
                    <SelectItem value="violet">Violet</SelectItem>
                    <SelectItem value="amber">Amber</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              {cfg.headerPreset === 'custom' && (
                <>
                  <Row label="Custom Background (CSS)">
                    <Input value={cfg.headerBg || 'linear-gradient(135deg,#1e293b,#334155)'} onChange={e => setConfig({ headerBg: e.target.value })} placeholder="color or gradient" />
                  </Row>
                  <ColorRow label="Text Color" value={cfg.headerColor || '#ffffff'} onChange={v => setConfig({ headerColor: v })} />
                </>
              )}
            </Section>
            <Separator />
            <Section title="Card Style">
              <ColorRow label="Background" value={s.bgColor || '#ffffff'} onChange={v => setStyle({ bgColor: v })} />
              <ColorRow label="Border Color" value={s.borderColor || '#dde3ed'} onChange={v => setStyle({ borderColor: v })} />
              <Row label={`Border Width: ${s.borderWidth || 2}px`}>
                <Slider min={0} max={8} step={1} value={[s.borderWidth || 2]} onValueChange={([v]) => setStyle({ borderWidth: v })} />
              </Row>
              <Row label={`Corner Radius: ${s.radius || 16}px`}>
                <Slider min={0} max={32} step={1} value={[s.radius || 16]} onValueChange={([v]) => setStyle({ radius: v })} />
              </Row>
            </Section>
          </>
        )}

        {/* TRAVEL SECTION */}
        {block.type === 'travel_section' && (
          <>
            <Section title="Content">
              <Toggle label="Show Vendor" value={cfg.showVendor !== false} onChange={v => setConfig({ showVendor: v })} />
              <Toggle label="Show Notes" value={cfg.showNotes !== false} onChange={v => setConfig({ showNotes: v })} />
              <Toggle label="Show Billable Amount" value={cfg.showCost !== false} onChange={v => setConfig({ showCost: v })} />
              <Toggle label="Show Section Total" value={cfg.showTotal !== false} onChange={v => setConfig({ showTotal: v })} />
            </Section>
            <Separator />
            <Section title="Section Header">
              <Row label="Background">
                <Select value={cfg.headerPreset || 'dark'} onValueChange={v => {
                  const presets = {
                    dark:   { bg: 'linear-gradient(135deg,#1e293b,#334155)', color: '#ffffff' },
                    blue:   { bg: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#ffffff' },
                    green:  { bg: 'linear-gradient(135deg,#065f46,#059669)', color: '#ffffff' },
                    violet: { bg: 'linear-gradient(135deg,#5b21b6,#7c3aed)', color: '#ffffff' },
                    amber:  { bg: 'linear-gradient(135deg,#b45309,#d97706)', color: '#ffffff' },
                    light:  { bg: '#f8fafc', color: '#1e293b' },
                  };
                  if (v === 'custom') {
                    setConfig({ headerPreset: 'custom' });
                  } else {
                    const p = presets[v] || presets.dark;
                    setConfig({ headerPreset: v, headerBg: p.bg, headerColor: p.color });
                  }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark Slate</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Emerald</SelectItem>
                    <SelectItem value="violet">Violet</SelectItem>
                    <SelectItem value="amber">Amber</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              {cfg.headerPreset === 'custom' && (
                <>
                  <Row label="Custom Background (CSS)">
                    <Input value={cfg.headerBg || 'linear-gradient(135deg,#1e293b,#334155)'} onChange={e => setConfig({ headerBg: e.target.value })} placeholder="color or gradient" />
                  </Row>
                  <ColorRow label="Text Color" value={cfg.headerColor || '#ffffff'} onChange={v => setConfig({ headerColor: v })} />
                </>
              )}
            </Section>
            <Separator />
            <Section title="Card Style">
              <ColorRow label="Background" value={s.bgColor || '#ffffff'} onChange={v => setStyle({ bgColor: v })} />
              <ColorRow label="Border Color" value={s.borderColor || '#dde3ed'} onChange={v => setStyle({ borderColor: v })} />
              <Row label={`Border Width: ${s.borderWidth || 2}px`}>
                <Slider min={0} max={8} step={1} value={[s.borderWidth || 2]} onValueChange={([v]) => setStyle({ borderWidth: v })} />
              </Row>
              <Row label={`Corner Radius: ${s.radius || 16}px`}>
                <Slider min={0} max={32} step={1} value={[s.radius || 16]} onValueChange={([v]) => setStyle({ radius: v })} />
              </Row>
            </Section>
          </>
        )}

        {/* TOTALS */}
        {block.type === 'totals' && (
          <>
            <Section title="Section Title">
              <Input value={block.title || 'Summary'} onChange={e => setTitle(e.target.value)} />
            </Section>
            <Separator />
            <Section title="Layout">
              <Row label="Alignment">
                <Select value={cfg.align || 'right'} onValueChange={v => setConfig({ align: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
            </Section>
            <Separator />
            {renderStyleSection()}
          </>
        )}

        {/* NOTES */}
        {block.type === 'notes' && (
          <>
            <Section title="Section Title">
              <Input value={block.title || 'Notes & Terms'} onChange={e => setTitle(e.target.value)} />
            </Section>
            <Separator />
            <Section title="Content">
              <Row label="Custom Text (leave blank to use quote notes)">
                <Textarea value={cfg.staticText || ''} onChange={e => setConfig({ staticText: e.target.value })} placeholder="Leave blank to pull from quote notes automatically..." className="min-h-24 text-sm" />
              </Row>
              <ColorRow label="Text Color" value={cfg.textColor || '#78350f'} onChange={v => setConfig({ textColor: v })} />
            </Section>
            <Separator />
            {renderStyleSection()}
          </>
        )}

        {/* DIVIDER */}
        {block.type === 'divider' && (
          <Section title="Divider Style">
            <ColorRow label="Color" value={s.borderColor || '#e2e8f0'} onChange={v => setStyle({ borderColor: v })} />
            <Row label={`Thickness: ${s.borderWidth || 1}px`}>
              <Slider min={1} max={6} step={1} value={[s.borderWidth || 1]} onValueChange={([v]) => setStyle({ borderWidth: v })} />
            </Row>
            <Row label={`Spacing: ${s.padding || 16}px`}>
              <Slider min={4} max={40} step={4} value={[s.padding || 16]} onValueChange={([v]) => setStyle({ padding: v })} />
            </Row>
          </Section>
        )}

        {/* SPACER */}
        {block.type === 'spacer' && (
          <Section title="Spacer">
            <Row label={`Height: ${cfg.height || 24}px`}>
              <Slider min={8} max={120} step={8} value={[cfg.height || 24]} onValueChange={([v]) => setConfig({ height: v })} />
            </Row>
          </Section>
        )}

        {/* FOOTER */}
        {block.type === 'footer' && (
          <>
            <Section title="Company Info">
              <Toggle label="Show Company Name" value={cfg.showCompany !== false} onChange={v => setConfig({ showCompany: v })} />
              <Toggle label="Show Phone" value={cfg.showPhone !== false} onChange={v => setConfig({ showPhone: v })} />
              <Toggle label="Show Email" value={cfg.showEmail !== false} onChange={v => setConfig({ showEmail: v })} />
              <Toggle label="Show Website" value={cfg.showWebsite !== false} onChange={v => setConfig({ showWebsite: v })} />
              <Toggle label="Show Address" value={cfg.showAddress !== false} onChange={v => setConfig({ showAddress: v })} />
            </Section>
            <Separator />
            <Section title="Disclaimer">
              <Textarea value={cfg.disclaimer || ''} onChange={e => setConfig({ disclaimer: e.target.value })} placeholder="Optional legal disclaimer text..." className="min-h-16 text-sm" />
            </Section>
            <Separator />
            <Section title="Style">
              <Row label="Alignment">
                <Select value={cfg.align || 'center'} onValueChange={v => setConfig({ align: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <ColorRow label="Background" value={s.bgColor || '#f8fafc'} onChange={v => setStyle({ bgColor: v })} />
              <ColorRow label="Text Color" value={cfg.textColor || '#64748b'} onChange={v => setConfig({ textColor: v })} />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}