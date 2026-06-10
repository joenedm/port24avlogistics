import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_SIZE_MB = 5;

export default function HeaderImageUpload({ value, onChange }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error state
    setError(null);

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Invalid file type. Supported: PNG, JPG, JPEG, WEBP, SVG`);
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      setError(`File too large. Maximum ${MAX_SIZE_MB}MB allowed.`);
      return;
    }

    // Upload file
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      setError(null);
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <Label>Background Image</Label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-all",
            isUploading
              ? "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed"
              : "border-border hover:border-primary/50 bg-card hover:bg-primary/5 cursor-pointer text-foreground"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">Choose Image</span>
            </>
          )}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={isUploading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive transition-all disabled:opacity-50"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-destructive font-medium">{error}</p>
      )}

      {value ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Selected image:</p>
          <div className="relative rounded-lg overflow-hidden border border-border bg-muted h-32">
            <img
              src={value}
              alt="Header background preview"
              className="w-full h-full object-cover"
              onError={() => setError('Failed to load image preview')}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center">
          <p className="text-xs text-muted-foreground">No background image selected</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Max size: {MAX_SIZE_MB}MB • Formats: PNG, JPG, WEBP, SVG
      </p>
    </div>
  );
}