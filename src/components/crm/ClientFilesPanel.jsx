import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Paperclip, Upload, Trash2, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

const CAT_COLORS = {
  contract: 'bg-blue-500/10 text-blue-600',
  coi: 'bg-purple-500/10 text-purple-600',
  po: 'bg-amber-500/10 text-amber-600',
  invoice: 'bg-emerald-500/10 text-emerald-600',
  quote: 'bg-primary/10 text-primary',
  other: 'bg-slate-500/10 text-slate-500',
};

export default function ClientFilesPanel({ clientId, clientName, showId }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [meta, setMeta] = useState({ category: 'other', visibility: 'internal', notes: '' });
  const [selectedFile, setSelectedFile] = useState(null);

  const qKey = ['client-files', clientId, showId];
  const { data: files = [] } = useQuery({
    queryKey: qKey,
    queryFn: () => {
      const q = { client_id: clientId };
      if (showId) q.show_id = showId;
      return base44.entities.ClientFile.filter(q);
    },
    enabled: !!clientId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientFile.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      await base44.entities.ClientFile.create({
        client_id: clientId,
        client_name: clientName,
        show_id: showId || undefined,
        file_name: selectedFile.name,
        file_url,
        file_type: selectedFile.type,
        file_size_kb: Math.round(selectedFile.size / 1024),
        category: meta.category,
        visibility: meta.visibility,
        notes: meta.notes,
        uploaded_by: user?.email,
      });
      queryClient.invalidateQueries({ queryKey: qKey });
      toast.success('File uploaded');
      setUploadDialog(false);
      setSelectedFile(null);
      setMeta({ category: 'other', visibility: 'internal', notes: '' });
    } catch (e) {
      toast.error('Upload failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" className="gap-2" onClick={() => setUploadDialog(true)}>
          <Upload className="w-4 h-4" /> Upload File
        </Button>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Paperclip className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p>No files uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(file => (
            <Card key={file.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file_name}</p>
                  <div className="flex gap-1.5 mt-0.5 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${CAT_COLORS[file.category] || CAT_COLORS.other}`}>{file.category}</Badge>
                    {file.visibility === 'internal' ? (
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1"><EyeOff className="w-2.5 h-2.5" />Internal</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 gap-1"><Eye className="w-2.5 h-2.5" />Client-Visible</Badge>
                    )}
                    {file.file_size_kb && <span className="text-xs text-muted-foreground">{file.file_size_kb}KB</span>}
                  </div>
                  {file.notes && <p className="text-xs text-muted-foreground mt-0.5">{file.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="w-3 h-3" /></Button>
                  </a>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(file.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>File</Label>
              <Input type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={meta.category} onValueChange={v => setMeta(m => ({ ...m, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['contract','coi','po','invoice','quote','site_plan','rider','branding','photo','other'].map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g,' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={meta.visibility} onValueChange={v => setMeta(m => ({ ...m, visibility: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal Only</SelectItem>
                    <SelectItem value="client_visible">Client-Visible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={meta.notes} onChange={e => setMeta(m => ({ ...m, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}