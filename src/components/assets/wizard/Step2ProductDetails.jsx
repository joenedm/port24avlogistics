import React, { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ImagePlus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Step2ProductDetails({ formData, set, categories }) {
  const fileRef = useRef();
  const [uploading, setUploading] = React.useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('image_url', file_url);
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      {/* Image */}
      <div className="flex gap-4 items-start">
        <div
          className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors shrink-0 relative overflow-hidden"
          onClick={() => fileRef.current?.click()}
        >
          {formData.image_url ? (
            <>
              <img src={formData.image_url} alt="Asset" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={e => { e.stopPropagation(); set('image_url', ''); }}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
              {uploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <div className="flex-1 space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={formData.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Shure SM58 Dynamic Mic" required />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={v => set('category', v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Manufacturer / Brand</Label>
          <Input value={formData.manufacturer || ''} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. Shure" />
        </div>
        <div>
          <Label>Model</Label>
          <Input value={formData.model || ''} onChange={e => set('model', e.target.value)} placeholder="e.g. SM58-LC" />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description || ''}
          onChange={e => set('description', e.target.value)}
          rows={3}
          placeholder="Brief description of this item, specs, use cases…"
        />
      </div>
    </div>
  );
}