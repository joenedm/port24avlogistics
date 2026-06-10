import React, { useState } from 'react';
import { db } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { X, ChevronUp, ChevronDown, Edit2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const VARIABLES = [
  'Project Name', 'Crew Name', 'Role', 'Date', 'Start Time', 'End Time', 
  'Notes', 'Accommodation', 'Company Name', 'Company Email', 'Company Phone'
];

export default function EmailBlockEditor({ sections, onUpdateSections }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editData, setEditData] = useState(null);
  const [uploadingIndex, setUploadingIndex] = useState(null);

  const addSection = (type) => {
    const newSection = {
      id: `section_${Date.now()}`,
      type,
      content: '',
      alignment: 'left',
      styling: {}
    };
    onUpdateSections([...sections, newSection]);
  };

  const deleteSection = (index) => {
    onUpdateSections(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index, direction) => {
    const newSections = [...sections];
    if (direction === 'up' && index > 0) {
      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
    } else if (direction === 'down' && index < sections.length - 1) {
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    }
    onUpdateSections(newSections);
  };

  const updateSection = (index, data) => {
    const newSections = [...sections];
    newSections[index] = { ...sections[index], ...data };
    onUpdateSections(newSections);
  };

  const openEditDialog = (index) => {
    setEditingIndex(index);
    setEditData({ ...sections[index] });
  };

  const saveEdit = () => {
    if (editingIndex !== null && editData) {
      updateSection(editingIndex, editData);
      setEditingIndex(null);
      setEditData(null);
    }
  };

  const handleImageUpload = async (file, index) => {
    try {
      setUploadingIndex(index);
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setEditData({ ...editData, content: file_url });
      setUploadingIndex(null);
    } catch (error) {
      alert('Upload failed: ' + error.message);
      setUploadingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Block Buttons */}
       <div className="flex flex-wrap gap-2 p-4 bg-secondary/30 rounded-lg">
        <Button size="sm" variant="outline" onClick={() => addSection('heading')}>+ Heading</Button>
        <Button size="sm" variant="outline" onClick={() => addSection('paragraph')}>+ Paragraph</Button>
        <Button size="sm" variant="outline" onClick={() => addSection('image')}>+ Image</Button>
        <Button size="sm" variant="outline" onClick={() => addSection('button')}>+ Button</Button>
        <Button size="sm" variant="outline" onClick={() => addSection('divider')}>+ Divider</Button>
        <Button size="sm" variant="outline" onClick={() => addSection('spacer')}>+ Space</Button>
      </div>

      {/* Sections List */}
      <div className="space-y-2">
        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Click a button above to add content blocks</p>
        ) : (
          sections.map((section, index) => (
            <Card key={section.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">{section.type}</p>
                  <p className="text-sm line-clamp-2">{section.content || '(empty)'}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(index)}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveSection(index, 'up')} disabled={index === 0}>
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1}>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteSection(index)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editingIndex !== null} onOpenChange={(open) => !open && setEditingIndex(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {editData?.type}</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-4">
              {(editData.type === 'heading' || editData.type === 'paragraph') && (
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={editData.content}
                    onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                    placeholder="Enter text. Use {{Variable}} for dynamic fields"
                    rows={4}
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="font-semibold mb-1">Available variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {VARIABLES.map(v => (
                        <code key={v} className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                          {`{{${v}}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {editData.type === 'button' && (
                <>
                  <div>
                    <label className="text-sm font-medium">Button Text</label>
                    <Input
                      value={editData.content}
                      onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                      placeholder="e.g., Confirm Assignment"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Button Color</label>
                    <Select value={editData.styling?.color || 'primary'} onValueChange={(v) => setEditData({ ...editData, styling: { ...editData.styling, color: v } })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Blue (Primary)</SelectItem>
                        <SelectItem value="green">Green (Success)</SelectItem>
                        <SelectItem value="gray">Gray</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {(editData.type === 'heading' || editData.type === 'paragraph' || editData.type === 'button') && (
                <div>
                  <label className="text-sm font-medium">Alignment</label>
                  <Select value={editData.alignment} onValueChange={(v) => setEditData({ ...editData, alignment: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editData.type === 'spacer' && (
               <div>
                 <label className="text-sm font-medium">Height (px)</label>
                 <Input
                   type="number"
                   value={editData.styling?.height || 20}
                   onChange={(e) => setEditData({ ...editData, styling: { ...editData.styling, height: parseInt(e.target.value) } })}
                   min="5"
                   max="100"
                 />
               </div>
              )}

              {editData.type === 'image' && (
               <>
                 <div>
                   <label className="text-sm font-medium">Image URL</label>
                   {editData.content ? (
                     <div className="space-y-2">
                       <img src={editData.content} alt="Preview" className="max-w-full h-auto rounded" />
                       <Button variant="outline" size="sm" onClick={() => setEditData({ ...editData, content: '' })}>
                         Replace Image
                       </Button>
                     </div>
                   ) : (
                     <div className="space-y-2">
                       <Input
                         type="file"
                         accept="image/*"
                         onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0], editingIndex)}
                         disabled={uploadingIndex === editingIndex}
                       />
                       {uploadingIndex === editingIndex && (
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                           <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                         </div>
                       )}
                     </div>
                   )}
                 </div>
                 <div>
                   <label className="text-sm font-medium">Max Width (px)</label>
                   <Input
                     type="number"
                     value={editData.styling?.maxWidth || 400}
                     onChange={(e) => setEditData({ ...editData, styling: { ...editData.styling, maxWidth: parseInt(e.target.value) } })}
                     min="50"
                     max="600"
                   />
                 </div>
               </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingIndex(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}